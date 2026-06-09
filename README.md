# AICITY Live

AICITY Live is a 24/7 YouTube live-city project built on the Three.js/TypeScript foundation from InfiniTownTS.

The product goal is not to make a random procedural demo. The goal is to create a **persistent miniature city** that feels like a real place: named districts, recurring landmarks, cinematic camera direction, day/night/weather ambience, visible growth, and later YouTube chat interaction.

---

## Current Phase

**Phase 2 — Persistent City** ✅

### Phase 2 adds (this update):

- **`src/city/CityMap.ts`** — Authored city layout: 6 named districts, 81 chunks, 10 landmarks, 6 recurring daily events.
- **`src/city/CityMapRenderer.ts`** — Replaces random block generation with deterministic authored layout per grid position.
- **`src/city/CityState.ts`** — Runtime persistent state: population growth (~50/day), construction timers, district unlocks at Day 3 & Day 6.
- **`src/city/CityEventBus.ts`** — Loose-coupled pub/sub for city-wide events (construction complete, district unlocked, viewer action).
- **Richer `StreamOverlay`** — Shows active recurring events, city stats (population / buildings), rotating dynamic ticker with construction news.
- **Updated `main.ts`** — Wires CityState into the animation loop; feeds city state snapshot into overlay.

### Phase 1 (already shipped):

- Three.js + TypeScript + Vite base.
- `CityClock` with a configurable city day (default: 1 hour real = 1 city day).
- Live overlay with city time, day counter, weather, and stream ticker.
- Day/night atmosphere controller with sun orbit.
- Weather-lite state: clear, cloudy, morning fog, light rain.
- Automatic cinematic `CameraDirector` for hands-free OBS streaming.
- Dev UI hidden by default; use `?dev=1` to show diagnostics.

---

## City Districts

| District | Mood | Description |
|---|---|---|
| **Downtown Core** | Busy | Glass towers and busy avenues |
| **Maple Quarter** | Residential | Tree-lined streets and row houses |
| **Harbor District** | Commercial | Shops, cafes, and waterfront stalls |
| **Ironworks** | Industrial | Factories, depots, and freight lanes (unlocks Day 3) |
| **Greenway** | Park | Parks, plazas, and open recreation (unlocks Day 6) |
| **Midtown** | Commercial | Restaurants, gas stations, mid-rise offices |

---

## Named Landmarks

City Hall Plaza · Central Tower · Arena Square · The Anchor Cafe · Harbor Market · Ironworks Plant · Festival Plaza · Maple Park · Southside Brew · City Green

---

## Daily Recurring Events

| Event | Time of Day | Icon |
|---|---|---|
| Sunrise Joggers | Dawn (Greenway) | 🏃 |
| Morning Commute | Early day | 🚗 |
| Market Day | Midday (Harbor) | 🛒 |
| Lunch Rush | Noon (Harbor) | 🍜 |
| Evening Traffic | Dusk | 🚦 |
| Night Cleanup Crews | Night | 🧹 |

---

## Run Locally

```
npm install
npm run dev
```

Useful query flags:

```
?dev=1              enable dev UI/FPS counter
?stream=0           disable stream-mode
?overlay=0          hide overlay
?camera=0           disable auto camera director
?atmosphere=0       disable day/night updates
?dayLength=300      set one city day to 300 real seconds (for testing)
?city=AICITY%20Live set overlay city name
```

---

## Build

```
npm run build
```

---

## OBS / YouTube Direction

```
Browser (AICITY) → OBS window/browser capture → YouTube Live RTMP
```

- 720p30 or 1080p30 recommended.
- Use `?dayLength=300` to test day/night cycle quickly.
- Use normal latency (not ultra-low) for stream stability.

---

## Roadmap

| Phase | Status | Goal |
|---|---|---|
| **Phase 1** | ✅ Done | Watchable stream MVP — CameraDirector, clock overlay, atmosphere |
| **Phase 2** | ✅ Done | Persistent city — named districts, landmarks, CityState, events |
| **Phase 3** | 🔜 Next | YouTube chat bot — `!vote`, `!name`, `!camera`, `!event` commands |
| **Phase 4** | 🔜 Future | Pedestrians, buses, ambient audio, deeper visual polish |

---

## Architecture

```
CityClock ──► CityState.tick()
                │
                ├──► CityEventBus (construction, unlocks, viewer actions)
                │
CityMap (authored layout) ──► CityMapRenderer (blockHint → block asset)
                                      │
                                      ▼
                              SceneManager (Three.js)
                                      │
                                      ├── CameraDirector
                                      ├── Atmosphere (day/night/weather)
                                      └── StreamOverlay (HUD)
                                                │
                                                ▼
                                    OBS Capture → YouTube RTMP
```

---

## Important License Note

This repository uses InfiniTownTS as the rendering foundation. Before monetizing the YouTube channel, confirm commercial usage rights for InfiniTownTS assets.
