import SwiftUI
import GigsmithKit
import ImageIO

/// Adaptive accents keep the same visual identity in bright and dark environments.
enum GigsmithTheme {
    static let accent = adaptive(dark: (0.18, 0.91, 0.96), light: (0, 0.36, 0.42))
    static let command = adaptive(dark: (0.95, 0.89, 0.15), light: (0.43, 0.36, 0))
    static let background = adaptive(dark: (0.025, 0.04, 0.055), light: (0.93, 0.96, 0.96))
    static let surface = adaptive(dark: (0.055, 0.08, 0.095), light: (0.98, 0.99, 0.99))
    static let border = adaptive(dark: (0.19, 0.29, 0.32), light: (0.62, 0.73, 0.75))

    private static func adaptive(dark: (Double, Double, Double), light: (Double, Double, Double)) -> Color {
        Color(uiColor: UIColor { traits in
            let value = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: value.0, green: value.1, blue: value.2, alpha: 1)
        })
    }

    static func cardColor(_ name: String) -> Color {
        switch name {
        case "Red": adaptive(dark: (1, 0.40, 0.48), light: (0.72, 0.12, 0.23))
        case "Yellow": command
        case "Green": adaptive(dark: (0.29, 0.88, 0.61), light: (0.05, 0.43, 0.25))
        case "Blue": accent
        default: adaptive(dark: (0.75, 0.66, 0.86), light: (0.43, 0.31, 0.55))
        }
    }
}

private struct CircuitBackground: View {
    var body: some View {
        ZStack {
            GigsmithTheme.background
            LinearGradient(colors: [GigsmithTheme.accent.opacity(0.07), .clear], startPoint: .topTrailing, endPoint: .bottomLeading)
            Canvas { context, size in
                var grid = Path()
                for x in stride(from: 0.0, through: size.width, by: 40) {
                    grid.move(to: CGPoint(x: x, y: 0)); grid.addLine(to: CGPoint(x: x, y: size.height))
                }
                for y in stride(from: 0.0, through: size.height, by: 40) {
                    grid.move(to: CGPoint(x: 0, y: y)); grid.addLine(to: CGPoint(x: size.width, y: y))
                }
                context.stroke(grid, with: .color(GigsmithTheme.accent.opacity(0.045)), lineWidth: 0.5)
            }
        }.ignoresSafeArea().allowsHitTesting(false).accessibilityHidden(true)
    }
}

extension View {
    func gigsmithSurface() -> some View {
        scrollContentBackground(.hidden)
            .background(CircuitBackground())
            .toolbarBackground(GigsmithTheme.background, for: .navigationBar)
    }

    func gigsmithPanel() -> some View {
        listRowBackground(GigsmithTheme.surface)
            .listRowSeparatorTint(GigsmithTheme.border)
    }
}

struct WorkbenchBanner: View {
    let title: String
    let subtitle: String
    let symbol: String
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: symbol)
                .font(.system(.caption, design: .monospaced, weight: .bold))
                .foregroundStyle(GigsmithTheme.command)
            Text(subtitle).font(.title2.weight(.heavy)).fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                Rectangle().fill(GigsmithTheme.accent).frame(width: 6, height: 6).accessibilityHidden(true)
                Text("BUILD / ANALYZE / PLAY")
                    .font(.system(.caption2, design: .monospaced, weight: .medium))
                    .tracking(1.5).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 16)
        .overlay(alignment: .top) { Rectangle().fill(GigsmithTheme.command).frame(height: 2).accessibilityHidden(true) }
        .overlay(alignment: .bottomTrailing) {
            HStack(spacing: 3) {
                ForEach(0..<7) { _ in Rectangle().fill(GigsmithTheme.accent).frame(width: 5, height: 3) }
            }.accessibilityHidden(true)
        }
    }
}

struct CardArtwork: View {
    let card: Card
    var large = false
    @AppStorage("gigsmith.art.enabled") private var enabled = false
    @State private var image: UIImage?
    @State private var unavailable = false
    @State private var loader = ArtworkLoader()
    @State private var renderedKey: String?
    var body: some View {
        // Keep the task on one container as its placeholder becomes an image.
        ZStack {
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
            let key = card.printing_id
            if !enabled || renderedKey != key { image = nil; renderedKey = nil; unavailable = false }
            await loader.load(key: key, enabled: enabled) {
                try await CardArtCache.shared.image(printingID: key, setCode: card.set.code, enabled: enabled)
            }
            guard !Task.isCancelled, enabled else { return }
            if let data = loader.data, image == nil {
                let source = CGImageSourceCreateWithData(data as CFData, nil)
                let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: large ? 1000 : 180, kCGImageSourceCreateThumbnailWithTransform: true]
                if let source, let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) {
                    image = UIImage(cgImage: thumbnail); renderedKey = key; unavailable = false
                }
                else { unavailable = true }
            } else if loader.unavailable { unavailable = true }
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
                    Text("Cyan framing, yellow highlights, and card-color markers adapt for a readable cyberpunk workbench.").font(.footnote).foregroundStyle(.secondary)
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
