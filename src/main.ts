/**
 * main.ts — AICITY Live Phase 5
 * Adds: SQLite-backed persistence (via server stateSnapshot),
 * TrafficLightManager, ClipRecorder, admin WS message handlers,
 * dayAdvance sync to server, constructionComplete sync.
 */
import { SceneManager }          from './core/SceneManager';
import { CubeObject }            from './objects/CubeObject';
import { setupUI }               from './ui/Controls';
import { setupFPSCounter }       from './utils/fpsCounter';
import { CityClock }             from './stream/CityClock';
import { streamConfig }          from './stream/StreamConfig';
import { StreamOverlay }         from './stream/StreamOverlay';
import { getWeatherFor }         from './weather/WeatherState';
import { CityState }             from './city/CityState';
import { CityEventBus }          from './city/CityEventBus';
import { chatBot }               from './chat/ChatBot';
import { ChatOverlay }           from './chat/ChatOverlay';
import { voteManager }           from './chat/VoteManager';
import { BusManager }            from './bus/BusManager';
import { FireworksController }   from './effects/Fireworks';
import { ambientAudio }          from './audio/AmbientAudio';
import { PedestrianManager }     from './pedestrians/PedestrianManager';
import { TrafficLightManager }   from './traffic/TrafficLightManager';
import { clipRecorder }          from './clips/ClipRecorder';
import { CitySignage }           from './city/CitySignage';
import { LandmarkLife }          from './city/LandmarkLife';
import { updateWater }           from './city/LandmarkFactory';

// ─── Core ─────────────────────────────────────────────────────────────────────
const container     = document.getElementById('app') as HTMLElement;
const cityClock     = new CityClock(streamConfig);
const sceneManager  = new SceneManager(container);
const streamOverlay = streamConfig.overlayEnabled ? new StreamOverlay(streamConfig) : null;
const chatOverlay   = new ChatOverlay();

// ─── Phase 5 subsystems ───────────────────────────────────────────────────────
const busManager      = new BusManager(sceneManager.scene);
const fireworks       = new FireworksController(sceneManager.scene);
const pedManager      = new PedestrianManager(sceneManager.scene);
const trafficLights   = new TrafficLightManager(sceneManager.scene);
const citySignage     = new CitySignage(sceneManager.scene);
const landmarkLife    = new LandmarkLife(sceneManager.scene);

// Give clip recorder access to the Three.js canvas
setTimeout(() => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (canvas) clipRecorder.setCanvas(canvas);
}, 600);

// NOTE: pedestrians / buses / traffic lights / signage / landmark-life were
// authored against the OLD CityDesign tile grid. We now load a complete
// artist-designed city scene instead, so those grid-aligned systems are
// disabled for now (they'd float disconnected from the new layout). They can
// be re-pointed at the new scene later. Kept imported to avoid churn.
void busManager; void pedManager; void trafficLights; void citySignage; void landmarkLife; void updateWater;

// ─── Camera mode hint + toggle ────────────────────────────────────────────────
// Manual is the default for now. Press "M" or click the badge to toggle the
// guided cinematic tour on/off at runtime.
const camHint = document.createElement('div');
camHint.id = 'cameraHint';
camHint.style.cssText =
  'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:200;' +
  'pointer-events:auto;cursor:pointer;font:600 12px system-ui,sans-serif;' +
  'color:#fff7e8;background:rgba(8,12,28,0.6);border:1px solid rgba(255,255,255,0.16);' +
  'border-radius:999px;padding:7px 16px;backdrop-filter:blur(12px);user-select:none;';
function renderCamHint() {
  const td = sceneManager.getTourCamera();
  camHint.textContent = td
    ? '🎬 Guided Tour · press M for manual control'
    : '🖱️ Drag: rotate · Scroll: zoom · Right-drag: pan · WASD/Arrows: move · M: tour';
}
function toggleCameraMode() {
  sceneManager.toggleCameraMode();
  renderCamHint();
}
camHint.addEventListener('click', toggleCameraMode);
window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') toggleCameraMode(); });
document.body.appendChild(camHint);
setTimeout(renderCamHint, 800);

// ─── Chat bot + server sync ───────────────────────────────────────────────────
if (streamConfig.streamMode) chatBot.connect();

