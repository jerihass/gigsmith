import { useMemo, useState } from "react";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { AttackLine, BoardState, Deck, Gig, TacticalUnit } from "@gigsmith/data-contracts";
import { evaluateAttackLines } from "@gigsmith/rules-core";

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function lineTitle(line: AttackLine, unitNames: Map<string, string>): string {
  if (line.blockerUnitId) return `Blocker redirects to ${unitNames.get(line.blockerUnitId) ?? "rival Unit"}`;
  if (line.outcome === "steal") return `Attack rival Gig area: steal ${line.gigsStolen ?? 0}`;
  if (line.finalTarget.type === "unit") return `Fight ${unitNames.get(line.finalTarget.unitId) ?? "rival Unit"}`;
  return "Attack line";
}

function lineDetail(line: AttackLine): string {
  if (line.reasons.length > 0) return line.reasons.map((entry) => entry.message).join(" ");
  if (line.outcome === "steal") {
    return line.gigsStolen === 1 ? "Move 1 rival Gig to your Gig area." : `Move ${line.gigsStolen ?? 0} rival Gigs to your Gig area.`;
  }
  if (line.fightResult === "attacker-defeated") return "The attacking Unit is defeated.";
  if (line.fightResult === "defender-defeated") return "The defending Unit is defeated.";
  return "Both Units are defeated.";
}

export function TacticalSandbox({ deck }: { deck: Deck }) {
  const [attackerPower, setAttackerPower] = useState(5);
  const [attackerReady, setAttackerReady] = useState(true);
  const [attackerLag, setAttackerLag] = useState(false);
  const [targetPower, setTargetPower] = useState(4);
  const [targetReady, setTargetReady] = useState(false);
  const [blockerPresent, setBlockerPresent] = useState(true);
  const [blockerPower, setBlockerPower] = useState(3);
  const [blockerReady, setBlockerReady] = useState(true);
  const [blockerKeyword, setBlockerKeyword] = useState(true);
  const [rivalGigCount, setRivalGigCount] = useState(2);

  const units = useMemo<TacticalUnit[]>(() => {
    const current: TacticalUnit[] = [
      { id: "attacker", controllerId: "player", name: "Your Unit", power: attackerPower, ready: attackerReady, hasLag: attackerLag, hasBlocker: false },
      { id: "target", controllerId: "rival", name: "Rival Unit", power: targetPower, ready: targetReady, hasLag: false, hasBlocker: false }
    ];
    if (blockerPresent) {
      current.push({ id: "blocker", controllerId: "rival", name: "Rival Blocker", power: blockerPower, ready: blockerReady, hasLag: false, hasBlocker: blockerKeyword });
    }
    return current;
  }, [attackerLag, attackerPower, attackerReady, blockerKeyword, blockerPower, blockerPresent, blockerReady, targetPower, targetReady]);

  const gigs = useMemo<Gig[]>(() => Array.from({ length: rivalGigCount }, (_, index) => ({
    id: `tactical-gig-${index + 1}`,
    dieType: "d6",
    value: 3,
    controllerId: "rival"
  })), [rivalGigCount]);

  const report = useMemo(() => {
    const boardState: BoardState = {
      players: [{ id: "player", deck, eddies: 0 }, { id: "rival", deck, eddies: 0 }],
      units,
      gigs,
      activePlayerId: "player",
      turn: 1
    };
    return evaluateAttackLines(boardState, cyberpunkRulesetV1Printable);
  }, [deck, gigs, units]);
  const unitNames = useMemo(() => new Map(units.map((unit) => [unit.id, unit.name])), [units]);
  const legalCount = report.lines.filter((line) => line.legal).length;

  return (
    <section className="panel tactical-sandbox">
      <div className="panel-title tactical-title">
        <div><p className="section-kicker">Attack resolution</p><h2>Tactical Sandbox</h2></div>
        <span className="result-count">{legalCount} legal / {report.lines.length} lines</span>
      </div>

      <div className="tactical-controls">
        <fieldset>
          <legend>Your attacker</legend>
          <label className="field"><span>Power</span><input aria-label="Attacker power" type="number" min="0" max="99" step="1" value={attackerPower} onChange={(event) => setAttackerPower(clampInteger(Number(event.target.value), 0, 99))} /></label>
          <label className="binary-field"><input type="checkbox" checked={attackerReady} onChange={(event) => setAttackerReady(event.target.checked)} /><span>Ready</span></label>
          <label className="binary-field"><input type="checkbox" checked={attackerLag} onChange={(event) => setAttackerLag(event.target.checked)} /><span>Has Lag</span></label>
        </fieldset>

        <fieldset>
          <legend>Rival Unit</legend>
          <label className="field"><span>Power</span><input aria-label="Rival Unit power" type="number" min="0" max="99" step="1" value={targetPower} onChange={(event) => setTargetPower(clampInteger(Number(event.target.value), 0, 99))} /></label>
          <label className="binary-field"><input type="checkbox" checked={targetReady} onChange={(event) => setTargetReady(event.target.checked)} /><span>Ready</span></label>
        </fieldset>

        <fieldset>
          <legend>Rival Blocker</legend>
          <label className="field"><span>Power</span><input aria-label="Blocker power" type="number" min="0" max="99" step="1" disabled={!blockerPresent} value={blockerPower} onChange={(event) => setBlockerPower(clampInteger(Number(event.target.value), 0, 99))} /></label>
          <label className="binary-field"><input type="checkbox" checked={blockerPresent} onChange={(event) => setBlockerPresent(event.target.checked)} /><span>In field</span></label>
          <label className="binary-field"><input type="checkbox" disabled={!blockerPresent} checked={blockerReady} onChange={(event) => setBlockerReady(event.target.checked)} /><span>Ready</span></label>
          <label className="binary-field"><input type="checkbox" disabled={!blockerPresent} checked={blockerKeyword} onChange={(event) => setBlockerKeyword(event.target.checked)} /><span>Has Blocker</span></label>
        </fieldset>

        <fieldset>
          <legend>Rival Gigs</legend>
          <label className="field"><span>Controlled dice</span><input aria-label="Rival Gig count" type="number" min="0" max="12" step="1" value={rivalGigCount} onChange={(event) => setRivalGigCount(clampInteger(Number(event.target.value), 0, 12))} /></label>
        </fieldset>
      </div>

      <div className="attack-lines" aria-live="polite">
        {report.lines.map((line) => (
          <article className={`attack-line ${line.legal ? "legal" : "blocked"}`} key={line.id}>
            <div><strong>{lineTitle(line, unitNames)}</strong><span>{lineDetail(line)}</span></div>
            <span className="line-status">{line.legal ? "Legal" : "Blocked"}</span>
          </article>
        ))}
      </div>

      <details className="tactical-notes">
        <summary>Rules scope and assumptions</summary>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        {report.warnings.map((warning) => <p key={warning.code}>{warning.message}{warning.relatedRuleUncertainty ? ` (${warning.relatedRuleUncertainty})` : ""}</p>)}
      </details>
    </section>
  );
}
