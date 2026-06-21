import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Info, Redo2, Undo2 } from "lucide-react";
import { cyberpunkCardDb, cyberpunkCardSnapshot, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, Deck, DeckCardEntry, DeckDocumentV1, ValidationIssue } from "@gigsmith/data-contracts";
import { decodeDeckSharePayload } from "@gigsmith/deck-io";
import {
  analyzeEddyCurve,
  calculateRamLimits,
  createGigMatch,
  evaluateCardRamCompatibility,
  evaluateMainDeckAddition,
  validateDeck
} from "@gigsmith/rules-core";
import { loadAppView, saveAppView, type AppView } from "./appViews";
import {
  browseCards,
  numberFilterOptions,
  type CardSort,
  type CardColorFilter,
  type CardTypeFilter,
  type DeckMembershipFilter,
  type NumberFilter,
  filterCardsByRamCompatibility,
  type RamCompatibilityFilter
} from "./cardFilters";
import { CardDetailDialog } from "./components/CardDetailDialog";
import { CardArt } from "./components/CardArt";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AppNavigation } from "./components/AppNavigation";
import { DeckBaselineNotice } from "./components/DeckBaselineNotice";
import { DeckCurveSummary } from "./components/DeckCurveSummary";
import { DeckRecovery } from "./components/DeckRecovery";
import { DeckTransfer } from "./components/DeckTransfer";
import { EddyCurvePanel } from "./components/EddyCurvePanel";
import { GigSandbox } from "./components/GigSandbox";
import { GigOddsPanel } from "./components/GigOddsPanel";
import { PwaUpdateNotice } from "./components/PwaUpdateNotice";
import { SampleHandPanel } from "./components/SampleHandPanel";
import { SharedDeckPreview } from "./components/SharedDeckPreview";
import { ValidationReport } from "./components/ValidationReport";
import { adjustDeckEntry, hasDeckEntry } from "./deckEntries";
import { loadCardArtPreference, saveCardArtPreference } from "./cardArtPreference";
import { fetchExternalCardArtUrls, selectExternalCardArtUrl } from "./externalCardArt";
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
import { groupValidationResult } from "./validationGroups";
import "./styles.css";

declare global {
  interface Window {
    gigsmithRoot?: Root;
  }
}

const colorOptions: CardColorFilter[] = ["Any", "Red", "Yellow", "Green", "Blue"];
const typeOptions: CardTypeFilter[] = ["Any", "Legend", "Unit", "Program", "Gear"];
const ramOptions = numberFilterOptions(cyberpunkCardDb.cards, "ram");
const costOptions = numberFilterOptions(cyberpunkCardDb.cards, "cost");

function cardById(cardId: string): Card | undefined {
  return cyberpunkCardDb.cards.find((card) => card.id === cardId);
}

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

