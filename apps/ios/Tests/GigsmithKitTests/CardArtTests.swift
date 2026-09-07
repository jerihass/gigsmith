import Foundation
import Testing
@testable import GigsmithKit

private actor ArtRequests {
    var count = 0
    let bytes = Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=")!
    func fetch(_ url: URL) throws -> Data {
        count += 1
        if url.host == "api.netdeck.gg" {
            return Data("{\"total\":1,\"items\":[{\"printing_id\":\"print\",\"image_url\":\"https://dstcynss47vun.cloudfront.net/art.webp?Expires=4102444800&Signature=test&Key-Pair-Id=test\"}]}".utf8)
        }
        return bytes
    }
}
@Suite struct CardArtTests {
    @Test func disabledDeduplicatedAndOfflineCache() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let requests = ArtRequests()
        let cache = CardArtCache(directory: root, fetch: { try await requests.fetch($0) })
        #expect(try await cache.image(printingID: "print", setCode: "set", enabled: false) == nil)
        #expect(await requests.count == 0)
        async let first = cache.image(printingID: "print", setCode: "set", enabled: true)
        async let second = cache.image(printingID: "print", setCode: "set", enabled: true)
        let values = try await [first, second]
        #expect(values[0] != nil && values[0] == values[1])
        #expect(await requests.count == 2)
        let offline = CardArtCache(directory: root, fetch: { _ in throw URLError(.notConnectedToInternet) })
        #expect(try await offline.image(printingID: "print", setCode: "set", enabled: true) == values[0])
        try await offline.clear()
        #expect(await offline.cachedBytes() == 0)
        await #expect(throws: (any Error).self) { try await offline.image(printingID: "print", setCode: "set", enabled: true) }
    }
    @Test func rejectsUntrustedAndExpiredArtwork() {
        #expect(!CardArtCache.isTrustedArtwork(URL(string: "https://evil.example/a?Signature=x")!))
        #expect(!CardArtCache.isTrustedArtwork(URL(string: "https://dstcynss47vun.cloudfront.net/a?Expires=1&Signature=x&Key-Pair-Id=x")!))
        #expect(!CardArtCache.isTrustedArtwork(URL(string: "https://dstcynss47vun.cloudfront.net/a")!))
    }
}
