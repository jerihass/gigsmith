import { useMemo, useState } from "react";
import { Dices, Minus, Plus, RotateCcw, SkipForward, X } from "lucide-react";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Gig, GigMatchIssue, GigMatchState, GigMatchTransition } from "@gigsmith/data-contracts";
import {
  advanceGigMatchTurn,
  createGigMatch,
  gainGig,
  gigDieMaximum,
  reportGigMatch,
  setMatchGigValue,
  stealGig
} from "@gigsmith/rules-core";

const playerIds: [string, string] = ["player", "rival"];

function playerLabel(playerId: string): string {
  return playerId === "player" ? "You" : "Rival";
}

function gigLocation(gig: Gig): string {
  if (!gig.controllerId) return `${playerLabel(gig.ownerId ?? "")} Fixer`;
  return `${playerLabel(gig.controllerId)} Gig area`;
}

function controlledByPlayer(match: GigMatchState, playerId: string): Gig[] {
  return match.gigs.filter((gig) => gig.controllerId === playerId);
}

function fixerDiceForPlayer(match: GigMatchState, playerId: string): Gig[] {
  return match.gigs.filter((gig) => gig.ownerId === playerId && !gig.controllerId);
}

function randomRoll(gig: Gig): number {
  return Math.floor(Math.random() * gigDieMaximum(gig.dieType)) + 1;
}

