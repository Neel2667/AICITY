/**
 * 
 */
import * as THREE from 'three';
import { MobileObj } from './MobileObj';
import { GVar } from '../utils/GVar';
import { MiscFunc } from '../utils/MiscFunc';
import type { CityChunkTbl } from '../core/CityChunkTbl';
import type { IUpdate } from '../interfaces/IUpdate';

export class MobileCloud extends MobileObj {
    private delay: number;
    private speedModifier: number;
    private moveSpeed: number;
    private maxScalar: number;
    private minScalar: number;
    private direction: THREE.Vector3;

    constructor(table: CityChunkTbl, obj: THREE.Object3D) {
        super(table);
        this.add( obj );

        this.position.set(
            MiscFunc.random() * GVar.CHUNK_SIZE - GVar.CHUNK_SIZE / 2,
            60,
            MiscFunc.random() * GVar.CHUNK_SIZE - GVar.CHUNK_SIZE / 2
        );

        this.delay = 5 * MiscFunc.random();
        this.speedModifier = 0.25 * MiscFunc.random() + 1;
        // *60是为了把移动以时间为基础，而不是以帧速为基础:
        this.moveSpeed = 0.05 * this.speedModifier * 60;
        this.maxScalar = this.scale.x + this.scale.x * 0.05;
        this.minScalar = this.scale.x - this.scale.x * 0.05;
        this.rotation.y = 0.25;
        this.direction = new THREE.Vector3(-1, 0, 0.3);
    }

    /**
     * 
     * @param ud 
     */
    public update( ud : IUpdate ): void {
        
        // 平滑又风骚的移动:
        const n = THREE.MathUtils.mapLinear(
            Math.sin((this.delay + ud.elapsed) * 2),
            -1, 1, 0, 1
        );
        this.scale.setScalar(this.minScalar + (this.maxScalar - this.minScalar) * n);

        const value = this.direction.clone().multiplyScalar(this.moveSpeed * ud.delta);
        this.position.add(value);

        this._updateTablePosition();
    }
}