export interface UICallbacks {
  addCube: () => void;
  addSphere: () => void;
  resetScene: () => void;
}

export function setupUI(callbacks: UICallbacks): void {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '100';
  container.style.display = 'flex';
  container.style.gap = '10px';
  
  // 创建按钮
  const createButton = (text: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.padding = '8px 16px';
    button.style.background = 'rgba(255, 255, 255, 0.1)';
    button.style.color = 'white';
    button.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.addEventListener('click', onClick);
    return button;
  };
  
  //container.appendChild(createButton('添加立方体', callbacks.addCube));
  //container.appendChild(createButton('添加球体', callbacks.addSphere));
  container.appendChild(createButton('重置场景', callbacks.resetScene));
  
  document.body.appendChild(container);
}