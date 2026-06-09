import * as THREE from 'three';
import { DemoObject } from './DemoObject';

export class CubeObject extends DemoObject {
    protected createMesh(): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(Math.random() * 0xffffff),
            metalness: 0.2,
            roughness: 0.7
        });
        const cube = new THREE.Mesh(geometry, material);
        
        // 随机位置
        cube.position.x = (Math.random() - 0.5) * 10;
        cube.position.y = 0.75;
        cube.position.z = (Math.random() - 0.5) * 10;
        
        return cube;
    }
}