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
        #expect(first == (try engine.sampleHand(deck, seed: "native-42")))
        #expect(first.cards.count == 6)
        deck.main[0].count = 4
        #expect(try engine.validate(deck).errors.contains { $0.code == "max-copies" })
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

@Suite @MainActor struct LibraryTests {
    @Test func editsUndoAndPersistAcrossLaunches() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let storage = DeckStorage(url: root.appendingPathComponent("decks.json"))
        let engine = try RulesEngine()
        let library = try DeckLibrary(engine: engine, storage: storage)
        let deck = try library.create(name: "First")
        var edited = deck
        edited.name = "Edited"
        try library.update(edited)
        #expect(library.decks.first?.name == "Edited")
        try library.undo()
        #expect(library.decks.first?.name == "First")
        try library.redo()
        #expect(try DeckLibrary(engine: engine, storage: storage).decks.first?.name == "Edited")
        try library.delete(id: deck.id)
        #expect(library.decks.isEmpty)
        try library.undo()
        #expect(library.decks.count == 1)
    }

    @Test func failedSaveDoesNotChangeMemory() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let storage = DeckStorage(url: root.appendingPathComponent("decks.json"))
        let library = try DeckLibrary(engine: RulesEngine(), storage: storage)
        try FileManager.default.removeItem(at: root)
        try Data("file, not directory".utf8).write(to: root)
        #expect(throws: (any Error).self) { try library.create(name: "Must not appear") }
        #expect(library.decks.isEmpty)
        #expect(!library.canUndo)
    }

    @Test func analysisIsExplainableAndEmptyHandsReportIssues() throws {
        let engine = try RulesEngine()
        let deck = try engine.newDeck(name: "Empty")
        let sections = try engine.analysis(deck, seed: "fixture")
        #expect(sections.contains { $0.title == "Assumptions" && !$0.rows.isEmpty })
        #expect(try engine.sampleHand(deck, seed: "fixture").issues.count > 0)
    }
}

@Suite @MainActor struct EditingLimitsTests {
    @Test func invalidNamesAndCountsCannotCreateUnimportableDecks() throws {
        let engine = try RulesEngine()
        #expect(throws: (any Error).self) { try engine.newDeck(name: String(repeating: "x", count: 121)) }
        var deck = try engine.newDeck(name: "Portable")
        deck.main = [DeckEntry(cardId: engine.cards[0].id, count: 101)]
        #expect(throws: (any Error).self) { try engine.checkPortable(deck) }
    }
}

@Suite @MainActor struct TextInterchangeTests {
    @Test func plainTextRoundTrip() throws {
        let engine = try RulesEngine()
        var deck = try engine.newDeck(name: "Text")
        deck.main = [DeckEntry(cardId: engine.cards.first { $0.card_type == "Unit" }!.id, count: 2)]
        let text: String = try engine.call("text", deck: deck)
        #expect(try engine.importDeck(text, plainText: true).main == deck.main)
    }
}
