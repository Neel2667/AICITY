import { SceneManager } from './core/SceneManager';
import { CubeObject } from './objects/CubeObject';
import { setupUI } from './ui/Controls';
import { setupFPSCounter } from './utils/fpsCounter';
import { CityClock } from './stream/CityClock';
import { streamConfig } from './stream/StreamConfig';
import { StreamOverlay } from './stream/StreamOverlay';
import { getWeatherFor } from './weather/WeatherState';

const container = document.getElementById('app') as HTMLElement;
const cityClock = new CityClock(streamConfig);
const sceneManager = new SceneManager(container);
const streamOverlay = streamConfig.overlayEnabled ? new StreamOverlay(streamConfig) : null;

if (streamConfig.devMode) {
  setupUI({
    addCube: () => {
      const newCube = new CubeObject();
      sceneManager.addObject(newCube);
    },
    addSphere: () => {
      // Reserved for future development-only diagnostics.
    },
    resetScene: () => {
      sceneManager.removeAllObjects();
    },
  });

  setupFPSCounter();
}

function animate() {
  requestAnimationFrame(animate);

  const clockSnapshot = cityClock.getSnapshot();
  const weatherSnapshot = getWeatherFor(clockSnapshot);

  streamOverlay?.update(clockSnapshot, weatherSnapshot);
  sceneManager.update(clockSnapshot, weatherSnapshot);
}

animate();
