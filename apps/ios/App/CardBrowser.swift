import SwiftUI
import GigsmithKit

struct CardBrowser: View {
    let engine: RulesEngine
    var database: CardDatabaseSync?
    var deck: Deck?
    var onChange: ((Card, Int) -> Void)?
    @State private var query = ""
    @State private var type = "All"
    @State private var color = "All"
    @State private var report: ValidationReport?
    @State private var reportFailure: String?
    @State private var showReport = false

    private var filtered: [Card] {
        engine.cards.filter { card in
            (type == "All" || card.card_type == type) && (color == "All" || card.color == color) &&
            (query.isEmpty || "\(card.display_name) \(card.rules_text ?? "") \(card.classifications.joined(separator: " "))".localizedStandardContains(query))
        }
    }
    var body: some View {
        List {
            Section {
                Picker("Card type", selection: $type) { ForEach(["All", "Legend", "Unit", "Program", "Gear"], id: \.self) { Text($0) } }
                Picker("Color", selection: $color) { ForEach(["All", "Red", "Yellow", "Green", "Blue", "Colorless"], id: \.self) { Text($0) } }
            }
            Section("\(filtered.count) cards") {
                ForEach(filtered) { card in
                    VStack(alignment: .leading, spacing: 8) {
                        NavigationLink { CardDetail(card: card, engine: engine) } label: { CardSummary(card: card) }
                        if let deck, let onChange {
                            let count = (card.card_type == "Legend" ? deck.legends : deck.main).filter { $0.cardId == card.id }.reduce(0) { $0 + $1.count }
                            Stepper("Copies: \(count)", value: Binding(get: { count }, set: { onChange(card, $0) }), in: 0...100)
                                .accessibilityLabel("Copies of \(card.display_name)")
                        }
                    }.padding(.vertical, 4)
                }
            }
        }
        .gigsmithSurface().navigationTitle(deck == nil ? "Card database" : "Add cards")
        .toolbar {
            if let database {
                NavigationLink { DatabaseSettings(database: database) } label: { Label("Sync database", systemImage: "arrow.triangle.2.circlepath") }
            }
        }
        .onChange(of: engine.revision) { _, _ in
            guard let deck else { return }
            do { report = try engine.validate(deck); reportFailure = nil }
            catch { report = nil; reportFailure = error.localizedDescription }
        }
        .searchable(text: $query, prompt: "Name, rules, classification")
        .overlay { if filtered.isEmpty { ContentUnavailableView.search(text: query) } }
        .onChange(of: deck, initial: true) { _, value in
            guard let value else { return }
            do { report = try engine.validate(value); reportFailure = nil }
            catch { report = nil; reportFailure = error.localizedDescription }
        }
        .safeAreaInset(edge: .bottom) {
            if deck != nil {
                Button {
                    showReport = true
                } label: {
                    Label(report.map { $0.legal ? "Deck is legal" : "\($0.errors.count) deck issues · View details" } ?? "Validation unavailable",
                          systemImage: report?.legal == true ? "checkmark.seal" : "exclamationmark.triangle")
                        .frame(maxWidth: .infinity).padding()
                }.buttonStyle(.plain).background(.regularMaterial).accessibilityIdentifier("liveValidation")
            }
        }
        .sheet(isPresented: $showReport) {
            NavigationStack {
                List {
                    if let reportFailure { Text(reportFailure) }
                    if let report {
                        ForEach(Array((report.errors + report.warnings).enumerated()), id: \.offset) { _, issue in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(issue.message)
                                ForEach(issue.suggestedFixes ?? [], id: \.self) { Text($0).font(.footnote).foregroundStyle(.secondary) }
                            }
                        }
                        if report.legal { Text("Your deck meets the bundled ruleset's requirements.") }
                    }
                }
                .gigsmithSurface().navigationTitle("Deck validation")
                .toolbar { Button("Done") { showReport = false } }
            }
        }
    }
}

struct CardSummary: View {
    let card: Card
    @AppStorage("gigsmith.art.enabled") private var artwork = false
    var body: some View {
        HStack(spacing: 12) {
            if artwork { CardArtwork(card: card) }
            RoundedRectangle(cornerRadius: 2).fill(GigsmithTheme.cardColor(card.color)).frame(width: 4, height: 36)
            VStack(alignment: .leading, spacing: 5) {
                Text(card.display_name).font(.headline)
                Text("\(card.color) · \(card.card_type) · RAM \(card.ram.map(String.init) ?? "?")")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }.accessibilityElement(children: .combine)
    }
}
struct CardDetail: View {
    let selectedCard: Card
    let engine: RulesEngine
    private var card: Card { engine.cards.first { $0.id == selectedCard.id } ?? selectedCard }
    init(card: Card, engine: RulesEngine) { selectedCard = card; self.engine = engine }
    @AppStorage("gigsmith.art.enabled") private var artwork = false
    var body: some View {
        List {
            if !engine.cards.contains(where: { $0.id == selectedCard.id }) {
                Section { Text("This card is absent from the current database. Showing its previously loaded details.").foregroundStyle(.orange) }
            }
            if artwork { Section { CardArtwork(card: card, large: true) } }
            if !artwork { Section { CardSummary(card: card).padding(.vertical, 12) } }
            Section(artwork ? "\(card.color) · \(card.card_type)" : "Printed stats") {
                LabeledContent("Cost", value: card.cost.map(String.init) ?? "Unknown")
                LabeledContent("Power", value: card.power.map(String.init) ?? "Unknown")
                LabeledContent("RAM", value: card.ram.map(String.init) ?? "Unknown")
            }
            Section("Rules text") { Text(card.rules_text ?? "No rules text.").textSelection(.enabled) }
            Section("Classifications") { Text(card.classifications.joined(separator: ", ")) }
            if !card.keywords.isEmpty { Section("Keywords") { Text(card.keywords.joined(separator: ", ")) } }
        }
        .gigsmithSurface().navigationTitle(card.display_name).navigationBarTitleDisplayMode(.inline)
    }
}
