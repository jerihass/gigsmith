import Foundation
import Testing
@testable import GigsmithKit

@MainActor struct ArtworkLoaderTests {
    @Test func reappearingArtworkKeepsLoadedDataWithoutFetchingAgain() async {
        let loader = ArtworkLoader()
        var requests = 0
        await loader.load(key: "first", enabled: true) { requests += 1; return Data([1]) }
        await loader.load(key: "first", enabled: true) {
            requests += 1
            #expect(loader.data == Data([1]))
            return Data([2])
        }
        #expect(requests == 1)
        #expect(loader.data == Data([1]))
        await loader.load(key: "second", enabled: true) {
            #expect(loader.data == nil)
            return Data([2])
        }
        #expect(loader.data == Data([2]))
        await loader.load(key: "second", enabled: false) { Issue.record("Disabled artwork fetched"); return nil }
        #expect(loader.data == nil)
    }

    @Test func cancelledRequestsDoNotReplaceNewArtwork() async {
        let loader = ArtworkLoader()
        var continuation: CheckedContinuation<Data?, Never>?
        let old = Task {
            await loader.load(key: "old", enabled: true) {
                await withCheckedContinuation { continuation = $0 }
            }
        }
        while continuation == nil { await Task.yield() }
        old.cancel()
        await loader.load(key: "new", enabled: true) { Data([2]) }
        continuation?.resume(returning: Data([1]))
        await old.value
        #expect(loader.data == Data([2]))
        #expect(!loader.unavailable)
    }
}
