# Application Navigation

Gigsmith organizes its tools into five locally selected views:

- **Deck:** deck library, deck editor, card database, and deck counts.
- **Analysis:** RAM limits, validation results, and Eddy curve.
- **Gigs:** Gig control and Street Cred board state.
- **Tactics:** attack-line and Blocker evaluation.
- **Transfer:** text/JSON import, export, and share links.

The active view is stored under `gigsmith.active-view.v1`. It is presentation
state only and contains no deck data. Changing views does not push browser
history entries, so Back and Forward remain available for actual navigation
such as shared links and source pages.

All view panels remain mounted while inactive. This preserves unsaved Gig and
tactical sandbox state during view changes. Inactive panels use the native
`hidden` attribute and are removed from the accessibility tree.

The tab list supports pointer input plus Left Arrow, Right Arrow, Home, and End.
