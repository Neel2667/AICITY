/**
 * main.ts — AICITY Live Phase 3
 * Adds: ChatBot (WebSocket client), ChatOverlay (vote HUD + chat feed),
 * VoteManager (poll lifecycle), auto-poll timer.
 */
import { SceneManager }   from './core/SceneManager';
import { CubeObject }     from './objects/CubeObject';
import { setupUI }        from './ui/Controls';
import { setupFPSCounter } from './utils/fpsCounter';
import { CityClock }      from './stream/CityClock';
import { streamConfig }   from './stream/StreamConfig';
import { StreamOverlay }  from './stream/StreamOverlay';
import { getWeatherFor }  from './weather/WeatherState';
import { CityState }      from './city/CityState';
import { CityEventBus }   from './city/CityEventBus';
import { chatBot }        from './chat/ChatBot';
import { ChatOverlay }    from './chat/ChatOverlay';
import { voteManager }    from './chat/VoteManager';

// ─── Core setup ───────────────────────────────────────────────────────────────
const container    = document.getElementById('app') as HTMLElement;
const cityClock    = new CityClock(streamConfig);
const sceneManager = new SceneManager(container);
const streamOverlay = streamConfig.overlayEnabled ? new StreamOverlay(streamConfig) : null;
const chatOverlay  = new ChatOverlay();

// ─── Chat bot (connects to ws://localhost:3717) ───────────────────────────────
if (streamConfig.streamMode) {
  chatBot.connect();
}

// ─── Auto-poll timer: open a vote poll every 10 minutes ──────────────────────
const AUTO_POLL_INTERVAL_MS = 10 * 60_000;
let lastAutoPollAt = 0;

// ─── Dev UI ───────────────────────────────────────────────────────────────────
if (streamConfig.devMode) {
  setupUI({
    addCube:    () => sceneManager.addObject(new CubeObject()),
    addSphere:  () => { /* reserved */ },
    resetScene: () => sceneManager.removeAllObjects(),
  });
  setupFPSCounter();
}

// ─── City event listeners ─────────────────────────────────────────────────────
CityEventBus.on('constructionComplete', (p) =>
  console.log(`[AICITY] 🏗️ ${p['label']} complete`));

CityEventBus.on('districtUnlocked', (p) =>
  console.log(`[AICITY] 🗺️ ${p['name']} unlocked`));

CityEventBus.on('buildVoteWon', (p) => {
  // Kick off a construction project for the winning build type
  const citySnap = CityState.getSnapshot();
  CityState.addConstruction({
    chunkX: 4,
    chunkY: 4,
    label: `Community ${p['buildType']} Project`,
    startDayNumber: citySnap.dayNumber,
    completionDayNumber: citySnap.dayNumber + 3,
  });
});

CityEventBus.on('cameraVote', (p) =>
  console.log(`[AICITY] 📷 Camera vote: ${p['author']} → ${p['mode']}`));

CityEventBus.on('fireworksRequested', (p) =>
  console.log(`[AICITY] 🎆 Fireworks by ${p['author']}`));

// ─── Main animation loop ──────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const clockSnapshot   = cityClock.getSnapshot();
  const weatherSnapshot = getWeatherFor(clockSnapshot);

  // City state tick
  CityState.tick(clockSnapshot.dayNumber);
  const cityStateSnapshot = CityState.getSnapshot();

  // Auto-open poll periodically (only if chat is connected or in dev mode)
  const now = Date.now();
  if (
    now - lastAutoPollAt > AUTO_POLL_INTERVAL_MS &&
    !voteManager.isPollOpen() &&
    !voteManager.isInCooldown()
  ) {
    const opened = voteManager.openPoll();
    if (opened) lastAutoPollAt = now;
  }

  // Update overlays
  streamOverlay?.update(clockSnapshot, weatherSnapshot, cityStateSnapshot);
  chatOverlay.update(clockSnapshot, cityStateSnapshot);

  // Update scene
  sceneManager.update(clockSnapshot, weatherSnapshot);
}

animate();
