# AICITY — Rebuild Plan: "A Real City You Can Tour"

Date: 2026-06-09
Status: **IN PROGRESS** — converting from infinite procedural treadmill → finite, authored, memorable city.

---

## 1. The Problem (confirmed in code)

The current build *claims* to be a persistent named city, but the renderer is the original
**InfiniTownTS infinite procedural engine**:

- `CityChunkTbl._genRandomChunk()` picks blocks at **random** (`getRandElement`) every tile.
- `CityChunkTbl.getChunkData()` **wraps with `% TABLE_SIZE`** → the same 9×9 grid repeats
  forever as the camera pans. There are **no edges**, so there is no "here" vs "there".
- The authored map (`src/city/CityMap.ts`) only feeds the **overlay text, camera labels,
  pedestrians, and traffic lights** — never the actual 3D buildings.
- `src/city/CityMapRenderer.ts` (the file whose job is to render the authored map) is
  **imported by nobody = dead code**.
- Runtime geometry comes **only** from the baked atlas `public/assets/scenes/main.bin` +
  `main.json` (generic blocks `block_1..block_11`, `park`, `stadium`, roads, cars, clouds).
  The `gltf/` folder is **never loaded at runtime**.

Result: viewers see a random, endlessly-repeating sprawl with fake place-names floating on top.
You can never "find the market" because the market is not a place — it's a label.

## 2. The Goal

> A **finite, hand-authored, recognizable city** that a viewer can mentally map:
> "the airport is north, the beach is south, downtown is the center, the market is east."
> Built for **24/7 watchability** — cozy, alive, always something happening, always a good shot.

Core memorable places (locked with stakeholder):
✈️ **Airport** · 🚂 **Train Station** · 🏖️ **Beach** · 🏘️ **Village** · 🏙️ **Downtown / Town** · 🛒 **Market**

## 3. Architecture Decisions

1. **Finite & bounded.** Kill the `% TABLE_SIZE` wrap. Tiles outside the map are natural edges
   (ocean / fields / mountains), not repeats. Camera pan is clamped to map bounds.
2. **Authored, not random.** Every tile's identity comes from `src/city/CityDesign.ts`
   (the new single source of truth for the map). Deterministic and editable.
3. **Landmarks are procedural meshes.** Unique structures that don't exist as assets
   (runway, sand+water beach, rail tracks/platform, market stalls, plaza) are built in a
   consistent low-poly style by a `LandmarkFactory`, layered over the baked blocks.
   This guarantees they render, keeps art consistent, and avoids licensing/format risk.
   Free CC0 glTF models may be slotted in later where they cleanly match.
4. **Keep the 24/7 stack.** `CityClock`, `CameraDirector`, `StreamOverlay`, `ChatOverlay`,
   atmosphere/day-night, buses, pedestrians, fireworks, ambient audio, clip recorder, and the
   chat server + SQLite are all **retained** and re-pointed at the new real map.

## 4. The Map (first authored draft)

A finite **16×16** tile grid (`CHUNK_SIZE` = 60 world units → ~960×960 world, a cozy toy city).
`(col x → east, row y → south)`.

```
            N  (mountains / forest backdrop)
   ┌───────────────────────────────────────────────┐
 0 │  ✈️ AIRPORT runway + terminal      🏘️ VILLAGE   │  small houses
 2 │  ─────── approach road ───────     + fields    │  + green lanes
 4 │  🏭 industrial / depot        🚂 TRAIN STATION  │  tracks run E–W
 6 │                               (central hub)     │
 7 │  🏙️ DOWNTOWN / TOWN CENTRE          🛒 MARKET    │  towers + plaza
 9 │  (tall towers, City Hall plaza)    (stalls)     │
11 │  residential midtown               🌳 city park  │
13 │  🌴 seaside promenade  ──────────────────────    │  coast road
14 │  🏖️ BEACH (sand)                                │
15 │  ~~~~~~~~~~~~~ OCEAN ~~~~~~~~~~~~~~~~~~~~~~~~~~~  │  water edge (south)
   └───────────────────────────────────────────────┘
            S  (ocean)
   W                                                 E
```

Edges: **ocean** on the south, **fields/forest** on north & sides → the map feels intentional,
not "cut off." Roads form a connected grid so the camera tour flows:
Airport → Village → Station → Downtown → Market → Park → Promenade → Beach.

## 5. Phased Execution

