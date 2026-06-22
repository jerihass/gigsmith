import { memo, useState } from "react";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { createGigMatch } from "@gigsmith/rules-core";
import { GigOddsPanel } from "./GigOddsPanel";
import { GigSandbox } from "./GigSandbox";

export const GigWorkspace = memo(function GigWorkspace({ deck }: { deck: Deck }) {
  const [match, setMatch] = useState(() =>
    createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable)
  );

  return (
    <div className="gig-workspace">
      <GigOddsPanel deck={deck} match={match} onMatchChange={setMatch} />
      <GigSandbox match={match} onChange={setMatch} />
    </div>
  );
});
