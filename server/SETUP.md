# AICITY Chat Server — Setup Guide (Phase 3)

## Prerequisites

- Node.js 20+
- A Google Cloud project with **YouTube Data API v3** enabled
- A YouTube channel with an **active live stream**
- (Optional) A bot YouTube account for posting replies

---

## Step 1 — Get Your YouTube API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **YouTube Data API v3**
3. Go to **Credentials** → Create **API Key**
4. Copy the key (starts with `AIza...`)

---

## Step 2 — Get Your Live Chat ID

When your YouTube stream is live, run this in your browser console or via curl:

```
https://www.googleapis.com/youtube/v3/liveBroadcasts
  ?part=snippet
  &broadcastStatus=active
  &key=YOUR_API_KEY
```

The `snippet.liveChatId` field is your `LIVE_CHAT_ID`.

Or find it in YouTube Studio → Go Live → Chat → Copy Chat ID from the URL.

---

## Step 3 — Install & Run

```bash
cd server
npm install
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... npm run dev
```

The server starts on `ws://localhost:3717` by default.

---

## Step 4 — Run the Frontend

In a separate terminal:

```bash
# root of repo
npm install
npm run dev
```

Open the browser. The frontend auto-connects to `ws://localhost:3717`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `YOUTUBE_API_KEY` | Yes (for live chat) | — | Google API key |
| `LIVE_CHAT_ID` | Yes (for live chat) | — | YouTube live chat ID |
| `CHAT_SERVER_PORT` | No | `3717` | WebSocket port |
| `POLL_INTERVAL_MS` | No | `3000` | YouTube API polling interval (ms) |

---

## Dev Mode (No YouTube Account Needed)

Without env vars set, the server still starts and accepts WebSocket connections.
Use the browser console to inject fake chat messages:

```js
window.__aicityChat('!vote park', 'Alice', 'channel-alice')
window.__aicityChat('!vote apartments', 'Bob', 'channel-bob')
window.__aicityChat('!name Sunset Tower', 'Carol', 'channel-carol')
window.__aicityChat('!camera follow', 'Dave', 'channel-dave')
```

A vote poll opens automatically every 10 minutes (or trigger it via dev tools).

---

## Supported Chat Commands

| Command | Description | Cooldown |
|---|---|---|
| `!vote park` | Vote in current poll | 1 per poll |
| `!vote apartments` | Vote in current poll | 1 per poll |
| `!vote factory` | Vote in current poll | 1 per poll |
| `!vote shops` | Vote in current poll | 1 per poll |
| `!vote stadium` | Vote in current poll (once only) | 1 per poll |
| `!name <text>` | Submit a building/road name | 2 min |
| `!camera orbit` | Vote for orbit camera | 30 sec |
| `!camera follow` | Vote to follow a vehicle | 30 sec |
| `!camera district` | Vote for district flyover | 30 sec |
| `!camera event` | Vote for event camera | 30 sec |
| `!event fireworks` | Request fireworks (Super Chat / mod only) | 5 min |
| `!where` | City status reply | 15 sec |
| `!mayor` | Enter the mayor raffle (runs every 30 min) | 1 hr |

---

## Poll Flow

1. Server auto-opens a poll every 10 minutes
2. Viewers type `!vote <option>` for 60 seconds
3. Winning option triggers a construction project in CityState
4. ChatOverlay shows live tally bars with percentages
5. 5-minute cooldown before next poll
