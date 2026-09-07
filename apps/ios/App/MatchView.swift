import SwiftUI
import GigsmithKit

struct MatchWorkspace: View {
    let engine: RulesEngine
    @State private var session: MatchSession?
    @State private var failure: String?
    @State private var savedURL: URL?
    var body: some View {
        NavigationStack {
            Group {
                if let session { MatchView(session: session) }
                else if let failure {
                    ContentUnavailableView {
                        Label("Match could not open", systemImage: "externaldrive.badge.exclamationmark")
                    } description: { Text(failure + "\nYour saved file has not been replaced. Decks remain available in the Decks tab.") }
                    actions: {
                        Button("Retry", action: load)
                        if let savedURL { ShareLink("Export saved match", item: savedURL) }
                    }
                } else { ProgressView("Opening match…") }
            }.navigationTitle("Match")
        }.task { if session == nil && failure == nil { load() } }
    }
    private func load() {
        do {
            let url = try DeckStorage.applicationStorage().url.deletingLastPathComponent().appendingPathComponent("match.json")
            savedURL = FileManager.default.fileExists(atPath: url.path) ? url : nil
            session = try MatchSession(engine: engine, url: url)
            failure = nil
        } catch { failure = error.localizedDescription }
    }
}

struct MatchView: View {
    @Bindable var session: MatchSession
    @State private var selectedID = ""
    @State private var rolledValue = 1
    @State private var failure: String?
    @State private var newMatch = false
    @State private var editingGig: MatchSnapshot.Gig?
    @State private var stealingGig: MatchSnapshot.Gig?
    private var report: MatchSnapshot.Report { session.match.report }
    private var available: [MatchSnapshot.Gig] { session.match.gigs.filter { report.availableGigIds.contains($0.id) } }
    private var selected: MatchSnapshot.Gig? { available.first { $0.id == selectedID } }
    private func playerName(_ id: String) -> String { id == "player" ? "You" : "Rival" }

    var body: some View {
        List {
            Section {
                if let winner = report.winnerId {
                    Label("\(playerName(winner)) won", systemImage: "trophy.fill").font(.title2.bold())
                    Text(report.winReason == "overtime-majority" ? "Overtime majority" : "Majority at the start of the turn")
                } else {
                    Text("\(playerName(report.activePlayerId)) · turn \(report.activePlayerTurn)").font(.title2.bold()).accessibilityIdentifier("activeTurn")
                    if report.overtime { Label("Overtime", systemImage: "clock.badge.exclamationmark") }
                }
                ForEach(report.players, id: \.playerId) { player in
                    LabeledContent(playerName(player.playerId), value: "\(player.controlledGigCount) Gigs · Street Cred \(player.streetCred)")
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(playerName(player.playerId))
                        .accessibilityValue("\(player.streetCred) Street Cred; \(player.controlledGigCount) Gigs")
                        .accessibilityIdentifier("score-\(player.playerId)")
                }
            }
            if report.winnerId == nil {
                Section("Start phase · gain a Gig") {
                    if available.isEmpty {
                        Text("No Gig is available to gain this turn.").foregroundStyle(.secondary)
                    } else {
                        Picker("Die", selection: $selectedID) { ForEach(available) { gig in Text(gig.dieType).tag(gig.id) } }
                        if let selected {
                            Stepper("Rolled value: \(rolledValue)", value: $rolledValue, in: 1...selected.maximum).accessibilityIdentifier("rolledValue")
                            Button("Gain Gig", systemImage: "plus.circle") { attempt { try session.apply(.gain, gigID: selected.id, value: rolledValue) } }
                        }
                        Text("Roll the physical die and enter its value. Available dice follow the bundled ruleset.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section { Button("End turn", systemImage: "arrow.right.circle") { attempt { try session.apply(.advance) } } }
            }
            ForEach(report.players, id: \.playerId) { player in
                Section("\(playerName(player.playerId)) · controlled Gigs") {
                    let gigs = session.match.gigs.filter { $0.controllerId == player.playerId }
                    if gigs.isEmpty { Text("No controlled Gigs").foregroundStyle(.secondary) }
                    ForEach(gigs) { gig in
                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("\(gig.dieType) · owned by \(playerName(gig.ownerId))", value: "\(gig.value)")
                            if report.winnerId == nil {
                                HStack {
                                    Button("Change value") { editingGig = gig }
                                    if gig.controllerId != report.activePlayerId {
                                        Spacer()
                                        Button("Record steal") { stealingGig = gig }
                                    }
                                }.buttonStyle(.borderless)
                            }
                        }.padding(.vertical, 4)
                    }
                }
            }
            Section("Tracking scope") {
                Text("Record steals only after resolving combat at the table. This tracker does not validate attacks, Blocker sequencing, or card effects.")
                Text(report.rulesetVersion).font(.caption).foregroundStyle(.secondary)
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Undo match action", systemImage: "arrow.uturn.backward") { attempt { try session.undo() } }.disabled(!session.canUndo)
                Button("New match", systemImage: "plus") { newMatch = true }
            }
        }
        .onChange(of: session.match, initial: true) { _, _ in
            if !available.contains(where: { $0.id == selectedID }) { selectedID = available.first?.id ?? "" }
            rolledValue = 1
        }
        .onChange(of: selectedID) { _, _ in rolledValue = 1 }
        .confirmationDialog("Start a new match?", isPresented: $newMatch, titleVisibility: .visible) {
            Button("You go first") { attempt { try session.reset(firstPlayer: "player") } }
            Button("Rival goes first") { attempt { try session.reset(firstPlayer: "rival") } }
        } message: { Text("The current match will be replaced. You can undo this during this app session.") }
        .confirmationDialog("Record resolved steal?", isPresented: Binding(get: { stealingGig != nil }, set: { if !$0 { stealingGig = nil } }), titleVisibility: .visible) {
            if let gig = stealingGig {
                Button("Record steal of \(gig.dieType)") { attempt { try session.apply(.steal, gigID: gig.id) }; stealingGig = nil }
            }
        } message: { Text("Confirm the attack and all reactions have resolved at the table.") }
        .sheet(item: $editingGig) { gig in
            MatchValueEditor(gig: gig) { value in try session.apply(.setValue, gigID: gig.id, value: value) }
        }
        .alert("Action could not be completed", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK") { failure = nil }
        } message: { Text(failure ?? "") }
    }
    private func attempt(_ action: () throws -> Void) { do { try action() } catch { failure = error.localizedDescription } }
}

private struct MatchValueEditor: View {
    let gig: MatchSnapshot.Gig
    let save: (Int) throws -> Void
    @State private var value: Int
    @State private var failure: String?
    @Environment(\.dismiss) private var dismiss
    init(gig: MatchSnapshot.Gig, save: @escaping (Int) throws -> Void) {
        self.gig = gig
        self.save = save
        _value = State(initialValue: gig.value)
    }
    var body: some View {
        NavigationStack {
            Form {
                Stepper("Value: \(value)", value: $value, in: 1...gig.maximum)
                if let failure { Text(failure).foregroundStyle(.red) }
            }
            .navigationTitle("Change \(gig.dieType) value")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { do { try save(value); dismiss() } catch { failure = error.localizedDescription } }
                }
            }
        }
    }
}
