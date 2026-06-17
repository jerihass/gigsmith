export type CardId = string;
export type RulesetVersion = string;
export type CardDataVersion = string;
export type FormatId = string;

export type CardColor = "Red" | "Yellow" | "Green" | "Blue" | "Colorless";
export type CardType = "Legend" | "Unit" | "Program" | "Gear";
export type IssueSeverity = "error" | "warning" | "info";

export interface CardSet {
  code: string;
  name: string;
}

export interface CardPrinting {
  id?: string;
  printing_id?: string;
  print_number?: string;
  rarity?: string;
  set?: CardSet;
}

export interface Card {
  id: CardId;
  external_id: string;
  name: string;
  subname: string | null;
  display_name: string;
  slug: string;
  rules_text: string | null;
  flavor_text: string | null;
  printing_id: string;
  set: CardSet;
  rarity: string | null;
  image_url?: string | null;
  source_image_url?: string | null;
  color: CardColor;
  card_type: CardType;
  is_eddiable: boolean;
  classifications: string[];
  keywords: string[];
  cost: number | null;
  power: number | null;
  ram: number | null;
  artist: string | null;
  print_number: string | null;
  printings: CardPrinting[];
  selected_printing_id: string | null;
  legality: "legal" | "banned" | "restricted" | string;
}

export interface Legend extends Card {
  card_type: "Legend";
  ram: number;
}

export interface CardSnapshotMetadata {
  game: "cyberpunk";
  sourceName: string;
  sourceUrl: string;
  sourceRetrievedAt: string;
  cardDataVersion: CardDataVersion;
  sourceCardCount: number;
  notes: string;
}

export interface CardSnapshot {
  metadata: CardSnapshotMetadata;
  cards: Card[];
}

export interface CardDatabase {
  metadata: CardSnapshotMetadata;
  cards: Card[];
}

export interface DeckCardEntry {
  cardId: CardId;
  count: number;
}

export interface DeckMetadata {
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

export interface Deck {
  id: string;
  name: string;
  legends: DeckCardEntry[];
  main: DeckCardEntry[];
  formatId: FormatId;
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
  metadata?: DeckMetadata;
}

export interface Format {
  id: FormatId;
  name: string;
  banned: CardId[];
  restricted: CardId[];
  allowedSets?: string[];
}

export interface Errata {
  cardId: CardId;
  effectiveFrom: string;
  rulesText?: string;
  note: string;
}

export interface Keyword {
  id: string;
  name: string;
  reminderText: string;
  rulesetVersion: RulesetVersion;
}

export interface Ruleset {
  version: RulesetVersion;
  sourceUrl: string;
  sourceRetrievedAt: string;
  formats: Format[];
  defaultFormatId: FormatId;
  minMainDeckCards: number;
  maxMainDeckCards: number;
  requiredUniqueLegends: number;
  maxCopiesByType: Partial<Record<CardType, number>>;
  keywords: Keyword[];
  errata: Errata[];
}

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  affectedCards: CardId[];
  suggestedFixes?: string[];
}

export interface ValidationResult {
  legal: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  rulesetVersion: RulesetVersion;
}

export interface RamLimit {
  color: CardColor;
  limit: number;
  legendCardIds: CardId[];
}

export interface RamLimitReport {
  limits: RamLimit[];
  rulesetVersion: RulesetVersion;
}

export interface CardLegalityReport {
  legal: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface Gig {
  id: string;
  dieType: DieType;
  value: number;
  controllerId?: string;
}

export interface PlayerState {
  id: string;
  deck: Deck;
  eddies: number;
  streetCred: number;
  friendlyGigIds: string[];
}

export interface BoardState {
  players: PlayerState[];
  gigs: Gig[];
  activePlayerId: string;
  turn: number;
}

export interface SimulationOutcome {
  label: string;
  probability?: number;
  explanation: string;
}

export interface SimulationResult {
  assumptions: string[];
  sampleSize?: number;
  outcomes: SimulationOutcome[];
}
