import Foundation
import JavaScriptCore
import Observation

public struct GigsmithError: LocalizedError {
    public let message: String
    public var errorDescription: String? { message }
    public init(_ message: String) { self.message = message }
}

/// JSContext never crosses actor boundaries. User content is passed as arguments, never source.
@MainActor @Observable public final class RulesEngine {
    private let context: JSContext
    private let function: JSValue
    public private(set) var cards: [Card] = []
    public private(set) var metadata = CatalogMetadata.empty
    public private(set) var revision = 0
    public init() throws {
        guard let context = JSContext(),
              let url = Bundle.module.url(forResource: "engine", withExtension: "js") else {
            throw GigsmithError("The bundled offline rules engine is unavailable.")
        }
        self.context = context
        context.evaluateScript(try String(contentsOf: url, encoding: .utf8))
        if let error = context.exception { throw GigsmithError(error.toString()) }
        guard let function = context.objectForKeyedSubscript("GigsmithBridge")?.objectForKeyedSubscript("invoke"), !function.isUndefined else {
            throw GigsmithError("The bundled rules engine could not start.")
        }
        self.function = function
        let catalog: NativeCatalog = try call("catalog")
        metadata = catalog.metadata
        cards = catalog.cards.sorted { $0.display_name.localizedStandardCompare($1.display_name) == .orderedAscending }
    }
    public func call<T: Decodable>(_ operation: String, deck: Deck? = nil, extra: [String: String] = [:]) throws -> T {
        var arguments: [String: Any] = extra
        if let deck { arguments["deck"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(deck)) }
        let input = String(decoding: try JSONSerialization.data(withJSONObject: arguments), as: UTF8.self)
        context.exception = nil
        let result = function.call(withArguments: [operation, input])
        if let error = context.exception { throw GigsmithError(error.toString()) }
        guard let json = result?.toString(), let data = json.data(using: .utf8) else { throw GigsmithError("The rules engine returned no report.") }
        return try JSONDecoder().decode(T.self, from: data)
    }
    struct PreparedCatalog {
        let json: String
        let catalog: NativeCatalog
    }
    func prepareDatabase(_ text: String) throws -> PreparedCatalog {
        let json: String = try call("prepareCatalog", extra: ["text": text])
        return PreparedCatalog(json: json, catalog: try JSONDecoder().decode(NativeCatalog.self, from: Data(json.utf8)))
    }
    func installDatabase(_ prepared: PreparedCatalog) throws {
        let _: Bool = try call("installCatalog", extra: ["text": prepared.json])
        cards = prepared.catalog.cards.sorted { $0.display_name.localizedStandardCompare($1.display_name) == .orderedAscending }
        metadata = prepared.catalog.metadata
        revision += 1
    }
    public func newDeck(name: String) throws -> Deck {
        let deck: Deck = try call("newDeck", extra: ["id": UUID().uuidString, "name": name])
        try checkPortable(deck)
        return deck
    }
    public func checkPortable(_ deck: Deck) throws {
        _ = try importDeck(exportDeck(deck))
    }
    public func validate(_ deck: Deck) throws -> ValidationReport { try call("validate", deck: deck) }
    public func exportDeck(_ deck: Deck) throws -> String { try call("export", deck: deck) }
    public func importDeck(_ text: String, plainText: Bool = false) throws -> Deck {
        try call(plainText ? "importText" : "import", extra: ["text": text, "id": UUID().uuidString])
    }
    public func sampleHand(_ deck: Deck, seed: String) throws -> SampleHand { try call("hand", deck: deck, extra: ["seed": seed]) }
    public func analysis(_ deck: Deck, seed: String) throws -> [AnalysisSection] { try call("analysis", deck: deck, extra: ["seed": seed]) }
    public func ram(_ deck: Deck) throws -> RamReport { try call("ram", deck: deck) }
}
