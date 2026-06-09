# AICITY Live

AICITY Live is a 24/7 YouTube live-city project built on the Three.js/TypeScript foundation from InfiniTownTS.

The product goal is not to make a random procedural demo. The goal is to create a persistent miniature city that feels like a real place: named districts, recurring landmarks, cinematic camera direction, day/night/weather ambience, visible growth, and later YouTube chat interaction.

## Current Phase

**Phase 1 — Watchable Stream MVP**

Implemented in this repo:

- Three.js + TypeScript + Vite base.
- Stream-first page title and layout.
- `CityClock` with a 60-minute city day.
- Live overlay with city time, day counter, weather, and stream ticker.
- Day/night atmosphere controller.
- Weather-lite state: clear, cloudy, morning fog, light rain metadata.
- Automatic cinematic `CameraDirector` for hands-free OBS streaming.
- Dev UI hidden by default; use `?dev=1` to show dev diagnostics.

## Run Locally

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser.

Useful query flags:

```text
?dev=1              enable dev UI/FPS counter
?stream=0           disable stream-mode default behavior
?overlay=0          hide overlay
?camera=0           disable auto camera director
?atmosphere=0       disable day/night atmosphere updates
?dayLength=300      set one city day to 300 real seconds for testing
?city=AICITY%20Live set overlay city name
```

## Build

```bash
npm run build
```

## OBS / YouTube Direction

For the first public version:

```text
Browser running AICITY → OBS capture → YouTube Live RTMP
```

Recommended first test:

- 720p30 or 1080p30.
- Browser full-screen or OBS browser/window capture.
- Use `?dayLength=300` for testing day/night quickly.
- Use normal latency, not ultra-low latency, for stream stability.

## Important License Note

This repository currently uses InfiniTownTS as the rendering foundation and includes its assets/code base. Before monetizing the YouTube channel, confirm commercial/monetized usage rights for InfiniTownTS and its derivative relationship to the original InfiniTown demo/assets.

## CTO Direction

Short-term:

1. Make the city beautiful and watchable.
2. Make it persistent and recognizable.
3. Launch 24/7 via local OBS.
4. Add chat voting and naming.
5. Grow toward a deeper living simulation after the stream is running.

Long-term moat:

- Cinematic camera director.
- Persistent city identity.
- Viewer-shaped city growth.
- AI news ticker from real city events.