function App({ initialLibrary }: { initialLibrary: DeckLibrary }) {
  const [library, setLibrary] = useState(initialLibrary);
  const [deckHistories, setDeckHistories] = useState<DeckHistories>({});
  const [activeView, setActiveView] = useState(() => loadAppView(window.localStorage));
  const [pendingDelete, setPendingDelete] = useState(false);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<CardColorFilter>("Any");
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("Any");
  const [ramFilter, setRamFilter] = useState<NumberFilter>("Any");
  const [costFilter, setCostFilter] = useState<NumberFilter>("Any");
  const [membershipFilter, setMembershipFilter] = useState<DeckMembershipFilter>("All");
  const [ramCompatibilityFilter, setRamCompatibilityFilter] = useState<RamCompatibilityFilter>("All");
  const [cardSort, setCardSort] = useState<CardSort>("Snapshot");
  const [deckEditNotice, setDeckEditNotice] = useState<ValidationIssue>();
  const [cardArtEnabled, setCardArtEnabled] = useState(() => loadCardArtPreference(window.localStorage));
  const [cardArtUrls, setCardArtUrls] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [cardArtSourceStatus, setCardArtSourceStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [eddyPlayerOrder, setEddyPlayerOrder] = useState<"first" | "second">("first");
  const [gigMatch, setGigMatch] = useState(() => createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable));
  const [sharedDocument, setSharedDocument] = useState<DeckDocumentV1>();
  const [sharedDeckError, setSharedDeckError] = useState("");
  const [detailCardId, setDetailCardId] = useState<string>();
  const detailTriggerRef = useRef<HTMLButtonElement>();
  const deck = getActiveDeck(library);
  const activeHistory = getDeckHistory(deckHistories, deck.id);
  const detailCard = detailCardId ? cardById(detailCardId) : undefined;

  const validation = useMemo(() => validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable), [deck]);
  const validationGroups = useMemo(
    () => groupValidationResult(validation, cyberpunkCardDb.cards),
    [validation]
  );
  const ram = useMemo(() => calculateRamLimits(deck.legends, cyberpunkCardDb, cyberpunkRulesetV1Printable), [deck.legends]);
  const ramCompatibilityById = useMemo(
    () => new Map(cyberpunkCardDb.cards.map((card) => [card.id, evaluateCardRamCompatibility(card, ram)])),
    [ram]
  );
  const additionEvaluationById = useMemo(
    () => new Map(
      cyberpunkCardDb.cards
        .filter((card) => card.card_type !== "Legend")
        .map((card) => [card.id, evaluateMainDeckAddition(deck, card.id, cyberpunkCardDb, cyberpunkRulesetV1Printable)])
    ),
    [deck]
  );
  const eddyCurve = useMemo(
    () => analyzeEddyCurve(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable),
    [deck]
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
    const browsedCards = browseCards(
        cyberpunkCardDb.cards,
        { query, color: colorFilter, type: typeFilter, ram: ramFilter, cost: costFilter },
        membershipFilter,
        cardSort,
        deckCardIds
      );
    return filterCardsByRamCompatibility(
      browsedCards,
      ramCompatibilityFilter,
      new Map([...ramCompatibilityById].map(([cardId, report]) => [cardId, report.status]))
    );
  }, [
    cardSort,
    colorFilter,
    costFilter,
    deckCardIds,
    membershipFilter,
    query,
    ramCompatibilityById,
    ramCompatibilityFilter,
    ramFilter,
    typeFilter
  ]);

  useEffect(() => {
    if (!cardArtEnabled) {
      setCardArtUrls(new Map());
      setCardArtSourceStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCardArtSourceStatus("loading");
    fetchExternalCardArtUrls(cyberpunkCardSnapshot.metadata.sourceUrl, controller.signal)
      .then((urls) => {
        setCardArtUrls(urls);
        setCardArtSourceStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCardArtUrls(new Map());
        setCardArtSourceStatus("unavailable");
      });
    return () => controller.abort();
  }, [cardArtEnabled]);

  useEffect(() => {
    setDeckEditNotice(undefined);
  }, [deck.id]);

  useEffect(() => {
    function readSharedDeckFromHash() {
      const payload = new URLSearchParams(window.location.hash.slice(1)).get("deck");
      if (!payload) return;

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

  function persistLibrary(next: typeof library) {
    setLibrary(next);
    saveDeckLibrary(window.localStorage, next);
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

  function openCardDetails(card: Card, trigger: HTMLButtonElement) {
    detailTriggerRef.current = trigger;
    setDetailCardId(card.id);
  }

  function closeCardDetails() {
    setDetailCardId(undefined);
    window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
  }

  function addLegend(card: Card) {
    if (hasDeckEntry(deck.legends, card.id)) return;
    persist({ ...deck, legends: adjustDeckEntry(deck.legends, card.id, 1) });
  }

  function adjustMainCard(card: Card, delta: number) {
    if (delta > 0) {
      const evaluation = evaluateMainDeckAddition(deck, card.id, cyberpunkCardDb, cyberpunkRulesetV1Printable);
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
      <PwaUpdateNotice />
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
        <section className="grid overview">
        <article className="metric">
          <span>Card Snapshot</span>
          <strong>{cyberpunkCardSnapshot.metadata.sourceCardCount}</strong>
          <small>{cyberpunkCardSnapshot.metadata.cardDataVersion}</small>
        </article>
        <article className="metric">
          <span>Legends</span>
          <strong>{entryCount(deck.legends)}</strong>
          <small>exactly 3 unique required</small>
        </article>
        <article className="metric">
          <span>Main Deck</span>
          <strong>{entryCount(deck.main)}</strong>
          <small>40-50 non-Legend cards</small>
        </article>
        <article className="metric">
          <span>Ruleset</span>
          <strong>v1</strong>
          <small>{cyberpunkRulesetV1Printable.version}</small>
        </article>
        </section>

        <div className="workspace">
        <section className="panel deck-panel">
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
          <DeckBaselineNotice deck={deck} onUpgrade={persist} />
          <label className="field">
            <span>Deck name</span>
            <input value={deck.name} onChange={(event) => persist({ ...deck, name: event.target.value })} />
          </label>

          <DeckCurveSummary demand={eddyCurve.mainDeckDemand} />

          <div className="deck-section-title"><h3>Legends</h3><span>{entryCount(deck.legends)} / 3</span></div>
          <div className="deck-list">
            {deck.legends.map((entry) => {
              const card = cardById(entry.cardId);
              return (
                <div className="deck-row" data-color={card?.color.toLowerCase()} key={entry.cardId}>
                  <div className="deck-card-copy">
                    <span>{card?.display_name ?? entry.cardId}</span>
                  </div>
                  {card && (
                    <div className="deck-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`View details for ${card.display_name}`}
                        title="Card details"
                        onClick={(event) => openCardDetails(card, event.currentTarget)}
                      ><Info size={17} aria-hidden="true" /></button>
                      <button onClick={() => removeLegend(card)}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="deck-section-title"><h3>Main</h3><span>{entryCount(deck.main)} / 40-50</span></div>
          <div className="deck-list">
            {deck.main.map((entry) => {
              const card = cardById(entry.cardId);
              const compatibility = card ? ramCompatibilityById.get(card.id) : undefined;
              const addition = card ? additionEvaluationById.get(card.id) : undefined;
              return (
                <div className="deck-row" data-color={card?.color.toLowerCase()} key={entry.cardId}>
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
                        onClick={(event) => openCardDetails(card, event.currentTarget)}
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

        <section className="panel">
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
              {cardArtEnabled && cardArtSourceStatus !== "ready" && (
                <span className="result-count" aria-live="polite">
                  {cardArtSourceStatus === "loading" ? "Loading art" : "Art unavailable"}
                </span>
              )}
              <span className="result-count">{filteredCards.length} cards</span>
            </div>
          </div>
          <div className="filter-grid">
            <label className="field search-field">
              <span>Search</span>
              <input placeholder="Name, text, faction..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
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
              <span>Deck</span>
              <select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value as DeckMembershipFilter)}>
                {(["All", "In Deck", "Not In Deck"] as const).map((option) => <option key={option}>{option}</option>)}
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
            <label className="field">
              <span>Sort</span>
              <select value={cardSort} onChange={(event) => setCardSort(event.target.value as CardSort)}>
                {(["Snapshot", "Name", "Cost", "RAM", "Power", "Color", "Type"] as const).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          {deckEditNotice && (
            <div
              className={`deck-edit-notice ${deckEditNotice.severity}`}
              role={deckEditNotice.severity === "error" ? "alert" : "status"}
            >
              {deckEditNotice.message}
            </div>
          )}
          <div className="card-list">
            {filteredCards.map((card) => {
              const legendSelected = card.card_type === "Legend" && hasDeckEntry(deck.legends, card.id);
              const compatibility = ramCompatibilityById.get(card.id);
              const addition = additionEvaluationById.get(card.id);
              const atCopyLimit = addition?.blockers.some((blocker) => blocker.code === "max-copies") ?? false;
              return (
                <article className="card-row" data-color={card.color.toLowerCase()} key={card.id}>
                  <CardArt
                    card={card}
                    enabled={cardArtEnabled}
                    source={selectExternalCardArtUrl(card, cardArtUrls)}
                    sourcePending={cardArtSourceStatus === "loading"}
                    variant="thumbnail"
                  />
                  <div className="card-copy">
                    <strong>{card.display_name}</strong>
                    <span>
                      {card.color} {card.card_type} · RAM {card.ram ?? "-"} · Cost {card.cost ?? "-"}
                      {deckCountById.has(card.id) ? ` · ${deckCountById.get(card.id)} in deck` : ""}
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
                    <button onClick={(event) => openCardDetails(card, event.currentTarget)}>Details</button>
                    {card.card_type === "Legend" ? (
                      <button disabled={legendSelected} onClick={() => addLegend(card)}>
                        {legendSelected ? "Selected" : "Add Legend"}
                      </button>
                    ) : (
                      <button
                        disabled={!addition?.allowed}
                        title={addition?.blockers[0]?.message}
                        onClick={() => adjustMainCard(card, 1)}
                      >{atCopyLimit ? `Max ${addition?.maxCopies}` : "+ Main"}</button>
                    )}
                  </div>
                </article>
              );
            })}
            {filteredCards.length === 0 && (
              <div className="empty-state">No cards match the current filters.</div>
            )}
          </div>
        </section>
        </div>
      </section>

      <section
        className="app-view"
        id="app-panel-analysis"
        role="tabpanel"
        aria-labelledby="app-tab-analysis"
        hidden={activeView !== "analysis"}
      >
        <section className="analysis-grid">
          <section className="panel">
            <h2>RAM Planner</h2>
            <div className="ram-list">
              {ram.limits.map((limit) => (
                <div className="ram-row" key={limit.color}>
                  <span>{limit.color}</span>
                  <strong>{limit.limit}</strong>
                </div>
              ))}
            </div>
          </section>
          <ValidationReport groups={validationGroups} />
        </section>

        <EddyCurvePanel
          cards={cyberpunkCardDb.cards}
          report={eddyCurve}
          playerOrder={eddyPlayerOrder}
          onPlayerOrderChange={setEddyPlayerOrder}
        />
        <SampleHandPanel deck={deck} />
        <GigOddsPanel deck={deck} match={gigMatch} />
      </section>

      <section
        className="app-view"
        id="app-panel-gigs"
        role="tabpanel"
        aria-labelledby="app-tab-gigs"
        hidden={activeView !== "gigs"}
      >
        <GigSandbox match={gigMatch} onChange={setGigMatch} />
      </section>

      <section
        className="app-view"
        id="app-panel-transfer"
        role="tabpanel"
        aria-labelledby="app-tab-transfer"
        hidden={activeView !== "transfer"}
      >
        <DeckTransfer deck={deck} onReplace={persist} />
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
            <dd>{cyberpunkCardSnapshot.metadata.cardDataVersion}</dd>
          </div>
          <div>
            <dt>Retrieved</dt>
            <dd>{cyberpunkCardSnapshot.metadata.sourceRetrievedAt}</dd>
          </div>
          <div>
            <dt>Ruleset</dt>
            <dd>{cyberpunkRulesetV1Printable.version}</dd>
          </div>
          <div>
            <dt>Source count</dt>
            <dd>{cyberpunkCardSnapshot.metadata.sourceCardCount} cards</dd>
          </div>
        </dl>
        <nav aria-label="Source links">
          <a href={cyberpunkRulesetV1Printable.sourceUrl} target="_blank" rel="noreferrer">Printable gameplay guide</a>
          <a href="https://netdeck.gg/cards/cyberpunk" target="_blank" rel="noreferrer">Netdeck cards</a>
          <a href={cyberpunkCardSnapshot.metadata.sourceUrl} target="_blank" rel="noreferrer">Snapshot API</a>
        </nav>
      </footer>

      <CardDetailDialog
        card={detailCard}
        artEnabled={cardArtEnabled}
        artSource={detailCard ? selectExternalCardArtUrl(detailCard, cardArtUrls) : undefined}
        artSourcePending={cardArtSourceStatus === "loading"}
        onClose={closeCardDetails}
      />
    </main>
  );
}

function GigsmithLoader() {
  const [fallbackDeck] = useState(() => createStarterDeck());
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

  return <App initialLibrary={loadResult.library} />;
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
