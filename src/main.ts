import { SceneManager } from './core/SceneManager';
import { CubeObject } from './objects/CubeObject';
import { setupUI } from './ui/Controls';
import { setupFPSCounter } from './utils/fpsCounter';

// 初始化场景
const container = document.getElementById('app') as HTMLElement;
const sceneManager = new SceneManager(container);


// 设置UI
setupUI({
  addCube: () => {
    const newCube = new CubeObject();
    sceneManager.addObject(newCube);
  },
  addSphere: () => {
  },
  resetScene: () => {
    sceneManager.removeAllObjects();

  }
});

// 设置FPS计数器
setupFPSCounter();

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  sceneManager.update();
}

animate();