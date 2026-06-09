import * as THREE from 'three';
import { GVar } from '../utils/GVar';

/**
 * AppScene组织类:
 * 最上层的组织类，用于全局的数据处理:
 */
export class AppScene extends THREE.Scene {
    protected _pickables: THREE.Mesh[] = [];
    protected arrChunkContainer: THREE.Object3D[][] = [];

    /**
     * 生成Chunk数据：
     * @param x 
     * @param z 
     */
    protected createChunkAt(x: number, z: number): THREE.Object3D {
        // 创建容器对象
        const chunkInsContainer = new THREE.Object3D();

        // 创建平面几何体和材质
        const geometry = new THREE.PlaneGeometry(
            GVar.CHUNK_SIZE,
            GVar.CHUNK_SIZE,
            1,
            1
        );

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,     // 启用透明度
            opacity: 0.35,          // 设置透明度值（0.0完全透明，1.0完全不透明
        });

        // 创建网格对象并添加自定义属性
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;

        // 计算中心偏移量
        const centerOffset = Math.floor(GVar.CHUNK_COUNT / 2);
        mesh.userData["centeredX"] = x - centerOffset;
        mesh.userData["centeredY"] = z - centerOffset;
        mesh.visible = false;
        if (GVar.bVisDebug)
            mesh.position.y += 0.01;

        // 添加到可拾取对象数组
        this._pickables.push(mesh);

        // 
        // 计算ChunkInsContainer的位置
        // chunkContainer的位置信息+AppScene的位置信息，构成了整个无限循环城市场景的正常运行。
        // 而ChunkContainer内的ChunkInstance则全部位于原点位置.
        const halfSize = (GVar.CHUNK_COUNT - 1) / 2 * -GVar.CHUNK_SIZE;
        chunkInsContainer.position.x = halfSize + x * GVar.CHUNK_SIZE;
        chunkInsContainer.position.z = halfSize + z * GVar.CHUNK_SIZE;

        // 添加自定义属性
        chunkInsContainer.userData["centeredX"] = mesh.userData["centeredX"];
        chunkInsContainer.userData["centeredY"] = mesh.userData["centeredY"];
        chunkInsContainer.userData["material"] = mesh.material;

        // 将网格添加到容器对象
        chunkInsContainer.add(mesh);

        return chunkInsContainer;
    }

    public getChunkContainer(cx: number, cz: number): any {
        for (let z: number = 0; z < GVar.CHUNK_COUNT; z++) {
            for (let x: number = 0; x < GVar.CHUNK_COUNT; x++) {
                let cc : any = this.arrChunkContainer[x][z];
                if( cc.userData["centeredX"] == cx && cc.userData["centeredY"] == cz  ) 
                    return cc;
            }
        }
        
        return null;
    }


    /**
     * 初始化当前AppScene内所有的ChunkInstance.
     * @returns 
     */
    public initChunks(): void {
        for (let z: number = 0; z < GVar.CHUNK_COUNT; z++) {
            for (let x: number = 0; x < GVar.CHUNK_COUNT; x++) {
                if (!this.arrChunkContainer[x]) {
                    this.arrChunkContainer[x] = [];
                }
                let chunkContainer: THREE.Object3D = this.createChunkAt(x, z);
                this.arrChunkContainer[x][z] = chunkContainer;
                this.add(chunkContainer);
            }
        }
        return;
    }

    /**
     * 获取可点击的对象数组：
     * @returns 
     */
    public getPickables(): THREE.Mesh[] {
        return this._pickables;
    }

    /**
     * 当前场景内Chunk数组内所有元素的功能回调：
     * @param cb 
     */
    public forEachChunk(cb: (chunkContainer: THREE.Object3D, centX: number, centY: number) => void): void {

        for (var x: number = 0; x < GVar.CHUNK_COUNT; x++) {
            for (var y: number = 0; y < GVar.CHUNK_COUNT; y++) {
                let v: THREE.Object3D = this.arrChunkContainer[x][y];
                cb(v, v.userData["centeredX"], v.userData["centeredY"]);
            }
        }
    }
}