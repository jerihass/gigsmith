import type { Deck } from "@gigsmith/data-contracts";
import {
  exportDeckJson,
  importDeckJson,
  type ExportDeckJsonOptions,
  type ImportDeckJsonResult
} from "./deckJson";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeDeckSharePayload(
  deck: Deck,
  options: ExportDeckJsonOptions = {}
): string {
  const compactJson = JSON.stringify(JSON.parse(exportDeckJson(deck, options)) as unknown);
  return bytesToBase64(new TextEncoder().encode(compactJson))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeDeckSharePayload(payload: string): ImportDeckJsonResult {
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
