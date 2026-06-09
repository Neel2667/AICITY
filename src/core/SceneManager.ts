import * as THREE from 'three';
import { Renderer } from './Renderer';
import type { IObject } from '../interfaces/IObject';
import { GVar } from '../utils/GVar';
import { AppScene } from './AppScene';
import { BinLoader } from '../loader/BinLoader';
import { BlockLoaded } from '../loader/BlockLoader';
import { CityChunkTbl, type ChunkData } from './CityChunkTbl';
import { CameraController } from '../constrol/CameraController';
import { InputMgr } from '../constrol/InputMgr';
import { SceneMoveController } from '../constrol/SceneMoveController';
import { EventMgr } from '../utils/EventMgr';
import { LightProbeLoader } from '../loader/LightProbeLoader';
import { EXRLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import { MobileCar } from '../objects/MobileCar';
import type { CityClockSnapshot } from '../stream/CityClock';
import type { WeatherSnapshot } from '../weather/WeatherState';
import { streamConfig } from '../stream/StreamConfig';
import { CameraDirector } from '../camera/CameraDirector';
import { TourCamera } from '../camera/TourCamera';
import { cityScene } from '../city/CityScene';
import { kenneyBuildings, type KenneyGroup } from '../city/KenneyBuildings';
//import TWEEN from 'three/examples/jsm/libs/tween.module.js'

export class SceneManager {
    public scene: THREE.Scene;
    public cameraController: CameraController;
    public renderer: Renderer;
    private objects: IObject[] = [];
    private clock: THREE.Clock;

    //
    //! 输出与相机控制类，与ChunkScene关联，从而场景可以无限循环：
    protected inputMgr: InputMgr = new InputMgr();
    protected smController: SceneMoveController | null = null;
    // ChunkInstance核心数据类:
    protected cityChkTbl: CityChunkTbl | null = null;
    // ChunkScene场景核心组织类：
    protected chunkScene: AppScene | null = null;

    // 
    // 网格坐标,无限循环场景的核心算法类：
    protected gridCoords: THREE.Vector2 = new THREE.Vector2(0, 0);

    //! Environment Llighting:
    protected envLightProbe: LightProbeLoader = LightProbeLoader.getins();
    protected dirLight: THREE.DirectionalLight | null = null;
    protected ambientLight: THREE.AmbientLight | null = null;
    protected cameraDirector: CameraDirector | null = null;

    // ─── Finite authored city (F1–F4) ──────────────────────────────────────────
    // When true, render the fixed, hand-authored, bounded city + guided tour
    // camera instead of the legacy infinite procedural treadmill.
    protected useAuthoredCity: boolean = false;
    protected cityRadius: number = 450;
    protected tourCamera: TourCamera | null = null;

    protected resizeHandler: any = null;

    // 是否初始化:
    protected bInited: boolean = false;
    //! 记录上一次中心位置，减少无效处理:
    protected iLastCx: number = -100000000;
    protected iLastCy: number = -100000000;

    //! 跟随物品:
    protected followMobile: MobileCar | null = null;
    protected lerpVal : number = 0.01;

    constructor(container: HTMLElement) {

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(GVar.FOG_COLOR, GVar.FOG_NEAR, GVar.FOG_FAR);
        this.scene.background = new THREE.Color(GVar.FOG_COLOR);

        // 创建相机控制器
        this.cameraController = new CameraController(container);
        container.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        // 
        // 用简版环境光还是复杂版本的环境光:
        if (GVar.bUseProbe) {
            this.envLightProbe.initLightProbe("./assets/environments/envProbe/irradiance.json",
                (light: THREE.LightProbe) => {
                    this.scene.add(light);
                    this.scene.environment = light as any;
                });
        } else {
            this.loadEnvMapLighting();
        }

        // 创建渲染器
        this.cameraDirector = streamConfig.cameraDirectorEnabled ? new CameraDirector(this.cameraController) : null;
        this.renderer = new Renderer(container);
        this.renderer.setSaturation(1.15);
        this.renderer.renderer.setClearColor(GVar.FOG_COLOR);


        // 添加环境光
        this.ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        this.scene.add(this.ambientLight);

        // 添加坐标轴
        //const axesHelper = new THREE.AxesHelper(5);
        //this.scene.add(axesHelper);

        // 添加网格
        //const gridHelper = new THREE.GridHelper(20, 20);
        //(gridHelper.material as THREE.Material).opacity = 0.2;
        //(gridHelper.material as THREE.Material).transparent = true;
        //this.scene.add(gridHelper);

        // 初始化时钟
        this.clock = new THREE.Clock();


        // 添加窗口大小调整监听
        this.resizeHandler = () => this.onWindowResize(container);
        window.addEventListener('resize', this.resizeHandler);


        let asce: AppScene = new AppScene();
        asce.initChunks();

        BinLoader.loadBin("./assets/scenes/data/main.bin", (data: ArrayBuffer) => {
            let bl: BlockLoaded = new BlockLoaded(data);
            bl.loadBlock("./assets/scenes/main.json", (obj: any) => {

                if (!obj) return;
                // 下一步需要创建Chunk数据了:
                let arrBlocks: Array<any> = obj.getObjectByName("blocks").children;
                let arrLanes: Array<any> = obj.getObjectByName("lanes").children;
                let arrIntersections: Array<any> = obj.getObjectByName("intersections").children;
                let arrCars: Array<any> = obj.getObjectByName("cars").children;
                let arrClouds: Array<any> = obj.getObjectByName("clouds").children;

                let lenarr: Array<number> = [arrBlocks.length, arrLanes.length, arrIntersections.length, arrCars.length, arrClouds.length];
                console.log("The lenth is:" + JSON.stringify(lenarr));

                // 初始化方向光：
                this.dirLight = this.renderer.initDirLight();
                this._resizeShadowMapFrustum(window.innerWidth, window.innerHeight);

                if (this.useAuthoredCity) {
                    // ─── REAL ARTIST-DESIGNED CITY SCENE (not a tile grid) ─────────
                    // Load one complete pre-made city model (irregular streets, varied
                    // density) and frame the camera so the WHOLE city is visible.
                    cityScene.load(streamConfig.citySceneId as any).then((loaded) => {
                        this.scene.add(loaded.group);
                        this.cityRadius = loaded.radius;
                        this.frameCameraToCity(loaded.box);
                        console.log('[AICITY] Real city scene loaded:', streamConfig.citySceneId, '· radius', Math.round(loaded.radius));
                    }).catch((e) => console.error('[AICITY] city scene failed', e));

                    this.scene.add(this.dirLight);
                    this.scene.add(this.dirLight.target);

                    this.cameraDirector = null;          // disable legacy director
                    this.smController = null;            // no infinite panning

                    if (streamConfig.cameraMode === 'tour') {
                        this.tourCamera = new TourCamera(this.cameraController);
                        console.log('[AICITY] Guided tour camera active');
                    } else {
                        this.tourCamera = null;
                        this.cameraController.enableManual();
                        console.log('[AICITY] Manual camera active (drag/scroll/WASD). Add ?camera=tour for the guided tour.');
                    }

                    this.initKeyEvent();
                    this.bInited = true;
                } else if (GVar.FIXED_MAP) {
                    // ─── FIXED 16x16 CITY (original assets, no infinite scroll) ────
                    this.cityChkTbl = new CityChunkTbl(arrBlocks, arrLanes, arrIntersections, arrCars, arrClouds);
                    this.chunkScene = new AppScene();
                    this.chunkScene.initChunks();
                    this.scene.add(this.chunkScene);

                    this.chunkScene.add(this.dirLight);
                    this.chunkScene.add(this.dirLight.target);

                    this.initKeyEvent();

                    // Place EVERY chunk at its permanent position once, then never move.
                    this.refreshChunkScene();
                    // No SceneMoveController, no chunkmove handler → the city stays put.

                    // Optionally swap the building in each chunk for a CC0 Kenney
                    // building (?buildings=kenney). Roads/intersections stay original.
                    if (streamConfig.buildingStyle === 'kenney') {
                        kenneyBuildings.preload().then(() => {
                            this.applyKenneyBuildings();
                            console.log('[AICITY] Kenney buildings applied to fixed city');
                        });
                    }

                    // Manual camera framed to the whole fixed city.
                    this.cameraDirector = null;
                    this.smController = null;
                    this.tourCamera = null;
                    this.frameCameraToFixedCity();
                    this.cameraController.enableManual();
                    this.bInited = true;
                    console.log('[AICITY] Fixed 16x16 city built (manual camera; drag/scroll/WASD)');
                } else {
                    // ─── LEGACY INFINITE PROCEDURAL ENGINE (fallback) ─────────────
                    this.cityChkTbl = new CityChunkTbl(arrBlocks, arrLanes, arrIntersections, arrCars, arrClouds);
                    this.chunkScene = new AppScene();
                    this.chunkScene.initChunks();
                    this.scene.add(this.chunkScene);

                    this.chunkScene.add(this.dirLight);
                    this.chunkScene.add(this.dirLight.target);

                    this.initKeyEvent();
                    this.smController = new SceneMoveController(this.inputMgr, this.chunkScene, this.cameraController);
                    this.refreshChunkScene();

                    EventMgr.getins().on("chunkmove", (xoff: number, yoff: number) => {
                        this.iLastCx = xoff;
                        this.iLastCy = yoff;
                        this.gridCoords.x += xoff;
                        this.gridCoords.y += yoff;
                        this.refreshChunkScene();
                    });
                    this.cameraController.setCameraHeight(200);
                    this.bInited = true;
                }

                this.inputMgr.on("mousewheel", (value: any) => {
                    // In any manual-camera mode (authored scene or fixed map),
                    // OrbitControls handles zoom natively — don't fight it.
                    if ((this.useAuthoredCity && !this.tourCamera) || GVar.FIXED_MAP) return;
                    if( !GVar.bCameraAnimState )
                        this.cameraController.updateHeight(value.deltaY * .05);
                });

                // 处理点击效果：
                this.inputMgr.on("startdrag", (evt: any) => {
                    if (this.useAuthoredCity || GVar.FIXED_MAP) return; // no car-picking
                    this.onMousePickCar(evt);
                });
            });

        });
    }
    protected mTw: any = null;

    /**
     * 处理鼠标选择场景内物品:
     * @param evt 
     */
    protected onMousePickCar(evt: any): void {
        // 找出Ray，并与场景的Mob物品做相交测试:
        let raycaster = new THREE.Raycaster();
        // 将鼠标点击位置转换为 WebGL 坐标系 (-1 到 1)
        let tmpVec2 = new THREE.Vector2((evt.x / GVar.gWidth) * 2 - 1, -(evt.y / GVar.gHeight) * 2 + 1);

        // WORK START: 此处的算法有问题，必须解决鼠标选取的逻辑：
        raycaster.setFromCamera(tmpVec2, this.cameraController.camera);

        var intersectors = raycaster.intersectObjects(this.chunkScene!.getPickables());
        if (intersectors.length > 0) {
            let insectObj = intersectors[0].object;

            // 
            // 是否显示调试信息:
            /*
            if (GVar.bVisDebug) {
                let arr: Array<any> = this.chunkScene!.getPickables();
                for (let ti: number = 0; ti < arr.length; ti++)
                    arr[ti].visible = false;
                insectObj.visible = true;
            }*/

            let cx: number = (insectObj as any).userData["centeredX"];
            let cy: number = (insectObj as any).userData["centeredY"];

            let ckContainer: any = this.chunkScene?.getChunkContainer(cx, cy);
            let chunkIns: any = ckContainer.getObjectByName("chunk");
            let bFollow : boolean = false;

            if (chunkIns && chunkIns.children.length > 0) {
                // 找到当前的模块与相邻模块上所有的小汽车,做相交测试:
                const neighboringCars: Array<MobileCar> = this.cityChkTbl!.getNeighboringCars(chunkIns.children[0]);

                // 所有的碰撞Car切换颜色：
                let meshArr: Array<any> = [];
                for (let ti: number = 0; ti < neighboringCars.length; ti++) {
                    neighboringCars[ti].setDebugBoxColor(0x00ff33, true);
                    meshArr.push(neighboringCars[ti].getMeshObj());
                }
                tmpVec2 = new THREE.Vector2((evt.x / GVar.gWidth) * 2 - 1, -(evt.y / GVar.gHeight) * 2 + 1);
                raycaster.setFromCamera(tmpVec2, this.cameraController.camera);
                intersectors = raycaster.intersectObjects(meshArr, true);
                if (intersectors.length > 0) {
                    for (let ti: number = 0; ti < intersectors.length; ti++) {
                        if (intersectors[ti].object.parent && (intersectors[ti].object.parent?.userData['type'] == "mobileCar")) {
                            let car: MobileCar = intersectors[ti].object.parent as MobileCar;
                            car.setDebugBoxColor(0xff00ff, true);
                            this.followMobile = car;
                            // 
                            // 顺便旋转相机的方向:
                            this.cameraController.lookAtFront( car );
                            
                            bFollow = true;
                        }
                    }
                }
                // 
                //　点击空白地面，切换自动跟随模式：
                if( !bFollow ) 
                    this.followMobile = null;
            }
        }

    }

    protected updateFollow(): void {
        if (!this.followMobile) return;

        let wpos: THREE.Vector3 = new THREE.Vector3();
        let orbit: OrbitControls = this.cameraController.controls as OrbitControls;
        let offset: THREE.Vector3 = this.cameraController.camera!.position.clone().sub(orbit.target);
        this.followMobile.getWorldPosition(wpos);

        //orbit.target.copy(wpos);
        orbit.target.lerp( wpos,this.lerpVal );
        const newPos: THREE.Vector3 = orbit.target.clone().add(offset);
        this.cameraController.camera!.position.copy(newPos);
    }

    /**
     * 加载全局的环境光数据:
     */
    protected loadEnvMapLighting(): void {
        // ⚙️ 创建环境贴图生成器
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer.renderer);
        pmremGenerator.compileEquirectangularShader();
        // 🔧 加载 .exr 文件
        new EXRLoader()
            .load('./assets/environments/DayStreet.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;

                // 生成环境贴图
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;

                // 应用到场景
                this.scene.environment = envMap;
                //this.scene.background = envMap; // 如果想让它作为背景

                texture.dispose();
                pmremGenerator.dispose();
            });
    }

    /**
     * 窗口大小变化时，阴影贴图需要重新计算：
     * window.innerWidth, window.innerHeight
     * @param wid 
     * @param hei 
     */
    protected _resizeShadowMapFrustum(wid: number, hei: number): void {
        var start = 1.25;
        var childStartView2 = Math.max(wid / hei, start);
        var halfHeight = 75 * childStartView2;
        this.dirLight!.shadow.camera.left = .9 * -halfHeight;
        this.dirLight!.shadow.camera.right = 1.3 * halfHeight;
        this.dirLight!.shadow.camera.top = halfHeight;
        this.dirLight!.shadow.camera.bottom = -halfHeight;
        this.dirLight!.shadow.camera.updateProjectionMatrix();
    }



    // 
    // 最核心的场景可视化函数：检测需要删除和重新安装的chunk数据，第一次初始化的时候，
    // remove的空，但会add上去一个新的结点,需要确认 v 是如何获取的，results
    protected refreshChunkScene(): void {

        this.chunkScene!.forEachChunk((chunkContainer: any, xOffset: number, yOffset: number) => {
            var xcor = this.gridCoords.x + xOffset;
            var ycor = this.gridCoords.y + yOffset;
            var v: ChunkData | null = this.cityChkTbl!.getChunkData(xcor, ycor);
            if (!v) return;
            chunkContainer.remove(chunkContainer.getObjectByName("chunk"));
            chunkContainer.add(v.node);
        });
    }


    protected updateAtmosphere(clock: CityClockSnapshot, weather: WeatherSnapshot): void {
        const baseColor = this.getSkyColor(clock.timeOfDay);
        const fogColor = baseColor.clone().lerp(new THREE.Color(0xdce7ef), weather.fogBoost);
        const daylight = this.getDaylight(clock.timeOfDay) * weather.lightMultiplier;
        const twilight = this.getTwilight(clock.timeOfDay);

        this.scene.background = baseColor;
        if (this.scene.fog instanceof THREE.Fog) {
            this.scene.fog.color.copy(fogColor);
            // Fog scaled for the large city scene (keeps distant skyline visible).
            if (this.useAuthoredCity) {
                // Large artist scene: keep distant skyline visible.
                this.scene.fog.near = 1400 - weather.fogBoost * 300;
                this.scene.fog.far  = 4200 - weather.fogBoost * 600;
            } else if (GVar.FIXED_MAP) {
                // Fixed 16x16 city: fog far enough to see the whole place, but
                // still hazes the distant edges for a cozy, framed look.
                this.scene.fog.near = 700 - weather.fogBoost * 200;
                this.scene.fog.far  = 1800 - weather.fogBoost * 300;
            } else {
                // Original InfiniTown infinite-scroll look: cozy close fog.
                this.scene.fog.near = 170 - weather.fogBoost * 55;
                this.scene.fog.far  = 320 - weather.fogBoost * 60;
            }
        }
        this.renderer.renderer.setClearColor(baseColor);

        if (this.ambientLight) {
            this.ambientLight.intensity = 0.22 + daylight * 0.68 + twilight * 0.18;
            this.ambientLight.color.copy(new THREE.Color(0xbfd5ff).lerp(new THREE.Color(0xffe0b0), twilight));
        }

        if (this.dirLight) {
            const sunOrbit = (clock.timeOfDay - 0.25) * Math.PI * 2;
            const sunHeight = Math.max(0.08, Math.sin(sunOrbit));
            this.dirLight.position.set(
                Math.cos(sunOrbit) * 130,
                35 + sunHeight * 145,
                Math.sin(sunOrbit) * 130,
            );
            this.dirLight.intensity = 0.18 + daylight * 1.12 + twilight * 0.35;
            this.dirLight.color.copy(new THREE.Color(0x9fb8ff).lerp(new THREE.Color(0xffddaa), Math.max(twilight, daylight * 0.45)));
        }
    }

    protected getDaylight(timeOfDay: number): number {
        return Math.max(0, Math.sin((timeOfDay - 0.25) * Math.PI * 2));
    }

    protected getTwilight(timeOfDay: number): number {
        const dawn = 1 - Math.min(1, Math.abs(timeOfDay - 0.255) / 0.07);
        const dusk = 1 - Math.min(1, Math.abs(timeOfDay - 0.755) / 0.08);
        return Math.max(0, dawn, dusk);
    }

    protected getSkyColor(timeOfDay: number): THREE.Color {
        const night = new THREE.Color(0x0b1026);
        const dawn = new THREE.Color(0xffa35c);
        const day = new THREE.Color(GVar.FOG_COLOR);
        const dusk = new THREE.Color(0xff8d6b);

        if (timeOfDay < 0.22) return night;
        if (timeOfDay < 0.30) return night.clone().lerp(dawn, (timeOfDay - 0.22) / 0.08);
        if (timeOfDay < 0.40) return dawn.clone().lerp(day, (timeOfDay - 0.30) / 0.10);
        if (timeOfDay < 0.68) return day;
        if (timeOfDay < 0.78) return day.clone().lerp(dusk, (timeOfDay - 0.68) / 0.10);
        if (timeOfDay < 0.86) return dusk.clone().lerp(night, (timeOfDay - 0.78) / 0.08);
        return night;
    }

    /**
     * 从碰撞Mesh获取对应的ChunkInstances.
     * @param x 
     * @param y 
     * @returns 
     */
    public getChunkInsFromColMesh(x: number, y: number): any {
        let chunkIns: any = null;
        this.chunkScene!.forEachChunk((chunkContainer: any, xOffset: number, yOffset: number) => {
            if (x != xOffset && y != yOffset)
                return;
            chunkIns = chunkContainer.getObjectByName("chunk");
        });

        return chunkIns;
    }

    public addObject(object: IObject): void {
        this.objects.push(object);
        this.scene.add(object.mesh);
    }

    public removeObject(object: IObject): void {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.scene.remove(object.mesh);
            this.objects.splice(index, 1);
        }
    }

    public removeAllObjects(): void {
        this.objects.forEach(obj => {
            this.scene.remove(obj.mesh);
            if (obj.dispose) obj.dispose();
        });
        this.objects = [];
        this.followMobile = null;
    }

    // ─── Phase 4 accessors ─────────────────────────────────────────────────────

    private _lastUpdate: { delta: number; elapsed: number } | null = null;

    public getLastUpdate(): { delta: number; elapsed: number } | null {
        return this._lastUpdate;
    }

    public getCameraDirector() {
        return this.cameraDirector;
    }

    public getTourCamera() {
        return this.tourCamera;
    }

    /** Switch between manual free-look and the guided cinematic tour at runtime. */
    public toggleCameraMode(): void {
        if (!this.useAuthoredCity) return;
        if (this.tourCamera) {
            // Tour → Manual
            this.tourCamera = null;
            this.cameraController.enableManual();
            console.log('[AICITY] Camera → manual');
        } else {
            // Manual → Tour
            this.cameraController.enableLocked();
            this.tourCamera = new TourCamera(this.cameraController);
            console.log('[AICITY] Camera → guided tour');
        }
    }

    /**
     * Position the camera so the ENTIRE city bounding box fits in view.
     * Uses the camera FOV to compute the required distance from the city centre.
     */
    protected frameCameraToCity(box: THREE.Box3): void {
        const centre = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(centre);
        box.getSize(size);

        const cam = this.cameraController.camera;
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = (cam.fov * Math.PI) / 180;
        // distance needed to fit the largest dimension, with margin
        let dist = (maxDim / 2) / Math.tan(fov / 2);
        dist *= 1.6; // breathing room

        // place camera at a pleasing isometric-ish angle above the city centre
        cam.position.set(
            centre.x + dist * 0.6,
            centre.y + dist * 0.7,
            centre.z + dist * 0.6,
        );
        cam.lookAt(centre);
        this.cameraController.getLookAtTarget().copy(centre);
        cam.updateProjectionMatrix();
    }

    /** Keep the look-at target loosely within the city radius. */
    /**
     * Replace each chunk's original building with a CC0 Kenney building.
     * Keeps the textured roads/intersections; only swaps the block. Deterministic
     * per tile so the city is stable and districts cluster by area.
     */
    protected applyKenneyBuildings(): void {
        if (!this.chunkScene || !kenneyBuildings.hasAny()) return;
        const N = GVar.CHUNK_COUNT;
        this.chunkScene.forEachChunk((container: any) => {
            const chunk: any = container.getObjectByName('chunk');
            if (!chunk) return;
            const oldBlock: THREE.Object3D | undefined = chunk.block;
            if (!oldBlock) return;

            // tile position → district feel (centre = downtown, edges = suburb)
            const cx = container.userData['centeredX'] ?? 0;
            const cy = container.userData['centeredY'] ?? 0;
            const distC = Math.max(Math.abs(cx), Math.abs(cy)) / (N / 2); // 0..1
            const seed = Math.abs(Math.floor(Math.sin(cx * 49.3 + cy * 97.1) * 10000));

            let group: KenneyGroup;
            if (distC < 0.32)      group = (seed % 3 === 0) ? 'modular' : 'downtown';
            else if (distC < 0.6)  group = (seed % 2 === 0) ? 'downtown' : 'suburb';
            else                   group = (seed % 4 === 0) ? 'industrial' : 'suburb';

            const names = kenneyBuildings.names(group);
            if (!names.length) return;
            const name = names[seed % names.length];
            const building = kenneyBuildings.get(group, name);
            if (!building) return;

            // swap: remove original block, drop in the Kenney building
            chunk.remove(oldBlock);
            building.position.set(0, 0, 0);
            building.rotation.y = (seed % 4) * (Math.PI / 2);
            chunk.add(building);
            chunk.block = building;
        });
    }

    /** Frame the manual camera over the whole fixed 16x16 city. */
    protected frameCameraToFixedCity(): void {
        const span = GVar.CHUNK_COUNT * GVar.CHUNK_SIZE; // 16 * 60 = 960
        this.cityRadius = span * 0.5;                    // ~480
        const cam = this.cameraController.camera;
        // pleasant high isometric overview of the whole city
        cam.position.set(span * 0.62, span * 0.7, span * 0.62);
        cam.lookAt(0, 0, 0);
        this.cameraController.getLookAtTarget().set(0, 0, 0);
        cam.updateProjectionMatrix();
    }

    protected clampTargetToCity(margin = 1.2): void {
        const r = this.cityRadius * margin;
        const tgt = this.cameraController.getLookAtTarget();
        tgt.x = Math.min(r, Math.max(-r, tgt.x));
        tgt.z = Math.min(r, Math.max(-r, tgt.z));
    }

        public update(clockSnapshot?: CityClockSnapshot, weatherSnapshot?: WeatherSnapshot): void {
        const delta: number = this.clock.getDelta();
        const elapsed: number = this.clock.getElapsedTime();
        this._lastUpdate = { delta, elapsed };


        // 更新所有对象
        this.objects.forEach(obj => {
            obj.update(delta);
        });

        if (streamConfig.atmosphereEnabled && clockSnapshot && weatherSnapshot) {
            this.updateAtmosphere(clockSnapshot, weatherSnapshot);
        }

        if (this.useAuthoredCity) {
            if (this.tourCamera) {
                this.tourCamera.update({ delta: delta, elapsed: elapsed }, clockSnapshot);
                this.cameraController.update();
            } else {
                // Manual free-look: OrbitControls + WASD drive the camera.
                this.cameraController.update();
                this.clampTargetToCity(1.6);
            }
        } else if (GVar.FIXED_MAP) {
            // ─── fixed 16x16 city: manual camera, no scroll, cars still drive ───
            this.cameraController.update();          // OrbitControls + WASD
            this.clampTargetToCity(1.1);             // keep view over the city
            this.cityChkTbl?.update({ delta: delta, elapsed: elapsed }); // moving cars/clouds
        } else {
            // ─── legacy infinite engine path ───
            this.updateFollow();
            if (!this.followMobile) {
                this.cameraDirector?.update({ delta: delta, elapsed: elapsed }, clockSnapshot);
            }
            this.cameraController.update();
            if (this.bInited) this.smController?.update();
            this.cityChkTbl?.update({ delta: delta, elapsed: elapsed });
        }


        // 渲染场景
        this.renderer.render(this.scene, this.cameraController.camera);
    }

    private onWindowResize(container: HTMLElement): void {
        this.cameraController.onWindowResize(container);
        this.renderer.onWindowResize(container);
    }

    protected mRotY: number = 0;
    protected initKeyEvent(): void {
        window.addEventListener("keydown", (event) => {
            if (event.key === 'z') {
                this.cameraController.lookAtFront( this.followMobile as MobileCar );
            }
        });
    }

    public dispose(): void {
        this.removeAllObjects();
        this.renderer.dispose();

        // 
        // 移除事件监听：
        window.removeEventListener('resize', this.resizeHandler);
        this.renderer.renderer.domElement.removeEventListener('mousemove', () => { });
    }
}

