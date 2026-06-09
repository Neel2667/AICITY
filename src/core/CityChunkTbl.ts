/**
 * 生成CityChunkTable数据，实质就是ChunkInstance数据
 */
import * as THREE from 'three';
//import { Tab } from './Tab'; // 假设模块 46 的车辆类
//import { Buffer } from './Buffer'; // 假设模块 49 的云类
import { GVar } from '../utils/GVar';
import { MiscFunc } from '../utils/MiscFunc';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MobileCloud } from '../objects/MobileCloud';
import type { IUpdate } from '../interfaces/IUpdate';
import {MobileCar} from '../objects/MobileCar';

// 定义城市块数据结构
export interface ChunkData {
    node: THREE.Object3D;
    tableX: number;
    tableY: number;
}

export class CityChunkTbl {
    private _containsStadium: boolean = false;
    private keys: any[]; // 城市块类型列表
    private lanes: any[] = []; // 道路列表
    private intersections: any[]; // 交叉口数量
    private mobs: any[] = []; // 动态对象列表（车辆和云）
    private chunks: ChunkData[][] = []; // 城市块表格
    private cloudObjects: any[]; // 云对象列表
    private carObjects: any[]; // 车辆对象列表

    /**
     * 获取Chunks数据.
     */
    public get arrChunks(): ChunkData[][] {
        return this.chunks;
    }
    /**
     * 生成CityChunkTable数据:
     * @param cblocks 
     * @param lanes 
     * @param intsects 
     * @param cars 
     * @param clouds 
     */
    constructor(cblocks: any[], lanes: any[], intsects: any[], cars: any[], clouds: any[]) {
        this.keys = cblocks;
        this.intersections = intsects;
        this.carObjects = cars;
        this.cloudObjects = clouds;

        console.log( "TheObj Length is:" + this.carObjects.length + "," + this.cloudObjects.length );

        // 初始化道路列表
        lanes.forEach((t) => {
            switch (t.name) {
                case "Road_Lane_01_fixed":
                    for (let e = 0; e < 10; e++) {
                        this.lanes.push(t);
                    }
                    break;
                case "Road_Lane_03_fixed":
                    for (let e = 0; e < 5; e++) {
                        this.lanes.push(t);
                    }
                    break;
            }
        });

        this._generate();
    }

    /**
     * 获取指定坐标的城市块数据
     * @param x 行索引
     * @param y 列索引
     * @returns 城市块数据或 undefined
     */
    public getChunkData(x: number, y: number): ChunkData | null {
        x = x % GVar.TABLE_SIZE;
        y = y % GVar.TABLE_SIZE;
        if (x < 0) x = GVar.TABLE_SIZE + x;
        if (y < 0) y = GVar.TABLE_SIZE + y;
        if( this.chunks[x] && this.chunks[x][y] )
            return this.chunks[x][y];
        else
            return null;
    }

    /**
     * 获取相邻车辆
     * @param s 当前车辆
     * @returns 相邻车辆列表
     */
    public getNeighboringCars(s: any): any[] {
        const exports: any[] = [];
        s.parent.traverse((sub: any) => {
            if (sub.name === "car" && sub !== s) {
                exports.push(sub);
            }
        });
        this._forEachNeighboringChunk(s.parent.tableX, s.parent.tableY, (spUtils: any) => {
            spUtils.traverse((e: any) => {
                if (e.name === "car") {
                    exports.push(e);
                }
            });
        });
        return exports;
    }

    /**
     * 更新城市块中的动态可移动元素
     * @param target 更新目标
     */
    public update( ed : IUpdate ): void {
        this.mobs.forEach(( mob : any ) => {
            mob.update( ed );
        });
    }

