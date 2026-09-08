import Foundation
import Testing
@testable import GigsmithKit

private actor DatabasePages {
    let pages: [Data]
    var offsets: [String] = []
    init(_ pages: [Data]) { self.pages = pages }
    func fetch(_ url: URL) throws -> Data {
        let index = offsets.count
        offsets.append(URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!.first { $0.name == "offset" }!.value!)
        guard index < pages.count else { throw URLError(.badServerResponse) }
        return pages[index]
    }
}
@Suite @MainActor struct DatabaseSyncTests {
    private func fixture(_ engine: RulesEngine) throws -> [[String: Any]] {
        let snapshot: JSONValue = try engine.call("catalog")
        let object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(snapshot)) as! [String: Any]
        var cards = Array((object["cards"] as! [[String: Any]]).filter { $0["card_type"] as? String == "Unit" }.prefix(2))
        cards[0]["display_name"] = "Synced card"
        cards[0]["ram"] = 999
        cards[0]["image_url"] = "https://untrusted.example/transient?Signature=secret"
        return cards
    }
    private func page(_ cards: [[String: Any]], total: Int) throws -> Data {
        try JSONSerialization.data(withJSONObject: ["items": cards, "total": total])
    }

    @Test func syncPaginatesUpdatesRulesAndSurvivesOfflineLaunch() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let engine = try RulesEngine()
        let cards = try fixture(engine)
        var deck = try engine.newDeck(name: "Existing deck")
        deck.main = [DeckEntry(cardId: cards[0]["id"] as! String, count: 1)]
        let pages = DatabasePages([try page([cards[0]], total: 2), try page([cards[1]], total: 2)])
        let url = root.appendingPathComponent("cards.json")
        let sync = CardDatabaseSync(engine: engine, url: url, fetch: { try await pages.fetch($0) })
        try await sync.refresh()
        #expect(await pages.offsets == ["0", "1"])
        #expect(engine.cards.count == 2)
        #expect(try engine.validate(deck).errors.contains { $0.message.contains("Synced card") })
        #expect(try engine.newDeck(name: "New").cardDataVersion == engine.metadata.cardDataVersion)
        #expect(!String(decoding: try Data(contentsOf: url), as: UTF8.self).contains("Signature"))
        let restarted = try RulesEngine()
        let restored = CardDatabaseSync(engine: restarted, url: url, fetch: { _ in throw URLError(.notConnectedToInternet) })
        #expect(restored.usingSavedSnapshot)
        #expect(restarted.cards == engine.cards)
        let saved = try Data(contentsOf: url)
        await #expect(throws: (any Error).self) { try await restored.refresh() }
        #expect(restarted.cards == engine.cards)
        #expect(try Data(contentsOf: url) == saved)
    }

    @Test func partialInvalidAndFailedSaveKeepCurrentDatabase() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let engine = try RulesEngine()
        let initial = engine.cards
        let cards = try fixture(engine)
        let pages = DatabasePages([try page([cards[0]], total: 2), try page([], total: 2)])
        let sync = CardDatabaseSync(engine: engine, url: root.appendingPathComponent("cards.json"), fetch: { try await pages.fetch($0) })
        await #expect(throws: (any Error).self) { try await sync.refresh() }
        #expect(engine.cards == initial)
        let invalidPage = try page([cards[0], cards[0]], total: 2)
        let invalid = CardDatabaseSync(engine: engine, url: root.appendingPathComponent("cards.json"), fetch: { _ in invalidPage })
        await #expect(throws: (any Error).self) { try await invalid.refresh() }
        #expect(engine.cards == initial)
        try Data("not a directory".utf8).write(to: root)
        let validPage = try page(cards, total: 2)
        let unwritable = CardDatabaseSync(engine: engine, url: root.appendingPathComponent("cards.json"), fetch: { _ in validPage })
        await #expect(throws: (any Error).self) { try await unwritable.refresh() }
        #expect(engine.cards == initial)
    }

    @Test func corruptSavedSnapshotFallsBackWithoutRemovingFile() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        let bad = Data("broken".utf8)
        try bad.write(to: url)
        let engine = try RulesEngine()
        let sync = CardDatabaseSync(engine: engine, url: url)
        #expect(engine.cards.count == 104)
        #expect(sync.loadWarning != nil)
        #expect(try Data(contentsOf: url) == bad)
    }
}

@Suite @MainActor struct LiveDatabaseTests {
    @Test(.enabled(if: ProcessInfo.processInfo.environment["GIGSMITH_LIVE_DATABASE_TEST"] == "1"))
    func liveDatabaseSyncAndOfflineRestore() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let engine = try RulesEngine()
        let url = root.appendingPathComponent("cards.json")
        let sync = CardDatabaseSync(engine: engine, url: url)
        try await sync.refresh()
        #expect(engine.cards.count == engine.metadata.sourceCardCount)
        #expect(engine.cards.count > 0)
        let restarted = try RulesEngine()
        let restored = CardDatabaseSync(engine: restarted, url: url, fetch: { _ in throw URLError(.notConnectedToInternet) })
        #expect(restored.usingSavedSnapshot)
        #expect(restarted.cards == engine.cards)
    }
}
