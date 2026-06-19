import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cyberpunkCardDb, cyberpunkCardSnapshot, cyberpunkRulesetV0Guide } from "@gigsmith/card-data";
import type { Card, Deck, DeckCardEntry } from "@gigsmith/data-contracts";
import { exportDecklist, importDecklist } from "@gigsmith/deck-io";
import { calculateRamLimits, validateDeck } from "@gigsmith/rules-core";
import { filterCards, type CardColorFilter, type CardTypeFilter, type NumberFilter } from "./cardFilters";
import { cardDetailStats, cardDetailTags, cardDetailText } from "./cardDetails";
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
import { groupValidationResult, type ValidationGroup } from "./validationGroups";
import "./styles.css";

declare global {
  interface Window {
    gigsmithRoot?: Root;
  }
}

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
    formatId: cyberpunkRulesetV0Guide.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV0Guide.version,
    cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
    legends: [],
    main: [],
    metadata: { createdAt: now, updatedAt: now }
  };
}

function entryCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function ValidationReport({ groups }: { groups: ValidationGroup[] }) {
  const issueCount = groups.reduce((sum, group) => sum + group.issues.length, 0);
  return (
    <section className="panel validation-report">
      <div className="panel-title">
        <h2>Validation</h2>
        <span className="result-count">{issueCount} {issueCount === 1 ? "result" : "results"}</span>
      </div>
      <div className="validation-groups">
        {groups.map((group) => (
          <section className="validation-group" key={group.id}>
            <h3>{group.title}</h3>
            <div className="issue-list">
              {group.issues.map((issue, index) => (
                <article className={`issue ${issue.severity}`} key={`${issue.code}-${index}`}>
                  <strong>{issue.message}</strong>
                  {issue.affectedCardLabels.length > 0 && (
                    <span className="affected-cards">Cards: {issue.affectedCardLabels.join(", ")}</span>
                  )}
                  {issue.suggestedFixes?.map((fix) => <span key={fix}>{fix}</span>)}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
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
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [detailCardId, setDetailCardId] = useState<string>();
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>();
  const deck = getActiveDeck(library);
  const detailCard = detailCardId ? cardById(detailCardId) : undefined;

  const validation = useMemo(() => validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide), [deck]);
  const validationGroups = useMemo(
    () => groupValidationResult(validation, cyberpunkCardDb.cards),
    [validation]
  );
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

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;

    if (detailCard && !dialog.open) {
      dialog.showModal();
      detailCloseRef.current?.focus();
    } else if (!detailCard && dialog.open) {
      dialog.close();
    }
  }, [detailCard]);

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
    setImportError("");
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
    persist({ ...result.deck, id: deck.id, name: deck.name, metadata: deck.metadata });
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

      <dialog
        className="card-detail-dialog"
        ref={detailDialogRef}
        aria-labelledby="card-detail-title"
        onCancel={(event) => {
          event.preventDefault();
          closeCardDetails();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeCardDetails();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeCardDetails();
        }}
      >
        {detailCard && (
          <div className="card-detail-content">
            <header className="card-detail-header">
              <div>
                <p>{detailCard.color} {detailCard.card_type}</p>
                <h2 id="card-detail-title">{detailCard.display_name}</h2>
                <code>{detailCard.external_id}</code>
              </div>
              <button
                className="icon-button"
                ref={detailCloseRef}
                aria-label="Close card details"
                title="Close"
                onClick={closeCardDetails}
              >×</button>
            </header>

            <dl className="card-detail-stats">
              {cardDetailStats(detailCard).map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>

            <section className="card-detail-section">
              <h3>Rules</h3>
              <p className="rules-text">{cardDetailText(detailCard.rules_text, "No rules text.")}</p>
            </section>

            {detailCard.flavor_text && (
              <section className="card-detail-section">
                <h3>Flavor</h3>
                <p className="flavor-text">{detailCard.flavor_text}</p>
              </section>
            )}

            <dl className="card-detail-taxonomy">
              <div>
                <dt>Keywords</dt>
                <dd>{cardDetailTags(detailCard.keywords)}</dd>
              </div>
              <div>
                <dt>Classifications</dt>
                <dd>{cardDetailTags(detailCard.classifications)}</dd>
              </div>
              <div>
                <dt>Set</dt>
                <dd>{detailCard.set.name} ({detailCard.set.code})</dd>
              </div>
              <div>
                <dt>Printing</dt>
                <dd>{detailCard.print_number ?? detailCard.printing_id}</dd>
              </div>
            </dl>

            <footer className="card-detail-footer">
              <span>Card ID: <code>{detailCard.id}</code></span>
              <a href={cyberpunkCardSnapshot.metadata.sourceUrl} target="_blank" rel="noreferrer">Snapshot source</a>
            </footer>
          </div>
        )}
      </dialog>
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
