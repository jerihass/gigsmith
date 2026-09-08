import Foundation
import CryptoKit
import Observation

public struct CatalogMetadata: Codable, Equatable, Sendable {
    public let sourceName: String
    public let sourceUrl: String
    public let sourceRetrievedAt: String
    public let cardDataVersion: String
    public let sourceCardCount: Int
    static let empty = CatalogMetadata(sourceName: "", sourceUrl: "", sourceRetrievedAt: "", cardDataVersion: "", sourceCardCount: 0)
}
struct NativeCatalog: Decodable { let cards: [Card]; let metadata: CatalogMetadata }

@MainActor @Observable public final class CardDatabaseSync {
    public let engine: RulesEngine
    public private(set) var isSyncing = false
    public private(set) var usingSavedSnapshot = false
    public private(set) var loadWarning: String?
    public private(set) var message: String?
    public private(set) var progress = ""
    private let url: URL
    private let fetch: CardArtCache.Fetch

    public init(engine: RulesEngine, url: URL, fetch: @escaping CardArtCache.Fetch = CardArtCache.download) {
        self.engine = engine; self.url = url; self.fetch = fetch
        if FileManager.default.fileExists(atPath: url.path) {
            do {
                let values = try url.resourceValues(forKeys: [.fileSizeKey])
                guard (values.fileSize ?? 0) <= 32 * 1024 * 1024 else { throw GigsmithError("Saved snapshot exceeds the size limit.") }
                let prepared = try engine.prepareDatabase(String(contentsOf: url, encoding: .utf8))
                try engine.installDatabase(prepared)
                usingSavedSnapshot = true
            } catch { loadWarning = "Saved card data could not be loaded; using bundled cards. The saved file is preserved. \(error.localizedDescription)" }
        }
    }
    public func refresh() async throws {
        guard !isSyncing else { return }
        isSyncing = true; message = nil; progress = "Connecting to Netdeck…"
        defer { isSyncing = false; progress = "" }
        do {
            struct Page: Decodable { let total: Int; let items: [JSONValue] }
            var cards: [JSONValue] = []
            var expected: Int?
            var bytes = 0
            while true {
                try Task.checkCancellation()
                var endpoint = URLComponents(string: "https://api.netdeck.gg/api/cards/cyberpunk")!
                endpoint.queryItems = [.init(name: "limit", value: "100"), .init(name: "offset", value: String(cards.count))]
                // Same fixed Netdeck endpoint, bounded ephemeral transport, and redirect policy as artwork lookup.
                let data = try await fetch(endpoint.url!)
                bytes += data.count
                guard bytes <= 32 * 1024 * 1024 else { throw GigsmithError("The database response exceeds the size limit.") }
                let page = try JSONDecoder().decode(Page.self, from: data)
                guard (1...5000).contains(page.total), expected == nil || expected == page.total,
                      !page.items.isEmpty, cards.count + page.items.count <= page.total else {
                    throw GigsmithError("The source returned incomplete or changing pages. Please try again.")
                }
                expected = page.total
                cards += page.items.map(Self.withoutArtwork)
                progress = "Downloaded \(cards.count) of \(page.total) cards…"
                if cards.count == page.total { break }
            }
            try Task.checkCancellation()
            let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
            let identity = SHA256.hash(data: try encoder.encode(cards)).prefix(8).map { String(format: "%02x", $0) }.joined()
            let timestamp = ISO8601DateFormatter().string(from: Date())
            let snapshot: JSONValue = .object([
                "metadata": .object([
                    "game": .string("cyberpunk"), "sourceName": .string("Netdeck"),
                    "sourceUrl": .string("https://api.netdeck.gg/api/cards/cyberpunk"),
                    "sourceRetrievedAt": .string(timestamp), "sourceCardCount": .number(Double(cards.count)),
                    "cardDataVersion": .string("netdeck-cyberpunk-\(identity)"),
                    "notes": .string("User-synced native text snapshot. Artwork URLs are resolved separately.")
                ]), "cards": .array(cards)
            ])
            let prepared = try engine.prepareDatabase(String(decoding: encoder.encode(snapshot), as: UTF8.self))
            let oldIDs = Set(engine.cards.map(\.id))
            let additions = prepared.catalog.cards.filter { !oldIDs.contains($0.id) }.count
            let changed = prepared.catalog.metadata.cardDataVersion != engine.metadata.cardDataVersion
            try persistAndInstall(prepared)
            message = changed ? "Synced \(cards.count) cards from Netdeck; \(additions) new cards. Existing decks were kept." : "Database is up to date (\(cards.count) cards)."
        } catch {
            message = "Sync failed. Your current database and decks are unchanged. \(error.localizedDescription)"
            throw error
        }
    }
    public func useBundledSnapshot() throws {
        guard !isSyncing else { throw GigsmithError("Wait for the current sync to finish.") }
        let text: String = try engine.call("bundledCatalog")
        try persistAndInstall(engine.prepareDatabase(text))
        message = "Using the bundled card database. Existing decks were kept."
    }
    private func persistAndInstall(_ prepared: RulesEngine.PreparedCatalog) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(prepared.json.utf8).write(to: url, options: .atomic)
        try engine.installDatabase(prepared)
        usingSavedSnapshot = true; loadWarning = nil
    }
    private static func withoutArtwork(_ value: JSONValue) -> JSONValue {
        switch value {
        case .array(let values): .array(values.map(withoutArtwork))
        case .object(let fields): .object(fields.filter { $0.key != "image_url" && $0.key != "source_image_url" }.mapValues(withoutArtwork))
        default: value
        }
    }
}
