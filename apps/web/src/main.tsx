import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { cyberpunkCardDb, cyberpunkCardSnapshot, cyberpunkRulesetV0Guide } from "@gigsmith/card-data";
import type { Card, Deck, DeckCardEntry, ValidationIssue } from "@gigsmith/data-contracts";
import { exportDecklist, importDecklist } from "@gigsmith/deck-io";
import { calculateRamLimits, validateDeck } from "@gigsmith/rules-core";
import { filterCards, type CardColorFilter, type CardTypeFilter, type NumberFilter } from "./cardFilters";
import "./styles.css";

const storageKey = "gigsmith.deck.v1";
const colorOptions: CardColorFilter[] = ["Any", "Red", "Yellow", "Green", "Blue"];
const typeOptions: CardTypeFilter[] = ["Any", "Legend", "Unit", "Program", "Gear"];
const numberOptions: NumberFilter[] = ["Any", "0", "1", "2", "3", "4", "5", "6", "7", "8"];

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
    formatId: cyberpunkRulesetV0Guide.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV0Guide.version,
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

function loadInitialDeck(): Deck {
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    try {
      return JSON.parse(stored) as Deck;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }
  return createStarterDeck();
}

function entryCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function upsertEntry(entries: DeckCardEntry[], cardId: string, delta: number): DeckCardEntry[] {
  const next = entries.map((entry) => ({ ...entry }));
  const existing = next.find((entry) => entry.cardId === cardId);
  if (!existing && delta > 0) return [...next, { cardId, count: delta }];
  if (!existing) return next;
  existing.count += delta;
  return next.filter((entry) => entry.count > 0);
}

function IssueList({ title, issues }: { title: string; issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="issue-list">
        {issues.map((issue, index) => (
          <article className={`issue ${issue.severity}`} key={`${issue.code}-${index}`}>
            <strong>{issue.message}</strong>
            {issue.suggestedFixes?.map((fix) => <span key={fix}>{fix}</span>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [deck, setDeck] = useState(loadInitialDeck);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<CardColorFilter>("Any");
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("Any");
  const [ramFilter, setRamFilter] = useState<NumberFilter>("Any");
  const [costFilter, setCostFilter] = useState<NumberFilter>("Any");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const validation = useMemo(() => validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide), [deck]);
  const ram = useMemo(() => calculateRamLimits(deck.legends, cyberpunkCardDb, cyberpunkRulesetV0Guide), [deck.legends]);
  const exportText = useMemo(() => exportDecklist(deck, cyberpunkCardDb), [deck]);

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

  function persist(next: Deck) {
    const updated = {
      ...next,
      metadata: {
        ...next.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    setDeck(updated);
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function addCard(card: Card) {
    if (card.card_type === "Legend") {
      persist({ ...deck, legends: upsertEntry(deck.legends, card.id, 1) });
      return;
    }
    persist({ ...deck, main: upsertEntry(deck.main, card.id, 1) });
  }

  function removeCard(card: Card) {
    if (card.card_type === "Legend") {
      persist({ ...deck, legends: upsertEntry(deck.legends, card.id, -1) });
      return;
    }
    persist({ ...deck, main: upsertEntry(deck.main, card.id, -1) });
  }

  function handleImport() {
    const result = importDecklist(importText, cyberpunkCardDb, {
      deckName: deck.name,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion
    });
    if (!result.deck) {
      setImportError(result.errors.map((error) => `Line ${error.line}: ${error.message}`).join("\n"));
      return;
    }
    setImportError("");
    persist(result.deck);
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
          <strong>v0</strong>
          <small>{cyberpunkRulesetV0Guide.version}</small>
        </article>
      </section>

      <div className="workspace">
        <section className="panel deck-panel">
          <div className="panel-title">
            <h2>Deck Editor</h2>
            <button onClick={() => persist(createStarterDeck({ id: "local-demo-deck", name: deck.name }))}>Reset</button>
          </div>
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
                  <span>{entry.count}x {card?.display_name ?? entry.cardId}</span>
                  {card && <button onClick={() => removeCard(card)}>Remove</button>}
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
                  <span>{entry.count}x {card?.display_name ?? entry.cardId}</span>
                  {card && <button onClick={() => removeCard(card)}>−</button>}
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
                {numberOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Cost</span>
              <select value={costFilter} onChange={(event) => setCostFilter(event.target.value as NumberFilter)}>
                {numberOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="card-list">
            {filteredCards.map((card) => (
              <article className="card-row" key={card.id}>
                <div>
                  <strong>{card.display_name}</strong>
                  <span>{card.color} {card.card_type} · RAM {card.ram ?? "-"} · Cost {card.cost ?? "-"}</span>
                </div>
                <button onClick={() => addCard(card)}>Add</button>
              </article>
            ))}
            {filteredCards.length === 0 && (
              <div className="empty-state">No cards match the current filters.</div>
            )}
          </div>
        </section>
      </div>

      <section className="grid">
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

        <IssueList title="Errors" issues={validation.errors} />
        <IssueList title="Warnings" issues={validation.warnings} />
        <IssueList title="Info" issues={validation.info} />
      </section>

      <section className="workspace io">
        <section className="panel">
          <h2>Export</h2>
          <textarea readOnly value={exportText} />
        </section>
        <section className="panel">
          <h2>Import</h2>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Legends:\n1 V — StreetKid\n\nMain:\n3 Swordwise Huscle" />
          <button className="primary" onClick={handleImport}>Import decklist</button>
          {importError && <pre className="import-error">{importError}</pre>}
        </section>
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
            <dd>{cyberpunkRulesetV0Guide.version}</dd>
          </div>
          <div>
            <dt>Source count</dt>
            <dd>{cyberpunkCardSnapshot.metadata.sourceCardCount} cards</dd>
          </div>
        </dl>
        <nav aria-label="Source links">
          <a href="https://cyberpunktcg.com/gameplay-guide" target="_blank" rel="noreferrer">Gameplay guide</a>
          <a href="https://netdeck.gg/cards/cyberpunk" target="_blank" rel="noreferrer">Netdeck cards</a>
          <a href={cyberpunkCardSnapshot.metadata.sourceUrl} target="_blank" rel="noreferrer">Snapshot API</a>
        </nav>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
