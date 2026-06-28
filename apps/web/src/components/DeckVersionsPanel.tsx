import { useMemo, useState } from "react";
import type { CardDatabase, Deck, DeckVersionSnapshot, Ruleset } from "@gigsmith/data-contracts";
import { analyzeEddyCurve, calculateRamLimits, validateDeck } from "@gigsmith/rules-core";
import { addDeckVersion, compareDeckVersionToDeck, restoreDeckVersion } from "../deckVersions";

function snapshotToDeck(deckId: string, snapshot: DeckVersionSnapshot): Deck {
  return {
    id: deckId,
    name: snapshot.deckName,
    legends: snapshot.legends.map((entry) => ({ ...entry })),
    main: snapshot.main.map((entry) => ({ ...entry })),
    formatId: snapshot.formatId,
    rulesetVersion: snapshot.rulesetVersion,
    cardDataVersion: snapshot.cardDataVersion,
    metadata: snapshot.notes ? { notes: snapshot.notes } : undefined
  };
}

function totalCount(deck: Pick<Deck, "legends" | "main">): number {
  return [...deck.legends, ...deck.main].reduce((sum, entry) => sum + entry.count, 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function DeckVersionsPanel({
  deck,
  cardDb,
  ruleset,
  onChange
}: {
  deck: Deck;
  cardDb: CardDatabase;
  ruleset: Ruleset;
  onChange: (deck: Deck) => void;
}) {
  const [versionName, setVersionName] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState(deck.versions?.at(-1)?.id ?? "");
  const versions = deck.versions ?? [];
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions.at(-1);
  const cardsById = useMemo(() => new Map(cardDb.cards.map((card) => [card.id, card])), [cardDb]);
  const selectedDeck = selectedVersion ? snapshotToDeck(deck.id, selectedVersion) : undefined;
  const comparison = selectedVersion ? compareDeckVersionToDeck(selectedVersion, deck, cardDb) : undefined;
  const selectedValidation = selectedDeck ? validateDeck(selectedDeck, cardDb, ruleset) : undefined;
  const currentValidation = validateDeck(deck, cardDb, ruleset);
  const selectedRam = selectedDeck ? calculateRamLimits(selectedDeck.legends, cardDb, ruleset) : undefined;
  const currentRam = calculateRamLimits(deck.legends, cardDb, ruleset);
  const selectedCurve = selectedDeck ? analyzeEddyCurve(selectedDeck, cardDb, ruleset) : undefined;
  const currentCurve = analyzeEddyCurve(deck, cardDb, ruleset);

  function cardName(cardId: string): string {
    return cardsById.get(cardId)?.display_name ?? cardId;
  }

  function handleSaveVersion() {
    const next = addDeckVersion(deck, versionName || `${deck.name} ${versions.length + 1}`);
    const savedVersion = next.versions?.at(-1);
    if (savedVersion) setSelectedVersionId(savedVersion.id);
    setVersionName("");
    onChange(next);
  }

  function handleRestoreVersion() {
    if (!selectedVersion) return;
    onChange(restoreDeckVersion(deck, selectedVersion.id));
  }

  return (
    <section className="deck-versions-panel" aria-label="Deck versions">
      <div className="deck-section-title">
        <h3>Versions</h3>
        <span>{versions.length} saved</span>
      </div>
      <div className="deck-version-create">
        <label className="field">
          <span>Version name</span>
          <input
            aria-label="Version name"
            placeholder="Tonight's list, Week 1..."
            value={versionName}
            onChange={(event) => setVersionName(event.target.value)}
          />
        </label>
        <button onClick={handleSaveVersion}>Save version</button>
      </div>
      {versions.length === 0 ? (
        <p className="deck-version-empty">Save a named version before changing a deck you may want to revisit.</p>
      ) : (
        <>
          <label className="field deck-version-picker">
            <span>Compare saved version</span>
            <select
              aria-label="Saved deck version"
              value={selectedVersion?.id ?? ""}
              onChange={(event) => setSelectedVersionId(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} - {formatDate(version.createdAt)}
                </option>
              ))}
            </select>
          </label>
          {selectedVersion && selectedDeck && comparison && selectedValidation && selectedRam && selectedCurve && (
            <div className="deck-version-summary">
              <div className="deck-version-metrics" aria-label="Version comparison summary">
                <div><span>Saved</span><strong>{totalCount(selectedDeck)}</strong></div>
                <div><span>Current</span><strong>{totalCount(deck)}</strong></div>
                <div><span>Legality</span><strong>{selectedValidation.legal ? "Legal" : "Issues"}{" -> "}{currentValidation.legal ? "Legal" : "Issues"}</strong></div>
                <div>
                  <span>RAM</span>
                  <strong>
                    {selectedRam.limits.reduce((sum, limit) => sum + limit.limit, 0)}
                    {" -> "}
                    {currentRam.limits.reduce((sum, limit) => sum + limit.limit, 0)}
                  </strong>
                </div>
                <div>
                  <span>Avg cost</span>
                  <strong>
                    {selectedCurve.mainDeckDemand.averagePrintedCost?.toFixed(1) ?? "-"}
                    {" -> "}
                    {currentCurve.mainDeckDemand.averagePrintedCost?.toFixed(1) ?? "-"}
                  </strong>
                </div>
                <div>
                  <span>Known costs</span>
                  <strong>
                    {selectedCurve.mainDeckDemand.cardsWithKnownCost}
                    {" -> "}
                    {currentCurve.mainDeckDemand.cardsWithKnownCost}
                  </strong>
                </div>
              </div>
              {comparison.baselineChanges.length > 0 && (
                <ul className="deck-version-change-list">
                  {comparison.baselineChanges.map((change) => <li key={change}>{change}</li>)}
                </ul>
              )}
              <div className="deck-version-deltas">
                {[...comparison.added, ...comparison.removed, ...comparison.changed].slice(0, 8).map((change) => (
                  <span key={`${change.section}-${change.cardId}`}>
                    {cardName(change.cardId)} {change.before}{" -> "}{change.after}
                  </span>
                ))}
                {comparison.added.length + comparison.removed.length + comparison.changed.length === 0 && (
                  <span>No card-count changes from this saved version.</span>
                )}
              </div>
              {comparison.missingCardIds.length > 0 && (
                <p className="deck-version-warning">
                  {comparison.missingCardIds.length} changed card ID{comparison.missingCardIds.length === 1 ? "" : "s"} missing from the current card snapshot.
                </p>
              )}
              <button onClick={handleRestoreVersion}>Restore as current edit</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
