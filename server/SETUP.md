# AICITY Server — Setup Guide (Phase 5)

## Install

```bash
cd server
npm install
```

## Required environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `YOUTUBE_API_KEY` | For live chat | — | Google Cloud API key |
| `LIVE_CHAT_ID` | For live chat | — | YouTube live chat ID |
| `CHAT_SERVER_PORT` | No | `3717` | WebSocket port |
| `ADMIN_PORT` | No | `3718` | Admin REST API port |
| `ADMIN_SECRET` | No | `aicity-dev-secret` | Admin panel auth token |
| `POLL_INTERVAL_MS` | No | `3000` | YouTube API poll rate |
| `DB_PATH` | No | `../aicity.db` | SQLite database path |

## Start (dev)

```bash
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... npm run dev
```

## Start (production)

```bash
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... ADMIN_SECRET=strong-secret npm start
```

## OAuth Bot Setup (one-time, for bot replies to YouTube chat)

1. Create a **Desktop App** OAuth 2.0 credential in Google Cloud Console
2. Download `credentials.json` → place in `server/auth/credentials.json`
3. Run: `npm run auth` → opens browser → log in with your **bot YouTube account**
4. Token saved to `server/auth/token.json` — restart server

## Admin Panel

Open `server/admin/index.html` in any browser.
Enter your `ADMIN_SECRET` and click **Connect**.

Features:
- Live city state (day, population, buildings, districts)
- Active construction projects
- Add new construction projects
- Broadcast messages to stream ticker + YouTube chat
- Trigger fireworks remotely
- Open a poll remotely
- View chat log (last 100 messages)
- View vote + mayor history
- Block / unblock channel IDs

## Dev Mode (no YouTube)

Without env vars, the server still works. Use the browser console:

```js
window.__aicityChat('!vote park', 'Alice', 'ch-alice')
window.__aicityChat('!camera follow', 'Bob', 'ch-bob')
window.__aicityChat('!event fireworks', 'Mod', 'ch-mod')
window.__aicityChat('!where', 'Carol', 'ch-carol')
```
