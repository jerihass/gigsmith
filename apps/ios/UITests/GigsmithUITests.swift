import XCTest

final class GigsmithUITests: XCTestCase {
    @MainActor func testLiveDatabaseSyncAndRelaunch() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["GIGSMITH_DATABASE_REVIEW"] == "1", "Live database review is opt-in.")
        let app = XCUIApplication()
        app.launch()
        app.tabBars.buttons["Cards"].tap()
        app.buttons["Sync database"].tap()
        XCTAssertTrue(app.buttons["syncDatabase"].waitForExistence(timeout: 5))
        app.buttons["syncDatabase"].tap()
        let status = app.staticTexts["databaseSyncStatus"]
        let synced = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "Synced", "up to date"), object: status)
        XCTAssertEqual(XCTWaiter.wait(for: [synced], timeout: 45), .completed)
        let version = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "netdeck-cyberpunk-")).firstMatch.label
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
        app.terminate()
        app.launch()
        app.tabBars.buttons["Cards"].tap()
        app.buttons["Sync database"].tap()
        XCTAssertTrue(app.staticTexts[version].waitForExistence(timeout: 5))
    }

    @MainActor func testLiveArtworkRendering() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["GIGSMITH_ART_REVIEW"] == "1", "Live artwork review is opt-in.")
        let app = XCUIApplication()
        app.launch()
        app.tabBars.buttons["Settings"].tap()
        let toggle = app.switches["externalArtwork"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        if toggle.value as? String == "0" { toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap() }
        XCTAssertEqual(toggle.value as? String, "1")
        app.tabBars.buttons["Cards"].tap()
        let card = app.buttons.containing(.staticText, identifier: "6th Street Recruits").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        card.tap()
        let artwork = app.descendants(matching: .any).matching(identifier: "cardArtwork").firstMatch
        let loaded = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "Loaded"), object: artwork)
        XCTAssertEqual(XCTWaiter.wait(for: [loaded], timeout: 30), .completed)
        let loadingAgain = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "Loading"), object: artwork)
        loadingAgain.isInverted = true
        XCTAssertEqual(XCTWaiter.wait(for: [loadingAgain], timeout: 3), .completed, "Loaded artwork must not cycle back to its placeholder")
        app.tabBars.buttons["Settings"].tap()
        app.tabBars.buttons["Cards"].tap()
        XCTAssertEqual(artwork.value as? String, "Loaded", "Returning to a card must retain its artwork")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
        app.tabBars.buttons["Settings"].tap()
        if toggle.value as? String == "1" { toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap() }
    }

    @MainActor func testAppearanceAndCacheControls() throws {
        let app = XCUIApplication()
        app.launch()
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(app.buttons["Clear cached artwork"].waitForExistence(timeout: 5))
        app.buttons["Clear cached artwork"].tap()
        XCTAssertEqual(app.switches["externalArtwork"].value as? String, "0")
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Theme")).firstMatch.tap()
        app.buttons["Dark"].tap()
        app.tabBars.buttons["Cards"].tap()
        XCTAssertTrue(app.navigationBars["Card database"].waitForExistence(timeout: 5))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
        app.tabBars.buttons["Settings"].tap()
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Theme")).firstMatch.tap()
        app.buttons["System"].tap()
    }

    @MainActor func testMatchGainUndoTurnAndRelaunch() throws {
        let app = XCUIApplication()
        app.launch()
        app.tabBars.buttons["Match"].tap()
        XCTAssertTrue(app.buttons["New match"].waitForExistence(timeout: 10))
        app.buttons["New match"].tap()
        app.buttons["You go first"].tap()
        let roll = app.steppers["rolledValue"]
        XCTAssertTrue(roll.waitForExistence(timeout: 5))
        roll.buttons["rolledValue-Increment"].tap()
        app.buttons["Gain Gig"].tap()
        let score = app.descendants(matching: .any).matching(identifier: "score-player").firstMatch
        XCTAssertEqual(score.value as? String, "2 Street Cred; 1 Gigs")
        app.buttons["Undo match action"].tap()
        XCTAssertEqual(score.value as? String, "0 Street Cred; 0 Gigs")
        app.buttons["Gain Gig"].tap()
        app.buttons["End turn"].tap()
        XCTAssertTrue(app.staticTexts["Rival · turn 1"].waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        app.tabBars.buttons["Match"].tap()
        XCTAssertTrue(app.staticTexts["Rival · turn 1"].waitForExistence(timeout: 5))
        XCTAssertEqual(score.value as? String, "1 Street Cred; 1 Gigs")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

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
