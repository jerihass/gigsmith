import { useMemo, useState } from "react";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { BoardState, Deck, DieType, Gig } from "@gigsmith/data-contracts";
import { calculateStreetCred } from "@gigsmith/rules-core";
import {
  assignGigController,
  changeGigDieType,
  createSandboxGig,
  dieMaximums,
  dieTypes,
  gigController,
  type GigController
} from "../gigSandbox";

function createGigId(): string {
  return typeof crypto.randomUUID === "function"
    ? `gig-${crypto.randomUUID()}`
    : `gig-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function GigSandbox({ deck }: { deck: Deck }) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const boardState = useMemo<BoardState>(() => ({
    players: [{ id: "player", deck, eddies: 0 }, { id: "rival", deck, eddies: 0 }],
    gigs,
    activePlayerId: "player",
    turn: 1
  }), [deck, gigs]);
  const playerStreetCred = useMemo(() => calculateStreetCred(boardState, "player", cyberpunkRulesetV1Printable), [boardState]);
  const rivalStreetCred = useMemo(() => calculateStreetCred(boardState, "rival", cyberpunkRulesetV1Printable), [boardState]);
  const fixerCount = gigs.filter((gig) => !gig.controllerId).length;
  const issues = [...playerStreetCred.issues, ...rivalStreetCred.issues];

  function updateGig(gigId: string, update: (gig: Gig) => Gig) {
    setGigs((current) => current.map((gig) => gig.id === gigId ? update(gig) : gig));
  }

  return (
    <section className="panel gig-sandbox">
      <div className="panel-title gig-sandbox-title">
        <div><p className="section-kicker">Exact board state</p><h2>Gig Sandbox</h2></div>
        <button className="primary" onClick={() => setGigs((current) => [...current, createSandboxGig(createGigId(), current.length)])}>+ Add Gig</button>
      </div>

      <dl className="street-cred-summary">
        <div className="friendly-cred"><dt>Your Street Cred</dt><dd>{playerStreetCred.total}</dd><small>{playerStreetCred.contributions.length} controlled Gigs</small></div>
        <div className="rival-cred"><dt>Rival Street Cred</dt><dd>{rivalStreetCred.total}</dd><small>{rivalStreetCred.contributions.length} controlled Gigs</small></div>
        <div><dt>Fixer Area</dt><dd>{fixerCount}</dd><small>uncontrolled Gigs</small></div>
      </dl>

      <div className="gig-list">
        {gigs.map((gig, index) => {
          const issue = issues.find((candidate) => candidate.affectedGigIds.includes(gig.id));
          return (
            <article className={`gig-row${issue ? " invalid" : ""}`} key={gig.id}>
              <div className="gig-index" aria-hidden="true">{index + 1}</div>
              <label className="field"><span>Die</span><select aria-label={`Die type for Gig ${index + 1}`} value={gig.dieType} onChange={(event) => updateGig(gig.id, (current) => changeGigDieType(current, event.target.value as DieType))}>{dieTypes.map((dieType) => <option key={dieType}>{dieType}</option>)}</select></label>
              <label className="field"><span>Value</span><input aria-label={`Value for Gig ${index + 1}`} type="number" min="1" max={dieMaximums[gig.dieType]} step="1" value={gig.value} onChange={(event) => updateGig(gig.id, (current) => ({ ...current, value: Number(event.target.value) }))} /></label>
              <label className="field gig-controller-field"><span>Control</span><select aria-label={`Controller for Gig ${index + 1}`} value={gigController(gig)} onChange={(event) => updateGig(gig.id, (current) => assignGigController(current, event.target.value as GigController))}><option value="player">You</option><option value="rival">Rival</option><option value="fixer">Fixer</option></select></label>
              <button className="icon-button gig-remove" aria-label={`Remove Gig ${index + 1}`} title="Remove Gig" onClick={() => setGigs((current) => current.filter((candidate) => candidate.id !== gig.id))}>×</button>
              {issue && <span className="gig-issue">{issue.code === "invalid-gig-value" ? `Value must be a whole number from 1 to ${dieMaximums[gig.dieType]} for ${gig.dieType}.` : issue.message}</span>}
            </article>
          );
        })}
        {gigs.length === 0 && <div className="empty-state">No Gigs in this board state.</div>}
      </div>
    </section>
  );
}
