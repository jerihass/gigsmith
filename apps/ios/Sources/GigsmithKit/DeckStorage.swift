import Foundation

public struct DeckStorage: Sendable {
    public let url: URL
    public init(url: URL) { self.url = url }
    public static func applicationStorage() throws -> DeckStorage {
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return DeckStorage(url: directory.appendingPathComponent("Gigsmith/decks.json"))
    }
    public func load() throws -> [Deck] {
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        return try JSONDecoder().decode([Deck].self, from: Data(contentsOf: url))
    }
    public func save(_ decks: [Deck]) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(decks).write(to: url, options: .atomic)
    }
}
