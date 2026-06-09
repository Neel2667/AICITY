import type { AppScene } from "../core/AppScene";
import { EventMgr } from "../utils/EventMgr";
import { GVar } from "../utils/GVar";
import type { CameraController } from "./CameraController";
import type { InputMgr } from "./InputMgr";
import * as THREE from 'three';
/**
 * 场景移动控制器
 */
export class SceneMoveController {

    protected _panning: boolean = false;
    //! 拖动开始时的屏幕坐标：
    protected _startCoords = new THREE.Vector2;
    //! 这个数据记录了鼠标在屏幕上总的移动像素数，所有的移动都是衔接到一起的
    //! 下面的变量_offset也是在_lastOffet的基础上进行叠加的：
    protected _lastOffset = new THREE.Vector2;

    //! 用于计算拖动效果的屏幕位移临时量:
    protected _offset = new THREE.Vector2;

    //! 鼠标拖动时的移动速度: 
    protected _speed = new THREE.Vector3(GVar.PAN_SPEED, 0, GVar.PAN_SPEED);
    protected _sceneOffset = new THREE.Vector3(0, 0, 0);
    //! 这个是用于拟合场景移动向量的临时变量:
    protected _tmpWorldOffset = new THREE.Vector3;

    protected _inputManager: InputMgr | null = null;
    protected _scene: AppScene | null = null;
    protected _camera: CameraController | null = null;
    protected enabled: boolean = false;

    protected _raycaster = new THREE.Raycaster;

    protected tmpVec2: THREE.Vector2 = new THREE.Vector2(0, 0);

    public constructor(imgr: InputMgr, scene: AppScene, cam: CameraController) {
        this._inputManager = imgr;
        this._scene = scene;
        this._camera = cam;
        this.enabled = true;

        // 
        // 禁用原版城市的自己的移动逻辑，直接使用OrbitConstrol提供的平移功能:
        //imgr.on("startdrag", this._onStartDrag.bind(this));
        //imgr.on("enddrag", this._onEndDrag.bind(this));
        //imgr.on("drag", this._onDrag.bind(this));
    }

    protected _onStartDrag(evt: any): void {
        if (this.enabled) {
            this._panning = true;
            this._startCoords.set(evt.x, evt.y);
            //console.log( "StartCord:" + JSON.stringify( this._startCoords ) );
        }
    }

    protected _onEndDrag(): void {
        if (this.enabled) {
            this._panning = false;
            this._lastOffset.copy(this._offset);
            //console.log( "LastOffset:" + JSON.stringify( this._startCoords ) );
        }
    }
    protected _onDrag(evt: any): void {
        var vector = new THREE.Vector2(0, 0);
        this.tmpVec2.x = evt.x;
        this.tmpVec2.y = evt.y;
        if (this.enabled && this._panning) {
            // 这些操作，都是为了更加平滑的移动效果：
            vector.subVectors(this.tmpVec2, this._startCoords);
            this._offset.addVectors(this._lastOffset, vector);
            //console.log( "AddValue is:" + JSON.stringify( this._offset ) 
            //    + "___" + JSON.stringify( this._lastOffset ) + "___" + JSON.stringify( vector ) );
        }
    }


    public raycast(): void {
        let castVec: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
        castVec.copy(this._camera!.getLookAtTarget() );

        // 
        // 加5的主要原因是：　如果不加的情况下，在某些情况下没有更新，
        // 是因为这个castVec的目标点Y值是零，而Pickable的Y值也是零，所以可能出错.
        castVec.y += 5;
        this._raycaster.set(castVec, new THREE.Vector3(0, -1, 0));
        var intersectors = this._raycaster.intersectObjects(this._scene!.getPickables());
        if (intersectors.length > 0) {
            let insectObj = intersectors[0].object;

            // 
            // 是否显示调试信息:
            /*
            if (GVar.bVisDebug) {
                let arr: Array<any> = this._scene!.getPickables();
                for (let ti: number = 0; ti < arr.length; ti++)
                    arr[ti].visible = false;
                insectObj.visible = true;
            }*/

            let cx: number = (insectObj as any).userData["centeredX"];
            let cy: number = (insectObj as any).userData["centeredY"];

            this._sceneOffset.x += cx * GVar.CHUNK_SIZE;
            this._sceneOffset.z += cy * GVar.CHUNK_SIZE;

            EventMgr.getins().trigger("chunkmove", cx, cy);

        }
    }

    protected point = new THREE.Vector3(0, 0, 0);
    /**
     * 更新控制器.
     */
    public update(): void {
        var offset = new THREE.Vector2;
        var angle = new THREE.Vector2(0, 0);

        this.raycast();
        offset.copy(this._offset);

        // 这个是计算场景与相机旋转的转换数据:
        offset.rotateAround(angle, -this._camera!.getRotationAngle());

        // 根据移动速度，来拟合一个最终的效果
        this._tmpWorldOffset.set(offset.x, 0, offset.y).multiply(this._speed);
        // 使用线性插值（lerp）技术，使 point 值以每帧 5% 的步幅平滑趋向 _worldOffset。
        // 这意味着场景不会立即跳到新位置，而是逐渐移动，使移动过程更自然流畅。这种平滑效果对用户体验至关重要。
        // 因为有offset的实际数据，所以最终还是会到达目标位置的
        this.point.lerp(this._tmpWorldOffset, .01);

        // 直接到达，无插值效果：
        //this.point.copy(this._tmpWorldOffset);

        // 
        // 处理场景内的位置偏移量：
        this._scene!.position.addVectors(this._sceneOffset, this.point);

    }
}