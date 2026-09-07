import Foundation
import Testing
@testable import GigsmithKit

@Suite @MainActor struct MatchTests {
    @Test func rulesRejectEarlyD20AndMissingStartPhase() throws {
        let engine = try RulesEngine()
        let initial = try engine.newMatch()
        #expect(initial.report.players.count == 2)
        #expect(!initial.report.availableGigIds.contains("player:d20"))
        #expect(throws: (any Error).self) { try engine.changeMatch(initial, action: .gain, gigID: "player:d20", value: 20) }
        #expect(throws: (any Error).self) { try engine.changeMatch(initial, action: .advance) }
        let gained = try engine.changeMatch(initial, action: .gain, gigID: "player:d4", value: 4)
        #expect(gained.report.players.first?.streetCred == 4)
        #expect(throws: (any Error).self) { try engine.changeMatch(gained, action: .gain, gigID: "player:d6", value: 6) }
        let next = try engine.changeMatch(gained, action: .advance)
        #expect(next.report.activePlayerId == "rival")
        let stolen = try engine.changeMatch(next, action: .steal, gigID: "player:d4")
        #expect(stolen.report.players.last?.streetCred == 4)
        #expect(throws: (any Error).self) { try engine.changeMatch(stolen, action: .setValue, gigID: "player:d4", value: 5) }
    }

    @Test func sessionPersistsUndoAndRejectsDamagedData() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent("match.json")
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let engine = try RulesEngine()
        let session = try MatchSession(engine: engine, url: url)
        let initial = session.match
        try session.apply(.gain, gigID: "player:d4", value: 3)
        #expect(try MatchSession(engine: engine, url: url).match == session.match)
        try session.undo()
        #expect(session.match == initial)
        #expect(try MatchSession(engine: engine, url: url).match == initial)
        try session.reset(firstPlayer: "rival")
        #expect(session.match.report.activePlayerId == "rival")
        try session.undo()
        #expect(session.match == initial)
        let corrupt = Data("{broken".utf8)
        try corrupt.write(to: url)
        #expect(throws: (any Error).self) { try MatchSession(engine: engine, url: url) }
        #expect(try Data(contentsOf: url) == corrupt)
    }

    @Test func failedSaveLeavesMatchAndUndoUnchanged() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let session = try MatchSession(engine: RulesEngine(), url: root.appendingPathComponent("match.json"))
        let initial = session.match
        try Data("not a directory".utf8).write(to: root)
        #expect(throws: (any Error).self) { try session.apply(.gain, gigID: "player:d4", value: 2) }
        #expect(session.match == initial)
        #expect(!session.canUndo)
    }
}

@Suite @MainActor struct MatchCompletionTests {
    @Test(arguments: [false, true]) func winnerTimingAndCompletedMatchGuards(overtime: Bool) throws {
        let engine = try RulesEngine()
        var match = try engine.newMatch()
        for _ in 0..<12 {
            match = try engine.changeMatch(match, action: .gain, gigID: match.report.availableGigIds.first!, value: 1)
            match = try engine.changeMatch(match, action: .advance)
        }
        if overtime {
            match = try engine.changeMatch(match, action: .advance)
            match = try engine.changeMatch(match, action: .advance)
            #expect(match.report.overtime)
        }
        match = try engine.changeMatch(match, action: .steal, gigID: "rival:d4")
        if !overtime {
            #expect(match.report.winnerId == nil)
            match = try engine.changeMatch(match, action: .advance)
            match = try engine.changeMatch(match, action: .advance)
        }
        #expect(match.report.winnerId == "player")
        #expect(match.report.winReason == (overtime ? "overtime-majority" : "start-turn-majority"))
        #expect(throws: (any Error).self) { try engine.changeMatch(match, action: .advance) }
    }

    @Test func invalidSavedStateAndRulesVersionAreRejected() throws {
        let engine = try RulesEngine()
        let match = try engine.newMatch()
        var json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(match)) as! [String: Any]
        var state = json["state"] as! [String: Any]
        state["activePlayerId"] = "unknown"
        json["state"] = state
        let broken = try JSONDecoder().decode(MatchSnapshot.self, from: JSONSerialization.data(withJSONObject: json))
        #expect(throws: (any Error).self) { try engine.restoreMatch(broken) }
        json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(match)) as! [String: Any]
        var report = json["report"] as! [String: Any]
        report["rulesetVersion"] = "future-rules"
        json["report"] = report
        let future = try JSONDecoder().decode(MatchSnapshot.self, from: JSONSerialization.data(withJSONObject: json))
        #expect(throws: (any Error).self) { try engine.restoreMatch(future) }
    }
}
