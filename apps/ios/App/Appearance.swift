import SwiftUI
import GigsmithKit
import ImageIO

/// High-contrast accents adapt to the system appearance; card colors also retain text labels.
enum GigsmithTheme {
    static let accent = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(red: 0.25, green: 0.88, blue: 0.94, alpha: 1) : UIColor(red: 0, green: 0.38, blue: 0.46, alpha: 1)
    })
    static let background = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(red: 0.035, green: 0.055, blue: 0.085, alpha: 1) : UIColor(red: 0.94, green: 0.96, blue: 0.97, alpha: 1)
    })
    static func cardColor(_ name: String) -> Color {
        switch name { case "Red": .red; case "Yellow": .yellow; case "Green": .green; case "Blue": .blue; default: .gray }
    }
}
extension View {
    func gigsmithSurface() -> some View {
        scrollContentBackground(.hidden)
            .background(Rectangle().fill(GigsmithTheme.background.gradient).ignoresSafeArea())
    }
}

struct CardArtwork: View {
    let card: Card
    var large = false
    @AppStorage("gigsmith.art.enabled") private var enabled = false
    @State private var image: UIImage?
    @State private var unavailable = false
    var body: some View {
        Group {
            if let image { Image(uiImage: image).resizable().scaledToFit() }
            else {
                RoundedRectangle(cornerRadius: 8).fill(GigsmithTheme.accent.opacity(0.08))
                    .overlay {
                        VStack(spacing: 8) {
                            if unavailable { Image(systemName: "photo") }
                            else { ProgressView() }
                            if large { Text(unavailable ? "Artwork unavailable offline or from the source" : "Loading artwork…").font(.caption).multilineTextAlignment(.center) }
                        }.padding(large ? 20 : 4).foregroundStyle(.secondary)
                    }
            }
        }
        .frame(width: large ? nil : 52, height: large ? 330 : 74)
        .frame(maxWidth: large ? .infinity : nil)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Card artwork for \(card.display_name)")
        .accessibilityValue(image != nil ? "Loaded" : unavailable ? "Unavailable" : "Loading")
        .accessibilityIdentifier("cardArtwork")
        .accessibilityHidden(!large)
        .task(id: "\(card.printing_id):\(enabled)") {
            image = nil; unavailable = false
            guard enabled else { return }
            do {
                guard let data = try await CardArtCache.shared.image(printingID: card.printing_id, setCode: card.set.code, enabled: enabled) else { return }
                try Task.checkCancellation()
                guard enabled else { return }
                let source = CGImageSourceCreateWithData(data as CFData, nil)
                let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: large ? 1000 : 180, kCGImageSourceCreateThumbnailWithTransform: true]
                if let source, let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) { image = UIImage(cgImage: thumbnail) }
                else { unavailable = true }
            } catch is CancellationError { }
            catch { unavailable = true }
        }
    }
}

struct AppearanceSettings: View {
    let database: CardDatabaseSync
    @AppStorage("gigsmith.appearance") private var appearance = "system"
    @AppStorage("gigsmith.art.enabled") private var artwork = false
    @State private var bytes = 0
    @State private var failure: String?
    @State private var clearing = false
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    NavigationLink { DatabaseSettings(database: database) } label: {
                        Label("Card database · \(database.engine.cards.count) cards", systemImage: "arrow.triangle.2.circlepath")
                    }
                }
                Section("Appearance") {
                    Picker("Theme", selection: $appearance) {
                        Text("System").tag("system")
                        Text("Dark").tag("dark")
                        Text("Light").tag("light")
                    }
                    Text("Cyan accents and card-color markers keep the interface readable at the table.").font(.footnote).foregroundStyle(.secondary)
                }
                Section("Card artwork") {
                    Toggle("External artwork", isOn: $artwork).accessibilityIdentifier("externalArtwork")
                    Text("Off by default. Enabling artwork contacts Netdeck and its artwork CDN. Downloaded images are stored on this device for offline use. Card text and controls always remain available.").font(.footnote).foregroundStyle(.secondary)
                    LabeledContent("Cached images", value: ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file))
                    Button("Refresh cache size") { Task { bytes = await CardArtCache.shared.cachedBytes() } }
                    Button("Clear cached artwork", role: .destructive) {
                        artwork = false
                        clearing = true
                        Task {
                            do { try await CardArtCache.shared.clear(); bytes = 0 }
                            catch { failure = error.localizedDescription }
                            clearing = false
                        }
                    }.disabled(clearing)
                    Text("Cache limit: 100 MB. Least recently used images are removed first. Clearing the cache also turns artwork off to prevent immediate downloads.").font(.footnote).foregroundStyle(.secondary)
                }
                if let failure { Section("Cache error") { Text(failure).foregroundStyle(.red) } }
            }
            .gigsmithSurface()
            .navigationTitle("Settings")
            .task { bytes = await CardArtCache.shared.cachedBytes() }
        }
    }
}


struct DatabaseSettings: View {
    @Bindable var database: CardDatabaseSync
    @State private var reset = false
    @State private var failure: String?
    var body: some View {
        Form {
            Section("Current database") {
                LabeledContent("Source", value: database.engine.metadata.sourceName)
                LabeledContent("Cards", value: "\(database.engine.cards.count)")
                LabeledContent("Stored locally", value: database.usingSavedSnapshot ? "Yes" : "Bundled snapshot")
                Text(database.engine.metadata.cardDataVersion).font(.caption).textSelection(.enabled)
                Text("Retrieved: \(database.engine.metadata.sourceRetrievedAt)").font(.caption).foregroundStyle(.secondary)
            }
            Section {
                Button {
                    Task { do { try await database.refresh() } catch { /* Status is retained by the sync service. */ } }
                } label: { Label("Sync from Netdeck", systemImage: "arrow.clockwise") }
                    .disabled(database.isSyncing).accessibilityIdentifier("syncDatabase")
                if database.isSyncing { ProgressView(database.progress) }
                if let message = database.message { Text(message).accessibilityIdentifier("databaseSyncStatus") }
                if let warning = database.loadWarning { Text(warning).foregroundStyle(.orange) }
                Text("Downloads the current text database from Netdeck and saves it for offline use. This does not enable artwork, upload decks, or change the bundled game rules.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Button("Use bundled database", role: .destructive) { reset = true }.disabled(database.isSyncing)
                Text("Existing decks retain their card IDs and original data version. Validation will flag missing cards or version differences.").font(.footnote).foregroundStyle(.secondary)
            }
            if let failure { Text(failure).foregroundStyle(.red) }
        }
        .gigsmithSurface().navigationTitle("Card database sync")
        .confirmationDialog("Use the bundled database?", isPresented: $reset, titleVisibility: .visible) {
            Button("Use bundled database", role: .destructive) {
                do { try database.useBundledSnapshot() } catch { failure = error.localizedDescription }
            }
        } message: { Text("This replaces your downloaded snapshot. Your decks stay saved, but cards added by the source may become unavailable until you sync again.") }
    }
}
