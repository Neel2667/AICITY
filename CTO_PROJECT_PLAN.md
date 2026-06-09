# 24x7 YouTube Live City Channel — CTO Plan

Date: 2026-06-09
Repo: https://github.com/osoker/InfiniTownTS

## 1. Executive Direction

We will use InfiniTownTS as the rendering foundation, but we should not ship it as a purely infinite procedural demo. The winning product is a persistent, recognizable, evolving city with named places, recurring characters, visible routines, and chat-driven civic events.

The core strategy:

- Keep Three.js + TypeScript for fast web-based rendering and automated streaming.
- Replace random city generation with a persistent city-state system.
- Use the existing chunk/table architecture for performance, but drive it from saved authored map data instead of uncontrolled random generation.
- Build an automated camera director so the stream always has pleasing shots.
- Add city life: traffic, pedestrians, buses, construction, day/night cycle, weather, events, and ambient audio.
- Add YouTube chat interactions carefully through voting and limited commands, not direct chaos.
- Monetize through watch time, fan funding, memberships, branded in-city placements, and eventually merch/sponsor districts.

## 2. Repo Audit Summary

The repo currently provides:

- Vite + TypeScript + Three.js app.
- A 9x9 city chunk table.
- Chunk swapping/recentering logic for an infinite-city illusion.
- Asset loader for `main.json` + `main.bin` city assets.
- Cars and clouds as moving objects.
- Orbit/camera controls.
- Post-processing saturation shader.
- Build works successfully with `npm run build`.

Important limitation:

- The current city is demo-style and random/repeating. Viewers may feel it is a toy simulation, not a living city. We should convert it into a persistent authored city with deterministic progression.

## 3. Recommended Product Concept

Working title: **TinyLive City** / **Stream City 24/7** / **ArenaTown Live**

Viewer promise:

> “A tiny city that never sleeps. Watch it grow, vote on decisions, name places, follow residents, and see your chat shape the city over time.”

The city must create long-session viewing through:

1. **Continuity** — viewers return and see what changed.
2. **Identity** — neighborhoods, shops, landmarks, citizens, transit lines have names.
3. **Predictability + surprise** — daily routines with occasional events.
4. **Participation** — chat can vote and trigger safe visible changes.
5. **Relaxing ambience** — cinematic camera, cozy lighting, city sounds, music.

## 4. Agent Roundtable

### CTO
Our goal is not just to render an infinite city. The goal is a watchable 24x7 entertainment product. The repo gives us a good rendering base, but the current random infinite city is not enough for viewer attachment. We need persistence and story.

### Agent 1 — Technical Architect
Use the repo as the client renderer. Convert `CityChunkTbl` from random `_generate()` into a `CityStateRenderer` that consumes a saved city layout. The chunk logic can remain, but the data should come from a persistent grid. Add a backend service that owns state: buildings, roads, citizens, vehicles, events, names, economy, construction timers, and chat votes.

Recommended stack:

- Frontend renderer: Three.js + TypeScript + Vite.
- State server: Node.js + TypeScript.
- Realtime link: WebSocket.
- Storage: SQLite for MVP, Postgres later.
- Chat bot: YouTube Live Chat API polling service.
- Streaming: OBS capture first, automated GPU server later.

### Agent 2 — Creative/Monetization Lead
People will watch for hours if the stream feels like a cozy miniature world, not a technical demo. We need camera scenes: sunrise commute, lunch rush, bus follow, construction progress, rain at night, festival lights, emergency response, airport/train moments. Add a small overlay with city clock, current event, latest chat decision, and a “coming up” ticker.

Monetization should begin with watch-time growth and then unlock Super Chat, memberships, and sponsored in-city assets. Chat should be rewarded: paid messages can name roads/buildings or trigger fireworks, but never break the city.

### CTO Decision
Best path: **Persistent authored simulation using InfiniTownTS renderer**, not a pure procedural city. We will create a fixed city map that can grow over weeks/months. Chat influences city decisions through structured votes. The world evolves automatically when chat is quiet.

## 5. Architecture

```text
YouTube Chat ──► Chat Bot / Moderation ──► Command Queue
                                         │
Admin Panel ────────────────────────────► City Simulation Server
                                         │
SQLite/Postgres ◄──── City State ◄──────┘
                                         │ WebSocket
                                         ▼
Three.js City Renderer ──► Browser/OBS/GPU Capture ──► YouTube RTMP Live
                                         │
                              Recording / Highlight Clips
```

## 6. Key Modules to Build

### 6.1 Persistent City Map

Replace random generation with saved city layout.

Data example:

```json
{
  "cityName": "Neon Harbor",
  "day": 18,
  "districts": [
    { "id": "downtown", "name": "Downtown", "mood": "busy" },
    { "id": "suburb", "name": "Maple Quarter", "mood": "calm" }
  ],
  "chunks": [
    {
      "x": 0,
      "y": 0,
      "district": "downtown",
      "blockType": "apartments",
      "rotation": 1,
      "level": 2,
      "name": "Chat Plaza"
    }
  ]
}
```

### 6.2 City Growth System

The city should grow visibly but not chaotically.

Growth mechanics:

- Construction sites appear with cranes/fences.
- Buildings upgrade over hours/days.
- New districts unlock after milestones.
- Parks, stations, shops, stadiums appear through votes.
- Roads become busier as population increases.

### 6.3 Citizens and Vehicles

Current repo has cars/clouds. Add:

