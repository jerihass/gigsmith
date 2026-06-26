import { memo } from "react";
import type { CardDatabase, Deck, GigMatchState } from "@gigsmith/data-contracts";
import { GigOddsPanel } from "./GigOddsPanel";
import { GigSandbox } from "./GigSandbox";

export const GigWorkspace = memo(function GigWorkspace({
  deck,
  cardDb,
  match,
  onMatchChange
}: {
  deck: Deck;
  cardDb: CardDatabase;
  match: GigMatchState;
  onMatchChange: (match: GigMatchState) => void;
}) {
  return (
    <div className="gig-workspace">
      <GigOddsPanel deck={deck} cardDb={cardDb} match={match} onMatchChange={onMatchChange} />
      <GigSandbox match={match} onChange={onMatchChange} />
    </div>
  );
});
