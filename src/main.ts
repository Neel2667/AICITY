/**
 * main.ts — AICITY Live Phase 2
 * Boots the city simulation with CityState, CityMap, CityEventBus wired in.
 */
import { SceneManager } from './core/SceneManager';
import { CubeObject } from './objects/CubeObject';
import { setupUI } from './ui/Controls';
import { setupFPSCounter } from './utils/fpsCounter';
import { CityClock } from './stream/CityClock';
import { streamConfig } from './stream/StreamConfig';
import { StreamOverlay } from './stream/StreamOverlay';
import { getWeatherFor } from './weather/WeatherState';
import { CityState } from './city/CityState';
import { CityEventBus } from './city/CityEventBus';

const container = document.getElementById('app') as HTMLElement;
const cityClock = new CityClock(streamConfig);
const sceneManager = new SceneManager(container);
const streamOverlay = streamConfig.overlayEnabled ? new StreamOverlay(streamConfig) : null;

if (streamConfig.devMode) {
  setupUI({
    addCube: () => { sceneManager.addObject(new CubeObject()); },
    addSphere: () => { /* reserved */ },
    resetScene: () => { sceneManager.removeAllObjects(); },
  });
  setupFPSCounter();
}

CityEventBus.on('constructionComplete', (p) => {
  console.log(`[AICITY] 🏗️ Construction complete: ${p['label']}`);
});
CityEventBus.on('districtUnlocked', (p) => {
  console.log(`[AICITY] 🗺️ District unlocked: ${p['name']}`);
});
CityEventBus.on('viewerContribution', (p) => {
  console.log(`[AICITY] 💬 @${p['name']} → ${p['target']}`);
});

function animate() {
  requestAnimationFrame(animate);
  const clockSnapshot = cityClock.getSnapshot();
  const weatherSnapshot = getWeatherFor(clockSnapshot);
  CityState.tick(clockSnapshot.dayNumber);
  const cityStateSnapshot = CityState.getSnapshot();
  streamOverlay?.update(clockSnapshot, weatherSnapshot, cityStateSnapshot);
  sceneManager.update(clockSnapshot, weatherSnapshot);
}

animate();
