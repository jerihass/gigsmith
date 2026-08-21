import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Info, Layers, Palette, Redo2, RefreshCw, Search, Undo2, X } from "lucide-react";
import { cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, CardDatabase, Deck, DeckCardEntry, DeckDocumentV1, GigMatchState, ValidationIssue } from "@gigsmith/data-contracts";
import { decodeDeckSharePayload, deckInputLimits } from "@gigsmith/deck-io";
import {
  analyzeEddyCurve,
  analyzeDeckComposition,
  analyzeGigOdds,
  calculateRamLimits,
  evaluateCardRamCompatibility,
  evaluateMainDeckAdditions,
  validateDeck
} from "@gigsmith/rules-core";
import { loadAppView, saveAppView, type AppView } from "./appViews";
import {
  browseCards,
  cardSetFilterOptions,
  numberFilterOptions,
  textListFilterOptions,
  type CardSort,
  type CardColorFilter,
  type CardSetFilter,
  type CardTypeFilter,
  type DeckMembershipFilter,
  type NumberFilter,
  type TextListFilter,
  filterCardsByRamCompatibility,
  type RamCompatibilityFilter,
  type SellableFilter
} from "./cardFilters";
import { CardDetailDialog } from "./components/CardDetailDialog";
import { CardArt } from "./components/CardArt";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AppNavigation } from "./components/AppNavigation";
import { CardPreviewIdentity, CardPreviewStats } from "./components/CardPreviewStats";
import { CardDatabaseRefresh } from "./components/CardDatabaseRefresh";
import { DeckBaselineNotice } from "./components/DeckBaselineNotice";
import { DeckCurveSummary } from "./components/DeckCurveSummary";
import { DeckCompositionPanel } from "./components/DeckCompositionPanel";
import { DeckReportPanel } from "./components/DeckReportPanel";
import { DeckRecovery } from "./components/DeckRecovery";
import { DeckTransfer } from "./components/DeckTransfer";
import { DeckVersionsPanel } from "./components/DeckVersionsPanel";
import { EddyCurvePanel } from "./components/EddyCurvePanel";
import { PwaUpdateNotice } from "./components/PwaUpdateNotice";
import type { RestoreResult } from "./components/PortableBackup";
import { PlaytestJournalPanel } from "./components/PlaytestJournalPanel";
import { SampleHandPanel } from "./components/SampleHandPanel";
import { SharedDeckPreview } from "./components/SharedDeckPreview";
import { ValidationReport } from "./components/ValidationReport";
import { createDeferredPersistence } from "./deferredPersistence";
import { adjustDeckEntry, hasDeckEntry } from "./deckEntries";
import {
  loadStoredCardDatabase,
  resetStoredCardDatabase,
  saveStoredCardDatabase,
  type CardDatabaseLoadResult
} from "./cardDatabase";
import { loadCardArtPreference, saveCardArtPreference } from "./cardArtPreference";
import {
  calculateExternalCardArtCoverage,
  clearCachedExternalCardArtUrls,
  loadExternalCardArtUrls,
  selectExternalCardArtUrl
} from "./externalCardArt";
import {
  dropDeckHistory,
  getDeckHistory,
  recordDeckEdit,
  redoDeckEdit,
  undoDeckEdit,
  type DeckHistories
} from "./deckHistory";
import {
  addDeck,
  getActiveDeck,
  loadDeckLibraryResult,
  removeDeck,
  replaceActiveDeck,
  resetDeckLibrary,
  saveDeckLibrary,
  selectDeck,
  type DeckLibrary
} from "./deckLibrary";
import { createDefaultGigMatch, loadGigMatch, saveGigMatch } from "./gigMatchStorage";
import { mergeBackupDeckLibrary, type PortableBackupV1 } from "./portableBackup";
import { measurePerformance } from "./performanceInstrumentation";
import { summarizeMobileDeckHealth } from "./mobileDeckHealth";
import { createEmptyPlaytestJournal, loadPlaytestJournal, savePlaytestJournal, type PlaytestJournal } from "./playtestJournal";
import { groupValidationResult, validationGroupAnchorId } from "./validationGroups";
import {
  applyThemePreference,
  loadThemePreference,
  saveThemePreference,
  type AppTheme
} from "./themePreference";
import "./styles.css";

declare global {
  interface Window {
    gigsmithRoot?: Root;
  }
}

const colorOptions: CardColorFilter[] = ["Any", "Red", "Yellow", "Green", "Blue"];
const typeOptions: CardTypeFilter[] = ["Any", "Legend", "Unit", "Program", "Gear"];

const LazyGigWorkspace = React.lazy(async () => ({
  default: (await import("./components/GigWorkspace")).GigWorkspace
}));
const LazyPortableBackup = React.lazy(async () => ({
  default: (await import("./components/PortableBackup")).PortableBackup
}));
const LazyProxyDeckPrintPanel = React.lazy(async () => ({
  default: (await import("./components/ProxyDeckPrintPanel")).ProxyDeckPrintPanel
}));
const LazyReleaseNotesDialog = React.lazy(async () => ({
  default: (await import("./components/ReleaseNotesDialog")).ReleaseNotesDialog
}));

function cardIdBySlug(slug: string): string {
  const card = cyberpunkCardDb.cards.find((candidate) => candidate.slug === slug);
  if (!card) throw new Error(`Starter deck card missing from snapshot: ${slug}`);
  return card.id;
}

function deckEntry(slug: string, count: number): DeckCardEntry {
  return { cardId: cardIdBySlug(slug), count };
}

function createStarterDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "local-demo-deck",
    name: "Starter Legal Shell",
    formatId: cyberpunkRulesetV1Printable.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV1Printable.version,
    cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
    legends: [
      deckEntry("v-streetkid", 1),
      deckEntry("dum-dum-maelstrom-triggerman", 1),
      deckEntry("goro-takemura-vengeful-bodyguard", 1)
    ],
    main: [
      deckEntry("swordwise-huscle", 3),
      deckEntry("kerry-eurodyne-the-last-rockerboy", 3),
      deckEntry("meredith-stout-stone-cold-corpo", 3),
      deckEntry("royce-don-t-call-me-simon", 3),
      deckEntry("mantis-blades", 3),
      deckEntry("satori-sword-of-saburo", 3),
      deckEntry("all-is-lost", 3),
      deckEntry("secondhand-bombus", 3),
      deckEntry("gilded-mato-n", 3),
      deckEntry("hanako-arasaka-in-a-gilded-cage", 3),
      deckEntry("offduty-malfini", 3),
      deckEntry("t-bug-amateur-philosopher", 3),
      deckEntry("corpo-security", 3),
      deckEntry("emergency-atlus", 1)
    ],
    ...overrides
  };
}

