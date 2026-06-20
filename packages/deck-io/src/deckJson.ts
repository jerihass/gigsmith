import type {
  Deck,
  DeckCardEntry,
  DeckDocumentV1,
  PortableDeckV1
} from "@gigsmith/data-contracts";

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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  value: unknown,
  path: string,
  errors: DeckJsonIssue[]
): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({
      code: "invalid-field",
      path,
      message: "Expected a non-empty string."
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

  const entries: DeckCardEntry[] = [];
  value.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push({ code: "invalid-field", path: entryPath, message: "Expected an object." });
      return;
    }

    const cardId = requiredString(candidate.cardId, `${entryPath}.cardId`, errors);
    if (typeof candidate.count !== "number" || !Number.isInteger(candidate.count) || candidate.count <= 0) {
      errors.push({
        code: "invalid-field",
        path: `${entryPath}.count`,
        message: "Expected a positive integer."
      });
    }

    if (cardId && typeof candidate.count === "number" && Number.isInteger(candidate.count) && candidate.count > 0) {
      entries.push({ cardId, count: candidate.count });
    }
  });

  return entries;
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

  const document: DeckDocumentV1 = {
    schema: "gigsmith.deck",
    version: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    deck: portableDeck
  };

  return JSON.stringify(document, null, 2);
}

export function importDeckJson(text: string): ImportDeckJsonResult {
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

  const name = requiredString(value.deck.name, "$.deck.name", errors);
  const formatId = requiredString(value.deck.formatId, "$.deck.formatId", errors);
  const rulesetVersion = requiredString(value.deck.rulesetVersion, "$.deck.rulesetVersion", errors);
  const cardDataVersion = requiredString(value.deck.cardDataVersion, "$.deck.cardDataVersion", errors);
  const legends = parseEntries(value.deck.legends, "$.deck.legends", errors);
  const main = parseEntries(value.deck.main, "$.deck.main", errors);
  let notes: string | undefined;
  if (value.deck.notes !== undefined) {
    if (typeof value.deck.notes !== "string") {
      errors.push({ code: "invalid-field", path: "$.deck.notes", message: "Expected a string." });
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
        ...(notes === undefined ? {} : { notes })
      }
    },
    errors
  };
}
