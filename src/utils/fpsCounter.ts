export function setupFPSCounter(): void {
  const fpsCounter = document.getElementById('fps-counter') as HTMLElement;
  let lastTime = performance.now();
  let frameCount = 0;
  
  function updateCounter() {
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;
    frameCount++;
    
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      fpsCounter.textContent = fps.toString();
      
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(updateCounter);
  }
  
  updateCounter();
}