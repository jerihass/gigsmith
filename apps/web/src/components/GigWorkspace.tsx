import { memo, useState } from "react";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { CardDatabase, Deck } from "@gigsmith/data-contracts";
import { createGigMatch } from "@gigsmith/rules-core";
import { GigOddsPanel } from "./GigOddsPanel";
import { GigSandbox } from "./GigSandbox";

export const GigWorkspace = memo(function GigWorkspace({ deck, cardDb }: { deck: Deck; cardDb: CardDatabase }) {
  const [match, setMatch] = useState(() =>
    createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable)
  );

  return (
    <div className="gig-workspace">
      <GigOddsPanel deck={deck} cardDb={cardDb} match={match} onMatchChange={setMatch} />
      <GigSandbox match={match} onChange={setMatch} />
    </div>
  );
});
