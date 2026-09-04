# Draft Board

A TV-friendly, browser-based fantasy football draft board. Runs entirely client-side (no backend) and syncs live with a [Sleeper](https://sleeper.com) draft, or runs fully offline as a manual mock draft board.

## Features

- **Sleeper live sync** — connect with a Sleeper league ID or draft ID; polls every few seconds and reflects picks as they happen, with connection/draft status (connecting, connected, offline, not started, in progress, paused, complete)
- **Manual mock drafts** — run a fully local draft not tied to Sleeper at all
- **Draft library** — every draft is saved locally in the browser (IndexedDB); rename, duplicate, archive/unarchive, delete, or bulk-delete archived drafts
- **Draft setup** — team count, team names (auto-filled from Sleeper league members when connected), snake/linear draft type, scoring format, rounds, pick timer, season
- **Board + clock** — round × team grid with an "on the clock" indicator; countdown clock (start/pause/resume/reset for manual drafts)
- **Pick editing** — manually draft a player, replace/clear an existing pick, undo the last pick, clear the whole board, and optionally allow edits after a draft is marked complete
- **Player pool** — search with keyboard navigation (`/` to focus, arrow keys, Enter to draft the highlighted player, Esc to clear), position filters, available-only toggle, sorted by Sleeper's player rank
- **TV mode** — large-format, chrome-free layout for casting to a television, plus a fullscreen toggle
- **Draft summary** — roster shape by team (position counts), CSV export of results
- **Keyboard shortcuts panel** — press `?` any time

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (or on a TV, point its browser at this machine's address on the same network).

To connect a live draft, on the "New draft" screen choose **Sync with Sleeper** and paste in either your Sleeper **league ID** or a **draft ID** directly, then **Connect**.

## Build

```bash
npm run build
npm run preview
```

## Notes

- ADP/player ranking uses Sleeper's own player search-rank order — there's no separate ranking source to import.
- Player data is fetched from Sleeper's public API (`api.sleeper.app`) and cached in the browser for 24 hours; use "Refresh Sleeper players" if it goes stale.
- All draft data lives in the browser's IndexedDB. Clearing site data removes saved drafts.
