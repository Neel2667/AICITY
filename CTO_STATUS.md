# CTO_STATUS.md
**Project:** AICITY Live — Persistent Living City (24/7 YouTube Stream)  
**Branch:** persistent-city  
**Last Updated:** 2026-06-09  
**CTO:** Arena.ai Agent Mode

---

## 1. Project Goal (Confirmed)

Build a **real-feeling persistent miniature city** for a 24/7 YouTube live stream.

Key requirements:
- The city must **not** feel like a procedural engine.
- Viewers should feel attached and watch for hours.
- Start with an **initial beautiful city** that then grows.
- Later (after full development) we can reset to an empty city that grows from Day 1.
- Chat interaction only after the persistent city feels stable.
- Long-term vision: A living city where citizens have names, jobs, homes, and personal stories. Real events happen (elections, theft, festivals, daily routines, etc.).

---

## 2. Current Status

- Repo cloned and analyzed.
- Git access configured using provided token.
- New branch created: `persistent-city`
- All changes will be pushed to this branch.
- This file (`CTO_STATUS.md`) created for full continuity.

**Current Phase:** Phase 0 – Foundation & Setup

---

## 3. Key Decisions Made

| Decision | Details |
|----------|---------|
| Starting State | Initial beautiful city already built, then grows |
| Chat Interaction | Added only after persistent city is stable |
| City Vibe | Quiet Harbor Town (cozy modern European harbor town) |
| Name | Harbor’s End |
| Technical Base | Existing Three.js + Vite + TypeScript renderer |
| Persistence | Replace random generation with saved `CityMap` system |
| Continuity Method | This `CTO_STATUS.md` + detailed commits |

---

## 4. City Vibe & Theme (Chosen by CTO)

**Quiet Harbor Town – “Harbor’s End”**

- Warm, cozy, cinematic European-style harbor town.
- Features: Waterfront, lighthouse, market square, residential hills, small industrial area, bridge.
- Why chosen: Excellent for long watch time, beautiful day/night cycles, easy to add character stories and events.

---

## 5. Phased Roadmap

| Phase | Name | Goal | Chat? | Status |
|-------|------|------|-------|--------|
| **0** | Foundation | Persistent city map + initial beautiful city | No | In Progress |
| **1** | Watchable Stream | Beautiful visuals, growth system, cinematic camera | No | Planned |
| **2** | Living Core | Named citizens + stories + daily routines | No | Planned |
| **3** | Events & Depth | Elections, incidents, festivals, character arcs | No | Planned |
| **4** | Chat Integration | Safe voting and viewer influence | Yes | Planned |

---

## 6. Next Immediate Tasks (Phase 0)

1. Design and implement `CityMap` JSON format.
2. Create an initial beautiful city layout (named districts + landmarks).
3. Replace random chunk generation in `CityChunkTbl` with map-driven rendering.
4. Add basic growth/construction system.
5. Update `CTO_STATUS.md` after every major step.
6. Push all changes to GitHub.

---

## 7. Git & Continuity Rules

- All work happens on branch: `persistent-city`
- Every significant change is committed with clear messages.
- This `CTO_STATUS.md` is updated regularly.
- Anyone resuming this project should read this file first.

---

## 8. Notes for Future Agents / Chats

- The vision is ambitious (real city simulation with citizen stories).
- We are starting small and building in phases.
- Do not add chat features until Phase 4.
- Always prioritize viewer attachment and “real city” feeling over technical complexity.
- Current vibe: Quiet Harbor Town.

---

**Status:** Phase 0 in progress — CityMap JSON and CityMapLoader created. Integration with CityChunkTbl started.