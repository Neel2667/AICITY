# AICITY Live

A **24/7 YouTube live-city simulation** — persistent, named, growing, chat-interactive. Built on Three.js + TypeScript.

---

## Phase 5 — Complete Stack ✅

### What's in Phase 5:

**`server/db/`**
- `schema.sql` — SQLite schema: city_meta, districts, construction, landmarks, viewer_contributions, mayors, vote_history, chat_log (24h pruned)
- `CityDatabase.ts` — Full persistence layer using `better-sqlite3` (sync API); survives server restarts; exposes `getFullSnapshot()` for admin and reconnect sync

**`server/auth/`**
- `OAuthBot.ts` — OAuth 2.0 token manager; posts replies to YouTube Live Chat as bot account; auto-refreshes token
- `setupOAuth.ts` — One-time browser login flow (`npm run auth`)

**`server/chatServer.ts`** (upgraded)
- SQLite persistence wired throughout
- Handles `voteResult`, `mayorElected`, `dayAdvance`, `constructionComplete`, `viewerContribution` from frontend → DB
- Bot replies on `!where`, poll close, mayor election, construction complete
- Admin REST API on port 3718 (broadcast, fireworks, poll, block/unblock, state, chat log)
- Sends `stateSnapshot` to reconnecting clients

**`server/admin/index.html`**
- Full web admin panel: city state, districts, active construction, chat log, vote/mayor history, moderation, broadcast, fireworks, poll trigger

**`src/traffic/`**
- `TrafficLight.ts` — Procedural 3-lens traffic light with green→yellow→red cycle, phase offset per intersection, emissive glowing lenses
- `TrafficLightManager.ts` — Spawns lights at chunk corners across unlocked districts; adds more on `districtUnlocked` event

**`src/clips/ClipRecorder.ts`**
- MediaRecorder API clip capture from the Three.js canvas
- Auto-triggers on: fireworks (22s), construction complete (12s), district unlock (15s), mayor election (12s)
- Downloads WebM clips to browser for YouTube Shorts editing
- Admin can trigger manually via admin panel

**`src/main.ts`** (upgraded)
- `TrafficLightManager` spawned at boot
- `ClipRecorder` wired to canvas
- `dayAdvance` synced to server each city day
- Admin WS message handler (`stateSnapshot`, `adminFireworks`, `adminOpenPoll`, `constructionAdded`, `tickerPush`)
- `ChatBot.sendToServer()` for all DB-persisted events

---

## Architecture

```
YouTube Live Chat API
        │ poll every 3s
        ▼
server/chatServer.ts (Node.js)
  ├── db/CityDatabase.ts (SQLite — persists across restarts)
  ├── auth/OAuthBot.ts (bot → YouTube chat replies)
  ├── Admin REST API :3718
  └── WebSocket :3717
           │
    Frontend (browser)
     ├── ChatBot.ts ──► VoteManager ──► CityEventBus
     ├── CityState.ts (ticked each day, synced to server)
     ├── StreamOverlay + ChatOverlay (HUD)
     ├── SceneManager (Three.js)
     │    ├── CameraDirector (5 modes)
     │    ├── Atmosphere (day/night/fog/weather)
     │    ├── PedestrianManager (4 moods, district-aware)
     │    ├── BusManager (3 routes, 24/7)
     │    ├── TrafficLightManager (green/yellow/red, phase-offset)
     │    └── FireworksController (particle bursts)
     ├── AmbientAudio (5 synthesised layers)
     └── ClipRecorder (auto-clips → YouTube Shorts)
              │
           OBS → YouTube RTMP (24/7 live)
```

---

## Quick Start

```bash
# Frontend
npm install && npm run dev

# Chat server (in another terminal)
cd server && npm install
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... npm run dev

# Admin panel — open in browser:
server/admin/index.html

# OAuth bot setup (one-time):
cd server && npm run auth
```

---

## Chat Commands

| Command | Effect | Cooldown |
|---|---|---|
| `!vote park/apartments/factory/shops/stadium` | Vote in current poll | 1/poll |
| `!name <text>` | Submit name for building/road | 2 min |
| `!camera orbit/follow/district/event` | Vote camera mode | 30 sec |
| `!event fireworks` | Fireworks (Super Chat or mod) | 5 min |
| `!where` | Bot replies with city status | 15 sec |
| `!mayor` | Enter mayor raffle (every 30 min) | 1 hr |

---

## URL Flags

```
?dev=1              dev UI + FPS + chat injection helper
?stream=0           disable stream mode
?overlay=0          hide overlay
?camera=0           disable CameraDirector
?atmosphere=0       disable day/night
?dayLength=300      fast day cycle for testing
```

---

## Full Roadmap

| Phase | Status | Shipped |
|---|---|---|
| 1 | ✅ | Stream MVP — CityClock, CameraDirector, atmosphere, weather overlay |
| 2 | ✅ | Persistent city — 6 districts, 81 chunks, 10 landmarks, CityState |
| 3 | ✅ | Chat bot — !vote, !name, !camera, !event, !where, !mayor, VoteManager |
| 4 | ✅ | Living city — pedestrians, buses, fireworks, ambient audio, 5-mode camera |
| 5 | ✅ | Full stack — SQLite, OAuth bot, admin panel, traffic lights, clip recorder |

---

## License Note

Uses InfiniTownTS as rendering foundation. Confirm commercial usage rights before monetizing.
