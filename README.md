# Music Atlas — האטלס המוזיקלי

Hebrew RTL, mobile-friendly PWA for exploring singers, bands, and composers through Wikidata and Wikipedia. It includes multilingual search, biography cards, representative images, a small set of sourced name stories, and automatic name-component identification where Wikidata records the given and family names. Sourced dictionary links and checked Hebrew explanations appear when available. For Hebrew given names that are also common words, the app automatically checks Hebrew Wiktionary for an exact entry recording both the name and the word sense, then labels the word's meaning separately from the person's naming history. When a two-part displayed name has a documented given name but no family-name claim, the other part remains explicitly unclassified. For name components without a verified dictionary meaning, the app can show a short, qualified excerpt from the artist's Hebrew Wikipedia biography if it specifically discusses the origin of that name; otherwise it says no verified meaning was found.

## Deployment

Import the GitHub repository into Vercel as an **Other** framework, with the repository root as the root directory. This is a static application (no build command, output directory `.`). HTTPS is required for PWA installation.

## APIs

Browser requests use the public Wikidata Action API, Wikipedia REST page summaries, and Wiktionary. Search results are limited to people with musical occupations and musical groups. A singer who is also a composer appears in both filters. Given and family names are matched to the displayed name before being shown, so a birth surname cannot be mistaken for a stage surname. A dictionary entry's meaning is not assumed to explain why a person received their name. The app uses Wikidata entity IDs to keep curated name stories attached to the right person.

## Offline use

The service worker stores the app shell for offline launch. Opening a profile saves up to 20 recently viewed artist cards in the device's local storage. On a later offline visit, those cards can be opened and searched by their stored names; they are marked as saved information that may have changed. New artists, images not already available to the browser, and live dictionary lookups need an internet connection. Browser storage can be cleared by the user or the operating system.

## Checks

Run `node --test` to check artist filtering, name labels, saved cards, and the service worker shell cache. No build step is required.

## Future phases

1. Broaden verified Hebrew name explanations; add five notable songs or compositions with YouTube links.
2. Offline-first local playlists with export/import.
3. Secure Google OAuth and YouTube Data API playlist creation, editing, and additions.