/*
import { CityLoader } from './CityLoader';
import { MiscFunc } from '../utils/MiscFunc';

        // 加载City:
        // const cityLoader = new CityLoader(this.scene);
        // cityLoader.loadClusters();

let images: any = obj.userData["images"];
let arrtex: any = obj.userData["textures"];
                    
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ map: arrtex['0E12E1AB-1D22-4642-BFB5-BC955808BB55'] });
const cube = new THREE.Mesh(geometry, material);
this.scene.add(cube);

let tmesh : any = arrBlocks[0];
tmesh.position.set(0, 0, 0);
this.scene.add(tmesh);*/



 //(this.cameraController.controls as OrbitControls).target.copy(car.position);
 // 创建 Tween 对象
 // 
 // WORK START: 处理好TWEEN对象.
 /*
 let wpos: THREE.Vector3 = new THREE.Vector3();
 let orbit: OrbitControls = this.cameraController.controls as OrbitControls;
 let offset: THREE.Vector3 = this.cameraController.camera!.position.clone().sub(orbit.target);
 car.getWorldPosition(wpos);*/
 /*
 new TWEEN.Tween(orbit.target) // 起始值
     .to({ x: wpos.x, z: wpos.z }, 800) // 结束值和动画时间（毫秒）
     .onUpdate( ()=>{
         orbit.update();
         const newPos : THREE.Vector3 = orbit.target.clone().add(offset);
         this.cameraController.camera!.position.copy(newPos);
     }).start();
 this.followMobile = car;
 orbit.target.lerp( wpos,this.lerpVal );
 const newPos: THREE.Vector3 = orbit.target.clone().add(offset);
 this.cameraController.camera!.position.copy(newPos);
 */
