# Rule Uncertainty Register

Gigsmith uses `ruleset.v1-printable-2026-06-19`, derived from the official
[printable gameplay guide](https://cyberpunktcg.com/docs/printable-gameplay-guide.pdf).
This register separates rules confirmed by that guide from interactions that the
guide does not resolve precisely enough for deterministic tactical advice.

## Confirmed Attack Baseline

The attack-line model may rely on these rules:

1. Only a ready Unit can attack. Units with Lag cannot attack.
2. The attacker is spent first, then its attack triggers resolve.
3. The attacker declares either a spent rival Unit or the rival Gig area as its target.
4. The defending player may then take any number of reactions: Call a Legend, use
   Quick effects, and use Blocker.
5. Blocker spends a ready Unit and redirects the attack to that Unit. The redirected
   attack becomes a fight and steals no Gigs, even when the Blocker is defeated.
6. A Gig-area attack steals no Gigs at power 0, one at power 1-9, two at power
   10-19, three at power 20-29, and so on, limited by available rival Gigs.
7. A fight compares power; the lower-power Unit is defeated and a tie defeats both.

These are rules-core behavior and require executable tests.

## Open Questions

### RU-001: Reaction Ordering

**Question:** When the defender takes multiple reactions, who chooses their order,
and does each reaction fully resolve before another reaction is declared?

**Current handling:** The first tactical model reports reaction windows but does not
simulate Quick or Call-a-Legend effects. It must not recommend an ordering.

**Resolution needed:** An official comprehensive rules document or ruling defining
reaction priority and resolution order.

### RU-002: Multiple Redirects

**Question:** Can more than one Blocker or redirect effect be used during one attack,
and if so, which redirect determines the final defender?

**Current handling:** The model treats the presence of at least one ready Blocker as
making an unqualified Gig steal unsafe. It exposes each ready Blocker as a possible
redirect but does not choose among competing redirects.

**Resolution needed:** An official ruling on repeated or competing redirects.

### RU-003: Blocker Prevention And Bypass

**Question:** How do card effects that prevent reactions, prevent spending, remove a
Blocker, or say an attack cannot be redirected interact with the Blocker window?

**Current handling:** Generic `bypassed` state is not a game rule and must not appear
as a legal shortcut. A Blocker only stops affecting an evaluated line when explicit
board state says it is spent, defeated, absent, or unable to react for a documented
card-effect reason.

**Resolution needed:** Card-specific rulings or comprehensive timing rules.

### RU-004: Mid-Attack Power And Target Changes

**Question:** When reactions alter power, readiness, control, or target eligibility,
at which exact points are fight and steal quantities locked in?

**Current handling:** The base model evaluates the supplied post-reaction power and
final target. It does not infer intermediate card-effect sequencing.

**Resolution needed:** An official timing chart covering state checks during attacks.

## Test Policy

- Confirmed baseline behavior gets active unit tests.
- Unsupported interactions return structured warnings or reasons.
- A pending test must reference an `RU-###` entry and state what ruling would make
  the expected result deterministic.
- Removing an uncertainty requires updating this document, the versioned ruleset,
  and the associated regression tests in the same change.

