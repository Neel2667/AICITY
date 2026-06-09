/**
 * 场景内移动的各种Car类.
 */
import * as THREE from 'three';
import { MobileObj } from './MobileObj';
import { MiscFunc } from '../utils/MiscFunc';
import type { CityChunkTbl } from '../core/CityChunkTbl';
import type { IUpdate } from '../interfaces/IUpdate';
import { GVar } from '../utils/GVar';

export class MobileCar extends MobileObj {
    private maxSpeed: number = 0.25 * 60;
    private minSpeed: number = 0;
    private speed: number = this.maxSpeed;
    private stuck: boolean = false;
    private restartTimer: any | null = null;
    private radarRadius: number = 20;
    private direction: THREE.Vector3 | null = null;
    private collisionPoints: THREE.Vector3[] = [];
    private detectedCar: MobileCar | null = null;
    private meshObj: THREE.Object3D | null = null;

    protected debugBox: any = null;

    constructor(table: CityChunkTbl, obj: THREE.Object3D, road: THREE.Object3D) {
        super(table);
        this.name = "car";
        this.userData['type'] = "mobileCar";
        (obj as THREE.Mesh).geometry.computeBoundingSphere();
        (obj as THREE.Mesh).geometry.computeBoundingBox();

        this.meshObj = obj;
        if (this._isLargeVehicle())
            this.radarRadius = this.radarRadius * 1.2;
        const box = new THREE.Box3().setFromObject(obj);
        this.add(obj);
        this.position.copy(road.position);
        const point = new THREE.Vector3(3.4, 0, 0);
        obj.rotation.copy(road.rotation);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), obj.rotation.y);
        if (MiscFunc.random() > 0.5) {
            this.position.add(point);
        } else {
            obj.rotation.y += Math.PI;
            this.position.sub(point);
        }
        this.direction = new THREE.Vector3();
        obj.getWorldDirection(this.direction).negate();
        this.direction.set(Math.round(this.direction.x), Math.round(this.direction.y), Math.round(this.direction.z));
        this._initCollisionPoints(box);

        // 创建Box3Helper（自动生成线框）
        const boxHelper = new THREE.Box3Helper(box, 0xffff00); // 参数：Box3实例 + 颜色
        obj.add(boxHelper);
        this.debugBox = boxHelper;

        if (GVar.bVisDebug) {
            this.debugBox.visible = true;
        }else
            this.debugBox.visible = false;

    }

    public getMeshObj(): any {
        return this.meshObj;
    }

    /**
     * 获取当前Car移动的方向
     * @param dir 
     */
    public getDirection(dir: THREE.Vector3): void {
        dir.copy(this.direction!);
    }

    private _initCollisionPoints(box: THREE.Box3): void {
        const min = box.min.clone();
        const max = box.max.clone();
        this.worldToLocal(min);
        this.worldToLocal(max);
        min.y = 1;
        max.y = 1;
        if (Math.abs(this.direction!.x) > 0) {
            min.z = 0;
            max.z = 0;
        } else {
            min.x = 0;
            max.x = 0;
        }
        this.collisionPoints = [min, max];
    }

    public detectCars(_data: MobileCar[]): void {
        const _speed = 0.0075 * 60;
        let n: boolean = true;
        this.detectedCar = null;
        for (const car of _data) {
            const detected = this.detectCar(car);
            if (detected) {
                n = false;
                this.detectedCar = detected;
                break;
            }
        }
        if (n) {
            if (this.speed < this.maxSpeed) {
                this.speed += _speed;
                this.speed = Math.min(this.speed, this.maxSpeed);
            }
            if (this.stuck) {
                clearTimeout(this.restartTimer!);
                this.stuck = false;
                this.minSpeed = 0;
            }
            this.setDebugBoxColor(0xffff00);
        } else {
            this.setDebugBoxColor(0xff0000);
            this.speed -= _speed;
            this.speed = Math.max(this.speed, this.minSpeed);
            if (!this.stuck && this.speed === 0) {
                this.stuck = true;
                this.restartTimer = setTimeout(() => {
                    this.minSpeed = 0.25 * this.maxSpeed;
                }, 2000);
            }
        }
    }

    protected bColorForceKeep: boolean = false;
    public setDebugBoxColor(color: number, forceKeep: boolean = false): void {
        if (this.bColorForceKeep && !forceKeep) return;
        this.bColorForceKeep = forceKeep;
        if (this.debugBox)
            (this.debugBox as THREE.BoxHelper).material.color.set(color);
    }

    private detectCar(obj: MobileCar): MobileCar | null {
        if (obj.detectedCar === this) {
            return null;
        }
        if (this.isOnIntersection() && !obj.isOnIntersection() && !this.direction!.equals(obj.direction!)) {
            return null;
        }
        obj.updateMatrix();
        const v1 = this.direction!.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
        const startGround = new THREE.Vector3();

        const curChunk: any = this.parent;
        this.getTablePosition(this.position, curChunk.tableX, curChunk.tableY, startGround);
        for (const pos of obj.collisionPoints) {
            const orig = pos.clone().applyMatrix4(obj.matrix);
            const endGround = new THREE.Vector3();
            this.getTablePosition(orig, (obj.parent as any).tableX, (obj.parent as any).tableY, endGround);
            const length = startGround.distanceTo(endGround);
            if (length <= this.radarRadius) {
                const v2 = endGround.clone().sub(startGround).normalize();
                const delta = v1.dot(v2);
                if (delta > 0.5) {
                    return obj;
                }
            }
        }
        return null;
    }

    /**
     *　移动更新:
     */
    public update(ud: IUpdate): void {
        const value = this.direction!.clone().multiplyScalar(this.speed * ud.delta);
        this.position.add(value);
        MiscFunc.roundVector(this.position, 2);
        this._updateTablePosition();
        const neighboringCars = this.table.getNeighboringCars(this);
        this.detectCars(neighboringCars);
    }

    /**
     * 是否碰撞：
     * @returns 
     */
    private isOnIntersection(): boolean {
        return this.position.x < -20 && this.position.x > -40 && this.position.z < -20 && this.position.z > -40;
    }

    protected _isLargeVehicle(): boolean {
        let mesh: any = this.meshObj;
        return mesh.name.indexOf("Bus") !== -1 ||
            mesh.name.indexOf("Container") !== -1 || mesh.name.indexOf("Truck") !== -1;
    }

}
