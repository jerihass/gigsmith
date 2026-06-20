import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cyberpunkCardDb, cyberpunkCardSnapshot, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, Deck, DeckCardEntry, DeckDocumentV1 } from "@gigsmith/data-contracts";
import { decodeDeckSharePayload } from "@gigsmith/deck-io";
import { analyzeEddyCurve, calculateRamLimits, validateDeck } from "@gigsmith/rules-core";
import {
  filterCards,
  numberFilterOptions,
  type CardColorFilter,
  type CardTypeFilter,
  type NumberFilter
} from "./cardFilters";
import { CardDetailDialog } from "./components/CardDetailDialog";
import { DeckTransfer } from "./components/DeckTransfer";
import { EddyCurvePanel } from "./components/EddyCurvePanel";
import { GigSandbox } from "./components/GigSandbox";
import { SharedDeckPreview } from "./components/SharedDeckPreview";
import { ValidationReport } from "./components/ValidationReport";
import { adjustDeckEntry, hasDeckEntry } from "./deckEntries";
import {
  addDeck,
  getActiveDeck,
  loadDeckLibrary,
  removeDeck,
  replaceActiveDeck,
  saveDeckLibrary,
  selectDeck
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

function App() {
  const [library, setLibrary] = useState(() =>
    loadDeckLibrary(window.localStorage, createStarterDeck())
  );
  const [pendingDelete, setPendingDelete] = useState(false);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<CardColorFilter>("Any");
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("Any");
  const [ramFilter, setRamFilter] = useState<NumberFilter>("Any");
  const [costFilter, setCostFilter] = useState<NumberFilter>("Any");
  const [eddyPlayerOrder, setEddyPlayerOrder] = useState<"first" | "second">("first");
  const [sharedDocument, setSharedDocument] = useState<DeckDocumentV1>();
  const [sharedDeckError, setSharedDeckError] = useState("");
  const [detailCardId, setDetailCardId] = useState<string>();
  const detailTriggerRef = useRef<HTMLButtonElement>();
  const deck = getActiveDeck(library);
  const detailCard = detailCardId ? cardById(detailCardId) : undefined;

  const validation = useMemo(() => validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable), [deck]);
  const validationGroups = useMemo(
    () => groupValidationResult(validation, cyberpunkCardDb.cards),
    [validation]
  );
  const ram = useMemo(() => calculateRamLimits(deck.legends, cyberpunkCardDb, cyberpunkRulesetV1Printable), [deck.legends]);
  const eddyCurve = useMemo(
    () => analyzeEddyCurve(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable),
    [deck]
  );
  const filteredCards = useMemo(
    () =>
      filterCards(cyberpunkCardDb.cards, {
        query,
        color: colorFilter,
        type: typeFilter,
        ram: ramFilter,
        cost: costFilter
      }),
    [colorFilter, costFilter, query, ramFilter, typeFilter]
  );

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
    persistLibrary(replaceActiveDeck(library, updated));
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
      <header className="app-header">
        <div>
          <p className="eyebrow">Unofficial Cyberpunk TCG companion</p>
          <h1>Gigsmith</h1>
        </div>
        <div className={`status ${validation.legal ? "legal" : "illegal"}`}>
          {validation.legal ? "Legal" : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}`}
        </div>
      </header>

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

      <SharedDeckPreview
        document={sharedDocument}
        error={sharedDeckError}
        onDismiss={clearSharedDeck}
        onAdd={addSharedDeckToLibrary}
      />

      <div className="workspace">
        <section className="panel deck-panel">
          <div className="panel-title">
            <h2>Deck Editor</h2>
            <button onClick={() => persist(createStarterDeck({ id: deck.id, name: deck.name, metadata: deck.metadata }))}>Reset</button>
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
          <label className="field">
            <span>Deck name</span>
            <input value={deck.name} onChange={(event) => persist({ ...deck, name: event.target.value })} />
          </label>

          <h3>Legends</h3>
          <div className="deck-list">
            {deck.legends.map((entry) => {
              const card = cardById(entry.cardId);
              return (
                <div className="deck-row" key={entry.cardId}>
                  <span>{card?.display_name ?? entry.cardId}</span>
                  {card && <button onClick={() => removeLegend(card)}>Remove</button>}
                </div>
              );
            })}
          </div>

          <h3>Main</h3>
          <div className="deck-list">
            {deck.main.map((entry) => {
              const card = cardById(entry.cardId);
              return (
                <div className="deck-row" key={entry.cardId}>
                  <span>{card?.display_name ?? entry.cardId}</span>
                  {card && (
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
                        aria-label={`Add one ${card.display_name}`}
                        title="Add one"
                        onClick={() => adjustMainCard(card, 1)}
                      >+</button>
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
            <span className="result-count">{filteredCards.length} cards</span>
          </div>
          <div className="filter-grid">
            <label className="field">
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
          </div>
          <div className="card-list">
            {filteredCards.map((card) => {
              const legendSelected = card.card_type === "Legend" && hasDeckEntry(deck.legends, card.id);
              return (
                <article className="card-row" key={card.id}>
                  <div className="card-copy">
                    <strong>{card.display_name}</strong>
                    <span>{card.color} {card.card_type} · RAM {card.ram ?? "-"} · Cost {card.cost ?? "-"}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={(event) => openCardDetails(card, event.currentTarget)}>Details</button>
                    {card.card_type === "Legend" ? (
                      <button disabled={legendSelected} onClick={() => addLegend(card)}>
                        {legendSelected ? "Selected" : "Add Legend"}
                      </button>
                    ) : (
                      <button onClick={() => adjustMainCard(card, 1)}>+ Main</button>
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

      <GigSandbox deck={deck} />

      <DeckTransfer deck={deck} onReplace={persist} />

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

      <CardDetailDialog card={detailCard} onClose={closeCardDetails} />
    </main>
  );
}

const rootElement = document.getElementById("root") as HTMLElement;
const root = window.gigsmithRoot ?? createRoot(rootElement);
window.gigsmithRoot = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
