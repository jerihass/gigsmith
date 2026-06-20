# Rules Source Baseline

Gigsmith's current rules baseline is the official printable gameplay guide retrieved on June 20, 2026.

- Source: `https://cyberpunktcg.com/docs/printable-gameplay-guide.pdf`
- Local copy: `docs/sources/printable-gameplay-guide-2026-06-20.pdf`
- SHA-256: `d7b090d8f6b0ce71e5a180c578d9c2ac9a625cd242ce304fda7f7a624d596378`
- Ruleset: `ruleset.v1-printable-2026-06-19`

Use the local copy for routine implementation and review. Check the remote source no more than once per week. When its bytes change, compare the new guide with this baseline before replacing the local file or changing rules code. A confirmed rules change must update the dated PDF, hash, ruleset version, uncertainty register, and affected tests together.

The current Gig baseline is:

- Each player has one `d4`, `d6`, `d8`, `d10`, `d12`, and `d20` in their Fixer area.
- At the start of each turn, after drawing, the active player rolls and gains one die from their own Fixer area; the `d20` is always last.
- Street Cred is the sum of values in a player's Gig area.
- Starting a turn with at least seven Gigs wins before gaining another Gig.
- Overtime begins after the second player's seventh turn. During overtime, controlling seven Gigs wins immediately.
