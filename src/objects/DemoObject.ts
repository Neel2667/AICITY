import * as THREE from 'three';
import type { IObject } from '../interfaces/IObject';

export abstract class DemoObject implements IObject {
    public mesh: THREE.Object3D;
    private originalMaterial: THREE.Material | THREE.Material[] = [];
    private hoverMaterial: THREE.MeshBasicMaterial;
    
    constructor() {
        this.mesh = this.createMesh();
        
        // 保存原始材质
        if (this.mesh instanceof THREE.Mesh) {
            this.originalMaterial = this.mesh.material;
        }
        
        // 创建悬停材质
        this.hoverMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            wireframe: true
        });
        
        // 添加用户数据标识
        this.mesh.userData.object = this;
    }
    
    protected abstract createMesh(): THREE.Object3D;
    
    public update(delta: number): void {
        // 默认旋转
        this.mesh.rotation.x += delta * 0.5;
        this.mesh.rotation.y += delta;
    }
    
    public onHover(): void {
        if (this.mesh instanceof THREE.Mesh) {
            this.mesh.material = this.hoverMaterial;
        }
    }
    
    public onUnhover(): void {
        if (this.mesh instanceof THREE.Mesh) {
            this.mesh.material = this.originalMaterial;
        }
    }
    
    public dispose(): void {
        if (this.mesh instanceof THREE.Mesh) {
            // 清理几何体和材质
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(mat => mat.dispose());
            } else if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            
            if (this.hoverMaterial) {
                this.hoverMaterial.dispose();
            }
        }
        
        // 从场景中移除
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}