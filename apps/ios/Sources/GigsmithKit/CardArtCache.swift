import Foundation
import CryptoKit
import ImageIO

/// Opt-in, bounded cache. Signed URLs stay in memory; image bytes live in purgeable Caches.
public actor CardArtCache {
    public static let shared = CardArtCache(directory: FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("GigsmithArtwork"))
    public typealias Fetch = @Sendable (URL) async throws -> Data
    private let directory: URL
    private let fetch: Fetch
    private let budget: Int
    private var pending: [String: Task<Data, any Error>] = [:]
    private var directories: [String: Task<[String: URL], any Error>] = [:]
    private var epoch = 0
    private static let maximumBytes = 8 * 1024 * 1024
    public init(directory: URL, budget: Int = 100 * 1024 * 1024, fetch: @escaping Fetch = CardArtCache.download) {
        self.directory = directory; self.budget = budget; self.fetch = fetch
    }
    public nonisolated static func isTrustedArtwork(_ url: URL, now: Date = Date()) -> Bool {
        guard url.scheme == "https", url.host == "dstcynss47vun.cloudfront.net", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443, url.fragment == nil,
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems else { return false }
        func field(_ name: String) -> String? { items.first { $0.name == name }?.value }
        guard let expires = field("Expires").flatMap(Double.init), expires > now.timeIntervalSince1970 + 30,
              let signature = field("Signature"), !signature.isEmpty,
              let key = field("Key-Pair-Id"), !key.isEmpty else { return false }
        return true
    }
    private func file(_ key: String) -> URL {
        let hash = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory.appendingPathComponent(hash + ".image")
    }
    private nonisolated static func validImage(_ data: Data) -> Bool {
        guard !data.isEmpty, data.count <= maximumBytes,
              let source = CGImageSourceCreateWithData(data as CFData, nil), CGImageSourceGetCount(source) > 0,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int,
              width > 0, height > 0, width <= 12000, height <= 12000, width * height <= 40_000_000 else { return false }
        return true
    }
    public func image(printingID: String, setCode: String, enabled: Bool) async throws -> Data? {
        guard enabled else { return nil }
        try Task.checkCancellation()
        let key = "v1:" + printingID
        let path = file(key)
        if let info = try? path.resourceValues(forKeys: [.contentModificationDateKey]),
           let date = info.contentModificationDate, Date().timeIntervalSince(date) < 30 * 86400,
           let bytes = try? Data(contentsOf: path), Self.validImage(bytes) {
            try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: path.path)
            return bytes
        }
        if let task = pending[key] { return try await task.value }
        let generation = epoch
        let task = Task<Data, any Error> {
            let url = try await self.artworkURL(printingID: printingID, setCode: setCode)
            try Task.checkCancellation()
            let bytes = try await self.fetch(url)
            try Task.checkCancellation()
            guard Self.validImage(bytes) else { throw GigsmithError("Artwork returned an unsupported or oversized image.") }
            return bytes
        }
        pending[key] = task
        do {
            let bytes = try await task.value
            guard generation == epoch else { throw CancellationError() }
            pending[key] = nil
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            if bytes.count <= budget {
                try bytes.write(to: path, options: .atomic)
                try trim()
            }
            return bytes
        } catch {
            if generation == epoch { pending[key] = nil }
            throw error
        }
    }
    private func artworkURL(printingID: String, setCode: String) async throws -> URL {
        if let task = directories[setCode] {
            let urls = try await task.value
            if let url = urls[printingID], Self.isTrustedArtwork(url) { return url }
            directories[setCode] = nil
        }
        let fetch = fetch
        let task = Task<[String: URL], any Error> {
            struct Page: Decodable {
                struct Item: Decodable { let printing_id: String?; let image_url: URL? }
                let total: Int
                let items: [Item]
            }
            var offset = 0
            var urls: [String: URL] = [:]
            while true {
                try Task.checkCancellation()
                var endpoint = URLComponents(string: "https://api.netdeck.gg/api/cards/cyberpunk")!
                endpoint.queryItems = [.init(name: "set", value: setCode), .init(name: "limit", value: "100"), .init(name: "offset", value: String(offset))]
                let page = try JSONDecoder().decode(Page.self, from: await fetch(endpoint.url!))
                guard (0...5000).contains(page.total), !page.items.isEmpty, offset + page.items.count <= page.total else {
                    throw GigsmithError("The artwork directory returned an incomplete response.")
                }
                for item in page.items {
                    if let id = item.printing_id, let url = item.image_url, Self.isTrustedArtwork(url) { urls[id] = url }
                }
                offset += page.items.count
                if offset == page.total { break }
            }
            return urls
        }
        directories[setCode] = task
        do {
            guard let url = try await task.value[printingID] else { throw GigsmithError("Artwork is unavailable for this printing.") }
            return url
        } catch { directories[setCode] = nil; throw error }
    }
    public func cancelRequests() {
        epoch += 1
        pending.values.forEach { $0.cancel() }
        directories.values.forEach { $0.cancel() }
        pending.removeAll(); directories.removeAll()
    }
    public func clear() throws {
        cancelRequests()
        if FileManager.default.fileExists(atPath: directory.path) { try FileManager.default.removeItem(at: directory) }
    }
    private func files() -> [URL] { (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey])) ?? [] }
    public func cachedBytes() -> Int { files().reduce(0) { $0 + ((try? $1.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) } }
    private func trim() throws {
        let ordered = files().sorted {
            ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) <
            ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast)
        }
        var total = cachedBytes()
        for url in ordered where total > budget {
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            try FileManager.default.removeItem(at: url)
            total -= size
        }
    }
    public nonisolated static func download(_ url: URL) async throws -> Data {
        guard isTrustedArtwork(url) || (url.scheme == "https" && url.host == "api.netdeck.gg" && url.path == "/api/cards/cyberpunk") else {
            throw GigsmithError("Untrusted artwork source.")
        }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 25
        let session = URLSession(configuration: configuration, delegate: NoArtworkRedirects(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        let (stream, response) = try await session.bytes(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              response.expectedContentLength <= maximumBytes else { throw GigsmithError("Artwork is unavailable from the source.") }
        var bytes = Data()
        for try await byte in stream {
            guard bytes.count < maximumBytes else { throw GigsmithError("Artwork response is too large.") }
            bytes.append(byte)
        }
        return bytes
    }
}
private final class NoArtworkRedirects: NSObject, URLSessionTaskDelegate, Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping @Sendable (URLRequest?) -> Void) { completionHandler(nil) }
}
