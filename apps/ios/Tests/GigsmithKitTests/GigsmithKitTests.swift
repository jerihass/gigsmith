import Foundation
import Testing
@testable import GigsmithKit

@Suite @MainActor struct GigsmithKitTests {
    @Test func offlineSnapshotAndValidation() throws {
        let engine = try RulesEngine()
        #expect(engine.cards.count == 104)
        let deck = try engine.newDeck(name: "Native")
        let report = try engine.validate(deck)
        #expect(!report.legal)
        #expect(report.errors.count >= 2)
        #expect(report.rulesetVersion == deck.rulesetVersion)
    }

    @Test func portableRoundTripAndMalformedImport() throws {
        let engine = try RulesEngine()
        var deck = try engine.newDeck(name: "Quotes \" and Unicode 夜")
        deck.main = [DeckEntry(cardId: engine.cards.first { $0.card_type != "Legend" }!.id, count: 3)]
        let text = try engine.exportDeck(deck)
        let imported = try engine.importDeck(text)
        #expect(imported.name == deck.name)
        #expect(imported.main == deck.main)
        #expect(imported.id != deck.id)
        #expect(throws: (any Error).self) { try engine.importDeck("{broken") }
        #expect(throws: (any Error).self) { try engine.importDeck(text.replacingOccurrences(of: "gigsmith.deck", with: "unknown")) }
    }

    @Test func deterministicHandAndCopyLimits() throws {
        let engine = try RulesEngine()
        var deck = try engine.newDeck(name: "Hand")
        deck.main = engine.cards.filter { $0.card_type != "Legend" }.prefix(14).map { DeckEntry(cardId: $0.id, count: 3) }
        let first = try engine.sampleHand(deck, seed: "native-42")
        #expect(first == engine.sampleHand(deck, seed: "native-42"))
        #expect(first.cards.count == 6)
        deck.main[0].count = 4
        #expect(try engine.validate(deck).errors.contains { $0.code == "copy-limit" })
    }

    @Test func atomicStorageAndCorruptDataPreservation() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = DeckStorage(url: root.appendingPathComponent("decks.json"))
        #expect(try storage.load().isEmpty)
        let deck = try RulesEngine().newDeck(name: "Saved")
        try storage.save([deck])
        #expect(try storage.load() == [deck])
        let corrupt = Data("broken".utf8)
        try corrupt.write(to: storage.url)
        #expect(throws: (any Error).self) { try storage.load() }
        #expect(try Data(contentsOf: storage.url) == corrupt)
    }
}
