import XCTest

final class GigsmithUITests: XCTestCase {
    @MainActor func testDeckCreationEditingAndOfflineRelaunch() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.buttons["newDeck"].waitForExistence(timeout: 15))
        app.buttons["newDeck"].tap()
        let name = "Native smoke \(UUID().uuidString.prefix(6))"
        app.alerts.textFields.firstMatch.tap()
        app.alerts.textFields.firstMatch.typeText(name)
        app.alerts.buttons["Create"].tap()
        let deck = app.staticTexts[name]
        XCTAssertTrue(deck.waitForExistence(timeout: 5))
        deck.tap()
        XCTAssertTrue(app.staticTexts["Main deck, 0 cards"].waitForExistence(timeout: 5))
        app.buttons["Add cards"].tap()
        let stepper = app.steppers.firstMatch
        XCTAssertTrue(stepper.waitForExistence(timeout: 5))
        stepper.buttons["Increment"].tap()
        XCTAssertTrue(app.staticTexts["Copies: 1"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["liveValidation"].exists)
        app.buttons["liveValidation"].tap()
        XCTAssertTrue(app.navigationBars["Deck validation"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        app.navigationBars.buttons.element(boundBy: 0).tap()
        XCTAssertTrue(app.staticTexts["Main deck, 1 card"].waitForExistence(timeout: 5))
        app.buttons["Validation and RAM"].tap()
        XCTAssertTrue(app.navigationBars["Deck validation"].waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 10))
        app.staticTexts[name].tap()
        XCTAssertTrue(app.staticTexts["Main deck, 1 card"].waitForExistence(timeout: 5))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
