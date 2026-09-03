# Application Navigation

Gigsmith organizes its tools into seven locally selected views:

- **Deck:** deck library, deck editor, and deck counts.
- **Cards:** searchable card library, filters, card details, and active-deck additions.
- **Analysis:** RAM limits, validation, Eddy curve, hand analysis, and deck-driven Gig odds.
- **Journal:** playtest records tied to deck versions.
- **Gigs:** fixed 12-die match state, turn flow, Street Cred, and win tracking.
- **Print:** deck reports and printable proxy cards.
- **Transfer:** text/JSON import, export, and share links.

The active view is stored under `gigsmith.active-view.v1`. It is presentation
state only and contains no deck data. Changing views does not push browser
history entries, so Back and Forward remain available for actual navigation
such as shared links and source pages.

All view panels remain mounted while inactive. This preserves unsaved Gig state
during view changes. Inactive panels use the native `hidden` attribute and are
removed from the accessibility tree. A stored selection for the retired Tactics
view safely falls back to Deck.

The tab list supports pointer input plus Left Arrow, Right Arrow, Home, and End.
