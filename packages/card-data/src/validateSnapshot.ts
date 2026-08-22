import type { CardSnapshot, SnapshotValidationError, SnapshotValidationResult } from "@gigsmith/data-contracts";

const validColors = new Set(["Red", "Yellow", "Green", "Blue", "Colorless"]);
const validCardTypes = new Set(["Legend", "Unit", "Program", "Gear"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(errors: SnapshotValidationError[], path: string, message: string): void {
  errors.push({ path, message });
}

function requireString(
  value: unknown,
  path: string,
  errors: SnapshotValidationError[],
  options: { nullable?: boolean } = {}
): void {
  if (options.nullable && value === null) return;
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(errors, path, "Expected a non-empty string.");
  }
}

function requireNumberOrNull(value: unknown, path: string, errors: SnapshotValidationError[]): void {
  if (value === null) return;
  if (typeof value !== "number" || Number.isNaN(value)) {
    addError(errors, path, "Expected a number or null.");
  }
}

function validateMetadata(snapshot: Record<string, unknown>, errors: SnapshotValidationError[]): void {
  if (!isRecord(snapshot.metadata)) {
    addError(errors, "metadata", "Expected snapshot metadata.");
    return;
  }

  const metadata = snapshot.metadata;
  requireString(metadata.game, "metadata.game", errors);
  if (metadata.game !== "cyberpunk") {
    addError(errors, "metadata.game", "Expected game to be cyberpunk.");
  }
  requireString(metadata.sourceName, "metadata.sourceName", errors);
  requireString(metadata.sourceUrl, "metadata.sourceUrl", errors);
  requireString(metadata.sourceRetrievedAt, "metadata.sourceRetrievedAt", errors);
  requireString(metadata.cardDataVersion, "metadata.cardDataVersion", errors);
  requireString(metadata.notes, "metadata.notes", errors);

  if (!Number.isInteger(metadata.sourceCardCount) || Number(metadata.sourceCardCount) < 0) {
    addError(errors, "metadata.sourceCardCount", "Expected a non-negative integer.");
  }
}

function validateSet(value: unknown, path: string, errors: SnapshotValidationError[]): void {
  if (!isRecord(value)) {
    addError(errors, path, "Expected set object.");
    return;
  }
  requireString(value.code, `${path}.code`, errors);
  requireString(value.name, `${path}.name`, errors);
}

function validateStringArray(value: unknown, path: string, errors: SnapshotValidationError[]): void {
  if (!Array.isArray(value)) {
    addError(errors, path, "Expected an array.");
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      addError(errors, `${path}[${index}]`, "Expected a string.");
    }
  });
}

function validatePrintings(value: unknown, path: string, errors: SnapshotValidationError[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    addError(errors, path, "Expected an array.");
    return;
  }

  value.forEach((printing, index) => {
    const printingPath = `${path}[${index}]`;
    if (!isRecord(printing)) {
      addError(errors, printingPath, "Expected printing object.");
      return;
    }
    if (printing.set !== undefined) validateSet(printing.set, `${printingPath}.set`, errors);
  });
}

function stableImageUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeCardSnapshot(snapshot: unknown): unknown {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.cards)) return snapshot;
  return {
    ...snapshot,
    cards: snapshot.cards.map((card) => {
      if (!isRecord(card)) return card;
      const { image_url: _transientImageUrl, ...stableCard } = card;
      const sourceImageUrl = stableImageUrl(card.source_image_url);
      if (sourceImageUrl !== undefined) stableCard.source_image_url = sourceImageUrl;
      return stableCard;
    })
  };
}

function validateCard(value: unknown, index: number, errors: SnapshotValidationError[]): string | undefined {
  const path = `cards[${index}]`;
  if (!isRecord(value)) {
    addError(errors, path, "Expected card object.");
    return undefined;
  }

  requireString(value.id, `${path}.id`, errors);
  requireString(value.external_id, `${path}.external_id`, errors);
  requireString(value.name, `${path}.name`, errors);
  requireString(value.display_name, `${path}.display_name`, errors);
  requireString(value.slug, `${path}.slug`, errors);
  requireString(value.printing_id, `${path}.printing_id`, errors);
  requireString(value.rules_text, `${path}.rules_text`, errors, { nullable: true });
  validateSet(value.set, `${path}.set`, errors);
  validatePrintings(value.printings, `${path}.printings`, errors);
  validateStringArray(value.classifications, `${path}.classifications`, errors);
  validateStringArray(value.keywords, `${path}.keywords`, errors);
  requireNumberOrNull(value.cost, `${path}.cost`, errors);
  requireNumberOrNull(value.power, `${path}.power`, errors);
  requireNumberOrNull(value.ram, `${path}.ram`, errors);

  if ("image_url" in value) {
    addError(errors, `${path}.image_url`, "Transient image_url values are not allowed in card snapshots.");
  }
  if (value.source_image_url !== undefined && value.source_image_url !== null) {
    requireString(value.source_image_url, `${path}.source_image_url`, errors);
    if (stableImageUrl(value.source_image_url) !== value.source_image_url) {
      addError(errors, `${path}.source_image_url`, "Expected a stable URL without query parameters or fragments.");
    }
  }

  if (typeof value.color !== "string" || !validColors.has(value.color)) {
    addError(errors, `${path}.color`, `Expected one of: ${[...validColors].join(", ")}.`);
  }

  if (typeof value.card_type !== "string" || !validCardTypes.has(value.card_type)) {
    addError(errors, `${path}.card_type`, `Expected one of: ${[...validCardTypes].join(", ")}.`);
  }

  return typeof value.id === "string" ? value.id : undefined;
}

export function validateCardSnapshot(snapshot: unknown): SnapshotValidationResult {
  const errors: SnapshotValidationError[] = [];

  if (!isRecord(snapshot)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Expected card snapshot object." }]
    };
  }

  validateMetadata(snapshot, errors);

  if (!Array.isArray(snapshot.cards)) {
    addError(errors, "cards", "Expected cards array.");
  } else {
    const ids = new Set<string>();
    snapshot.cards.forEach((card, index) => {
      const id = validateCard(card, index, errors);
      if (!id) return;
      if (ids.has(id)) {
        addError(errors, `cards[${index}].id`, `Duplicate card id "${id}".`);
      }
      ids.add(id);
    });

    const count = isRecord(snapshot.metadata) ? snapshot.metadata.sourceCardCount : undefined;
    if (Number.isInteger(count) && count !== snapshot.cards.length) {
      addError(errors, "metadata.sourceCardCount", `Expected ${snapshot.cards.length} to match cards length.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function assertValidCardSnapshot(snapshot: unknown): asserts snapshot is CardSnapshot {
  const result = validateCardSnapshot(snapshot);
  if (!result.valid) {
    const details = result.errors.map((error) => `${error.path}: ${error.message}`).join("\n");
    throw new Error(`Invalid card snapshot:\n${details}`);
  }
}
