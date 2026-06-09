export function setupFPSCounter(): void {
  let fpsCounter = document.getElementById('fps-counter') as HTMLElement | null;

  if (!fpsCounter) {
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.innerHTML = 'AICITY Dev | FPS: <span id="fps-counter">0</span>';
    document.body.appendChild(statusBar);
    fpsCounter = document.getElementById('fps-counter') as HTMLElement;
  }

  let lastTime = performance.now();
  let frameCount = 0;

  function updateCounter() {
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;
    frameCount++;

    if (elapsed >= 1000 && fpsCounter) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      fpsCounter.textContent = fps.toString();

      frameCount = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(updateCounter);
  }

  updateCounter();
}
