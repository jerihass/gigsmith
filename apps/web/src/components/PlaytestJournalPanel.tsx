import { useEffect, useMemo, useState } from "react";
import type { CardColor, Deck, DeckVersionSnapshot, PlaytestPlayerOrder, PlaytestRecord, PlaytestResult } from "@gigsmith/data-contracts";
import {
  createPlaytestRecord,
  deletePlaytestRecord,
  summarizePlaytests,
  upsertPlaytestRecord,
  type PlaytestJournal
} from "../playtestJournal";

const colors: CardColor[] = ["Red", "Yellow", "Green", "Blue"];

function createId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `playtest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayVersion(record: PlaytestRecord): string {
  return record.deck.deckVersionName ?? "Current edit snapshot";
}

function formatResult(summary: ReturnType<typeof summarizePlaytests>): string {
  return `${summary.wins}-${summary.losses}-${summary.draws}`;
}

export function PlaytestJournalPanel({
  deck,
  journal,
  onChange
}: {
  deck: Deck;
  journal: PlaytestJournal;
  onChange: (journal: PlaytestJournal) => void;
}) {
  const [editingId, setEditingId] = useState<string>();
  const [result, setResult] = useState<PlaytestResult>("win");
  const [playerOrder, setPlayerOrder] = useState<PlaytestPlayerOrder>("unknown");
  const [versionId, setVersionId] = useState(deck.versions?.at(-1)?.id ?? "current");
  const [playedAt, setPlayedAt] = useState(today());
  const [opponentName, setOpponentName] = useState("");
  const [opponentColors, setOpponentColors] = useState<CardColor[]>([]);
  const [turns, setTurns] = useState("");
  const [finalStreetCred, setFinalStreetCred] = useState("");
  const [eventName, setEventName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const deckVersions = deck.versions ?? [];
  const deckRecords = journal.records.filter((record) => record.deck.deckId === deck.id);
  const selectedVersion = deckVersions.find((version) => version.id === versionId);
  const selectedVersionRecords = deckRecords.filter((record) =>
    versionId === "current"
      ? record.deck.deckVersionId === undefined
      : record.deck.deckVersionId === versionId
  );
  const deckSummary = useMemo(() => summarizePlaytests(deckRecords), [deckRecords]);
  const versionSummary = useMemo(() => summarizePlaytests(selectedVersionRecords), [selectedVersionRecords]);

  function resetForm() {
    setEditingId(undefined);
    setResult("win");
    setPlayerOrder("unknown");
    setVersionId(deck.versions?.at(-1)?.id ?? "current");
    setPlayedAt(today());
    setOpponentName("");
    setOpponentColors([]);
    setTurns("");
    setFinalStreetCred("");
    setEventName("");
    setTags("");
    setNotes("");
  }

  useEffect(() => {
    resetForm();
  }, [deck.id]);

  function toggleColor(color: CardColor) {
    setOpponentColors((current) =>
      current.includes(color) ? current.filter((candidate) => candidate !== color) : [...current, color]
    );
  }

  function startEdit(record: PlaytestRecord) {
    setEditingId(record.id);
    setResult(record.result);
    setPlayerOrder(record.playerOrder);
    setVersionId(record.deck.deckVersionId ?? "current");
    setPlayedAt(record.playedAt);
    setOpponentName(record.opponent.name ?? "");
    setOpponentColors(record.opponent.colors);
    setTurns(record.turns == null ? "" : String(record.turns));
    setFinalStreetCred(record.finalStreetCred == null ? "" : String(record.finalStreetCred));
    setEventName(record.event ?? "");
    setTags(record.tags.join(", "));
    setNotes(record.notes ?? "");
  }

  function submit() {
    const record = createPlaytestRecord({
      id: editingId ?? createId(),
      deck,
      deckVersion: selectedVersion,
      playedAt,
      result,
      playerOrder,
      opponentName,
      opponentColors,
      turns: turns.trim() === "" ? undefined : Number(turns),
      finalStreetCred: finalStreetCred.trim() === "" ? undefined : Number(finalStreetCred),
      event: eventName,
      notes,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      now: new Date().toISOString()
    });
    const existing = editingId ? journal.records.find((candidate) => candidate.id === editingId) : undefined;
    onChange(upsertPlaytestRecord(journal, existing ? { ...record, createdAt: existing.createdAt } : record));
    resetForm();
  }

  function remove(recordId: string) {
    onChange(deletePlaytestRecord(journal, recordId));
    if (editingId === recordId) resetForm();
  }

  return (
    <section className="panel playtest-journal" aria-labelledby="playtest-journal-title">
      <div className="panel-title playtest-title">
        <div><p className="section-kicker">Observed games</p><h2 id="playtest-journal-title">Playtest Journal</h2></div>
        <span className="result-count">{deckRecords.length} local records</span>
      </div>

      <div className="playtest-summary-grid" aria-label="Playtest summary">
        <div><span>Deck sample</span><strong>{deckSummary.sampleSize}</strong></div>
        <div><span>Record</span><strong>{formatResult(deckSummary)}</strong></div>
        <div><span>Version sample</span><strong>{versionSummary.sampleSize}</strong></div>
        <div><span>Avg turns</span><strong>{versionSummary.averageTurns == null ? "n/a" : versionSummary.averageTurns.toFixed(1)}</strong></div>
      </div>
      <p className="playtest-note">Summaries are observed samples only, not matchup or strategy claims.</p>

      <div className="playtest-entry-grid">
        <label className="field">
          <span>Date</span>
          <input aria-label="Playtest date" type="date" value={playedAt} onChange={(event) => setPlayedAt(event.target.value)} />
        </label>
        <label className="field">
          <span>Deck version</span>
          <select aria-label="Playtest deck version" value={versionId} onChange={(event) => setVersionId(event.target.value)}>
            <option value="current">Current edit snapshot</option>
            {deckVersions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Result</span>
          <select aria-label="Playtest result" value={result} onChange={(event) => setResult(event.target.value as PlaytestResult)}>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
          </select>
        </label>
        <label className="field">
          <span>First player</span>
          <select aria-label="Playtest first player" value={playerOrder} onChange={(event) => setPlayerOrder(event.target.value as PlaytestPlayerOrder)}>
            <option value="unknown">Unknown</option>
            <option value="first">I went first</option>
            <option value="second">I went second</option>
          </select>
        </label>
        <label className="field">
          <span>Opponent</span>
          <input aria-label="Opponent archetype" value={opponentName} onChange={(event) => setOpponentName(event.target.value)} placeholder="Blue control, starter deck..." />
        </label>
        <fieldset className="playtest-colors">
          <legend>Opponent colors</legend>
          {colors.map((color) => (
            <label key={color}><input checked={opponentColors.includes(color)} type="checkbox" onChange={() => toggleColor(color)} /> {color}</label>
          ))}
        </fieldset>
        <label className="field">
          <span>Turns</span>
          <input aria-label="Turns played" min="1" type="number" value={turns} onChange={(event) => setTurns(event.target.value)} />
        </label>
        <label className="field">
          <span>Final Street Cred</span>
          <input aria-label="Final Street Cred" min="0" type="number" value={finalStreetCred} onChange={(event) => setFinalStreetCred(event.target.value)} />
        </label>
        <label className="field">
          <span>Event</span>
          <input aria-label="Playtest event" value={eventName} onChange={(event) => setEventName(event.target.value)} />
        </label>
        <label className="field">
          <span>Tags</span>
          <input aria-label="Playtest tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="comma, separated" />
        </label>
        <label className="field playtest-notes">
          <span>Notes</span>
          <textarea aria-label="Playtest notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>
      <div className="playtest-actions">
        <button className="primary" onClick={submit}>{editingId ? "Save playtest" : "Record playtest"}</button>
        {editingId && <button onClick={resetForm}>Cancel edit</button>}
      </div>

      <div className="playtest-breakdowns">
        <div><strong>First player split</strong><span>{versionSummary.firstPlayer} first · {versionSummary.secondPlayer} second · {versionSummary.unknownPlayerOrder} unknown</span></div>
        <div><strong>Opponent colors</strong><span>{versionSummary.opponentColors.length ? versionSummary.opponentColors.map((item) => `${item.color} ${item.count}`).join(" · ") : "No color data"}</span></div>
        <div><strong>Tags</strong><span>{versionSummary.tags.length ? versionSummary.tags.map((item) => `${item.tag} ${item.count}`).join(" · ") : "No tags"}</span></div>
      </div>

      <section className="playtest-records" aria-label="Playtest records">
        {deckRecords.map((record) => (
          <article key={record.id}>
            <div>
              <strong>{record.result.toUpperCase()} · {record.playedAt}</strong>
              <span>{displayVersion(record)} · {record.playerOrder === "unknown" ? "first player unknown" : record.playerOrder === "first" ? "went first" : "went second"}</span>
              <small>{record.opponent.name ?? "Opponent not recorded"}{record.opponent.colors.length ? ` · ${record.opponent.colors.join("/")}` : ""}</small>
            </div>
            <div className="playtest-record-actions">
              <button onClick={() => startEdit(record)}>Edit</button>
              <button className="danger" onClick={() => remove(record.id)}>Delete</button>
            </div>
          </article>
        ))}
        {deckRecords.length === 0 && <div className="empty-state">No playtests recorded for this deck.</div>}
      </section>
    </section>
  );
}