// Handle server-pushed messages (state snapshot on reconnect, admin commands)
CityEventBus.on('serverMessage', (p) => {
  const type = p['type'] as string;
  if (type === 'stateSnapshot') {
    const snap = p['payload'] as any;
    if (snap?.meta) {
      console.log(`[AICITY] Server snapshot: Day ${snap.meta.dayNumber} · Pop ${snap.meta.population}`);
    }
  }
  if (type === 'adminMessage') {
    streamOverlay && CityEventBus.emit('adminTicker', { text: p['text'] });
  }
  if (type === 'adminFireworks') {
    fireworks.show(p['duration'] as number ?? 15);
  }
  if (type === 'adminOpenPoll') {
    voteManager.openPoll(p['question'] as string);
  }
  if (type === 'constructionAdded') {
    CityState.addConstruction({
      chunkX: p['chunkX'] as number, chunkY: p['chunkY'] as number,
      label: p['label'] as string,
      startDayNumber: p['startDay'] as number,
      completionDayNumber: p['completionDay'] as number,
    });
  }
  if (type === 'tickerPush') {
    CityEventBus.emit('tickerPush', { text: p['text'] });
  }
});

// ─── Audio ────────────────────────────────────────────────────────────────────
function startAudio() {
  if (!ambientAudio.isStarted()) { ambientAudio.start(); }
  window.removeEventListener('click',   startAudio);
  window.removeEventListener('keydown', startAudio);
}
window.addEventListener('click',   startAudio);
window.addEventListener('keydown', startAudio);
(window as any).__aicityAudio = ambientAudio;

// ─── Auto-poll ────────────────────────────────────────────────────────────────
const AUTO_POLL_MS = 10 * 60_000;
let lastAutoPollAt = 0;
let lastDayNumber  = 1;

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
CityEventBus.on('buildVoteWon', (p) => {
  const snap = CityState.getSnapshot();
  CityState.addConstruction({
    chunkX: 4, chunkY: 4,
    label: `Community ${p['buildType']} Project`,
    startDayNumber: snap.dayNumber,
    completionDayNumber: snap.dayNumber + 3,
  });
  // Sync vote result to server for DB persistence
  chatBot.sendToServer({ type: 'voteResult', pollId: p['pollId'] ?? '', winner: p['buildType'], totalVotes: p['totalVotes'] ?? 0, dayNumber: snap.dayNumber });
});

CityEventBus.on('fireworksRequested', () => fireworks.show(20));
CityEventBus.on('districtUnlocked', (p) => {
  fireworks.show(12);
  trafficLights.addForDistrict(p['districtId'] as string);
});
CityEventBus.on('constructionComplete', (p) => {
  fireworks.show(8);
  chatBot.sendToServer({ type: 'constructionComplete', constructionId: p['id'] ?? 0, label: p['label'] ?? '' });
});
CityEventBus.on('mayorElected', (p) => {
  chatBot.sendToServer({ type: 'mayorElected', channelId: p['channelId'], authorName: p['authorName'] ?? 'Unknown' });
});
CityEventBus.on('viewerContribution', (p) => {
  chatBot.sendToServer({ type: 'viewerContribution', ...p as any });
});
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

  // Sync day advance to server
  if (clockSnapshot.dayNumber !== lastDayNumber) {
    lastDayNumber = clockSnapshot.dayNumber;
    chatBot.sendToServer({ type: 'dayAdvance', dayNumber: clockSnapshot.dayNumber });
  }

  // Auto-poll
  const now = Date.now();
  if (now - lastAutoPollAt > AUTO_POLL_MS && !voteManager.isPollOpen() && !voteManager.isInCooldown()) {
    if (voteManager.openPoll()) lastAutoPollAt = now;
  }

  ambientAudio.update(clockSnapshot, weatherSnapshot);
  streamOverlay?.update(clockSnapshot, weatherSnapshot, citySnap);
  chatOverlay.update(clockSnapshot, citySnap);

  const ud = sceneManager.getLastUpdate();
  if (ud) {
    // Grid-aligned city life is disabled while we use the artist city scene.
    // Fireworks still work (sky effect, position-independent).
    fireworks.update(ud);
  }

  sceneManager.update(clockSnapshot, weatherSnapshot);
}

animate();
