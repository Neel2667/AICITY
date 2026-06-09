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

| Phase | What | Visible result |
|---|---|---|
| **F0** | `CityDesign.ts` authored map (THIS COMMIT) + plan doc | Single source of truth exists |
| **F1** | Finite bounds: stop `% TABLE_SIZE` wrap; out-of-map = ocean/field ground | City has edges, no treadmill |
| **F2** | Authored renderer: `CityChunkTbl` builds tiles from `CityDesign` (existing blocks) | Downtown is always downtown |
| **F3** | `LandmarkFactory`: procedural airport / beach / station / market / village / plaza | The 6 memorable places appear |
| **F4** | Camera tour + overlay/pedestrians/traffic re-pointed to real zones; clamp pan | "Here's the airport" is finally true |
| **F5** | Polish: signage labels in-world, water shader, richer life, soak test | Hours-long watchable stream |

## 6. Non-negotiables

- Must keep building (`npm run build`) green at each phase.
- Must not break the chat server / SQLite / admin panel.
- Must stay cozy & readable (no HUD clutter, no aggressive camera) — watchability first.
