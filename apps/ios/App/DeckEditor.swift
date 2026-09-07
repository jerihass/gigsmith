import SwiftUI
import GigsmithKit

struct DeckEditor: View {
    @Bindable var library: DeckLibrary
    let deckID: String
    @State private var failure: String?
    @State private var report: ValidationReport?
    @State private var ram: RamReport?
    @State private var rename = false
    @State private var name = ""
    @State private var exportFile: DeckFile?
    @State private var exporting = false
    private var deck: Deck? { library.decks.first { $0.id == deckID } }

    var body: some View {
        Group {
            if let deck {
                List {
                    Section {
                        LabeledContent("Main deck", value: "\(deck.mainCount) \(deck.mainCount == 1 ? "card" : "cards")")
                        if let report {
                            Label(report.legal ? "Deck is legal" : "\(report.errors.count) issues to resolve", systemImage: report.legal ? "checkmark.seal" : "exclamationmark.triangle")
                                .foregroundStyle(report.legal ? .green : .orange)
                        }
                        NavigationLink("Validation and RAM") { validationView }
                        NavigationLink("Opening hand and analysis") { AnalysisView(engine: library.engine, deck: deck) }
                    }
                    Section {
                        NavigationLink {
                            CardBrowser(engine: library.engine, deck: self.deck) { card, count in
                                guard var current = self.deck else { return }
                                current.setCount(for: card, count: count)
                                attempt { try library.update(current) }
                            }
                        } label: { Label("Add cards", systemImage: "plus.rectangle.on.rectangle") }
                    }
                    entries("Legends", entries: deck.legends)
                    entries("Main deck", entries: deck.main)
                    Section("Data versions") {
                        Text(deck.rulesetVersion)
                        Text(deck.cardDataVersion)
                    }.font(.caption).foregroundStyle(.secondary)
                }
                .gigsmithSurface().navigationTitle(deck.name)
                .toolbar {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button("Undo", systemImage: "arrow.uturn.backward") { attempt { try library.undo() } }.disabled(!library.canUndo)
                        Menu {
                            Button("Redo", systemImage: "arrow.uturn.forward") { attempt { try library.redo() } }.disabled(!library.canRedo)
                            Button("Rename", systemImage: "pencil") { name = deck.name; rename = true }
                            Button("Export JSON", systemImage: "square.and.arrow.up") { export(deck, text: false) }
                            Button("Export text", systemImage: "doc.plaintext") { export(deck, text: true) }
                        } label: { Label("Deck actions", systemImage: "ellipsis.circle") }
                    }
                }
                .onChange(of: deck, initial: true) { _, value in
                    do { report = try library.engine.validate(value); ram = try library.engine.ram(value) }
                    catch { report = nil; ram = nil; failure = error.localizedDescription }
                }
            } else { ContentUnavailableView("Deck not found", systemImage: "rectangle.stack", description: Text("Return to your library or undo the last deletion.")) }
        }
        .alert("Rename deck", isPresented: $rename) {
            TextField("Deck name", text: $name)
            Button("Save") { if var deck { deck.name = name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Untitled deck" : name; attempt { try library.update(deck) } } }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Could not complete action", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK") { failure = nil }
        } message: { Text(failure ?? "") }
        .fileExporter(isPresented: $exporting, document: exportFile, contentType: exportType, defaultFilename: "Gigsmith-deck") { result in
            if case .failure(let error) = result { failure = error.localizedDescription }
        }
    }
    @State private var exportType: UTType = .json
    private func export(_ deck: Deck, text: Bool) {
        attempt {
            exportFile = DeckFile(text: text ? try library.engine.call("text", deck: deck) : try library.engine.exportDeck(deck))
            exportType = text ? .plainText : .json
            exporting = true
        }
    }
    private func entries(_ title: String, entries: [DeckEntry]) -> some View {
        Section(title) {
            if entries.isEmpty { Text("No cards selected").foregroundStyle(.secondary) }
            ForEach(Array(entries.enumerated()), id: \.offset) { _, entry in
                if let card = library.engine.cards.first(where: { $0.id == entry.cardId }) {
                    VStack(alignment: .leading) {
                        NavigationLink { CardDetail(card: card) } label: { CardSummary(card: card) }
                        Stepper("Copies: \(entry.count)", value: Binding(get: { entry.count }, set: { count in
                            guard var deck else { return }
                            deck.setCount(for: card, count: count)
                            attempt { try library.update(deck) }
                        }), in: 0...max(100, entry.count)).accessibilityLabel("Copies of \(card.display_name)")
                    }
                } else {
                    VStack(alignment: .leading) {
                        Text("Unknown card: \(entry.cardId)")
                        Button("Remove unknown card", role: .destructive) {
                            guard var deck else { return }
                            deck.legends.removeAll { $0.cardId == entry.cardId }
                            deck.main.removeAll { $0.cardId == entry.cardId }
                            attempt { try library.update(deck) }
                        }
                    }
                }
            }
        }
    }
    private var validationView: some View {
        List {
            if let ram {
                Section("RAM from selected Legends") {
                    if ram.limits.isEmpty { Text("Select Legends to provide RAM.") }
                    ForEach(ram.limits, id: \.color) { limit in LabeledContent(limit.color, value: "\(limit.limit)") }
                }
            }
            if let report {
                Section(report.legal ? "Legal deck" : "Errors") {
                    ForEach(Array(report.errors.enumerated()), id: \.offset) { _, issue in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(issue.message)
                            ForEach(issue.suggestedFixes ?? [], id: \.self) { Text($0).font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                }
                Section("Warnings") { ForEach(Array(report.warnings.enumerated()), id: \.offset) { _, issue in Text(issue.message) } }
            }
        }.gigsmithSurface().navigationTitle("Deck validation")
    }
    private func attempt(_ action: () throws -> Void) { do { try action() } catch { failure = error.localizedDescription } }
}

import UniformTypeIdentifiers
