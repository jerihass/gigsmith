import type { Deck, DeckCardEntry, DeckDocumentV1 } from "@gigsmith/data-contracts";
import {
  exportDeckJson,
  importDeckJson,
  type ExportDeckJsonOptions,
  type ImportDeckJsonResult
} from "./deckJson";
import { deckInputLimits } from "./limits";

const compactSharePrefix = "g1";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodePayloadJson(json: string): string {
  return bytesToBase64(new TextEncoder().encode(json))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeCompactEntries(entries: DeckCardEntry[]): string {
  return entries.map((entry) => `${encodeURIComponent(entry.cardId)}:${entry.count}`).join(",");
}

function decodeCompactEntries(value: string): DeckCardEntry[] | undefined {
  if (!value) return [];
  const entries: DeckCardEntry[] = [];
  for (const candidate of value.split(",")) {
    const separatorIndex = candidate.lastIndexOf(":");
    if (separatorIndex <= 0) return undefined;
    const cardId = decodeURIComponent(candidate.slice(0, separatorIndex));
    const count = Number(candidate.slice(separatorIndex + 1));
    if (!cardId || !Number.isInteger(count)) return undefined;
    entries.push({ cardId, count });
  }
  return entries;
}

function encodeCompactSharePayload(deck: Deck, options: ExportDeckJsonOptions): string {
  return [
    compactSharePrefix,
    deck.name,
    deck.formatId,
    deck.rulesetVersion,
    deck.cardDataVersion,
    encodeCompactEntries(deck.legends),
    encodeCompactEntries(deck.main),
    options.exportedAt ?? "",
    deck.metadata?.notes ?? ""
  ].map((field) => encodeURIComponent(field)).join("|");
}

function decodeCompactSharePayload(payload: string): DeckDocumentV1 | undefined {
  const fields = payload.split("|").map((field) => decodeURIComponent(field));
  if (fields.length !== 9 || fields[0] !== compactSharePrefix) return undefined;
  const [, name, formatId, rulesetVersion, cardDataVersion, legendsText, mainText, exportedAt, notes] = fields;
  const legends = decodeCompactEntries(legendsText);
  const main = decodeCompactEntries(mainText);
  if (!legends || !main) return undefined;

  return {
    schema: "gigsmith.deck",
    version: 1,
    exportedAt: exportedAt || new Date().toISOString(),
    deck: {
      name,
      formatId,
      rulesetVersion,
      cardDataVersion,
      legends,
      main,
      ...(notes ? { notes } : {})
    }
  };
}

export function encodeDeckSharePayload(
  deck: Deck,
  options: ExportDeckJsonOptions = {}
): string {
  if (!options.includeVersionHistory) return encodeCompactSharePayload(deck, options);
  const document = JSON.parse(exportDeckJson(deck, options)) as unknown;
  return encodePayloadJson(JSON.stringify(document));
}

export function decodeDeckSharePayload(payload: string): ImportDeckJsonResult {
  if (payload.length > deckInputLimits.sharePayloadCharacters) {
    return {
      errors: [{
        code: "invalid-payload",
        path: "$",
        message: `Shared deck payloads are limited to ${deckInputLimits.sharePayloadCharacters} characters.`
      }]
    };
  }
  if (payload.startsWith(`${compactSharePrefix}|`)) {
    try {
      const compactDocument = decodeCompactSharePayload(payload);
      if (compactDocument) return importDeckJson(JSON.stringify(compactDocument));
    } catch {
      return {
        errors: [{
          code: "invalid-payload",
          path: "$",
          message: "Shared deck payload could not be decoded."
        }]
      };
    }
  }
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    return {
      errors: [{
        code: "invalid-payload",
        path: "$",
        message: "Shared deck payload is not valid base64url data."
      }]
    };
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(padded));
    return importDeckJson(json);
  } catch {
    return {
      errors: [{
        code: "invalid-payload",
        path: "$",
        message: "Shared deck payload could not be decoded."
      }]
    };
  }
}
