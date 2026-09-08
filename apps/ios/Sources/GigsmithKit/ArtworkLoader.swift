import Foundation
import Observation

/// Keeps a view's successful artwork across appearances; a new printing or opt-out clears it.
@MainActor @Observable public final class ArtworkLoader {
    public private(set) var data: Data?
    public private(set) var unavailable = false
    private var key: String?
    private var generation = 0

    public init() {}

    public func load(key: String, enabled: Bool, fetch: () async throws -> Data?) async {
        generation += 1
        let request = generation
        guard enabled else {
            self.key = nil; data = nil; unavailable = false
            return
        }
        if self.key == key, data != nil { return }
        self.key = key; data = nil; unavailable = false
        do {
            let result = try await fetch()
            try Task.checkCancellation()
            guard request == generation else { return }
            data = result
            unavailable = result == nil
        } catch {
            guard request == generation, !Task.isCancelled else { return }
            unavailable = !(error is CancellationError)
        }
    }
}