| Phase | What | Visible result | Status |
|---|---|---|---|
| **F0** | `CityDesign.ts` authored map + plan doc | Single source of truth exists | ✅ done |
| **F1** | Finite bounds: stop infinite wrap; out-of-map = ocean/field; clamp camera | City has edges, no treadmill | ✅ done |
| **F2** | Authored renderer: `CityBuilder` builds tiles from `CityDesign` (baked blocks) | Downtown is always downtown | ✅ done |
| **F3** | `LandmarkFactory`: procedural airport / beach / station / market / plaza / promenade | The 6 memorable places appear | ✅ done |
| **F4a** | Guided **TourCamera**: Airport→Village→Station→Market→Park→Beach→Downtown→Industrial loop + "Now Touring" overlay badge | "Here's the airport" is finally true | ✅ done |
| **F4b** | Re-point pedestrians / traffic lights / buses to the NEW map coordinates | City life aligns to real streets | ✅ done |
| **F5** | Polish: in-world signage, animated train/plane/boats, water shimmer | Hours-long watchable stream | ✅ done |

### F1–F4a implementation notes
- New: `src/city/CityDesign.ts` (map data), `src/city/LandmarkFactory.ts` (procedural
  landmarks), `src/city/CityBuilder.ts` (assembles the finite city once), `src/camera/TourCamera.ts`
  (guided cinematic loop).
- `SceneManager` now has `useAuthoredCity = true`: it builds the fixed city + tour camera and
  **skips** the legacy `CityChunkTbl` / `SceneMoveController` / infinite-wrap path (kept as a
  fallback behind the flag).
- Camera is clamped to `worldBounds()` so it can never wander off the finite map.
- Overlay shows a live **"NOW TOURING"** badge that names the place the camera is visiting.
- Bonus: fixed the 9 pre-existing `tsc` errors, so `npm run build` is green again.

### F4b implementation notes (city life on the real streets)
- `CityDesign.ts` gained a street-network API: `roadTiles()`, `walkableTiles()`,
  `intersectionTiles()`, `isRoad()`, `tileToWorld()` → all systems share one map truth.
- **Pedestrians** now spawn on real walkable tiles (roads, plazas, station, promenade) with
  a per-tile "home" they wander around, and mood mixes per authored zone (joggers in the park,
  shoppers in the market, commuters at the station/airport).
- **Buses**: 3 routes rewritten to follow ACTUAL roads — Cross-Town Line (central avenue),
  Airport Connector (airport spur + north ring), Seaside Loop (downtown spine → promenade →
  beach). Routes use dense road waypoints (pass-through) + named timed stops; `CityBus` now
  distinguishes drive-through waypoints from dwell stops. Verified every stop sits on a road.
- **Traffic lights** now placed at REAL road intersections (`intersectionTiles()`), not the
  old 9×9 chunk corners.

### F5 implementation notes (watchability polish)
- `src/city/CitySignage.ts`: floating pill-shaped labels (icon + name) over every landmark,
  gently bobbing and always facing the camera — you always know where you are, even with the
  HUD hidden.
- `src/city/LandmarkLife.ts`: animated set-pieces that loop 24/7 —
  🚂 a 3-car train arrives at Central Station, dwells ~10s (pushes a ticker), departs, resets;
  ✈️ a plane taxis the runway, takes off, and resets; ⛵ 3 boats drift across the ocean.
- Animated **water shimmer**: all ocean tiles share one material whose hue/brightness ripples
  (`updateWater()` in `LandmarkFactory`, driven from the main loop).
- Perf check: ~260 pedestrians (shared geometry+materials), 34 traffic lights, 3 buses, train,
  plane, 3 boats. Bundle ~894 KB. Boots clean (HTTP 200).

### Optional future work (not blocking a 24/7 launch)
- `gltf/` models remain unused; optionally swap select procedural landmarks for CC0 glTF later.
- Migrate the legacy `CITY_MAP` references in `StreamOverlay` tickers + the disabled
  `CameraDirector` to `CityDesign` for full single-source consistency.
- Long unattended soak test on the target streaming box; OBS/RTMP runbook.

---

## ✅ Rebuild complete (F0–F5)

AICITY is no longer an infinite procedural treadmill. It is now a **finite, hand-authored,
memorable city** — airport NW, village NE, station centre, downtown SW, market E, park,
seaside promenade + beach + ocean to the south — toured by a **guided cinematic camera**, with
**living streets** (pedestrians, buses on real roads, traffic lights at real intersections) and
**signature landmark life** (train, plane, boats) under a shimmering sea. `npm run build` green.

## 6. Non-negotiables

- Must keep building (`npm run build`) green at each phase.
- Must not break the chat server / SQLite / admin panel.
- Must stay cozy & readable (no HUD clutter, no aggressive camera) — watchability first.
