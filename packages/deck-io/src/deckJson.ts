import type {
  Deck,
  DeckCardEntry,
  DeckDocumentV1,
  DeckVersionSnapshot,
  PortableDeckV1
} from "@gigsmith/data-contracts";
import { deckInputLimits } from "./limits";

export interface DeckJsonIssue {
  code: "invalid-json" | "invalid-schema" | "unsupported-version" | "invalid-field" | "invalid-payload";
  path: string;
  message: string;
}

export interface ImportDeckJsonResult {
  document?: DeckDocumentV1;
  errors: DeckJsonIssue[];
}

export interface ExportDeckJsonOptions {
  exportedAt?: string;
  includeVersionHistory?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  value: unknown,
  path: string,
  errors: DeckJsonIssue[],
  maximumLength: number = deckInputLimits.identifierCharacters
): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({
      code: "invalid-field",
      path,
      message: "Expected a non-empty string."
    });
    return undefined;
  }
  if (value.length > maximumLength) {
    errors.push({
      code: "invalid-field",
      path,
      message: `Expected at most ${maximumLength} characters.`
    });
    return undefined;
  }
  return value;
}

function parseEntries(
  value: unknown,
  path: string,
  errors: DeckJsonIssue[]
): DeckCardEntry[] | undefined {
  if (!Array.isArray(value)) {
    errors.push({ code: "invalid-field", path, message: "Expected an array." });
    return undefined;
  }
  if (value.length > deckInputLimits.entriesPerSection) {
    errors.push({
      code: "invalid-field",
      path,
      message: `Expected at most ${deckInputLimits.entriesPerSection} entries.`
    });
    return undefined;
  }

  const entries: DeckCardEntry[] = [];
  value.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push({ code: "invalid-field", path: entryPath, message: "Expected an object." });
      return;
    }

    const cardId = requiredString(candidate.cardId, `${entryPath}.cardId`, errors);
    if (
      typeof candidate.count !== "number" ||
      !Number.isInteger(candidate.count) ||
      candidate.count <= 0 ||
      candidate.count > deckInputLimits.cardCount
    ) {
      errors.push({
        code: "invalid-field",
        path: `${entryPath}.count`,
        message: `Expected an integer from 1 to ${deckInputLimits.cardCount}.`
      });
    }

    if (
      cardId &&
      typeof candidate.count === "number" &&
      Number.isInteger(candidate.count) &&
      candidate.count > 0 &&
      candidate.count <= deckInputLimits.cardCount
    ) {
      entries.push({ cardId, count: candidate.count });
    }
  });

  return entries;
}

function parseVersions(
  value: unknown,
  path: string,
  errors: DeckJsonIssue[]
): DeckVersionSnapshot[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push({ code: "invalid-field", path, message: "Expected an array." });
    return undefined;
  }
  if (value.length > deckInputLimits.entriesPerSection) {
    errors.push({
      code: "invalid-field",
      path,
      message: `Expected at most ${deckInputLimits.entriesPerSection} entries.`
    });
    return undefined;
  }

  const versions: DeckVersionSnapshot[] = [];
  value.forEach((candidate, index) => {
    const versionPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push({ code: "invalid-field", path: versionPath, message: "Expected an object." });
      return;
    }

    const id = requiredString(candidate.id, `${versionPath}.id`, errors);
    const name = requiredString(candidate.name, `${versionPath}.name`, errors, deckInputLimits.deckNameCharacters);
    const deckName = requiredString(candidate.deckName, `${versionPath}.deckName`, errors, deckInputLimits.deckNameCharacters);
    const formatId = requiredString(candidate.formatId, `${versionPath}.formatId`, errors);
    const rulesetVersion = requiredString(candidate.rulesetVersion, `${versionPath}.rulesetVersion`, errors);
    const cardDataVersion = requiredString(candidate.cardDataVersion, `${versionPath}.cardDataVersion`, errors);
    const legends = parseEntries(candidate.legends, `${versionPath}.legends`, errors);
    const main = parseEntries(candidate.main, `${versionPath}.main`, errors);
    let notes: string | undefined;
    if (candidate.notes !== undefined) {
      if (typeof candidate.notes !== "string") {
        errors.push({ code: "invalid-field", path: `${versionPath}.notes`, message: "Expected a string." });
      } else if (candidate.notes.length > deckInputLimits.notesCharacters) {
        errors.push({
          code: "invalid-field",
          path: `${versionPath}.notes`,
          message: `Expected at most ${deckInputLimits.notesCharacters} characters.`
        });
      } else {
        notes = candidate.notes;
      }
    }
    const createdAt = requiredString(candidate.createdAt, `${versionPath}.createdAt`, errors);
    if (createdAt && (
      Number.isNaN(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt
    )) {
      errors.push({
        code: "invalid-field",
        path: `${versionPath}.createdAt`,
        message: "Expected an ISO-8601 date-time string."
      });
    }

    if (id && name && createdAt && deckName && legends && main && formatId && rulesetVersion && cardDataVersion) {
      versions.push({
        id,
        name,
        createdAt,
        deckName,
        legends,
        main,
        formatId,
        rulesetVersion,
        cardDataVersion,
        ...(notes === undefined ? {} : { notes })
      });
    }
  });

  return versions;
}

