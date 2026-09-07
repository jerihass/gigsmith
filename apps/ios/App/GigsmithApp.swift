import SwiftUI
import GigsmithKit

@main struct GigsmithApp: App {
    @AppStorage("gigsmith.appearance") private var appearance = "system"
    @AppStorage("gigsmith.art.enabled") private var artwork = false
    @State private var library: DeckLibrary?
    @State private var failure: String?
    @State private var recoveryURL: URL?

    var body: some Scene {
        WindowGroup {
            Group {
                if let library { LibraryView(library: library) }
                else if let failure {
                    ContentUnavailableView {
                        Label("Library could not open", systemImage: "externaldrive.badge.exclamationmark")
                    } description: {
                        Text(failure + "\nYour saved file has not been replaced.")
                    } actions: {
                        Button("Retry", action: load)
                        if let recoveryURL { ShareLink("Export saved file", item: recoveryURL) }
                    }
                } else { ProgressView("Opening offline library…") }
            }
            .tint(GigsmithTheme.accent)
            .preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil)
            .onChange(of: artwork) { _, enabled in
                if !enabled { Task { await CardArtCache.shared.cancelRequests() } }
            }
            .task { if library == nil && failure == nil { load() } }
        }
    }
    private func load() {
        do {
            let storage = try DeckStorage.applicationStorage()
            recoveryURL = FileManager.default.fileExists(atPath: storage.url.path) ? storage.url : nil
            library = try DeckLibrary(engine: RulesEngine(), storage: storage)
            failure = nil
        } catch { failure = error.localizedDescription }
    }
}
