# Music Atlas — האטלס המוזיקלי

Hebrew RTL, mobile-friendly PWA for exploring singers, bands, and composers through Wikidata and Wikipedia. It includes multilingual search, representative images, and a short biographical excerpt of up to five complete sentences drawn from the artist's Wikipedia article. When the article introduction is too short, a relevant first biography paragraph can complete it. If the article has less information, the card shows only available sentences; it never fabricates missing details. When Wikipedia has an artist-specific song category, the card also lists up to five linked song articles in alphabetical order with clearly labeled YouTube search links. These are documented examples, not a ranking or verified video links.

## Deployment

Import the GitHub repository into Vercel as an **Other** framework, with the repository root as the root directory. This is a static application (no build command, output directory `.`). HTTPS is required for PWA installation.

## APIs

Browser requests use the public Wikidata Action API, Wikipedia REST page summaries, and the Wikipedia Action API for plain-text article extracts and artist-specific song category pages when a card is opened. Search results are limited to people with musical occupations and musical groups. A singer who is also a composer appears in both filters. Hebrew Wikipedia is preferred when available; English category titles are checked if the Hebrew song category is missing. Name explanations and etymology are no longer rendered on artist cards.

The `/api/youtube-top` Vercel Function uses the YouTube Data API to search up to 50 music-category videos sorted by views, retrieve current view counts, keep videos from the artist's Wikidata-linked YouTube channel when available (otherwise channels named for the artist), remove obvious covers and repeated video versions, and show up to five distinct videos. This is a sampled video-view ranking, **not** the all-time most popular songs across every upload. Configure `YOUTUBE_API_KEY` as a Vercel environment variable for Production and Preview and enable YouTube Data API v3 for that key in Google Cloud. Do not commit the key to the repository. Missing configuration or upstream failures display a message while Wikipedia song links remain available. Successful responses are cached by Vercel for six hours to reduce API usage.

## Offline use

The service worker stores the app shell for offline launch. Opening a profile saves up to 20 recently viewed artist cards in the device's local storage, including the biographical excerpt and song examples once they are loaded. On a later offline visit, those cards can be opened and searched by their stored names; they are marked as saved information that may have changed. New artists and images not already available to the browser need an internet connection. Browser storage can be cleared by the user or the operating system.

## Checks

Run `node --test` to check artist filtering, biography excerpts, saved cards, and the service worker shell cache. No build step is required.

## Future phases

1. Offline-first local playlists with export/import.
2. Secure Google OAuth and YouTube Data API playlist creation, editing, and additions.
