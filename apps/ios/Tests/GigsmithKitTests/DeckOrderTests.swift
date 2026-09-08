import Foundation
import Testing
@testable import GigsmithKit

@MainActor struct DeckOrderTests {
    @Test(arguments: ["Unit", "Legend"])
    func quantitiesPreserveOrder(cardType: String) throws {
        let engine = try RulesEngine()
        let cards = Array(engine.cards.filter { $0.card_type == cardType }.prefix(4))
        var deck = try engine.newDeck(name: "Stable order")
        for card in cards.prefix(3) { deck.setCount(for: card, count: 1) }
        let entries: (Deck) -> [DeckEntry] = { cardType == "Legend" ? $0.legends : $0.main }
        let original = entries(deck).map(\.cardId)
        deck.setCount(for: cards[0], count: 3)
        #expect(entries(deck).map(\.cardId) == original)
        #expect(entries(deck).first?.count == 3)
        deck.setCount(for: cards[1], count: 2)
        deck.setCount(for: cards[1], count: 1)
        #expect(entries(deck).map(\.cardId) == original)
        deck.setCount(for: cards[1], count: 0)
        #expect(entries(deck).map(\.cardId) == [cards[0].id, cards[2].id])
        deck.setCount(for: cards[3], count: 2)
        #expect(entries(deck).map(\.cardId) == [cards[0].id, cards[2].id, cards[3].id])
    }

    @Test func orderSurvivesSaveUndoAndReload() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let engine = try RulesEngine()
        let storage = DeckStorage(url: root.appendingPathComponent("decks.json"))
        let library = try DeckLibrary(engine: engine, storage: storage)
        var deck = try library.create(name: "Stable saved order")
        let cards = Array(engine.cards.filter { $0.card_type == "Unit" }.prefix(3))
        for card in cards { deck.setCount(for: card, count: 1) }
        try library.update(deck)
        deck.setCount(for: cards[0], count: 2)
        try library.update(deck)
        let order = cards.map(\.id)
        #expect(try storage.load().first?.main.map(\.cardId) == order)
        try library.undo()
        #expect(library.decks.first?.main.map(\.cardId) == order)
        try library.redo()
        #expect(try DeckLibrary(engine: engine, storage: storage).decks.first?.main.map(\.cardId) == order)
    }
}
