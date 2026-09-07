// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "GigsmithKit",
    platforms: [.iOS("26.0"), .macOS("14.0")],
    products: [.library(name: "GigsmithKit", targets: ["GigsmithKit"])],
    targets: [
        .target(name: "GigsmithKit", resources: [.process("Resources")]),
        .testTarget(name: "GigsmithKitTests", dependencies: ["GigsmithKit"])
    ],
    swiftLanguageModes: [.v6]
)