export function GigSandbox({ match, onChange }: { match: GigMatchState; onChange: (match: GigMatchState) => void }) {
  const [issues, setIssues] = useState<GigMatchIssue[]>([]);
  const [editingGigId, setEditingGigId] = useState<string | undefined>();
  const report = useMemo(() => reportGigMatch(match, cyberpunkRulesetV1Printable), [match]);
  const activeLabel = playerLabel(report.activePlayerId);
  const mustGainGig = !match.gainedGigThisTurn && report.availableGigIds.length > 0;
  const matchStarted = match.gigs.some((gig) => Boolean(gig.controllerId));
  const orderedPlayerIds = useMemo(
    () => [...playerIds].sort((left, right) => Number(right === report.activePlayerId) - Number(left === report.activePlayerId)),
    [report.activePlayerId]
  );

  function apply(transition: GigMatchTransition) {
    onChange(transition.state);
    setIssues(transition.issues);
  }

  function reset(firstPlayerId = match.firstPlayerId) {
    onChange(createGigMatch(playerIds, firstPlayerId, cyberpunkRulesetV1Printable));
    setIssues([]);
    setEditingGigId(undefined);
  }

  function updateValue(gig: Gig, value: number) {
    apply(setMatchGigValue(match, gig.id, value));
  }

  function renderFixerGig(gig: Gig) {
    const available = report.availableGigIds.includes(gig.id) && !match.gainedGigThisTurn && !match.winnerId;
    const issue = issues.find((candidate) => candidate.affectedGigIds.includes(gig.id));

    return (
      <article className={`match-gig fixer-gig${issue ? " invalid" : ""}`} key={gig.id}>
        <div className="gig-die">
          <strong>{gig.dieType}</strong>
          <span>{gig.ownerId === "player" ? "Your die" : "Rival die"}</span>
        </div>
        <div className="gig-location">
          <strong>{gigLocation(gig)}</strong>
          <span>{gig.dieType === "d20" && !available ? "Must be gained last" : "Unrolled"}</span>
        </div>

        <button
          className="gig-command"
          aria-label={`Roll and gain ${playerLabel(gig.ownerId ?? "")} ${gig.dieType}`}
          disabled={!available}
          onClick={() => apply(gainGig(match, gig.id, randomRoll(gig), cyberpunkRulesetV1Printable))}
        >
          <Dices size={16} aria-hidden="true" /> Roll &amp; gain
        </button>
        {issue && <span className="gig-issue">{issue.message}</span>}
      </article>
    );
  }

  function renderControlledGig(gig: Gig) {
    const rivalControlled = Boolean(gig.controllerId && gig.controllerId !== match.activePlayerId);
    const issue = issues.find((candidate) => candidate.affectedGigIds.includes(gig.id));
    const maximum = gigDieMaximum(gig.dieType);
    const editing = editingGigId === gig.id && !match.winnerId;

    return (
      <article className={`match-gig controlled-gig${issue ? " invalid" : ""}`} key={gig.id}>
        <div className="gig-die">
          <strong>{gig.dieType}</strong>
          <span>{gig.ownerId === "player" ? "Your die" : "Rival die"}</span>
        </div>
        <div className="gig-location">
          <strong>{gigLocation(gig)}</strong>
          <span>Rolled value</span>
        </div>

        <div className="gig-value-editor">
          <button
            className="gig-value-trigger"
            aria-expanded={editing}
            aria-label={`Edit ${gig.dieType} value, currently ${gig.value} of ${maximum}`}
            disabled={Boolean(match.winnerId)}
            onClick={() => setEditingGigId(editing ? undefined : gig.id)}
          >
            <strong>{gig.value}</strong>
            <span>/{maximum}</span>
          </button>
          {editing && (
            <div className="gig-value-popover" role="dialog" aria-label={`Edit ${gig.dieType} value`}>
              <div className="gig-value-popover-heading">
                <strong>{gig.dieType} value</strong>
                <button className="icon-button" aria-label={`Close ${gig.dieType} value editor`} title="Close" onClick={() => setEditingGigId(undefined)}>
                  <X size={16} />
                </button>
              </div>
              <div className="gig-value-controls" aria-label={`Value controls for ${gig.dieType} owned by ${playerLabel(gig.ownerId ?? "")}`}>
                <button className="icon-button" aria-label={`Decrease ${gig.dieType}`} title="Decrease value" disabled={gig.value <= 1} onClick={() => updateValue(gig, gig.value - 1)}><Minus size={16} /></button>
                <input aria-label={`Value for ${gig.id}`} type="number" min="1" max={maximum} value={gig.value} onChange={(event) => updateValue(gig, Number(event.target.value))} />
                <button className="icon-button" aria-label={`Increase ${gig.dieType}`} title="Increase value" disabled={gig.value >= maximum} onClick={() => updateValue(gig, gig.value + 1)}><Plus size={16} /></button>
                <button className="icon-button" aria-label={`Reroll ${gig.dieType}`} title="Reroll" onClick={() => updateValue(gig, randomRoll(gig))}><Dices size={16} /></button>
              </div>
            </div>
          )}
        </div>
        <button className="gig-command" aria-label={`Steal ${gig.dieType} for ${activeLabel}`} disabled={!rivalControlled || Boolean(match.winnerId)} onClick={() => apply(stealGig(match, gig.id, cyberpunkRulesetV1Printable))}>Steal for {activeLabel}</button>
        {issue && <span className="gig-issue">{issue.message}</span>}
      </article>
    );
  }

  function renderPlayerBoard(playerId: string) {
    const player = report.players.find((candidate) => candidate.playerId === playerId);
    const fixerDice = fixerDiceForPlayer(match, playerId);
    const controlledGigs = controlledByPlayer(match, playerId);
    const isActive = playerId === match.activePlayerId;

    return (
      <section className={`gig-player-board${isActive ? " active" : ""}`} aria-labelledby={`${playerId}-board-title`} key={playerId}>
        <div className="gig-player-heading">
          <div>
            <p className="section-kicker">{isActive ? "Current turn" : "Waiting"}</p>
            <h3 id={`${playerId}-board-title`}>{playerLabel(playerId)}</h3>
          </div>
          <div className="gig-player-stats" aria-label={`${playerLabel(playerId)} Gig totals`}>
            <strong>{player?.controlledGigCount ?? 0} Gigs</strong>
            <span>{player?.streetCred ?? 0} Street Cred</span>
          </div>
        </div>

        <div className="gig-zone-grid">
          <section className="gig-zone controlled-zone" aria-label={`${playerLabel(playerId)} controlled Gigs`}>
            <div className="gig-zone-title">
              <h4>Controlled Gigs</h4>
              <span>{controlledGigs.length} total</span>
            </div>
            <div className="gig-list">
              {controlledGigs.length ? controlledGigs.map(renderControlledGig) : <p className="empty-state">No controlled Gigs.</p>}
            </div>
          </section>

          <section className="gig-zone fixer-zone" aria-label={`${playerLabel(playerId)} Fixer dice`}>
            <div className="gig-zone-title">
              <h4>Fixer</h4>
              <span>{fixerDice.length} dice</span>
            </div>
            <div className="gig-list">
              {fixerDice.length ? fixerDice.map(renderFixerGig) : <p className="empty-state">No dice in Fixer.</p>}
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="panel gig-sandbox">
      <div className="panel-title gig-sandbox-title">
        <div><p className="section-kicker">Fixed 12-die pool</p><h2>Gig Match Tracker</h2></div>
        <button onClick={() => reset()}><RotateCcw size={16} aria-hidden="true" /> Reset match</button>
      </div>

      <div className="gig-match-toolbar">
        <div>
          <span className="control-label">First player</span>
          <div className="segmented-control" role="group" aria-label="First player">
            {playerIds.map((playerId) => (
              <button
                key={playerId}
                aria-pressed={match.firstPlayerId === playerId}
                disabled={matchStarted}
                title={matchStarted ? "Reset the match to change the first player." : undefined}
                onClick={() => reset(playerId)}
              >{playerLabel(playerId)}</button>
            ))}
          </div>
        </div>
        <div className="turn-command">
          <span className="control-label">{report.overtime ? "Overtime" : `Turn ${report.activePlayerTurn}`} · {activeLabel}</span>
          <button className="primary" disabled={Boolean(match.winnerId) || mustGainGig} onClick={() => apply(advanceGigMatchTurn(match, cyberpunkRulesetV1Printable))}>
            <SkipForward size={16} aria-hidden="true" /> End turn
          </button>
        </div>
      </div>

      {match.winnerId && (
        <div className="gig-winner" role="status">
          <strong>{playerLabel(match.winnerId)} win</strong>
          <span>{match.winReason === "overtime-majority" ? "Seven Gigs during overtime." : "Started the turn with seven Gigs."}</span>
        </div>
      )}

      <dl className="street-cred-summary">
        {report.players.map((player) => (
          <div className={player.playerId === "player" ? "friendly-cred" : "rival-cred"} key={player.playerId}>
            <dt>{playerLabel(player.playerId)}</dt>
            <dd>{player.controlledGigCount} {player.controlledGigCount === 1 ? "Gig" : "Gigs"}</dd>
            <dd className="street-cred-detail">{player.streetCred} Street Cred · {player.fixerGigCount} in Fixer</dd>
          </div>
        ))}
        <div><dt>Start phase</dt><dd>{mustGainGig ? "Gain 1" : "Complete"}</dd><dd className="street-cred-detail">d20 is always last</dd></div>
      </dl>

      {issues.some((issue) => issue.affectedGigIds.length === 0) && (
        <div className="gig-global-issue" role="status">{issues.find((issue) => issue.affectedGigIds.length === 0)?.message}</div>
      )}

      <div className="gig-player-boards">
        {orderedPlayerIds.map(renderPlayerBoard)}
      </div>
    </section>
  );
}
