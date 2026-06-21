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

export interface SnapshotValidationError {
  path: string;
  message: string;
}

export interface SnapshotValidationResult {
  valid: boolean;
  errors: SnapshotValidationError[];
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

export interface PortableDeckV1 {
  name: string;
  legends: DeckCardEntry[];
  main: DeckCardEntry[];
  formatId: FormatId;
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
  notes?: string;
}

export interface DeckDocumentV1 {
  schema: "gigsmith.deck";
  version: 1;
  exportedAt: string;
  deck: PortableDeckV1;
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

export interface EddyRules {
  startingEddies: number;
  openingHandSize: number;
  cardsDrawnPerTurn: number;
  maxSellsPerTurn: number;
  eddiesPerSoldCard: number;
  soldCardDestination: "eddies-area";
  eddiesReadyAtStartOfTurn: boolean;
  legendPaymentValue: number;
  firstPlayerSpentLegendsAtSetup: number;
  firstPlayerLegendsReadyOnFirstTurn: boolean;
  callLegendCost: number;
}

export interface MulliganRules {
  maxMulligans: number;
  returnScope: "full-hand";
  shuffleReturnedCards: boolean;
  drawCount: number;
}

export interface GigRules {
  playerDieTypes: DieType[];
  gigsToWin: number;
  d20MustBeGainedLast: boolean;
  overtimeAfterCompletedTurnsPerPlayer: number;
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
  eddyRules: EddyRules;
  mulliganRules: MulliganRules;
  gigRules: GigRules;
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

export type RamCompatibilityStatus = "compatible" | "incompatible" | "unknown" | "not-applicable";

export interface RamCompatibilityReport {
  status: RamCompatibilityStatus;
  requiredRam: number | null;
  availableRam: number | null;
}

export interface DeckEditEvaluation {
  allowed: boolean;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  currentCopies: number;
  maxCopies: number | null;
}

export interface EddyCostBucket {
  cost: number;
  cardCount: number;
  cardIds: CardId[];
}

export interface EddyDemandSummary {
  cardCount: number;
  cardsWithKnownCost: number;
  totalPrintedCost: number;
  averagePrintedCost: number | null;
  costBuckets: EddyCostBucket[];
  cardsWithoutPrintedCostIds: CardId[];
}

export interface EddyTurnProjection {
  turn: number;
  cardsSeen: number;
  expectedSellableCardsSeen: number;
  expectedPersistentEddies: number;
  maximumPersistentEddies: number;
  firstPlayerLegendCapacity: number;
  secondPlayerLegendCapacity: number;
  expectedFirstPlayerPaymentCapacity: number;
  expectedSecondPlayerPaymentCapacity: number;
}

export interface EddySupplySummary {
  sellableCardCount: number;
  nonSellableCardCount: number;
  sellableDensity: number;
  maximumPersistentEddies: number;
  turnProjections: EddyTurnProjection[];
}

export interface EddyEffectReference {
  cardId: CardId;
  copies: number;
  rulesText: string;
}

export interface EddyCurveWarning {
  code: string;
  message: string;
  affectedCards: CardId[];
}

export interface EddyCurveReport {
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
  assumptions: string[];
  mainDeckDemand: EddyDemandSummary;
  legendDemand: EddyDemandSummary;
  supply: EddySupplySummary;
  effectReferences: EddyEffectReference[];
  warnings: EddyCurveWarning[];
}

export interface SampleHandCard {
  cardId: CardId;
  copyNumber: number;
  known: boolean;
  displayName?: string;
  cost?: number | null;
  isSellable?: boolean;
  classifications: string[];
}

export interface SampleHandIssue {
  code: "unknown-card" | "invalid-count" | "insufficient-deck";
  message: string;
  affectedCardIds: CardId[];
}

export interface SampleHandReport {
  seed: string;
  requestedHandSize: number;
  deckCardCount: number;
  cards: SampleHandCard[];
  sellableCount: number;
  knownPrintedCostTotal: number;
  issues: SampleHandIssue[];
  assumptions: string[];
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
}

export type MulliganGoal = "balanced" | "early-play" | "eddy-supply";
export type MulliganPlayerOrder = "first" | "second";
export type MulliganRecommendation = "lean-keep" | "lean-mulligan" | "close-call";

export interface MulliganHandMetrics {
  cardCount: number;
  knownCostCount: number;
  totalPrintedCost: number;
  averagePrintedCost: number | null;
  sellableCount: number;
  sellableDensity: number;
  firstTurnPaymentCapacity: number;
  playableCardCount: number;
  playableDensity: number;
  score: number;
}

export interface MulliganIssue {
  code: "insufficient-data" | "unknown-card" | "unsupported-card-text";
  message: string;
  affectedCardIds: CardId[];
}

export interface MulliganAnalysisReport {
  version: "mulligan-analysis.v1";
  seed: string;
  goal: MulliganGoal;
  playerOrder: MulliganPlayerOrder;
  method: "exact" | "seeded-simulation";
  sampleSize: number;
  totalOutcomes: number | null;
  currentHand: SampleHandReport;
  sampledMulliganHand: SampleHandReport;
  currentMetrics: MulliganHandMetrics;
  expectedMulliganMetrics: MulliganHandMetrics;
  confidenceLevel: number;
  scoreMarginOfError: number;
  recommendation: MulliganRecommendation;
  reasons: string[];
  assumptions: string[];
  issues: MulliganIssue[];
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
}

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface Gig {
  id: string;
  dieType: DieType;
  value: number;
  ownerId?: string;
  controllerId?: string;
}

export type GigMatchWinReason = "start-turn-majority" | "overtime-majority";

export interface GigMatchState {
  playerIds: [string, string];
  firstPlayerId: string;
  activePlayerId: string;
  completedTurns: Record<string, number>;
  gigs: Gig[];
  gainedGigThisTurn: boolean;
  overtime: boolean;
  winnerId?: string;
  winReason?: GigMatchWinReason;
}

export interface GigMatchIssue {
  code: string;
  message: string;
  affectedGigIds: string[];
}

export interface GigMatchTransition {
  state: GigMatchState;
  issues: GigMatchIssue[];
}

export interface GigMatchPlayerReport {
  playerId: string;
  controlledGigCount: number;
  streetCred: number;
  fixerGigCount: number;
}

export interface GigMatchReport {
  players: GigMatchPlayerReport[];
  activePlayerId: string;
  activePlayerTurn: number;
  availableGigIds: string[];
  overtime: boolean;
  winnerId?: string;
  winReason?: GigMatchWinReason;
  rulesetVersion: RulesetVersion;
}

export type GigConditionId =
  | "high-8"
  | "maximum"
  | "minimum"
  | "parity-mix"
  | "distinct-2"
  | "distinct-3"
  | "value-pair"
  | "cost-match"
  | "street-cred-20"
  | "street-cred-lead"
  | "street-cred-trail";

export interface CardGigRequirement {
  externalCardId: string;
  conditions: GigConditionId[];
  note: string;
}

export interface GigRequirementRegistry {
  version: string;
  rulesetVersion: RulesetVersion;
  entries: CardGigRequirement[];
}

export interface GigConditionDemand {
  condition: GigConditionId;
  copies: number;
  cardIds: CardId[];
  colors: CardColor[];
  supported: boolean;
}

export interface GigRollProfile {
  outcomeCount: number;
  expectedStreetCred: number;
  high8Probability: number;
  maximumProbability: number;
  minimumProbability: number;
  parityMixProbability: number;
  distinct2Probability: number;
  distinct3Probability: number;
  valuePairProbability: number;
  streetCred20Probability: number;
  expectedCostMatchDensity: number | null;
}

export interface GigOddsTurn {
  turn: number;
  dieType: DieType;
  dice: DieType[];
  profile: GigRollProfile;
  deckFitScore: number;
}

export interface GigNextDieOption {
  dieType: DieType;
  profile: GigRollProfile;
  deckFitScore: number;
}

export interface GigOddsReport {
  registryVersion: string;
  rulesetVersion: RulesetVersion;
  cardDataVersion: CardDataVersion;
  demands: GigConditionDemand[];
  unsupportedCardIds: CardId[];
  recommendedOrder: DieType[];
  turns: GigOddsTurn[];
  nextDieOptions: GigNextDieOption[];
  assumptions: string[];
}

export interface PlayerState {
  id: string;
  deck: Deck;
  eddies: number;
}

export interface BoardState {
  players: PlayerState[];
  gigs: Gig[];
  units?: TacticalUnit[];
  activePlayerId: string;
  turn: number;
}

export interface TacticalUnit {
  id: string;
  controllerId: string;
  cardId?: CardId;
  name: string;
  power: number;
  ready: boolean;
  hasLag: boolean;
  hasBlocker: boolean;
  cannotReactReason?: string;
}

export type AttackTarget =
  | { type: "gig-area"; playerId: string }
  | { type: "unit"; unitId: string };

export type AttackOutcome = "fight" | "steal";
export type FightResult = "attacker-defeated" | "defender-defeated" | "both-defeated";

export interface AttackLineReason {
  code: string;
  message: string;
  affectedUnitIds: string[];
}

export interface AttackLine {
  id: string;
  attackerUnitId: string;
  declaredTarget: AttackTarget;
  finalTarget: AttackTarget;
  legal: boolean;
  outcome: AttackOutcome;
  blockerUnitId?: string;
  fightResult?: FightResult;
  gigsStolen?: number;
  reasons: AttackLineReason[];
}

export interface AttackLineWarning {
  code: string;
  message: string;
  relatedRuleUncertainty?: string;
  affectedUnitIds: string[];
}

export interface AttackLineReport {
  activePlayerId: string;
  rivalPlayerId?: string;
  lines: AttackLine[];
  warnings: AttackLineWarning[];
  assumptions: string[];
  rulesetVersion: RulesetVersion;
}

export interface StreetCredContribution {
  gigId: string;
  dieType: DieType;
  value: number;
}

export interface StreetCredIssue {
  code: "unknown-player" | "invalid-gig-value" | "duplicate-gig-id";
  message: string;
  affectedGigIds: string[];
}

export interface StreetCredReport {
  playerId: string;
  total: number;
  contributions: StreetCredContribution[];
  issues: StreetCredIssue[];
  rulesetVersion: RulesetVersion;
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
