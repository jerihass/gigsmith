import Foundation
import Observation

@MainActor @Observable public final class DeckLibrary {
    public private(set) var decks: [Deck]
    public let engine: RulesEngine
    private let storage: DeckStorage
    private var past: [[Deck]] = []
    private var future: [[Deck]] = []
    public var canUndo: Bool { !past.isEmpty }
    public var canRedo: Bool { !future.isEmpty }

    public init(engine: RulesEngine, storage: DeckStorage) throws {
        self.engine = engine
        self.storage = storage
        self.decks = try storage.load()
    }
    private func commit(_ next: [Deck]) throws {
        guard next != decks else { return }
        for deck in next where !decks.contains(deck) { try engine.checkPortable(deck) }
        try storage.save(next)
        past.append(decks)
        if past.count > 100 { past.removeFirst() }
        future.removeAll()
        decks = next
    }
    @discardableResult public func create(name: String) throws -> Deck {
        let deck = try engine.newDeck(name: name)
        try commit(decks + [deck])
        return deck
    }
    public func update(_ deck: Deck) throws {
        guard let index = decks.firstIndex(where: { $0.id == deck.id }) else { throw GigsmithError("This deck is no longer in the library.") }
        var next = decks
        next[index] = deck
        try commit(next)
    }
    @discardableResult public func importDeck(_ text: String, plainText: Bool = false) throws -> Deck {
        let deck = try engine.importDeck(text, plainText: plainText)
        try commit(decks + [deck])
        return deck
    }
    public func duplicate(_ deck: Deck) throws {
        var copy = deck
        copy.id = UUID().uuidString
        copy.name += " copy"
        try commit(decks + [copy])
    }
    public func delete(id: String) throws { try commit(decks.filter { $0.id != id }) }
    public func undo() throws {
        guard let previous = past.last else { return }
        try storage.save(previous)
        future.append(decks)
        past.removeLast()
        decks = previous
    }
    public func redo() throws {
        guard let next = future.last else { return }
        try storage.save(next)
        past.append(decks)
        future.removeLast()
        decks = next
    }
}