- Tiny pedestrians with simple pathfinding along sidewalks.
- Buses/trains with schedules.
- Emergency vehicles for events.
- Delivery vans, taxis, garbage trucks, police cars.
- Named “featured residents” for camera follow mode.

### 6.4 Camera Director

For 24x7 streaming, manual camera is not enough.

Modes:

- Slow orbit skyline.
- Follow random vehicle/citizen.
- Construction timelapse shot.
- Event shot.
- District flyover.
- Sunrise/sunset cinematic shot.
- Chat-voted camera target.

### 6.5 Day/Night/Weather/Event Loop

A good stream needs changing atmosphere.

Suggested accelerated cycle:

- 1 real hour = 1 city day, or
- 2 real hours = 1 city day for slower cozy pacing.

Events:

- Morning commute.
- Lunch rush.
- Evening traffic.
- Night cleaning trucks.
- Rain/storm.
- Market day.
- Stadium event.
- Fireworks after milestones.
- Holiday/festival skins.

### 6.6 YouTube Chat Interaction

Use structured commands:

- `!vote park` / `!vote apartments` — choose next build.
- `!name Maple Cafe` — submit names for moderation/vote.
- `!camera bus` — vote camera mode.
- `!mayor` — periodic raffle/election for a viewer title.
- `!event fireworks` — gated by cooldown or fan funding.
- `!where` — bot replies with city status.

Important: do not let chat directly spam objects. Use cooldowns, queues, moderation, and votes.

## 7. Streaming Infrastructure

### MVP Streaming

- Run the app in Chrome.
- Capture browser window with OBS.
- Stream to YouTube via RTMP.
- Use a local or cloud GPU machine.

Pros: fastest and easiest.
Cons: needs manual monitoring.

### Production Streaming

- GPU VPS or dedicated machine.
- Browser in kiosk mode or Electron shell.
- OBS/FFmpeg service supervision.
- Health monitor restarts browser/stream if FPS drops or scene freezes.
- Backup fallback video/scene.

Recommended production path:

1. OBS + browser capture for MVP.
2. Automated OBS with WebSocket control.
3. Later investigate headless Chromium + FFmpeg only if stable with WebGL hardware acceleration.

## 8. Viewer Experience Direction

The best-looking version is not the largest city. It is the most understandable city.

Visual principles:

- Cozy isometric camera, not too high.
- Slow motion, no aggressive spinning.
- Warm sunrise/sunset lighting.
- Lots of tiny motion: pedestrians, cars, lights, clouds, signs.
- Clear landmarks visible repeatedly.
- Minimal overlay, not gaming HUD clutter.
- City sounds + copyright-safe ambient music.

Stream overlay:

- City name and city day/time.
- Current event: “Rain over Maple Quarter”.
- Next vote countdown.
- Latest supporter/namer.
- Population/buildings stat.

## 9. Monetization Plan

### Stage 1 — Pre-YPP Audience Growth

- 24/7 stream for watch hours.
- Daily Shorts/highlights: construction timelapse, funny traffic jam, mayor vote, before/after city growth.
- Community posts: polls for next district.
- Discord/community optional later.

### Stage 2 — Early Fan Funding

When eligible, use:

- Super Chat / Super Stickers.
- Memberships.
- Name a building/road/park after supporters.
- Member-only districts or member name wall.
- Monthly “Mayor Council” vote.

### Stage 3 — Ads + Sponsorships

- Full YPP ads once eligible.
- Sponsor branded billboards or storefronts inside the city.
- Sponsored events: “Friday Fireworks by X”.
- Sell digital postcards/wallpapers of the evolving city.
- Merch: city map posters, stickers, supporter plaques.

Policy note: we should keep the channel clearly original and human-directed. Avoid mass-produced, low-variation uploads.

## 10. MVP Scope

### MVP v0.1 — Streaming Demo

- Remove dev UI and debug boxes.
- Add autoplay cinematic camera.
- Add city clock overlay.
- Add deterministic seed/map.
- OBS-ready 1080p scene.
- Stable 6–12 hour test stream.

### MVP v0.2 — Persistent City

- City state JSON/SQLite.
- Fixed neighborhoods and landmarks.
- Building names.
- Construction progression.
- Auto-growth every N minutes.

### MVP v0.3 — Chat Interaction

- YouTube chat bot.
- Vote system.
- Safe command queue.
- On-screen vote overlay.
- Moderation/cooldowns.

### MVP v0.4 — Monetizable Polish

- Better lighting/day-night.
- Pedestrians and buses.
- Ambient audio.
- Highlight recorder/exporter for Shorts.
- Admin dashboard.

## 11. First Engineering Actions

1. Create a branch: `live-city`.
2. Add `config/stream.json` for stream mode settings.
3. Hide debug UI and add cinematic camera mode.
4. Convert random city generation to deterministic seed first.
5. Add a `CityMap` JSON format.
6. Refactor `CityChunkTbl` to render from map data.
7. Add overlay layer for city clock/votes.
8. Build chat bot service.
9. Build OBS/YouTube streaming runbook.
10. Run a 24-hour soak test.

## 12. Final Recommendation

Do not build a generic procedural city stream. Build a persistent miniature city show.

Use InfiniTownTS as the technical base, but the product moat is:

- persistent city memory,
- recurring characters/places,
- cinematic camera direction,
- chat-shaped growth,
- daily/weekly events,
- safe monetization hooks.
