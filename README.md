# AICITY Live

A **24/7 YouTube live-city simulation** built on Three.js + TypeScript. A persistent miniature city with named districts, cinematic camera direction, day/night cycle, weather, pedestrians, buses, fireworks, and live viewer chat interaction.

---

## Current Phase

**Phase 4 — Living City** ✅

### Phase 4 adds:

- **`src/pedestrians/Pedestrian.ts`** — Capsule-mesh pedestrians with sidewalk waypoint navigation, mood types (worker/shopper/jogger/commuter), head-bob animation, activity scaling by time of day
- **`src/pedestrians/PedestrianManager.ts`** — Spawns pedestrians across all 81 authored chunks; district mood drives pedestrian type mix; night → near-empty streets
- **`src/bus/BusRoute.ts`** — 3 fixed bus routes: Harbor Express, West Connector, Greenway Loop; named stops in world space
- **`src/bus/CityBus.ts`** — Coloured bus mesh with destination label sprite; smooth waypoint navigation; dwell timer at stops; fires `busArrived` events
- **`src/bus/BusManager.ts`** — Spawns all buses staggered on routes; night service (60% speed); exposes `getRandomBus()` for camera follow
- **`src/effects/Fireworks.ts`** — GPU particle bursts via THREE.Points + additive blending; multi-burst shows triggered by Super Chat, district unlocks, and construction completions
- **`src/audio/AmbientAudio.ts`** — Fully synthesised city soundscape (Web Audio API, no external files): city hum, traffic layer, birdsong (dawn), rain layer, night crickets; all fade smoothly with time of day
- **`src/camera/CameraDirector.ts`** — Full 5-mode cinematic director: `orbit`, `follow`, `district`, `event`, `fireworks`; auto-rotates scenes every 45s; responds to chat votes and city events
- **Updated `StreamOverlay.ts`** — Bus arrival tickers, fireworks announcements, mayor news, enhanced dynamic ticker pool
- **Updated `index.html`** — Audio mute button, night vignette

### Phase 3 (shipped): YouTube chat bot — `!vote`, `!name`, `!camera`, `!event`, `!where`, `!mayor`
### Phase 2 (shipped): Persistent city — 6 districts, 10 landmarks, CityState, CityEventBus
### Phase 1 (shipped): Stream MVP — CityClock, CameraDirector, day/night atmosphere, WeatherState

---

## City Overview

### Districts

| District | Mood | Unlocks | Pedestrians |
|---|---|---|---|
| **Downtown Core** | Busy | Day 1 | Commuters, workers |
| **Maple Quarter** | Residential | Day 1 | Shoppers, joggers |
| **Harbor District** | Commercial | Day 1 | Shoppers, commuters |
| **Midtown** | Commercial | Day 1 | Mix |
| **Ironworks** | Industrial | Day 3 | Workers |
| **Greenway** | Park | Day 6 | Joggers, shoppers |

### Bus Routes

| Route | Name | Colour | Key Stops |
|---|---|---|---|
| A | Harbor Express | Blue | Arena Square → Midtown → Harbor Market → Anchor Cafe |
| B | West Connector | Green | Maple Park → Midtown West → Ironworks Gate |
| C | Greenway Loop | Yellow | City Green → Festival Plaza → Sunset Lawn → Southside Brew |

### Camera Modes

| Mode | Trigger | Description |
|---|---|---|
| `orbit` | Auto (45s rotation) | Slow panoramic orbit, height varies with phase |
| `district` | Auto / `!camera district` | Slow flyover of a named district |
| `follow` | `!camera follow` | Tracks a city bus or car |
| `event` | Auto / `!camera event` | Zooms to active landmark |
| `fireworks` | Super Chat / milestone | Pulls back for full sky view |

---

## Audio Layers (Web Audio API, no files needed)

| Layer | Active When |
|---|---|
| City hum (low-pass noise) | Always |
| Traffic wash | Day / commute hours |
| Birdsong | Dawn, early morning |
| Rain | Weather = Light Rain |
| Night crickets | Night phase |

Click anywhere or press any key to unlock audio.

---

## Run Locally

```bash
# Frontend
npm install
npm run dev

# Chat server (optional — for real YouTube chat)
cd server
npm install
YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=Cg0KC... npm run dev
```

### Dev chat injection (no YouTube needed)
```js
window.__aicityChat('!vote park', 'Alice', 'ch-1')
window.__aicityChat('!camera follow', 'Bob', 'ch-2')
window.__aicityChat('!event fireworks', 'Mod', 'ch-mod')
```

---

## URL Flags

```
?dev=1              dev UI + FPS counter + chat injection helper
?stream=0           disable stream mode
?overlay=0          hide overlay
?camera=0           disable CameraDirector
?atmosphere=0       disable day/night
?dayLength=300      fast testing (300s per city day)
?city=AICITY%20Live overlay city name
```

---

## Build

```bash
npm run build
```

---

## OBS Setup

```
Browser (full-screen AICITY) → OBS Window Capture → YouTube RTMP
```

- 1080p30 recommended
- Enable audio capture on the browser source in OBS

---

## Roadmap

| Phase | Status | Goal |
|---|---|---|
| Phase 1 | ✅ Done | Stream MVP |
| Phase 2 | ✅ Done | Persistent city map |
| Phase 3 | ✅ Done | YouTube chat bot + vote system |
| Phase 4 | ✅ Done | Pedestrians, buses, audio, fireworks, 5-mode camera |
| Phase 5 | 🔜 Next | OAuth bot replies to YouTube chat, SQLite persistence, admin panel, traffic lights |

---

## Architecture

```
YouTube Live Chat API
        │
server/chatServer.ts ──WS──► ChatBot → VoteManager → CityEventBus
                                                           │
CityClock → CityState.tick() ──────────────────────────────┤
                                                           │
CityMap (authored) ──► CityMapRenderer (chunk layout)      │
                                                           ▼
                                               SceneManager (Three.js)
                                                ├── CameraDirector (5 modes)
                                                ├── Atmosphere (day/night/fog)
                                                ├── PedestrianManager
                                                ├── BusManager (3 routes)
                                                ├── FireworksController
                                                ├── AmbientAudio (synthesised)
                                                └── StreamOverlay + ChatOverlay
                                                           │
                                                  OBS → YouTube RTMP
```

---

## License Note

Uses InfiniTownTS as rendering foundation. Confirm commercial usage rights before monetizing.
