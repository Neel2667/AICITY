# AICITY Live

AICITY Live is a 24/7 YouTube live-city project built on the Three.js/TypeScript foundation from InfiniTownTS.

The product goal: a **persistent miniature city** that feels like a real place — named districts, recurring landmarks, cinematic camera direction, day/night/weather ambience, visible growth, and viewer-driven city decisions via YouTube chat.

---

## Current Phase

**Phase 3 — YouTube Chat Interaction** ✅

### Phase 3 adds (this update):

- **`src/chat/ChatCommand.ts`** — Parser for all chat commands (`!vote`, `!name`, `!camera`, `!event`, `!where`, `!mayor`)
- **`src/chat/VoteManager.ts`** — Full poll lifecycle: open → tally → close → apply winner; cooldowns, unique votes per viewer
- **`src/chat/ChatBot.ts`** — WebSocket client connecting to the chat server; per-command cooldowns; dev injection helper (`window.__aicityChat(...)`)
- **`src/chat/ChatOverlay.ts`** — In-stream HUD: live tally bars with %, countdown timer, chat feed (last 5 lines), Super Chat highlight, event banners (district unlock, construction complete, mayor elected)
- **`server/chatServer.ts`** — Node.js WebSocket relay: polls YouTube Live Chat API every ~3s, forwards messages to frontend, spam guard, moderation blocklist
- **`server/SETUP.md`** — Full setup guide for YouTube API key + Live Chat ID
- **Auto-poll timer** — A vote poll opens automatically every 10 minutes in stream mode
- **Mayor raffle** — Every 30 minutes a random `!mayor` entrant is elected

### Phase 2 (shipped):
- Persistent city map: 6 named districts, 81 chunks, 10 landmarks, 6 recurring daily events
- CityState runtime: population growth, construction timers, district unlocks

### Phase 1 (shipped):
- Three.js + TypeScript + Vite · CityClock · Day/night atmosphere · CameraDirector · WeatherState · StreamOverlay

---

## City Districts

| District | Mood | Unlocks |
|---|---|---|
| **Downtown Core** | Busy | Day 1 |
| **Maple Quarter** | Residential | Day 1 |
| **Harbor District** | Commercial | Day 1 |
| **Midtown** | Commercial | Day 1 |
| **Ironworks** | Industrial | Day 3 |
| **Greenway** | Park | Day 6 |

---

## Chat Commands

| Command | What it does | Cooldown |
|---|---|---|
| `!vote park` / `apartments` / `factory` / `shops` / `stadium` | Vote in current poll | 1 per poll |
| `!name <text>` | Submit a building/road name for moderation | 2 min |
| `!camera orbit` / `follow` / `district` / `event` | Vote for camera mode | 30 sec |
| `!event fireworks` | Trigger fireworks (Super Chat or mod only) | 5 min |
| `!where` | Bot replies with city status | 15 sec |
| `!mayor` | Enter the 30-min mayor raffle | 1 hr |

---

## Run Locally

### Frontend

```bash
npm install
npm run dev
```

### Chat Server (optional — needed for real YouTube chat)

```bash
cd server
npm install
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... npm run dev
```

See [`server/SETUP.md`](server/SETUP.md) for full YouTube API setup.

### Dev Chat Injection (no YouTube account needed)

```js
// Open browser console and run:
window.__aicityChat('!vote park', 'Alice', 'ch-alice')
window.__aicityChat('!vote stadium', 'Bob', 'ch-bob')
window.__aicityChat('!name Sunset Tower', 'Carol', 'ch-carol')
window.__aicityChat('!camera follow', 'Dave', 'ch-dave')
```

---

## URL Flags

```
?dev=1              enable dev UI/FPS counter + chat injection helper
?stream=0           disable stream-mode (also disables chatBot.connect())
?overlay=0          hide overlay
?camera=0           disable auto CameraDirector
?atmosphere=0       disable day/night updates
?dayLength=300      set one city day to 300 real seconds (fast testing)
?city=AICITY%20Live set overlay city name
```

---

## Build

```bash
npm run build
```

---

## OBS / YouTube Direction

```
Browser (AICITY + Chat Server) → OBS capture → YouTube Live RTMP
```

- 720p30 or 1080p30
- Use `?dayLength=300` to test day/night quickly
- Normal latency (not ultra-low) for stream stability

---

## Roadmap

| Phase | Status | Goal |
|---|---|---|
| **Phase 1** | ✅ Done | Stream MVP — CameraDirector, clock overlay, atmosphere |
| **Phase 2** | ✅ Done | Persistent city — districts, landmarks, CityState, events |
| **Phase 3** | ✅ Done | Chat bot — votes, names, camera, fireworks, mayor raffle |
| **Phase 4** | 🔜 Next | Pedestrians, buses, ambient audio, deeper visual polish |
| **Phase 5** | 🔜 Future | OAuth bot replies to YouTube chat, SQLite persistence, admin panel |

---

## Architecture

```
YouTube Live Chat API
        │
        ▼
server/chatServer.ts (Node.js + WebSocket)
        │  ws://localhost:3717
        ▼
src/chat/ChatBot.ts ──► parseCommand() ──► VoteManager / CityEventBus
                                                  │
                                    CityState.tick() ──► CityEventBus
                                                  │
                              StreamOverlay + ChatOverlay (HUD)
                                                  │
                                         SceneManager (Three.js)
                                                  │
                                         CameraDirector
                                         Atmosphere Controller
                                                  │
                                        OBS → YouTube RTMP
```

---

## Important License Note

This repository uses InfiniTownTS as the rendering foundation. Before monetizing, confirm commercial usage rights for InfiniTownTS assets.
