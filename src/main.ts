/**
 * main.ts — AICITY Live Phase 4
 * Adds: PedestrianManager, BusManager, FireworksController, AmbientAudio
 * Enhanced CameraDirector with 5 modes responds to all city events.
 */
import { SceneManager }       from './core/SceneManager';
import { CubeObject }         from './objects/CubeObject';
import { setupUI }            from './ui/Controls';
import { setupFPSCounter }    from './utils/fpsCounter';
import { CityClock }          from './stream/CityClock';
import { streamConfig }       from './stream/StreamConfig';
import { StreamOverlay }      from './stream/StreamOverlay';
import { getWeatherFor }      from './weather/WeatherState';
import { CityState }          from './city/CityState';
import { CityEventBus }       from './city/CityEventBus';
import { chatBot }            from './chat/ChatBot';
import { ChatOverlay }        from './chat/ChatOverlay';
import { voteManager }        from './chat/VoteManager';
import { BusManager }         from './bus/BusManager';
import { FireworksController } from './effects/Fireworks';
import { ambientAudio }       from './audio/AmbientAudio';
import { PedestrianManager }  from './pedestrians/PedestrianManager';

// ─── Core ─────────────────────────────────────────────────────────────────────
const container     = document.getElementById('app') as HTMLElement;
const cityClock     = new CityClock(streamConfig);
const sceneManager  = new SceneManager(container);
const streamOverlay = streamConfig.overlayEnabled ? new StreamOverlay(streamConfig) : null;
const chatOverlay   = new ChatOverlay();

// ─── Phase 4 subsystems ───────────────────────────────────────────────────────
const busManager      = new BusManager(sceneManager.scene);
const fireworks       = new FireworksController(sceneManager.scene);
const pedManager      = new PedestrianManager(sceneManager.scene);

// Spawn buses and pedestrians (after scene is ready — brief defer)
setTimeout(() => {
  busManager.spawn();
  pedManager.spawnInitial();
  console.log('[AICITY] Phase 4 subsystems spawned');
}, 500);

// ─── Chat bot ─────────────────────────────────────────────────────────────────
if (streamConfig.streamMode) chatBot.connect();

// ─── Audio: start on first user interaction ───────────────────────────────────
function startAudioOnInteraction() {
  if (!ambientAudio.isStarted()) {
    ambientAudio.start();
    window.removeEventListener('click',   startAudioOnInteraction);
    window.removeEventListener('keydown', startAudioOnInteraction);
  }
}
window.addEventListener('click',   startAudioOnInteraction);
window.addEventListener('keydown', startAudioOnInteraction);

// ─── Auto-poll timer ──────────────────────────────────────────────────────────
const AUTO_POLL_INTERVAL_MS = 10 * 60_000;
let lastAutoPollAt = 0;

// ─── Dev mode ─────────────────────────────────────────────────────────────────
if (streamConfig.devMode) {
  setupUI({
    addCube:    () => sceneManager.addObject(new CubeObject()),
    addSphere:  () => {},
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
  const snap = CityState.getSnapshot();
  CityState.addConstruction({
    chunkX: 4, chunkY: 4,
    label: `Community ${p['buildType']} Project`,
    startDayNumber: snap.dayNumber,
    completionDayNumber: snap.dayNumber + 3,
  });
});

CityEventBus.on('fireworksRequested', () => {
  fireworks.show(20);
});

// Milestone fireworks: district unlock
CityEventBus.on('districtUnlocked', () => fireworks.show(12));

// Milestone fireworks: construction complete
CityEventBus.on('constructionComplete', () => fireworks.show(8));

// Camera follow a bus on vote
CityEventBus.on('cameraVote', (p) => {
  if (p['mode'] === 'follow') {
    const bus = busManager.getRandomBus();
    if (bus) sceneManager.getCameraDirector()?.setFollowTarget(bus);
  }
});

// ─── Animation loop ───────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const clockSnapshot   = cityClock.getSnapshot();
  const weatherSnapshot = getWeatherFor(clockSnapshot);

  CityState.tick(clockSnapshot.dayNumber);
  const citySnap = CityState.getSnapshot();

  // Auto-poll
  const now = Date.now();
  if (now - lastAutoPollAt > AUTO_POLL_INTERVAL_MS &&
      !voteManager.isPollOpen() && !voteManager.isInCooldown()) {
    if (voteManager.openPoll()) lastAutoPollAt = now;
  }

  // Update audio
  ambientAudio.update(clockSnapshot, weatherSnapshot);

  // Update overlays
  streamOverlay?.update(clockSnapshot, weatherSnapshot, citySnap);
  chatOverlay.update(clockSnapshot, citySnap);

  // Update Phase 4 subsystems
  const ud = sceneManager.getLastUpdate();
  if (ud) {
    busManager.update(ud, clockSnapshot);
    pedManager.update(ud, clockSnapshot);
    fireworks.update(ud);
  }

  // Update scene (atmosphere + camera director + chunk mobs)
  sceneManager.update(clockSnapshot, weatherSnapshot);
}

animate();
