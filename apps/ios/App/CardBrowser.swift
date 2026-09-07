import SwiftUI
import GigsmithKit

struct CardBrowser: View {
    let engine: RulesEngine
    var deck: Deck?
    var onChange: ((Card, Int) -> Void)?
    @State private var query = ""
    @State private var type = "All"
    @State private var color = "All"

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
                        NavigationLink { CardDetail(card: card) } label: { CardSummary(card: card) }
                        if let deck, let onChange {
                            let count = (card.card_type == "Legend" ? deck.legends : deck.main).filter { $0.cardId == card.id }.reduce(0) { $0 + $1.count }
                            Stepper("Copies: \(count)", value: Binding(get: { count }, set: { onChange(card, $0) }), in: 0...500)
                                .accessibilityLabel("Copies of \(card.display_name)")
                        }
                    }.padding(.vertical, 4)
                }
            }
        }
        .navigationTitle(deck == nil ? "Card database" : "Add cards")
        .searchable(text: $query, prompt: "Name, rules, classification")
        .overlay { if filtered.isEmpty { ContentUnavailableView.search(text: query) } }
    }
}

struct CardSummary: View {
    let card: Card
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(card.display_name).font(.headline)
            Text("\(card.color) · \(card.card_type) · RAM \(card.ram.map(String.init) ?? "?")")
                .font(.subheadline).foregroundStyle(.secondary)
        }.accessibilityElement(children: .combine)
    }
}
struct CardDetail: View {
    let card: Card
    var body: some View {
        List {
            Section { CardSummary(card: card).padding(.vertical, 12) }
            Section("Printed stats") {
                LabeledContent("Cost", value: card.cost.map(String.init) ?? "Unknown")
                LabeledContent("Power", value: card.power.map(String.init) ?? "Unknown")
                LabeledContent("RAM", value: card.ram.map(String.init) ?? "Unknown")
            }
            Section("Rules text") { Text(card.rules_text ?? "No rules text.").textSelection(.enabled) }
            Section("Classifications") { Text(card.classifications.joined(separator: ", ")) }
            if !card.keywords.isEmpty { Section("Keywords") { Text(card.keywords.joined(separator: ", ")) } }
        }
        .navigationTitle(card.display_name).navigationBarTitleDisplayMode(.inline)
    }
}