    /**
     * 遍历邻近块并执行回调
     * @param n X 坐标
     * @param r Y 坐标
     * @param expect 回调函数
     */
    private _forEachNeighboringChunk(n: number, r: number, expect: (chunk: any) => void): void {
        const menu = new THREE.Vector2(n, r);
        const pipelets = [
            new THREE.Vector2(-1, -1), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0),
            new THREE.Vector2(0, 1), new THREE.Vector2(0, 1), new THREE.Vector2(-1, 0),
            new THREE.Vector2(-1, 0), new THREE.Vector2(0, -1)
        ];
        pipelets.forEach((e) => {
            menu.add(e);
            const each1 = this.getChunkData(menu.x, menu.y);
            if (each1) {
                expect(each1.node);
            }
        });
    }

    /**
     * 获取邻近块的类型名称
     * @param e X 坐标
     * @param n Y 坐标
     * @returns 邻近块名称数组
     */
    private _getNeighboringBlocks(e: number, n: number): string[] {
        const parkNames: string[] = [];
        this._forEachNeighboringChunk(e, n, (dep) => {
            parkNames.push(dep.block.name);
        });
        return parkNames;
    }

    /**
     * 在指定坐标选择随机块类型
     * @param pieceX X 坐标
     * @param pieceY Y 坐标
     * @returns 随机块对象
     */
    private _getRandomBlockAt(pieceX: number, pieceY: number): any {
        let blockData: any;
        const piece = this._getNeighboringBlocks(pieceX, pieceY);
        for (let i = 0; i < 100; i++) {
            const file = MiscFunc.getRandElement(this.keys).clone();
            const type = file.name;
            if (type === "block_8_merged") {
                if (this._containsStadium) continue;
                this._containsStadium = true;
                blockData = file;
                break;
            }
            if (piece.indexOf(type) === -1) {
                blockData = file;
                break;
            }
        }
        return blockData;
    }

    /**
     * 生成随机城市块
     * @param x X 坐标
     * @param y Y 坐标
     * @returns 城市块对象
     */
    private _genRandomChunk(x: number, y: number): THREE.Object3D {
        const matrix = new THREE.Matrix4();
        const matrixWorldInverse = new THREE.Matrix4().makeRotationY(Math.PI / 2);
        const chunkIns = new THREE.Object3D();
        chunkIns.name = "chunk";

        const block = this._getRandomBlockAt(x, y);
        const randYRot = Math.round(4 * MiscFunc.random()) * (Math.PI / 2);
        block.rotation.y = randYRot;
        block.position.set(0, 0, 0);
        chunkIns.add(block);
        (chunkIns as any).block = block;

        const d: any[] = [];
        const result = MiscFunc.getRandElement(this.lanes).clone();
        result.position.set(-30, 0, 10);
        chunkIns.add(result);
        d.push(result);

        const object = MiscFunc.getRandElement(this.lanes).clone();
        object.position.set(-30, 0, -10);
        matrix.makeTranslation(0, 0, -20);
        object.geometry = object.geometry.clone();
        result.geometry = result.geometry.clone();
        object.geometry.applyMatrix4(matrix);
        d.push(object);

        const mesh = MiscFunc.getRandElement(this.lanes).clone();
        mesh.position.set(-10, 0, -30);
        mesh.rotation.y = Math.PI / 2;
        d.push(mesh);
        matrix.makeTranslation(20, 0, -40);
        mesh.geometry = mesh.geometry.clone();
        mesh.geometry.applyMatrix4(matrixWorldInverse);
        mesh.geometry.applyMatrix4(matrix);

        const o = MiscFunc.getRandElement(this.lanes).clone();
        o.geometry = o.geometry.clone();
        o.position.set(10, 0, -30);
        o.rotation.y = Math.PI / 2;
        matrix.makeTranslation(40, 0, -40);
        o.geometry.applyMatrix4(matrixWorldInverse);
        o.geometry.applyMatrix4(matrix);
        d.push(o);

        // === 关键修改：使用BufferGeometryUtils合并几何体 ===
        try {
            // 收集所有需要合并的几何体
            const geometries = [
                result.geometry,
                object.geometry,
                mesh.geometry,
                o.geometry
            ];

            // 合并几何体（true参数表示保留原始groups）
            const mergedGeometry = mergeGeometries(geometries, true);

            if (mergedGeometry) {
                // 应用合并后的几何体
                result.geometry = mergedGeometry;

                // 移除其他对象（只保留合并后的result）
                d.forEach(obj => {
                    if (obj !== result) chunkIns.remove(obj);
                });
            } else {
                console.error("Geometry merge failed");
            }
        } catch (e) {
            console.error("Geometry merge error:", e);
            // 回退方案：保持原始几何体
        }

        const r = MiscFunc.getRandElement(this.intersections).clone();
        r.position.set(-30, 0, 30);
        chunkIns.add(r);

        // 
        // 车辆和云的实例创建:每一个Road都随机是否创小汽车:
        d.forEach( (road) => {
            const e = GVar.isMobile() ? 0.2 : 0.35;
            if (MiscFunc.random() < e) {
                // 测试是否影响点击测试：
                let  rawCar : any = MiscFunc.getRandElement(this.carObjects); 
                const carObj = rawCar.clone();
                // 
                // ATTENTION TO FIX: 下面的代码，并不会影响点击测试:
                //carObj.geometry = rawCar.geometry.clone();
                //carObj.material = rawCar.material.clone();

                const carIns = new MobileCar(this, carObj, road);
                chunkIns.add(carIns);
                this.mobs.push(carIns);
            }
        });

        if (MiscFunc.random() > 0.65) {
            const cins : any = MiscFunc.getRandElement(this.cloudObjects).clone();
            const b = new MobileCloud(this, cins);
            chunkIns.add(b);
            this.mobs.push(b);
        }

        chunkIns.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material && object.material.pbr) {
                object.material.defines.USE_FOG = true;
                if (!(object instanceof Buffer)) {
                    object.receiveShadow = true;
                    object.material.defines.USE_SHADOWMAP = true;
                    object.material.defines[GVar.SHADOWMAP_TYPE] = true;
                }
            }
        });

        return chunkIns;
    }

    /**
     * 生成城市块表格
     */
    private _generate(): void {
        for (let y = 0; y < GVar.TABLE_SIZE; y++) {
            for (let x = 0; x < GVar.TABLE_SIZE; x++) {
                if (!this.chunks[x]) {
                    this.chunks[x] = [];
                }
                const chunkObj: any = this._genRandomChunk(x, y);
                chunkObj.tableX = x;
                chunkObj.tableY = y;
                this.chunks[x][y] = { node: chunkObj, tableX: x, tableY: y };
            }
        }
    }

}