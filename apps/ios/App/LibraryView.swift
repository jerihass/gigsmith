import SwiftUI
import UniformTypeIdentifiers
import GigsmithKit

struct DeckFile: FileDocument {
    static var readableContentTypes: [UTType] { [.json, .plainText] }
    var text: String
    init(text: String) { self.text = text }
    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents, let value = String(data: data, encoding: .utf8) else {
            throw GigsmithError("Select a UTF-8 deck file.")
        }
        text = value
    }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: Data(text.utf8)) }
}

struct LibraryView: View {
    @Bindable var library: DeckLibrary
    let database: CardDatabaseSync
    @State private var newDeck = false
    @State private var name = ""
    @State private var importSheet = false
    @State private var failure: String?

    var body: some View {
        TabView {
            Tab("Decks", systemImage: "rectangle.stack") {
                NavigationStack {
                    List {
                        Section {
                            VStack(alignment: .leading, spacing: 8) {
                                Label("BUILD YOUR NEXT RUN", systemImage: "bolt.fill").font(.system(.caption, design: .monospaced, weight: .bold)).foregroundStyle(GigsmithTheme.accent)
                                Text("Your decks. Offline.").font(.title2.bold())
                                Text("Build, check RAM, and test an opening hand.").foregroundStyle(.secondary)
                            }.padding(.vertical, 8)
                        }
                        if library.decks.isEmpty {
                            ContentUnavailableView("No decks yet", systemImage: "rectangle.stack.badge.plus", description: Text("Create a deck or import a Gigsmith JSON file."))
                        }
                        Section("Library · \(library.decks.count)") {
                            ForEach(library.decks) { deck in
                                NavigationLink {
                                    DeckEditor(library: library, deckID: deck.id)
                                } label: {
                                    VStack(alignment: .leading, spacing: 5) {
                                        Text(deck.name).font(.headline)
                                        Text("\(deck.legends.reduce(0) { $0 + $1.count }) Legends · \(deck.mainCount) main cards")
                                            .font(.subheadline).foregroundStyle(.secondary)
                                    }.padding(.vertical, 5)
                                }
                                .swipeActions {
                                    Button("Delete", role: .destructive) { attempt { try library.delete(id: deck.id) } }
                                    Button("Duplicate") { attempt { try library.duplicate(deck) } }.tint(.blue)
                                }
                            }
                        }
                        Section { Text("Unofficial Cyberpunk TCG companion. Not affiliated with or endorsed by the game's owners.").font(.footnote).foregroundStyle(.secondary) }
                    }
                    .gigsmithSurface().navigationTitle("Gigsmith")
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Import", systemImage: "square.and.arrow.down") { importSheet = true }
                        }
                        ToolbarItemGroup(placement: .topBarTrailing) {
                            Button("Undo", systemImage: "arrow.uturn.backward") { attempt { try library.undo() } }.disabled(!library.canUndo)
                            Button("New deck", systemImage: "plus") { name = ""; newDeck = true }.accessibilityIdentifier("newDeck")
                        }
                    }
                }
            }
            Tab("Settings", systemImage: "slider.horizontal.3") { AppearanceSettings(database: database) }
            Tab("Match", systemImage: "dice") { MatchWorkspace(engine: library.engine) }
            Tab("Cards", systemImage: "rectangle.on.rectangle") {
                NavigationStack { CardBrowser(engine: library.engine, database: database) }
            }
        }
        .alert("New deck", isPresented: $newDeck) {
            TextField("Deck name", text: $name)
            Button("Create") { attempt { try library.create(name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Untitled deck" : name) } }
            Button("Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $importSheet) { ImportView(library: library) }
        .alert("Could not save", isPresented: errorPresented) { Button("OK") { failure = nil } } message: { Text(failure ?? "") }
    }
    private var errorPresented: Binding<Bool> { Binding(get: { failure != nil }, set: { if !$0 { failure = nil } }) }
    private func attempt(_ action: () throws -> Void) { do { try action() } catch { failure = error.localizedDescription } }
}

struct ImportView: View {
    let library: DeckLibrary
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var plainText = false
    @State private var filePicker = false
    @State private var failure: String?
    var body: some View {
        NavigationStack {
            Form {
                Section("Format") { Toggle("Plain-text decklist", isOn: $plainText) }
                Section("Paste a deck") {
                    TextEditor(text: $text).frame(minHeight: 220).font(.body.monospaced()).autocorrectionDisabled()
                        .accessibilityLabel("Deck contents")
                    Button("Choose file…", systemImage: "folder") { filePicker = true }
                }
                if let failure { Section("Import failed") { Text(failure).foregroundStyle(.red).textSelection(.enabled) } }
                Section { Text("JSON preserves notes and deck version history. Import creates a new deck; your existing decks remain available.").font(.footnote) }
            }
            .gigsmithSurface().navigationTitle("Import deck")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Import") {
                        do { try library.importDeck(text, plainText: plainText); dismiss() }
                        catch { failure = error.localizedDescription }
                    }.disabled(text.isEmpty)
                }
            }
            .fileImporter(isPresented: $filePicker, allowedContentTypes: [.json, .plainText]) { result in
                do {
                    let url = try result.get()
                    let granted = url.startAccessingSecurityScopedResource()
                    defer { if granted { url.stopAccessingSecurityScopedResource() } }
                    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    guard size <= 1_000_000 else { throw GigsmithError("Deck files must be smaller than 1 MB.") }
                    text = try String(contentsOf: url, encoding: .utf8)
                    plainText = url.pathExtension.lowercased() != "json"
                } catch { failure = error.localizedDescription }
            }
        }
    }
}
