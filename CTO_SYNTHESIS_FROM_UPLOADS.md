# CTO Synthesis From Uploaded Plans

Date: 2026-06-09
Project aim: Build a 24x7 YouTube live city channel using InfiniTownTS as the base, where the city feels persistent and alive — not like a random procedural demo.

## 1. CTO Verdict

The uploaded plans are valuable. They contain strong architecture, research discipline, and a clear long-term vision for a Living World Engine. However, the product target is not “build the best engine.” The target is a watchable, monetizable 24x7 YouTube live channel.

Therefore:

- We will adopt the best principles from the plans.
- We will reject anything that delays a watchable livestream for too long.
- We will not ship a random infinite procedural city.
- We will create a persistent city with names, history, districts, routines, and visible growth.
- World generation may be used as an authoring tool, but the livestream city must be saved/frozen/evolving like a real place.

## 2. What We Keep From the Uploaded Plans

### Keep: Prime Directive
Build the most watchable simulation, not the most advanced one.

### Keep: Product Over Engine
The stream is the product. Architecture serves the stream.

### Keep: Framework-Agnostic Core
Stay with vanilla TypeScript + Three.js + Vite. Do not rewrite into React/R3F now.

### Keep: Reuse-First
Use InfiniTownTS, Three.js, camera-controls, existing assets, existing algorithms where possible.

### Keep: Camera Director As Moat
The automatic cinematic camera is one of the highest-ROI systems. It should be built early.

### Keep: Map Identity
The city should have geography, districts, landmarks, and names. “The map is the main character” is a strong principle.

### Keep: Determinism + Persistence
Use seed + saved deltas so the city remembers what happened.

### Keep: Chat As v2
The city must work without chat first. Chat later becomes a control layer, not the foundation.

## 3. What We Must Change / Defer

### Defer Full Living World Engine
The full LWE is multi-year scope. We should not build citizens, economy, road tensor fields, full terrain, AI news, and pathfinding before going live.

### Defer Full Procedural World Generation
The user’s core requirement is that viewers should feel they are watching a real city. A procedural generator can help us produce a starting map, but the public stream should not feel like it is constantly generating random content.

Final interpretation:

> Procedural-assisted authoring is allowed. Procedural-looking random livestream is not allowed.

### Defer Heavy Traffic Intelligence
Current moving cars are enough for the first watchable stream. Real traffic lights, IDM/MOBIL, and pathfinding belong after the visual stream is stable.

### Do Not Replatform
No Next.js/R3F rewrite. InfiniTownTS already builds and works.

## 4. Final Product Direction

We are building:

> A persistent miniature city livestream that grows over time, has named places, follows daily routines, and is shaped by chat through safe votes/events.

We are not building:

> A generic infinite procedural engine demo.

## 5. Recommended Architecture

```text
InfiniTownTS Renderer
  ├─ CityMap JSON / saved state
  ├─ Persistent chunk assignments
  ├─ CityClock
  ├─ Day/night/weather
  ├─ Camera Director
  ├─ Overlay/HUD
  ├─ Growth/construction system
  └─ Chat command bridge later
```

Streaming:

```text
Browser running city app → OBS → YouTube Live
```

Later:

```text
YouTube Chat → local bot → command queue → city renderer/state
```

## 6. Real City Strategy

To satisfy the “real city, not procedural engine” requirement:

1. Create one persistent city map.
2. Give districts and landmarks names.
3. Store city changes as deltas.
4. Use construction timers for visible growth.
5. Avoid random chunk swapping in camera-facing areas.
6. Use the infinite/wrap system only as a rendering optimization, not as the product promise.
7. Make viewers see continuity: same park, same stadium, same downtown, same road names.

## 7. Revised Roadmap

### Phase 0 — Legal + Repo Baseline
- Confirm InfiniTownTS license / contact author before monetization.
- Create a project branch.
- Run app locally and verify OBS capture.

### Phase 1 — Watchable Stream MVP
Goal: a viewer watches for 60 seconds and says “this looks good.”

Build:
- Stream mode config.
- Hide dev UI/debug visuals.
- CityClock.
- Day/night lighting.
- Minimal overlay/HUD.
- Camera Director v1.
- Basic cozy color grade/fog.
- Stable 6–12 hour local test.

### Phase 2 — Persistent City Identity
Goal: viewer feels this is a place.

Build:
- `CityMap` JSON.
- Fixed district/landmark names.
- Persistent chunk selection instead of random generation.
- Labels or overlay mentions for named places.
- First construction/growth state.

### Phase 3 — Public 24x7 Launch
Goal: start collecting audience and watch hours.

Build:
- OBS profile.
- Startup script.
- Watchdog/manual runbook.
- Original/owned music and ambience.
- YouTube title/thumbnail/description.
- Daily Shorts pipeline.

### Phase 4 — Chat Interaction
Goal: viewers affect the city safely.

Build:
- YouTube chat listener.
- Vote system.
- Cooldowns/moderation.
- Commands: `!vote`, `!name`, `!camera`, `!weather`, `!mayor`.
- Persist approved names/events.

### Phase 5 — Living Simulation Expansion
Goal: deeper retention.

Build incrementally:
- Better traffic.
- Pedestrians.
- Bus routes.
- Events.
- AI news ticker from city facts.
- Seasonal festivals.

## 8. Immediate Next Technical Actions

1. Create `live-city` branch.
2. Add `src/config/streamConfig.ts`.
3. Add `CityClock` module.
4. Add `CameraDirector` module using existing camera controls/TWEEN.
5. Add `StreamOverlay` HTML/CSS.
6. Modify startup to support `?stream=1` mode.
7. Freeze current city seed/assignments for repeatability.
8. Run OBS private stream test.

## 9. CTO Bottom Line

The uploaded plans are strong, but we will use them as a compass, not as a prison.

The aim remains:

> Build a 24x7 YouTube city channel people can watch for hours, return to daily, and eventually support financially.

The shortest path is:

1. Make it beautiful.
2. Make it persistent.
3. Make it feel alive.
4. Make chat matter.
5. Grow into a deeper engine only after the stream exists.
