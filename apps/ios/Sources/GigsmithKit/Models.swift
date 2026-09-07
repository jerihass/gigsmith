import Foundation

public struct Card: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let display_name: String
    public let color: String
    public let card_type: String
    public let rules_text: String?
    public let cost: Int?
    public let power: Int?
    public let ram: Int?
    public let is_eddiable: Bool
    public let keywords: [String]
    public let classifications: [String]
}

public struct DeckEntry: Codable, Equatable, Sendable {
    public var cardId: String
    public var count: Int
    public init(cardId: String, count: Int) { self.cardId = cardId; self.count = count }
}

/// Lossless storage for optional metadata and version history owned by the shared format.
public enum JSONValue: Codable, Equatable, Sendable {
    case string(String), number(Double), bool(Bool), object([String: JSONValue]), array([JSONValue]), null
    public init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode([String: JSONValue].self) { self = .object(v) }
        else { self = .array(try c.decode([JSONValue].self)) }
    }
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
}

public struct Deck: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var legends: [DeckEntry]
    public var main: [DeckEntry]
    public var formatId: String
    public var rulesetVersion: String
    public var cardDataVersion: String
    public var metadata: JSONValue?
    public var versions: JSONValue?
    public var mainCount: Int { main.reduce(0) { $0 + $1.count } }
    public mutating func setCount(for card: Card, count: Int) {
        var entries = card.card_type == "Legend" ? legends : main
        entries.removeAll { $0.cardId == card.id }
        if count > 0 { entries.append(DeckEntry(cardId: card.id, count: count)) }
        if card.card_type == "Legend" { legends = entries } else { main = entries }
    }
}

public struct ValidationIssue: Codable, Equatable, Sendable {
    public let code: String
    public let message: String
    public let affectedCards: [String]
    public let suggestedFixes: [String]?
}
public struct ValidationReport: Codable, Sendable {
    public let legal: Bool
    public let errors: [ValidationIssue]
    public let warnings: [ValidationIssue]
    public let rulesetVersion: String
}
public struct SampleHand: Codable, Equatable, Sendable {
    public struct Copy: Codable, Equatable, Sendable {
        public let cardId: String
        public let copyNumber: Int
        public let displayName: String?
    }
    public let cards: [Copy]
    public struct Issue: Codable, Equatable, Sendable { public let message: String }
    public let issues: [Issue]
    public let sellableCount: Int
    public let assumptions: [String]
}
public struct RamReport: Codable, Sendable {
    public struct Limit: Codable, Sendable { public let color: String; public let limit: Int }
    public let limits: [Limit]
}
public struct AnalysisSection: Codable, Identifiable, Sendable {
    public var id: String { title }
    public let title: String
    public let rows: [String]
}
