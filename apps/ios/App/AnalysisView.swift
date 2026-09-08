import SwiftUI
import GigsmithKit

struct AnalysisView: View {
    let engine: RulesEngine
    let deck: Deck
    @State private var seed = "gigsmith"
    @State private var hand: SampleHand?
    @State private var sections: [AnalysisSection] = []
    @State private var failure: String?
    var body: some View {
        List {
            Section("Repeatable sample") {
                TextField("Seed", text: $seed).autocorrectionDisabled().textInputAutocapitalization(.never)
                Button("Draw and analyze", systemImage: "hand.draw") { analyze() }
                Text("The same deck and seed produce the same hand. Change the seed for a different sample.").font(.footnote).foregroundStyle(.secondary)
            }
            if let failure { Section("Analysis unavailable") { Text(failure) } }
            if let hand {
                Section("Opening hand · \(hand.sellableCount) sellable") {
                    ForEach(Array(hand.cards.enumerated()), id: \.offset) { _, copy in
                        Text(copy.displayName ?? copy.cardId)
                    }
                    ForEach(Array(hand.issues.enumerated()), id: \.offset) { _, issue in Text(issue.message).foregroundStyle(.orange) }
                    ForEach(hand.assumptions, id: \.self) { Text($0).font(.footnote).foregroundStyle(.secondary) }
                }
            }
            ForEach(sections) { section in
                if !section.rows.isEmpty {
                    Section(section.title) { ForEach(Array(section.rows.enumerated()), id: \.offset) { _, row in Text(row) } }
                }
            }
        }
        .gigsmithSurface().navigationTitle("Hand and analysis")
        .task { analyze() }
        .onChange(of: engine.revision) { _, _ in analyze() }
    }
    private func analyze() {
        do {
            hand = try engine.sampleHand(deck, seed: seed)
            sections = try engine.analysis(deck, seed: seed)
            failure = nil
        } catch { failure = error.localizedDescription }
    }
}
