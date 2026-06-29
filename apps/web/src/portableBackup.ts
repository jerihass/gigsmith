import type { CardSnapshot, GigMatchState } from "@gigsmith/data-contracts";
import { validateCardSnapshot } from "@gigsmith/card-data";
import { isAppView, type AppView } from "./appViews";
import { isDeckLibrary, type DeckLibrary } from "./deckLibrary";
import { isGigMatchState } from "./gigMatchStorage";
import type { PlaytestJournal } from "./playtestJournal";
import type { AppTheme } from "./themePreference";

export const portableBackupSchema = "gigsmith.backup";
export const portableBackupVersion = 1;

export interface PortableBackupV1 {
  schema: typeof portableBackupSchema;
  version: typeof portableBackupVersion;
  exportedAt: string;
  library: DeckLibrary;
  preferences: {
    theme: AppTheme;
    cardArtEnabled: boolean;
    activeView: AppView;
  };
  cardDatabaseOverride?: CardSnapshot;
  gigMatch?: GigMatchState;
  playtestJournal?: PlaytestJournal;
}

export interface BackupImportResult {
  backup?: PortableBackupV1;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTheme(value: unknown): value is AppTheme {
  return value === "dark" || value === "light" || value === "neon";
}

export function createPortableBackup(input: Omit<PortableBackupV1, "schema" | "version" | "exportedAt">): PortableBackupV1 {
  return {
    schema: portableBackupSchema,
    version: portableBackupVersion,
    exportedAt: new Date().toISOString(),
    ...input
  };
}

export function exportPortableBackup(input: Omit<PortableBackupV1, "schema" | "version" | "exportedAt">): string {
  return JSON.stringify(createPortableBackup(input), null, 2);
}

export function importPortableBackup(value: string): BackupImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return { errors: ["Backup is not valid JSON."] };
  }

  if (!isRecord(parsed)) return { errors: ["Backup must be a JSON object."] };
  if (parsed.schema !== portableBackupSchema) return { errors: ["Backup is not a Gigsmith backup document."] };
  if (parsed.version !== portableBackupVersion) return { errors: [`Backup version ${String(parsed.version)} is not supported.`] };
  if (typeof parsed.exportedAt !== "string" || Number.isNaN(Date.parse(parsed.exportedAt))) return { errors: ["Backup export timestamp is invalid."] };
  if (!isDeckLibrary(parsed.library)) return { errors: ["Backup deck library is invalid."] };
  if (!isRecord(parsed.preferences) || !isTheme(parsed.preferences.theme) || typeof parsed.preferences.cardArtEnabled !== "boolean" || !isAppView(parsed.preferences.activeView)) {
    return { errors: ["Backup preferences are invalid."] };
  }
  if (parsed.cardDatabaseOverride !== undefined && !validateCardSnapshot(parsed.cardDatabaseOverride).valid) {
    return { errors: ["Backup card database override is invalid."] };
  }
  if (parsed.gigMatch !== undefined && !isGigMatchState(parsed.gigMatch)) {
    return { errors: ["Backup Gig Sandbox state is invalid."] };
  }
  if (parsed.playtestJournal !== undefined) {
    if (!isRecord(parsed.playtestJournal) || parsed.playtestJournal.version !== 1 || !Array.isArray(parsed.playtestJournal.records)) {
      return { errors: ["Backup playtest journal is invalid."] };
    }
  }

  return { backup: parsed as unknown as PortableBackupV1, errors: [] };
}

export function mergeBackupDeckLibrary(
  current: DeckLibrary,
  imported: DeckLibrary,
  createId: () => string
): { library: DeckLibrary; addedDeckCount: number } {
  const existingIds = new Set(current.decks.map((deck) => deck.id));
  const decks = [...current.decks];
  for (const deck of imported.decks) {
    let id = deck.id;
    while (existingIds.has(id)) id = createId();
    existingIds.add(id);
    decks.push({
      ...deck,
      id,
      legends: deck.legends.map((entry) => ({ ...entry })),
      main: deck.main.map((entry) => ({ ...entry })),
      metadata: deck.metadata ? { ...deck.metadata } : undefined,
      versions: deck.versions?.map((version) => ({
        ...version,
        legends: version.legends.map((entry) => ({ ...entry })),
        main: version.main.map((entry) => ({ ...entry }))
      }))
    });
  }
  return { library: { ...current, decks }, addedDeckCount: imported.decks.length };
}