function createDeckId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `deck-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDeck(name = "Untitled Deck"): Deck {
  const now = new Date().toISOString();
  return {
    id: createDeckId(),
    name,
    formatId: cyberpunkRulesetV1Printable.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV1Printable.version,
    cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
    legends: [],
    main: [],
    metadata: { createdAt: now, updatedAt: now }
  };
}

function entryCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function App({ initialLibrary, initialCardDatabase }: { initialLibrary: DeckLibrary; initialCardDatabase: CardDatabaseLoadResult }) {
  const [library, setLibrary] = useState(initialLibrary);
  const [cardDatabaseState, setCardDatabaseState] = useState(initialCardDatabase);
  const [deckHistories, setDeckHistories] = useState<DeckHistories>({});
  const [activeView, setActiveView] = useState(() => loadAppView(window.localStorage));
  const [pendingDelete, setPendingDelete] = useState(false);
  const [backupRestoreToast, setBackupRestoreToast] = useState<string>();
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<CardColorFilter>("Any");
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("Any");
  const [ramFilter, setRamFilter] = useState<NumberFilter>("Any");
  const [costFilter, setCostFilter] = useState<NumberFilter>("Any");
  const [setFilter, setSetFilter] = useState<CardSetFilter>("Any");
  const [classificationFilter, setClassificationFilter] = useState<TextListFilter>("Any");
  const [keywordFilter, setKeywordFilter] = useState<TextListFilter>("Any");
  const [sellableFilter, setSellableFilter] = useState<SellableFilter>("Any");
  const [membershipFilter, setMembershipFilter] = useState<DeckMembershipFilter>("All");
  const [ramCompatibilityFilter, setRamCompatibilityFilter] = useState<RamCompatibilityFilter>("All");
  const [cardSort, setCardSort] = useState<CardSort>("Snapshot");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [mobileDeckDrawerOpen, setMobileDeckDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => loadThemePreference(window.localStorage));
  const [deckEditNotice, setDeckEditNotice] = useState<ValidationIssue>();
  const [cardArtEnabled, setCardArtEnabled] = useState(() => loadCardArtPreference(window.localStorage));
  const [cardArtUrls, setCardArtUrls] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [cardArtSourceStatus, setCardArtSourceStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [cardArtRequestVersion, setCardArtRequestVersion] = useState(0);
  const [gigMatch, setGigMatch] = useState<GigMatchState>(() => loadGigMatch(window.localStorage));
  const [playtestJournal, setPlaytestJournal] = useState<PlaytestJournal>(() => loadPlaytestJournal(window.localStorage));
  const [eddyPlayerOrder, setEddyPlayerOrder] = useState<"first" | "second">("first");
  const [sharedDocument, setSharedDocument] = useState<DeckDocumentV1>();
  const [sharedDeckError, setSharedDeckError] = useState("");
  const [detailCardId, setDetailCardId] = useState<string>();
  const [detailNavigationContext, setDetailNavigationContext] = useState<"database" | "deck">("database");
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement>();
  const releaseNotesTriggerRef = useRef<HTMLButtonElement>();
  const libraryPersistence = useRef(
    createDeferredPersistence<DeckLibrary>((next) =>
      measurePerformance(
        "persistence.deckLibrary",
        () => saveDeckLibrary(window.localStorage, next),
        { decks: next.decks.length }
      )
    )
  ).current;
  const gigMatchPersistence = useRef(
    createDeferredPersistence<GigMatchState>((next) =>
      measurePerformance(
        "persistence.gigMatch",
        () => saveGigMatch(window.localStorage, next),
        { gigs: next.gigs.length }
      )
    )
  ).current;
  const playtestJournalPersistence = useRef(
    createDeferredPersistence<PlaytestJournal>((next) =>
      measurePerformance(
        "persistence.playtestJournal",
        () => savePlaytestJournal(window.localStorage, next),
        { records: next.records.length }
      )
    )
  ).current;
  const advancedFiltersId = useId();
  const cardDb = cardDatabaseState.cardDb;
  const deck = getActiveDeck(library);
  const activeHistory = getDeckHistory(deckHistories, deck.id);
  const cardsById = useMemo(() => new Map(cardDb.cards.map((card) => [card.id, card])), [cardDb]);
  const cardArtCoverage = useMemo(
    () => calculateExternalCardArtCoverage(cardDb.cards, cardArtUrls),
    [cardArtUrls, cardDb.cards]
  );
  const detailCard = detailCardId ? cardsById.get(detailCardId) : undefined;
  const ramOptions = useMemo(() => numberFilterOptions(cardDb.cards, "ram"), [cardDb]);
  const costOptions = useMemo(() => numberFilterOptions(cardDb.cards, "cost"), [cardDb]);
  const setOptions = useMemo(() => cardSetFilterOptions(cardDb.cards), [cardDb]);
  const classificationOptions = useMemo(() => textListFilterOptions(cardDb.cards, "classifications"), [cardDb]);
  const keywordOptions = useMemo(() => textListFilterOptions(cardDb.cards, "keywords"), [cardDb]);
  const activeAdvancedFilterChips = [
    colorFilter !== "Any" ? { key: "color", label: colorFilter, clear: () => setColorFilter("Any") } : undefined,
    typeFilter !== "Any" ? { key: "type", label: typeFilter, clear: () => setTypeFilter("Any") } : undefined,
    ramFilter !== "Any" ? { key: "ram", label: `RAM ${ramFilter === "none" ? "None" : ramFilter}`, clear: () => setRamFilter("Any") } : undefined,
    costFilter !== "Any" ? { key: "cost", label: `Cost ${costFilter === "none" ? "None" : costFilter}`, clear: () => setCostFilter("Any") } : undefined,
    setFilter !== "Any" ? { key: "set", label: setOptions.find((option) => option.value === setFilter)?.label ?? setFilter, clear: () => setSetFilter("Any") } : undefined,
    classificationFilter !== "Any" ? { key: "classification", label: classificationFilter, clear: () => setClassificationFilter("Any") } : undefined,
    keywordFilter !== "Any" ? { key: "keyword", label: keywordFilter, clear: () => setKeywordFilter("Any") } : undefined,
    sellableFilter !== "Any" ? { key: "sellable", label: sellableFilter, clear: () => setSellableFilter("Any") } : undefined,
    ramCompatibilityFilter !== "All" ? { key: "ram-fit", label: ramCompatibilityFilter === "Compatible" ? "RAM fit" : "Over RAM", clear: () => setRamCompatibilityFilter("All") } : undefined
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip));
  const activeAdvancedFilterCount = activeAdvancedFilterChips.length;
  const clearAdvancedFilters = () => {
    setColorFilter("Any");
    setTypeFilter("Any");
    setRamFilter("Any");
    setCostFilter("Any");
    setSetFilter("Any");
    setClassificationFilter("Any");
    setKeywordFilter("Any");
    setSellableFilter("Any");
    setRamCompatibilityFilter("All");
  };
  const openAdvancedFiltersFromMobileSearch = () => {
    setAdvancedFiltersOpen(true);
    window.requestAnimationFrame(() => document.getElementById(advancedFiltersId)?.scrollIntoView({ block: "nearest" }));
  };
  const scrollToMobileCardSearch = () => {
    document.getElementById("mobile-card-search-input")?.scrollIntoView({ block: "start" });
  };
  const deckDetailCards = useMemo(() => {
    const seen = new Set<string>();
    const cards: Card[] = [];
    for (const entry of [...deck.legends, ...deck.main]) {
      if (seen.has(entry.cardId)) continue;
      seen.add(entry.cardId);
      const card = cardsById.get(entry.cardId);
      if (card) cards.push(card);
    }
    return cards;
  }, [cardsById, deck.legends, deck.main]);
  const deckDetailIndex = detailNavigationContext === "deck"
    ? deckDetailCards.findIndex((card) => card.id === detailCardId)
    : -1;

  const validation = useMemo(
    () => measurePerformance(
      "deck.validation",
      () => validateDeck(deck, cardDb, cyberpunkRulesetV1Printable),
      { legends: entryCount(deck.legends), mainCards: entryCount(deck.main), cards: cardDb.cards.length }
    ),
    [cardDb, deck]
  );
  const validationGroups = useMemo(
    () => groupValidationResult(validation, cardDb.cards),
    [cardDb, validation]
  );
  const mobileDeckHealth = useMemo(
    () => summarizeMobileDeckHealth(validationGroups, validation.legal),
    [validationGroups, validation.legal]
  );
  const openMobileDeckHealthIssue = () => {
    const issue = mobileDeckHealth.topIssue;
    if (!issue) return;
    setActiveView("analysis");
    window.requestAnimationFrame(() => {
      document.getElementById(validationGroupAnchorId(issue.groupId))?.scrollIntoView({ block: "start" });
    });
  };
  const ram = useMemo(() => calculateRamLimits(deck.legends, cardDb, cyberpunkRulesetV1Printable), [cardDb, deck.legends]);
  const ramCompatibilityById = useMemo(
    () => new Map(cardDb.cards.map((card) => [card.id, evaluateCardRamCompatibility(card, ram)])),
    [cardDb, ram]
  );
  const additionEvaluationById = useMemo(
    () => evaluateMainDeckAdditions(deck, cardDb, cyberpunkRulesetV1Printable),
    [cardDb, deck]
  );
  const eddyCurve = useMemo(
    () => measurePerformance(
      "deck.eddyCurve",
      () => analyzeEddyCurve(deck, cardDb, cyberpunkRulesetV1Printable),
      { mainCards: entryCount(deck.main) }
    ),
    [cardDb, deck]
  );
  const composition = useMemo(
    () => measurePerformance(
      "deck.composition",
      () => analyzeDeckComposition(deck, cardDb),
      { mainCards: entryCount(deck.main), cards: cardDb.cards.length }
    ),
    [cardDb, deck]
  );
  const reportGigOdds = useMemo(
    () => activeView === "print" ? measurePerformance(
      "deck.reportGigOdds",
      () => analyzeGigOdds(deck, cardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable),
      { mainCards: entryCount(deck.main) }
    ) : undefined,
    [activeView, cardDb, deck]
  );
  const deckCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of [...deck.legends, ...deck.main]) {
      counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.count);
    }
    return counts;
  }, [deck.legends, deck.main]);
  const deckCardIds = useMemo(() => new Set(deckCountById.keys()), [deckCountById]);
  const filteredCards = useMemo(() => {
    return measurePerformance("card.filter", () => {
      const browsedCards = browseCards(
        cardDb.cards,
        {
          query,
          color: colorFilter,
          type: typeFilter,
          ram: ramFilter,
          cost: costFilter,
          set: setFilter,
          classification: classificationFilter,
          keyword: keywordFilter,
          sellable: sellableFilter
        },
        membershipFilter,
        cardSort,
        deckCardIds
      );
      return filterCardsByRamCompatibility(
        browsedCards,
        ramCompatibilityFilter,
        new Map([...ramCompatibilityById].map(([cardId, report]) => [cardId, report.status]))
      );
    }, { cards: cardDb.cards.length, deckCards: deckCardIds.size });
  }, [
    cardSort,
    cardDb,
    classificationFilter,
    colorFilter,
    costFilter,
    deckCardIds,
    keywordFilter,
    membershipFilter,
    query,
    ramCompatibilityById,
    ramCompatibilityFilter,
    ramFilter,
    setFilter,
    sellableFilter,
    typeFilter
  ]);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    if (!cardArtEnabled) {
      setCardArtUrls(new Map());
      setCardArtSourceStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCardArtSourceStatus("loading");
    const cardDataIdentity = `${cardDb.metadata.cardDataVersion}:${cardDb.metadata.sourceCardCount}`;
    loadExternalCardArtUrls(
      window.localStorage,
      cardDb.metadata.sourceUrl,
      controller.signal,
      fetch,
      Date.now(),
      cardDataIdentity
    )
      .then(({ urls }) => {
        setCardArtUrls(urls);
        setCardArtSourceStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCardArtUrls(new Map());
        setCardArtSourceStatus("unavailable");
      });
    return () => controller.abort();
  }, [cardArtEnabled, cardArtRequestVersion, cardDb.metadata.cardDataVersion, cardDb.metadata.sourceCardCount, cardDb.metadata.sourceUrl]);

  function flushDeferredPersistence() {
    libraryPersistence.flush();
    gigMatchPersistence.flush();
    playtestJournalPersistence.flush();
  }

  useEffect(() => {
    function flushOnHidden() {
      if (document.visibilityState === "hidden") flushDeferredPersistence();
    }

    window.addEventListener("pagehide", flushDeferredPersistence);
    document.addEventListener("visibilitychange", flushOnHidden);
    return () => {
      window.removeEventListener("pagehide", flushDeferredPersistence);
      document.removeEventListener("visibilitychange", flushOnHidden);
      flushDeferredPersistence();
    };
  }, [gigMatchPersistence, libraryPersistence, playtestJournalPersistence]);

  useEffect(() => {
    setDeckEditNotice(undefined);
    setMobileDeckDrawerOpen(false);
  }, [deck.id]);

  useEffect(() => {
    if (activeView !== "deck") setMobileDeckDrawerOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!mobileDeckDrawerOpen) return;
    function closeMobileDeckDrawer(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileDeckDrawerOpen(false);
    }

    window.addEventListener("keydown", closeMobileDeckDrawer);
    return () => window.removeEventListener("keydown", closeMobileDeckDrawer);
  }, [mobileDeckDrawerOpen]);

  useEffect(() => {
    if (!deckEditNotice) return;
    const affectedCardId = deckEditNotice.affectedCards[0];
    if (!affectedCardId) return;

    const currentEvaluation = additionEvaluationById.get(affectedCardId);
    const stillApplies = [...(currentEvaluation?.blockers ?? []), ...(currentEvaluation?.warnings ?? [])]
      .some((issue) => issue.code === deckEditNotice.code);
    if (!stillApplies) setDeckEditNotice(undefined);
  }, [additionEvaluationById, deckEditNotice]);

  useEffect(() => {
    if (!backupRestoreToast) return;
    const timeout = window.setTimeout(() => setBackupRestoreToast(undefined), 6000);
    return () => window.clearTimeout(timeout);
  }, [backupRestoreToast]);

  useEffect(() => {
    function readSharedDeckFromHash() {
      const hash = window.location.hash.slice(1);
      if (hash.length > deckInputLimits.sharePayloadCharacters + 16) {
        setSharedDocument(undefined);
        setSharedDeckError("Shared deck link exceeds the supported size limit.");
        return;
      }
      const payload = new URLSearchParams(hash).get("deck");
      if (!payload) {
        setSharedDocument(undefined);
        setSharedDeckError("");
        return;
      }

      const result = decodeDeckSharePayload(payload);
      if (result.document) {
        setSharedDocument(result.document);
        setSharedDeckError("");
      } else {
        setSharedDocument(undefined);
        setSharedDeckError(result.errors.map((error) => error.message).join(" "));
      }
    }

    readSharedDeckFromHash();
    window.addEventListener("hashchange", readSharedDeckFromHash);
    return () => window.removeEventListener("hashchange", readSharedDeckFromHash);
  }, []);

  function persistLibrary(next: typeof library, options: { immediate?: boolean } = {}) {
    setLibrary(next);
    if (options.immediate) {
      libraryPersistence.cancel();
      saveDeckLibrary(window.localStorage, next);
      return;
    }
    libraryPersistence.schedule(next);
  }

  function persist(next: Deck) {
    const updated = {
      ...next,
      metadata: {
        ...next.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    setDeckHistories((current) => recordDeckEdit(current, deck));
    persistLibrary(replaceActiveDeck(library, updated));
  }

  function restoreFromHistory(restored: Deck) {
    const updated = {
      ...restored,
      metadata: { ...restored.metadata, updatedAt: new Date().toISOString() }
    };
    persistLibrary(replaceActiveDeck(library, updated));
  }

  function handleUndo() {
    const transition = undoDeckEdit(deckHistories, deck);
    if (!transition.deck) return;
    setDeckHistories(transition.histories);
    restoreFromHistory(transition.deck);
  }

  function handleRedo() {
    const transition = redoDeckEdit(deckHistories, deck);
    if (!transition.deck) return;
    setDeckHistories(transition.histories);
    restoreFromHistory(transition.deck);
  }

  function handleViewChange(view: AppView) {
    setActiveView(view);
    saveAppView(window.localStorage, view);
  }

  function handleCardArtPreference(enabled: boolean) {
    setCardArtEnabled(enabled);
    saveCardArtPreference(window.localStorage, enabled);
  }

  function retryExternalCardArt() {
    clearCachedExternalCardArtUrls(window.localStorage);
    setCardArtUrls(new Map());
    setCardArtSourceStatus("loading");
    setCardArtRequestVersion((version) => version + 1);
  }

  function handleThemeChange(nextTheme: AppTheme) {
    setTheme(nextTheme);
    applyThemePreference(nextTheme);
    saveThemePreference(window.localStorage, nextTheme);
  }

  function handleCardDatabaseChange(nextCardDb: CardDatabase, usingOverride: boolean) {
    setCardDatabaseState({ cardDb: nextCardDb, usingOverride });
  }

  function handleGigMatchChange(nextMatch: GigMatchState) {
    setGigMatch(nextMatch);
    gigMatchPersistence.schedule(nextMatch);
  }

  function handlePlaytestJournalChange(nextJournal: PlaytestJournal) {
    setPlaytestJournal(nextJournal);
    playtestJournalPersistence.schedule(nextJournal);
  }

  function handleBackupRestore(backup: PortableBackupV1, mode: "replace" | "merge"): RestoreResult {
    try {
      if (mode === "merge") {
        const merged = mergeBackupDeckLibrary(library, backup.library, createDeckId);
        persistLibrary(merged.library, { immediate: true });
        const result = {
          kind: "success",
          message: `Added ${merged.addedDeckCount} backup deck${merged.addedDeckCount === 1 ? "" : "s"}; current preferences and sandbox were kept.`
        } satisfies RestoreResult;
        setBackupRestoreToast(result.message);
        return result;
      }

      libraryPersistence.cancel();
      gigMatchPersistence.cancel();
      playtestJournalPersistence.cancel();
      saveDeckLibrary(window.localStorage, backup.library);
      setLibrary(backup.library);
      setDeckHistories({});
      setPendingDelete(false);

      setTheme(backup.preferences.theme);
      applyThemePreference(backup.preferences.theme);
      saveThemePreference(window.localStorage, backup.preferences.theme);
      setCardArtEnabled(backup.preferences.cardArtEnabled);
      saveCardArtPreference(window.localStorage, backup.preferences.cardArtEnabled);
      setActiveView(backup.preferences.activeView);
      saveAppView(window.localStorage, backup.preferences.activeView);

      const restoredCardDatabase = backup.cardDatabaseOverride
        ? saveStoredCardDatabase(window.localStorage, backup.cardDatabaseOverride)
        : resetStoredCardDatabase(window.localStorage);
      setCardDatabaseState(restoredCardDatabase);

      const restoredMatch = backup.gigMatch ?? createDefaultGigMatch();
      setGigMatch(restoredMatch);
      saveGigMatch(window.localStorage, restoredMatch);
      const restoredJournal = backup.playtestJournal ?? createEmptyPlaytestJournal();
      setPlaytestJournal(restoredJournal);
      savePlaytestJournal(window.localStorage, restoredJournal);
      const result = {
        kind: "success",
        message: `Restored ${backup.library.decks.length} deck${backup.library.decks.length === 1 ? "" : "s"}, preferences, card data, and Gig Sandbox state.`
      } satisfies RestoreResult;
      setBackupRestoreToast(result.message);
      return result;
    } catch (error) {
      return {
        kind: "error",
        message: error instanceof Error ? `Restore failed: ${error.message}` : "Restore failed; retry after freeing browser storage."
      };
    }
  }

  function handleCreateDeck() {
    setPendingDelete(false);
    persistLibrary(addDeck(library, createEmptyDeck()));
  }

  function handleDuplicateDeck() {
    const now = new Date().toISOString();
    const duplicate: Deck = {
      ...deck,
      id: createDeckId(),
      name: `${deck.name} Copy`,
      legends: deck.legends.map((entry) => ({ ...entry })),
      main: deck.main.map((entry) => ({ ...entry })),
      metadata: { ...deck.metadata, createdAt: now, updatedAt: now }
    };
    setPendingDelete(false);
    persistLibrary(addDeck(library, duplicate));
  }

  function handleSelectDeck(deckId: string) {
    setPendingDelete(false);
    persistLibrary(selectDeck(library, deckId));
  }

  function handleDeleteDeck() {
    setDeckHistories((current) => dropDeckHistory(current, deck.id));
    persistLibrary(removeDeck(library, deck.id));
    setPendingDelete(false);
  }

  function openCardDetails(card: Card, trigger: HTMLButtonElement, context: "database" | "deck" = "database") {
    detailTriggerRef.current = trigger;
    setDetailNavigationContext(context);
    setDetailCardId(card.id);
  }

  function closeCardDetails() {
    setDetailCardId(undefined);
    setDetailNavigationContext("database");
    window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
  }

  function openReleaseNotes(trigger?: HTMLButtonElement) {
    releaseNotesTriggerRef.current = trigger;
    setReleaseNotesOpen(true);
  }

  function closeReleaseNotes() {
    setReleaseNotesOpen(false);
    window.requestAnimationFrame(() => releaseNotesTriggerRef.current?.focus());
  }

  function navigateDeckDetails(offset: -1 | 1) {
    if (deckDetailCards.length < 2 || deckDetailIndex < 0) return;
    const nextIndex = (deckDetailIndex + offset + deckDetailCards.length) % deckDetailCards.length;
    setDetailCardId(deckDetailCards[nextIndex].id);
  }

  function addLegend(card: Card) {
    if (hasDeckEntry(deck.legends, card.id)) return;
    persist({ ...deck, legends: adjustDeckEntry(deck.legends, card.id, 1) });
  }

  function adjustMainCard(card: Card, delta: number) {
    if (delta > 0) {
      const evaluation = additionEvaluationById.get(card.id);
      if (!evaluation) return;
      if (!evaluation.allowed) {
        setDeckEditNotice(evaluation.blockers[0]);
        return;
      }
      setDeckEditNotice(evaluation.warnings[0]);
    } else {
      setDeckEditNotice(undefined);
    }
    persist({ ...deck, main: adjustDeckEntry(deck.main, card.id, delta) });
  }

  function removeLegend(card: Card) {
    persist({ ...deck, legends: adjustDeckEntry(deck.legends, card.id, -1) });
  }

  function clearSharedDeck() {
    setSharedDocument(undefined);
    setSharedDeckError("");
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  function addSharedDeckToLibrary() {
    if (!sharedDocument) return;
    const now = new Date().toISOString();
    const portableDeck = sharedDocument.deck;
    const importedDeck: Deck = {
      id: createDeckId(),
      name: portableDeck.name,
      legends: portableDeck.legends.map((entry) => ({ ...entry })),
      main: portableDeck.main.map((entry) => ({ ...entry })),
      formatId: portableDeck.formatId,
      rulesetVersion: portableDeck.rulesetVersion,
      cardDataVersion: portableDeck.cardDataVersion,
      metadata: {
        createdAt: now,
        updatedAt: now,
        notes: portableDeck.notes
      }
    };
    persistLibrary(addDeck(library, importedDeck));
    clearSharedDeck();
  }

  return (
    <main>
      <PwaUpdateNotice onReleaseNotes={openReleaseNotes} />
      <header className="app-header">
        <div>
          <p className="eyebrow">Unofficial Cyberpunk TCG companion</p>
          <h1>Gigsmith</h1>
        </div>
        <div className="header-context">
          <div className="active-deck-context">
            <span>Active deck</span>
            <strong title={deck.name}>{deck.name}</strong>
          </div>
          <div className={`status ${validation.legal ? "legal" : "illegal"}`}>
            {validation.legal ? "Legal" : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}`}
          </div>
          <label className="theme-picker" title="Application theme">
            <Palette size={17} aria-hidden="true" />
            <select
              aria-label="Theme"
              value={theme}
              onChange={(event) => handleThemeChange(event.target.value as AppTheme)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="neon">Neon</option>
            </select>
          </label>
          <button
            className="icon-button info-button"
            aria-label="View release notes"
            title="Release notes"
            onClick={(event) => openReleaseNotes(event.currentTarget)}
          >
            <Info size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <AppNavigation activeView={activeView} onChange={handleViewChange} />

      <SharedDeckPreview
        document={sharedDocument}
        error={sharedDeckError}
        onDismiss={clearSharedDeck}
        onAdd={addSharedDeckToLibrary}
      />

      <section
        className="app-view"
        id="app-panel-deck"
        role="tabpanel"
        aria-labelledby="app-tab-deck"
        hidden={activeView !== "deck"}
      >
        <div className="workspace deck-builder-workspace">
        <section className="panel deck-panel" id="deck-builder-current">
          <div className="panel-title">
            <h2>Deck Editor</h2>
            <div className="panel-actions">
              <span className="result-count">{entryCount(deck.legends)} Legends · {entryCount(deck.main)} main</span>
              <div className="history-controls" aria-label="Deck edit history">
                <button
                  className="icon-button"
                  aria-label="Undo deck edit"
                  title="Undo deck edit"
                  disabled={activeHistory.past.length === 0}
                  onClick={handleUndo}
                ><Undo2 size={17} aria-hidden="true" /></button>
                <button
                  className="icon-button"
                  aria-label="Redo deck edit"
                  title="Redo deck edit"
                  disabled={activeHistory.future.length === 0}
                  onClick={handleRedo}
                ><Redo2 size={17} aria-hidden="true" /></button>
              </div>
              <button onClick={() => persist(createStarterDeck({ id: deck.id, name: deck.name, metadata: deck.metadata }))}>Reset</button>
            </div>
          </div>
          <div className="deck-library-controls">
            <label className="field deck-picker">
              <span>Active deck</span>
              <select value={deck.id} onChange={(event) => handleSelectDeck(event.target.value)}>
                {library.decks.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                ))}
              </select>
            </label>
            <div className="deck-actions" aria-label="Deck actions">
              <button onClick={handleCreateDeck}>New</button>
              <button onClick={handleDuplicateDeck}>Duplicate</button>
              <button
                disabled={library.decks.length === 1}
                onClick={() => setPendingDelete(true)}
              >Delete</button>
            </div>
          </div>
          {pendingDelete && (
            <div className="delete-confirmation" role="alert">
              <span>Delete “{deck.name}” from this device?</span>
              <div>
                <button onClick={() => setPendingDelete(false)}>Cancel</button>
                <button className="danger" onClick={handleDeleteDeck}>Delete deck</button>
              </div>
            </div>
          )}
          <DeckBaselineNotice deck={deck} cardDb={cardDb} onUpgrade={persist} />
          <label className="field">
            <span>Deck name</span>
            <input value={deck.name} onChange={(event) => persist({ ...deck, name: event.target.value })} />
          </label>

          <DeckVersionsPanel
            deck={deck}
            cardDb={cardDb}
            ruleset={cyberpunkRulesetV1Printable}
            onChange={persist}
          />

          <DeckCurveSummary demand={eddyCurve.mainDeckDemand} />

          <div className="deck-section-title"><h3>Legends</h3><span>{entryCount(deck.legends)} / 3</span></div>
          <div aria-label="Legend cards" className="deck-list" role="list">
            {deck.legends.map((entry) => {
              const card = cardsById.get(entry.cardId);
              return (
                <div
                  aria-label={card?.display_name ?? entry.cardId}
                  className="deck-row"
                  data-color={card?.color.toLowerCase()}
                  key={entry.cardId}
                  role="listitem"
                >
                  <div className="deck-card-copy">
                    <span>{card?.display_name ?? entry.cardId}</span>
                  </div>
                  {card && (
                    <div className="deck-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`View details for ${card.display_name}`}
                        title="Card details"
                        onClick={(event) => openCardDetails(card, event.currentTarget, "deck")}
                      ><Info size={17} aria-hidden="true" /></button>
                      <button onClick={() => removeLegend(card)}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="deck-section-title"><h3>Main</h3><span>{entryCount(deck.main)} / 40-50</span></div>
          <div aria-label="Main deck cards" className="deck-list" role="list">
            {deck.main.map((entry) => {
              const card = cardsById.get(entry.cardId);
              const compatibility = card ? ramCompatibilityById.get(card.id) : undefined;
              const addition = card ? additionEvaluationById.get(card.id) : undefined;
              return (
                <div
                  aria-label={`${card?.display_name ?? entry.cardId}, ${entry.count} ${entry.count === 1 ? "copy" : "copies"}`}
                  className="deck-row"
                  data-color={card?.color.toLowerCase()}
                  key={entry.cardId}
                  role="listitem"
                >
                  <div className="deck-card-copy">
                    <span>{card?.display_name ?? entry.cardId}</span>
                    {compatibility?.status === "incompatible" && (
                      <small className="ram-compatibility incompatible">
                        Over RAM · needs {compatibility.requiredRam}, has {compatibility.availableRam}
                      </small>
                    )}
                    {compatibility?.status === "unknown" && (
                      <small className="ram-compatibility unknown">RAM unknown</small>
                    )}
                  </div>
                  {card && (
                    <div className="deck-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`View details for ${card.display_name}`}
                        title="Card details"
                        onClick={(event) => openCardDetails(card, event.currentTarget, "deck")}
                      ><Info size={17} aria-hidden="true" /></button>
                      <div className="count-controls">
                        <button
                          className="icon-button"
                          aria-label={`Remove one ${card.display_name}`}
                          title="Remove one"
                          onClick={() => adjustMainCard(card, -1)}
                        >−</button>
                        <strong aria-label={`${entry.count} copies`}>{entry.count}</strong>
                        <button
                          className="icon-button"
                          aria-label={addition?.blockers[0]?.message ?? `Add one ${card.display_name}`}
                          title={addition?.blockers[0]?.message ?? "Add one"}
                          disabled={!addition?.allowed}
                          onClick={() => adjustMainCard(card, 1)}
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel card-database-panel" id="deck-builder-search">
          <div className="panel-title">
            <h2>Card Database</h2>
            <div className="panel-actions card-database-actions">
              <label className="binary-field card-art-toggle" title="Loads artwork from the external card-data source">
                <input
                  type="checkbox"
                  checked={cardArtEnabled}
                  onChange={(event) => handleCardArtPreference(event.target.checked)}
                />
                <span>External art</span>
              </label>
              {cardArtEnabled && (
                <span className="result-count" aria-live="polite">
                  {cardArtSourceStatus === "ready"
                    ? `${cardArtCoverage.available} / ${cardArtCoverage.total} art`
                    : cardArtSourceStatus === "loading" ? "Loading art" : "Art unavailable"}
                </span>
              )}
              {cardArtEnabled && (
                cardArtSourceStatus === "unavailable" ||
                (cardArtSourceStatus === "ready" && cardArtCoverage.available < cardArtCoverage.total)
              ) && (
                <button
                  aria-label="Retry external artwork"
                  className="icon-button"
                  onClick={retryExternalCardArt}
                  title="Retry external artwork"
                  type="button"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              )}
              <span className="result-count">{filteredCards.length} cards</span>
            </div>
          </div>
          <div className="mobile-card-search-bar" role="search" aria-label="Card search">
            <label>
              <span>Search</span>
              <input
                id="mobile-card-search-input"
                aria-label="Search cards"
                placeholder="Name, text, faction..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              aria-controls={advancedFiltersId}
              aria-expanded={advancedFiltersOpen}
              onClick={openAdvancedFiltersFromMobileSearch}
              type="button"
            >
              Filters{activeAdvancedFilterCount > 0 ? ` ${activeAdvancedFilterCount}` : ""}
            </button>
            <span aria-live="polite">{filteredCards.length}</span>
          </div>
          <div className="filter-grid">
            <label className="field search-field">
              <span>Search</span>
              <input placeholder="Name, text, faction..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label className="field">
              <span>Sort</span>
              <select value={cardSort} onChange={(event) => setCardSort(event.target.value as CardSort)}>
                {(["Snapshot", "Name", "Cost", "RAM", "Power", "Color", "Type"] as const).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Deck</span>
              <select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value as DeckMembershipFilter)}>
                {(["All", "In Deck", "Not In Deck"] as const).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <button
              aria-controls={advancedFiltersId}
              aria-expanded={advancedFiltersOpen}
              className="filter-toggle"
              onClick={() => setAdvancedFiltersOpen((open) => !open)}
              type="button"
            >
              Filters{activeAdvancedFilterCount > 0 ? ` ${activeAdvancedFilterCount}` : ""}
            </button>
            {activeAdvancedFilterChips.length > 0 && (
              <div className="filter-chips" aria-label="Active card filters">
                {activeAdvancedFilterChips.map((chip) => (
                  <button aria-label={`Clear ${chip.label} filter`} key={chip.key} onClick={chip.clear} type="button">
                    {chip.label}
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            )}
            <div className="filter-secondary" data-expanded={advancedFiltersOpen ? "true" : "false"} id={advancedFiltersId}>
              <label className="field">
                <span>Color</span>
                <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value as CardColorFilter)}>
                  {colorOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Type</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as CardTypeFilter)}>
                  {typeOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Set</span>
                <select value={setFilter} onChange={(event) => setSetFilter(event.target.value as CardSetFilter)}>
                  {setOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>RAM</span>
                <select value={ramFilter} onChange={(event) => setRamFilter(event.target.value as NumberFilter)}>
                  {ramOptions.map((option) => (
                    <option key={option} value={option}>{option === "none" ? "None" : option}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Cost</span>
                <select value={costFilter} onChange={(event) => setCostFilter(event.target.value as NumberFilter)}>
                  {costOptions.map((option) => (
                    <option key={option} value={option}>{option === "none" ? "None" : option}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Classification</span>
                <select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value as TextListFilter)}>
                  {classificationOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              {keywordOptions.length > 1 && (
                <label className="field">
                  <span>Keyword</span>
                  <select value={keywordFilter} onChange={(event) => setKeywordFilter(event.target.value as TextListFilter)}>
                    {keywordOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Sellable</span>
                <select value={sellableFilter} onChange={(event) => setSellableFilter(event.target.value as SellableFilter)}>
                  {(["Any", "Sellable", "Not Sellable"] as const).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="field">
                <span>RAM fit</span>
                <select
                  value={ramCompatibilityFilter}
                  onChange={(event) => setRamCompatibilityFilter(event.target.value as RamCompatibilityFilter)}
                >
                  {(["All", "Compatible", "Incompatible"] as const).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <button className="filter-clear" disabled={activeAdvancedFilterCount === 0} onClick={clearAdvancedFilters} type="button">
                Clear filters
              </button>
            </div>
          </div>
          {deckEditNotice && (
            <div
              className={`deck-edit-notice ${deckEditNotice.severity}`}
              role={deckEditNotice.severity === "error" ? "alert" : "status"}
            >
              {deckEditNotice.message}
            </div>
          )}
          <section aria-label="Card database results" className="card-list">
            {filteredCards.map((card) => {
              const legendSelected = card.card_type === "Legend" && hasDeckEntry(deck.legends, card.id);
              const deckCopies = deckCountById.get(card.id) ?? 0;
              const compatibility = ramCompatibilityById.get(card.id);
              const addition = additionEvaluationById.get(card.id);
              const atCopyLimit = addition?.blockers.some((blocker) => blocker.code === "max-copies") ?? false;
              return (
                <article aria-label={card.display_name} className="card-row" data-color={card.color.toLowerCase()} key={card.id}>
                  <CardArt
                    card={card}
                    enabled={cardArtEnabled}
                    source={selectExternalCardArtUrl(card, cardArtUrls)}
                    sourcePending={cardArtSourceStatus === "loading"}
                    variant="thumbnail"
                  />
                  <div className="card-copy">
                    <strong className="card-title-line">
                      {legendSelected && (
                        <span className="deck-membership-badge" aria-label="Legend selected in deck">Selected</span>
                      )}
                      {!legendSelected && deckCopies > 0 && (
                        <span className="deck-membership-badge" aria-label={`${deckCopies} ${deckCopies === 1 ? "copy" : "copies"} in deck`}>
                          x{deckCopies}
                        </span>
                      )}
                      <span>{card.display_name}</span>
                    </strong>
                    <span>
                      <CardPreviewIdentity card={card} /> · <CardPreviewStats card={card} />
                    </span>
                    {compatibility?.status === "compatible" && (
                      <small className="ram-compatibility compatible">RAM fit</small>
                    )}
                    {compatibility?.status === "incompatible" && (
                      <small className="ram-compatibility incompatible">
                        Over RAM · needs {compatibility.requiredRam}, has {compatibility.availableRam}
                      </small>
                    )}
                    {compatibility?.status === "unknown" && (
                      <small className="ram-compatibility unknown">RAM unknown</small>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      className="card-details-action"
                      onClick={(event) => openCardDetails(card, event.currentTarget)}
                    >Details</button>
                    {card.card_type === "Legend" ? (
                      legendSelected ? (
                        <button onClick={() => removeLegend(card)}>Remove</button>
                      ) : (
                        <button onClick={() => addLegend(card)}>Add Legend</button>
                      )
                    ) : (
                      <div className="card-action-group">
                        <button
                          disabled={deckCopies === 0}
                          aria-label={`Remove one ${card.display_name}`}
                          title={deckCopies > 0 ? "Remove one" : "Not in deck"}
                          onClick={() => adjustMainCard(card, -1)}
                          className="card-remove-copy-action"
                        >−</button>
                        <button
                          disabled={!addition?.allowed}
                          title={addition?.blockers[0]?.message}
                          onClick={() => adjustMainCard(card, 1)}
                        >{atCopyLimit ? `Max ${addition?.maxCopies}` : "+ Main"}</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {filteredCards.length === 0 && (
              <div className="empty-state">No cards match the current filters.</div>
            )}
          </section>
        </section>
        </div>
        {activeView === "deck" && createPortal(
          <>
        <nav className="mobile-deck-sheet mobile-deck-dock" aria-label="Mobile deck builder shortcuts">
          <div className="mobile-deck-dock-status">
            <span>{entryCount(deck.legends)} / 3 Legends</span>
            <strong>{entryCount(deck.main)} / 40 main</strong>
            <span className={`deck-pill ${validation.legal ? "legal" : "illegal"}`}>
              {validation.legal ? "Legal" : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="mobile-deck-health" aria-label="Deck health summary">
            {mobileDeckHealth.metrics.map((metric) => (
              <span className="mobile-deck-health-chip" data-state={metric.state} key={metric.id}>
                <span>{metric.label}</span>
                <strong>{metric.issueCount === 0 ? "OK" : metric.issueCount}</strong>
              </span>
            ))}
          </div>
          {mobileDeckHealth.topIssue && (
            <button
              className="mobile-deck-health-issue"
              data-severity={mobileDeckHealth.topIssue.severity}
              onClick={openMobileDeckHealthIssue}
              type="button"
            >
              <span>{mobileDeckHealth.topIssue.title}</span>
              <strong>{mobileDeckHealth.topIssue.message}</strong>
            </button>
          )}
          <div className="mobile-deck-meter" aria-hidden="true">
            <span style={{ inlineSize: `${Math.min(100, (entryCount(deck.main) / 40) * 100)}%` }} />
          </div>
          <div className="mobile-deck-dock-actions">
            <button onClick={scrollToMobileCardSearch} type="button"><Search size={17} aria-hidden="true" />Search</button>
            <button
              aria-controls="mobile-deck-drawer"
              aria-expanded={mobileDeckDrawerOpen}
              onClick={() => setMobileDeckDrawerOpen((open) => !open)}
              type="button"
            >
              <Layers size={17} aria-hidden="true" />
              Deck
            </button>
          </div>
        </nav>
        {mobileDeckDrawerOpen && (
          <div
            className="mobile-deck-drawer-backdrop"
            role="presentation"
            onClick={() => setMobileDeckDrawerOpen(false)}
          >
            <aside
              aria-label="Current deck"
              aria-modal="true"
              className="mobile-deck-sheet mobile-deck-drawer"
              id="mobile-deck-drawer"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="mobile-deck-drawer-header">
                <div>
                  <h2>Current Deck</h2>
                  <span>{entryCount(deck.legends)} / 3 Legends · {entryCount(deck.main)} / 40 main</span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close current deck"
                  title="Close"
                  onClick={() => setMobileDeckDrawerOpen(false)}
                  type="button"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </header>
              <div className="mobile-deck-meter" aria-hidden="true">
                <span style={{ inlineSize: `${Math.min(100, (entryCount(deck.main) / 40) * 100)}%` }} />
              </div>
              <div className="mobile-deck-drawer-body">
                <section>
                  <div className="deck-section-title"><h3>Legends</h3><span>{entryCount(deck.legends)} / 3</span></div>
                  <div aria-label="Current Legend cards" className="deck-list mobile-deck-drawer-list" role="list">
                    {deck.legends.map((entry) => {
                      const card = cardsById.get(entry.cardId);
                      return (
                        <div
                          aria-label={card?.display_name ?? entry.cardId}
                          className="deck-row mobile-deck-drawer-row"
                          data-color={card?.color.toLowerCase()}
                          key={entry.cardId}
                          role="listitem"
                        >
                          <span>{card?.display_name ?? entry.cardId}</span>
                          {card && (
                            <div>
                              <button
                                className="icon-button"
                                aria-label={`View details for ${card.display_name}`}
                                title="Card details"
                                onClick={(event) => openCardDetails(card, event.currentTarget, "deck")}
                                type="button"
                              ><Info size={17} aria-hidden="true" /></button>
                              <button onClick={() => removeLegend(card)} type="button">Remove</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <div className="deck-section-title"><h3>Main</h3><span>{entryCount(deck.main)} / 40-50</span></div>
                  <div aria-label="Current main deck cards" className="deck-list mobile-deck-drawer-list" role="list">
                    {deck.main.map((entry) => {
                      const card = cardsById.get(entry.cardId);
                      const addition = card ? additionEvaluationById.get(card.id) : undefined;
                      return (
                        <div
                          aria-label={`${card?.display_name ?? entry.cardId}, ${entry.count} ${entry.count === 1 ? "copy" : "copies"}`}
                          className="deck-row mobile-deck-drawer-row"
                          data-color={card?.color.toLowerCase()}
                          key={entry.cardId}
                          role="listitem"
                        >
                          <span>{card?.display_name ?? entry.cardId}</span>
                          {card && (
                            <div>
                              <button
                                className="icon-button"
                                aria-label={`View details for ${card.display_name}`}
                                title="Card details"
                                onClick={(event) => openCardDetails(card, event.currentTarget, "deck")}
                                type="button"
                              ><Info size={17} aria-hidden="true" /></button>
                              <div className="count-controls">
                                <button
                                  className="icon-button"
                                  aria-label={`Remove one ${card.display_name}`}
                                  title="Remove one"
                                  onClick={() => adjustMainCard(card, -1)}
                                  type="button"
                                >−</button>
                                <strong aria-label={`${entry.count} copies`}>{entry.count}</strong>
                                <button
                                  className="icon-button"
                                  aria-label={addition?.blockers[0]?.message ?? `Add one ${card.display_name}`}
                                  title={addition?.blockers[0]?.message ?? "Add one"}
                                  disabled={!addition?.allowed}
                                  onClick={() => adjustMainCard(card, 1)}
                                  type="button"
                                >+</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        )}
          </>,
          document.body
        )}
      </section>

      <section
        className="app-view"
        id="app-panel-analysis"
        role="tabpanel"
        aria-labelledby="app-tab-analysis"
        hidden={activeView !== "analysis"}
      >
        <section className="analysis-grid">
          <section className="panel ram-planner-panel">
            <div className="compact-panel-title">
              <h2>RAM Planner</h2>
              <span className="result-count">Legend limits</span>
            </div>
            <div className="ram-chip-list">
              {ram.limits.map((limit) => (
                <div className="ram-chip" key={limit.color}>
                  <span>{limit.color}</span>
                  <strong>{limit.limit}</strong>
                </div>
              ))}
            </div>
          </section>
          <ValidationReport groups={validationGroups} />
        </section>

        <EddyCurvePanel
          cards={cardDb.cards}
          report={eddyCurve}
          playerOrder={eddyPlayerOrder}
          onPlayerOrderChange={setEddyPlayerOrder}
        />
        <DeckCompositionPanel report={composition} cards={cardDb.cards} />
        <SampleHandPanel deck={deck} cardDb={cardDb} />
      </section>

      <section
        className="app-view"
        id="app-panel-journal"
        role="tabpanel"
        aria-labelledby="app-tab-journal"
        hidden={activeView !== "journal"}
      >
        <PlaytestJournalPanel deck={deck} journal={playtestJournal} onChange={handlePlaytestJournalChange} />
      </section>

      <section
        className="app-view"
        id="app-panel-gigs"
        role="tabpanel"
        aria-labelledby="app-tab-gigs"
        hidden={activeView !== "gigs"}
      >
        {activeView === "gigs" && (
          <React.Suspense fallback={<section className="panel loading-panel">Loading Gig tools...</section>}>
            <LazyGigWorkspace deck={deck} cardDb={cardDb} match={gigMatch} onMatchChange={handleGigMatchChange} />
          </React.Suspense>
        )}
      </section>

      <section
        className="app-view"
        id="app-panel-print"
        role="tabpanel"
        aria-labelledby="app-tab-print"
        hidden={activeView !== "print"}
      >
        {activeView === "print" && (
          <React.Suspense fallback={<section className="panel loading-panel">Loading print tools...</section>}>
            {reportGigOdds && <>
              <DeckReportPanel
                deck={deck}
                cardDb={cardDb}
                validation={validation}
                ram={ram}
                eddyCurve={eddyCurve}
                composition={composition}
                gigOdds={reportGigOdds}
              />
              <LazyProxyDeckPrintPanel deck={deck} cardDb={cardDb} />
            </>}
          </React.Suspense>
        )}
      </section>

      <section
        className="app-view"
        id="app-panel-transfer"
        role="tabpanel"
        aria-labelledby="app-tab-transfer"
        hidden={activeView !== "transfer"}
      >
        <CardDatabaseRefresh
          cardDb={cardDb}
          usingOverride={cardDatabaseState.usingOverride}
          initialError={cardDatabaseState.error}
          cardArtEnabled={cardArtEnabled}
          cardArtUrls={cardArtUrls}
          cardArtSourcePending={cardArtSourceStatus === "loading"}
          onChange={handleCardDatabaseChange}
          onViewCard={(card, trigger) => openCardDetails(card, trigger)}
        />
        {activeView === "transfer" && (
          <React.Suspense fallback={<section className="panel loading-panel">Loading backup tools...</section>}>
            <LazyPortableBackup
              library={library}
              theme={theme}
              cardArtEnabled={cardArtEnabled}
              activeView={activeView}
              cardDb={cardDb}
              usingCardDatabaseOverride={cardDatabaseState.usingOverride}
              gigMatch={gigMatch}
              playtestJournal={playtestJournal}
              onBeforeExport={flushDeferredPersistence}
              onRestore={handleBackupRestore}
            />
          </React.Suspense>
        )}
        <DeckTransfer deck={deck} cardDb={cardDb} onReplace={persist} />
      </section>

      <footer className="source-panel">
        <div>
          <h2>Sources</h2>
          <p>
            Gigsmith is an unofficial local-first companion. It is not endorsed by CD Projekt Red, Go On Board, or Netdeck.
          </p>
        </div>
        <dl>
          <div>
            <dt>Card data</dt>
            <dd>{cardDb.metadata.cardDataVersion}</dd>
          </div>
          <div>
            <dt>Retrieved</dt>
            <dd>{cardDb.metadata.sourceRetrievedAt}</dd>
          </div>
          <div>
            <dt>Ruleset</dt>
            <dd>{cyberpunkRulesetV1Printable.version}</dd>
          </div>
          <div>
            <dt>Source count</dt>
            <dd>{cardDb.metadata.sourceCardCount} cards</dd>
          </div>
        </dl>
        <nav aria-label="Source links">
          <a href={cyberpunkRulesetV1Printable.sourceUrl} target="_blank" rel="noreferrer">Printable gameplay guide</a>
          <a href="https://netdeck.gg/cards/cyberpunk" target="_blank" rel="noreferrer">Netdeck cards</a>
          <a href={cardDb.metadata.sourceUrl} target="_blank" rel="noreferrer">Snapshot API</a>
        </nav>
      </footer>

      <CardDetailDialog
        card={detailCard}
        artEnabled={cardArtEnabled}
        artSource={detailCard ? selectExternalCardArtUrl(detailCard, cardArtUrls) : undefined}
        artSourcePending={cardArtSourceStatus === "loading"}
        sourceUrl={cardDb.metadata.sourceUrl}
        navigation={deckDetailIndex >= 0 && deckDetailCards.length > 1 ? {
          position: deckDetailIndex + 1,
          total: deckDetailCards.length,
          previousCardName: deckDetailCards[(deckDetailIndex - 1 + deckDetailCards.length) % deckDetailCards.length].display_name,
          nextCardName: deckDetailCards[(deckDetailIndex + 1) % deckDetailCards.length].display_name,
          onPrevious: () => navigateDeckDetails(-1),
          onNext: () => navigateDeckDetails(1)
        } : undefined}
        onClose={closeCardDetails}
      />
      {releaseNotesOpen && (
        <React.Suspense fallback={null}>
          <LazyReleaseNotesDialog open={releaseNotesOpen} onClose={closeReleaseNotes} />
        </React.Suspense>
      )}
      {backupRestoreToast && (
        <div className="import-toast success" role="status">
          <span>{backupRestoreToast}</span>
          <button className="icon-button" aria-label="Dismiss backup notification" title="Dismiss" onClick={() => setBackupRestoreToast(undefined)}><X size={17} aria-hidden="true" /></button>
        </div>
      )}
    </main>
  );
}

function GigsmithLoader() {
  const [fallbackDeck] = useState(() => createStarterDeck());
  const [cardDatabase] = useState(() => loadStoredCardDatabase(window.localStorage));
  const [loadResult, setLoadResult] = useState(() =>
    loadDeckLibraryResult(window.localStorage, fallbackDeck)
  );

  if (loadResult.recovery) {
    return (
      <DeckRecovery
        recovery={loadResult.recovery}
        onRetry={() => setLoadResult(loadDeckLibraryResult(window.localStorage, fallbackDeck))}
        onReset={() => setLoadResult({ library: resetDeckLibrary(window.localStorage, fallbackDeck) })}
      />
    );
  }

  return <App initialLibrary={loadResult.library} initialCardDatabase={cardDatabase} />;
}

const rootElement = document.getElementById("root") as HTMLElement;
const root = window.gigsmithRoot ?? createRoot(rootElement);
window.gigsmithRoot = root;

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <GigsmithLoader />
    </AppErrorBoundary>
  </React.StrictMode>
);
