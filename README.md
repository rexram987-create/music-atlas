# Music Atlas — האטלס המוזיקלי

Hebrew RTL, mobile-friendly PWA for exploring singers, bands, and composers through Wikidata and Wikipedia. Phase 1 includes multilingual search, dynamic biography cards, representative images, and an installable app shell.

## Deployment

Import the GitHub repository into Vercel as an **Other** framework, with the repository root as the root directory. This is a static application (no build command, output directory `.`). HTTPS is required for PWA installation.

## APIs

Browser requests use the public Wikidata Action API and Wikipedia REST page summaries. Information is linked back to the primary pages. In this first phase, song rankings, name etymology, and YouTube playlists are intentionally not implemented; they belong to later phases.

## Future phases

1. Name etymology with sourced facts; five notable songs or compositions with YouTube links.
2. Offline-first local playlists with export/import.
3. Secure Google OAuth and YouTube Data API playlist creation, editing, and additions.
