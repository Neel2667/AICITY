import * as THREE from 'three';

export interface IObject {
    mesh: THREE.Object3D;
    update(delta: number): void;
    dispose?(): void; // 可选资源清理方法
    onHover?(): void; // 鼠标悬停回调
    onClick?(): void; // 点击回调
}