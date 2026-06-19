import { describe, expect, it } from "vitest";
import type { ValidationResult } from "@gigsmith/data-contracts";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { groupValidationResult } from "./validationGroups";

const knownCard = cyberpunkCardDb.cards[0];

describe("groupValidationResult", () => {
  it("groups issues in a stable order and resolves affected card names", () => {
    const result: ValidationResult = {
      legal: false,
      rulesetVersion: "ruleset.v0-guide",
      errors: [
        {
          code: "ram-limit",
          severity: "error",
          message: "RAM exceeded.",
          affectedCards: [knownCard.id]
        },
        {
          code: "main-deck-size",
          severity: "error",
          message: "Wrong deck size.",
          affectedCards: []
        },
        {
          code: "unknown-card",
          severity: "error",
          message: "Unknown card.",
          affectedCards: ["missing-card"]
        },
        {
          code: "legend-total",
          severity: "error",
          message: "Wrong Legend count.",
          affectedCards: [knownCard.id, knownCard.id]
        }
      ],
      warnings: [
        {
          code: "card-data-version-mismatch",
          severity: "warning",
          message: "Snapshot mismatch.",
          affectedCards: []
        }
      ],
      info: []
    };

    expect(groupValidationResult(result, cyberpunkCardDb.cards)).toMatchInlineSnapshot(`
      [
        {
          "id": "deck-size",
          "issues": [
            {
              "affectedCardLabels": [],
              "affectedCards": [],
              "code": "main-deck-size",
              "message": "Wrong deck size.",
              "severity": "error",
            },
          ],
          "title": "Deck Size",
        },
        {
          "id": "legends",
          "issues": [
            {
              "affectedCardLabels": [
                "V — StreetKid",
              ],
              "affectedCards": [
                "81a8dec7-9541-4020-93e1-7d798a57dcbc",
                "81a8dec7-9541-4020-93e1-7d798a57dcbc",
              ],
              "code": "legend-total",
              "message": "Wrong Legend count.",
              "severity": "error",
            },
          ],
          "title": "Legends",
        },
        {
          "id": "ram",
          "issues": [
            {
              "affectedCardLabels": [
                "V — StreetKid",
              ],
              "affectedCards": [
                "81a8dec7-9541-4020-93e1-7d798a57dcbc",
              ],
              "code": "ram-limit",
              "message": "RAM exceeded.",
              "severity": "error",
            },
          ],
          "title": "RAM",
        },
        {
          "id": "unknown-cards",
          "issues": [
            {
              "affectedCardLabels": [
                "missing-card",
              ],
              "affectedCards": [
                "missing-card",
              ],
              "code": "unknown-card",
              "message": "Unknown card.",
              "severity": "error",
            },
          ],
          "title": "Unknown Cards",
        },
        {
          "id": "data-warnings",
          "issues": [
            {
              "affectedCardLabels": [],
              "affectedCards": [],
              "code": "card-data-version-mismatch",
              "message": "Snapshot mismatch.",
              "severity": "warning",
            },
          ],
          "title": "Data Warnings",
        },
      ]
    `);
  });

  it("keeps unknown future codes visible as data warnings", () => {
    const result: ValidationResult = {
      legal: true,
      rulesetVersion: "ruleset.v0-guide",
      errors: [],
      warnings: [{ code: "future-code", severity: "warning", message: "Future issue.", affectedCards: [] }],
      info: []
    };

    expect(groupValidationResult(result, [])).toEqual([
      expect.objectContaining({ id: "data-warnings", title: "Data Warnings" })
    ]);
  });
});
