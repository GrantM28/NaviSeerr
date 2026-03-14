# NaviSeerr

NaviSeerr is a self-hosted discovery and collection-completion companion for Navidrome. It connects to your Navidrome library, scans what you already own, and builds a dashboard around what should come next.

## What the MVP does

- Connects to a Navidrome server with Subsonic-compatible auth
- Scans the library and builds artist + album inventory
- Flags missing release groups for artists already in the collection
- Surfaces recent missing releases from artists you already follow
- Suggests similar artists using Navidrome similarity data, then Last.fm if configured
- Lets you save albums and artists to a local wishlist
- Optionally sends wishlist items to a custom webhook for the rest of your stack

## Stack

- Next.js 15
- React 19
- TypeScript
- File-based JSON storage under `data/`

No external database is required for the MVP. Settings, cached scan output, and wishlist items are stored as JSON files so the app is easy to ship in Docker and easy to back up.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in your Navidrome credentials.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

You can also leave the environment variables empty and save everything through the in-app settings form instead.

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build -d
```

Then open `http://your-server:3000`.

### Recommended volume

Mount `./data` to `/app/data` so you keep:

- saved settings
- cached scan report
- wishlist queue

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NAVIDROME_URL` | Base URL for your Navidrome server |
| `NAVIDROME_USERNAME` | Navidrome username |
| `NAVIDROME_PASSWORD` | Navidrome password or app password |
| `LASTFM_API_KEY` | Optional. Improves similar-artist suggestions when Navidrome does not return them |
| `REQUEST_WEBHOOK_URL` | Optional. POST target for sending wanted items to your own downloader workflow |
| `MUSICBRAINZ_CONTACT` | Optional but recommended for MusicBrainz User-Agent contact info |
| `DATA_DIR` | Directory used for JSON persistence |

## Notes on the current scan model

- NaviSeerr scans the top artists by album count, not every artist in one pass. This keeps MusicBrainz lookups practical and avoids slow scans on large libraries.
- Missing discography is based on MusicBrainz release groups, which is strong for albums, EPs, compilations, and live releases, but not a perfect edition-level match.
- Recent releases are based on the configurable release window in settings.
- Similar artists first try Navidrome's own `getArtistInfo2` data, then fall back to Last.fm if you supply an API key.

## Sending wanted items to your stack

If you set `REQUEST_WEBHOOK_URL`, NaviSeerr will send a JSON payload like this when you click `Send` in the wishlist:

```json
{
  "type": "naviseerr.wanted",
  "wanted": {
    "id": "uuid",
    "artist": "Deftones",
    "title": "Koi No Yokan",
    "type": "album",
    "reason": "Missing album from Deftones",
    "source": "missing-discography",
    "status": "saved",
    "createdAt": "2026-03-14T18:00:00.000Z"
  }
}
```

That gives you a simple bridge for Lidarr automation, a custom script, or a queue service without locking the MVP to one downloader.

## Good next steps

- Add a real Lidarr integration target
- Add per-user auth instead of a single shared config
- Cache MusicBrainz artist matches and release catalogs independently
- Add similar-song and listening-history based recommendation paths
- Add tour dates and upcoming release views
