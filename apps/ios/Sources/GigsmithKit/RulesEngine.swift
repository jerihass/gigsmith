import Foundation
import JavaScriptCore

public struct GigsmithError: LocalizedError {
    public let message: String
    public var errorDescription: String? { message }
    public init(_ message: String) { self.message = message }
}

/// JSContext never crosses actor boundaries. User content is passed as arguments, never source.
@MainActor public final class RulesEngine {
    private let context: JSContext
    private let function: JSValue
    public private(set) var cards: [Card] = []
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
        struct Catalog: Decodable { let cards: [Card] }
        let catalog: Catalog = try call("catalog")
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
    public func newDeck(name: String) throws -> Deck { try call("newDeck", extra: ["id": UUID().uuidString, "name": name]) }
    public func validate(_ deck: Deck) throws -> ValidationReport { try call("validate", deck: deck) }
    public func exportDeck(_ deck: Deck) throws -> String { try call("export", deck: deck) }
    public func importDeck(_ text: String, plainText: Bool = false) throws -> Deck {
        try call(plainText ? "importText" : "import", extra: ["text": text, "id": UUID().uuidString])
    }
    public func sampleHand(_ deck: Deck, seed: String) throws -> SampleHand { try call("hand", deck: deck, extra: ["seed": seed]) }
    public func analysis(_ deck: Deck, seed: String) throws -> [AnalysisSection] { try call("analysis", deck: deck, extra: ["seed": seed]) }
    public func ram(_ deck: Deck) throws -> RamReport { try call("ram", deck: deck) }
}