export function exportDeckJson(
  deck: Deck,
  options: ExportDeckJsonOptions = {}
): string {
  const portableDeck: PortableDeckV1 = {
    name: deck.name,
    legends: deck.legends.map((entry) => ({ ...entry })),
    main: deck.main.map((entry) => ({ ...entry })),
    formatId: deck.formatId,
    rulesetVersion: deck.rulesetVersion,
    cardDataVersion: deck.cardDataVersion
  };
  if (deck.metadata?.notes) portableDeck.notes = deck.metadata.notes;
  if (options.includeVersionHistory && deck.versions?.length) {
    portableDeck.versions = deck.versions.map((version) => ({
      ...version,
      legends: version.legends.map((entry) => ({ ...entry })),
      main: version.main.map((entry) => ({ ...entry }))
    }));
  }

  const document: DeckDocumentV1 = {
    schema: "gigsmith.deck",
    version: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    deck: portableDeck
  };

  return JSON.stringify(document, null, 2);
}

export function importDeckJson(text: string): ImportDeckJsonResult {
  if (text.length > deckInputLimits.textCharacters) {
    return {
      errors: [{
        code: "invalid-payload",
        path: "$",
        message: `JSON deck documents are limited to ${deckInputLimits.textCharacters} characters.`
      }]
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return {
      errors: [{ code: "invalid-json", path: "$", message: "Input is not valid JSON." }]
    };
  }

  if (!isRecord(value)) {
    return {
      errors: [{ code: "invalid-field", path: "$", message: "Expected a JSON object." }]
    };
  }

  const errors: DeckJsonIssue[] = [];
  if (value.schema !== "gigsmith.deck") {
    errors.push({
      code: "invalid-schema",
      path: "$.schema",
      message: "Expected schema \"gigsmith.deck\"."
    });
  }
  if (value.version !== 1) {
    errors.push({
      code: "unsupported-version",
      path: "$.version",
      message: `Deck document version ${String(value.version)} is not supported.`
    });
  }

  const exportedAt = requiredString(value.exportedAt, "$.exportedAt", errors);
  if (exportedAt && (
    Number.isNaN(Date.parse(exportedAt)) || new Date(exportedAt).toISOString() !== exportedAt
  )) {
    errors.push({
      code: "invalid-field",
      path: "$.exportedAt",
      message: "Expected an ISO-8601 date-time string."
    });
  }

  if (!isRecord(value.deck)) {
    errors.push({ code: "invalid-field", path: "$.deck", message: "Expected an object." });
    return { errors };
  }

  const name = requiredString(value.deck.name, "$.deck.name", errors, deckInputLimits.deckNameCharacters);
  const formatId = requiredString(value.deck.formatId, "$.deck.formatId", errors);
  const rulesetVersion = requiredString(value.deck.rulesetVersion, "$.deck.rulesetVersion", errors);
  const cardDataVersion = requiredString(value.deck.cardDataVersion, "$.deck.cardDataVersion", errors);
  const legends = parseEntries(value.deck.legends, "$.deck.legends", errors);
  const main = parseEntries(value.deck.main, "$.deck.main", errors);
  const versions = parseVersions(value.deck.versions, "$.deck.versions", errors);
  let notes: string | undefined;
  if (value.deck.notes !== undefined) {
    if (typeof value.deck.notes !== "string") {
      errors.push({ code: "invalid-field", path: "$.deck.notes", message: "Expected a string." });
    } else if (value.deck.notes.length > deckInputLimits.notesCharacters) {
      errors.push({
        code: "invalid-field",
        path: "$.deck.notes",
        message: `Expected at most ${deckInputLimits.notesCharacters} characters.`
      });
    } else {
      notes = value.deck.notes;
    }
  }

  if (errors.length > 0 || !exportedAt || !name || !formatId || !rulesetVersion || !cardDataVersion || !legends || !main) {
    return { errors };
  }

  return {
    document: {
      schema: "gigsmith.deck",
      version: 1,
      exportedAt,
      deck: {
        name,
        legends,
        main,
        formatId,
        rulesetVersion,
        cardDataVersion,
        ...(notes === undefined ? {} : { notes }),
        ...(versions === undefined ? {} : { versions })
      }
    },
    errors
  };
}
