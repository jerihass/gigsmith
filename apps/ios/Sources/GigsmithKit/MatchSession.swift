import Foundation
import Observation

public enum MatchAction: String, Sendable { case gain, setValue, steal, advance }

public struct MatchSnapshot: Codable, Equatable, Sendable {
    public struct Gig: Codable, Equatable, Identifiable, Sendable {
        public let id: String
        public let ownerId: String
        public let controllerId: String?
        public let dieType: String
        public let value: Int
        public let maximum: Int
    }
    public struct Report: Codable, Equatable, Sendable {
        public struct Player: Codable, Equatable, Sendable {
            public let playerId: String
            public let controlledGigCount: Int
            public let streetCred: Int
            public let fixerGigCount: Int
        }
        public let players: [Player]
        public let activePlayerId: String
        public let activePlayerTurn: Int
        public let availableGigIds: [String]
        public let overtime: Bool
        public let winnerId: String?
        public let winReason: String?
        public let rulesetVersion: String
    }
    public let state: JSONValue
    public let report: Report
    public let gigs: [Gig]
}

extension RulesEngine {
    public func newMatch(firstPlayer: String = "player") throws -> MatchSnapshot {
        try call("matchCreate", extra: ["firstPlayer": firstPlayer])
    }
    public func restoreMatch(_ match: MatchSnapshot) throws -> MatchSnapshot {
        try call("matchRestore", extra: matchArguments(match))
    }
    public func changeMatch(_ match: MatchSnapshot, action: MatchAction, gigID: String = "", value: Int = 1) throws -> MatchSnapshot {
        var args = try matchArguments(match)
        args["action"] = action.rawValue
        args["gigID"] = gigID
        args["value"] = String(value)
        return try call("matchChange", extra: args)
    }
    private func matchArguments(_ match: MatchSnapshot) throws -> [String: String] {
        ["state": String(decoding: try JSONEncoder().encode(match.state), as: UTF8.self), "rulesetVersion": match.report.rulesetVersion]
    }
}

/// Match edits are transactional. A failed load preserves the file; a failed write preserves memory.
@MainActor @Observable public final class MatchSession {
    public private(set) var match: MatchSnapshot
    private let engine: RulesEngine
    public let url: URL
    private var past: [MatchSnapshot] = []
    public var canUndo: Bool { !past.isEmpty }

    public init(engine: RulesEngine, url: URL) throws {
        self.engine = engine
        self.url = url
        if FileManager.default.fileExists(atPath: url.path) {
            let saved = try JSONDecoder().decode(MatchSnapshot.self, from: Data(contentsOf: url))
            match = try engine.restoreMatch(saved)
        } else { match = try engine.newMatch() }
    }
    public func apply(_ action: MatchAction, gigID: String = "", value: Int = 1) throws {
        try commit(engine.changeMatch(match, action: action, gigID: gigID, value: value))
    }
    public func reset(firstPlayer: String) throws { try commit(engine.newMatch(firstPlayer: firstPlayer)) }
    public func undo() throws {
        guard let previous = past.last else { return }
        try save(previous)
        past.removeLast()
        match = previous
    }
    private func commit(_ next: MatchSnapshot) throws {
        guard next != match else { return }
        try save(next)
        past.append(match)
        if past.count > 100 { past.removeFirst() }
        match = next
    }
    private func save(_ next: MatchSnapshot) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: url, options: .atomic)
    }
}
