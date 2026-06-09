import { MiscFunc } from "../utils/MiscFunc";
import * as THREE from 'three';

/**
 * 把main.json和main.bin关联起来的文件代码。
 */
export class BlockLoaded {

    protected geometryBuffer: ArrayBuffer = new ArrayBuffer();
    protected texturePath: string = './assets/main/';
    protected objMainJson: any = null;

    constructor(buf: ArrayBuffer) {
        this.geometryBuffer = buf;
    }

    /**
     * 加载场景内的所有的街区Block Mesh数据。
     * @param url 
     * @param cb 
     */
    public loadBlock(url: string, cb: any): void {
        MiscFunc.fetchJsonData(url).then((jsond: any) => {
            if (!jsond) return;

            // 开启对应的数据解晰流程:
            this.parseJsonData(jsond, ( parseObj : any ) => {
                
                this.objMainJson = parseObj;
                console.log("所有的几何体加载完成...");
                if (cb)
                    cb(this.objMainJson);
            });
        });
    }



    /**
     * 解析main.json数据:
     * @param jsond 
     */
    protected parseJsonData(jsond: any, onLoad: any): void {
        let geometries: any = null;
        let images: any = null;
        let textures: any = null;
        let materials: any = null;

        if (jsond.binary)
            geometries = this.parseBinaryGeometries(jsond.geometries);

        if (jsond.images) {
            images = this.parseImages(jsond.images, () => {
                console.log("所有的纹理加载完成..");

                if (jsond.textures) {
                    textures = this.parseTextures(jsond.textures, images);
                }
                if (jsond.materials) {
                    materials = this.parseMaterials(jsond.materials, textures);
                }

                // 处理object的解析.
                let object: any = this.parseObject(jsond.object, geometries, materials);
                
                // 记录临时变量,Debug use:
                object.userData['images'] = images;
                object.userData['textures'] = textures;

                if (jsond.animations)
                    object.animations = this.parseAnimations(jsond.animations);
                if (jsond.cameras)
                    this.parseCameras(object, jsond.cameras);

                // 完成回调：
                if (onLoad)
                    onLoad( object );
            });
        }
    }

    /**
     * 解析动画数据:
     * @param jsonani 
     * @returns 
     */
    protected parseAnimations(jsonani: any): any {

        var t_chksum = [];
        for (let i: number = 0; i < jsonani.length; i++) {
            var r = THREE.AnimationClip.parse(jsonani[i]);
            t_chksum.push(r);
        }
        return t_chksum;
    }

    /**
     * 解析相机相关的细节.
     * @param object 
     * @param camdata 
     * @returns 
     */
    protected parseCameras(obj: any, camdata: any): void {
        var resd: any = [];
        for (let index: number = 0; index < camdata.length; index++) {
            let td: any = obj.getObjectByProperty("uuid", camdata[index]);
            if (td) {
                resd.push(td);
            }
        }
        return resd;
    }

    protected parseObject(data: any, geometries: any, materials: any): any {
        const getGeometry = (name?: string): THREE.BufferGeometry => {
            if (!name || !geometries[name]) {
                console.warn("ObjectLoader: 未定义的几何体", name);
                return new THREE.BufferGeometry();
            }
            return geometries[name];
        };

        const getMaterial = (name?: string): THREE.Material | undefined => {
            if (name && !materials[name]) {
                console.warn("ObjectLoader: 未定义的材质", name);
            }
            return name ? materials[name] : undefined;
        };

        let object: any;

        switch (data.type) {
            case "Scene":
                object = new THREE.Scene();
                break;

            case "PerspectiveCamera":
                let cam: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(data.fov, data.aspect, data.near, data.far);
                if (data.focus) {
                    cam.focus = data.focus;
                }
                if (void 0 !== data.zoom) {
                    cam.zoom = data.zoom;
                }
                if (void 0 !== data.filmGauge) {
                    cam.filmGauge = data.filmGauge;
                }
                if (void 0 !== data.filmOffset) {
                    cam.filmOffset = data.filmOffset;
                }
                if (void 0 !== data.view) {
                    /** @type {!Object} */
                    cam.view = Object.assign({}, data.view);
                }
                object = cam;
                break;

            case "OrthographicCamera":
                object = new THREE.OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);
                //throw new Error( "Not support OrthographicCamera." );
                break;
            case "AmbientLight":
                object = new THREE.AmbientLight(data.color, data.intensity);
                break;

            case "DirectionalLight":
                object = new THREE.DirectionalLight(data.color, data.intensity);
                break;

            case "PointLight":
                object = new THREE.PointLight(
                    data.color,
                    data.intensity,
                    data.distance,
                    data.decay
                );
                break;

            case "SpotLight":
                object = new THREE.SpotLight(
                    data.color,
                    data.intensity,
                    data.distance,
                    data.angle,
                    data.penumbra,
                    data.decay
                );
                break;

            case "HemisphereLight":
                object = new THREE.HemisphereLight(
                    data.color,
                    data.groundColor,
                    data.intensity
                );
                break;

            case "Mesh":
                var geometry = getGeometry(data.geometry);
                var material = getMaterial(data.material);
                object = new THREE.Mesh(geometry, material);

                break;

            case "LOD":
                object = new THREE.LOD();
                break;

            case "Line":
                object = new THREE.Line(getGeometry(data.geometry), getMaterial(data.material));
                break;

            case "LineSegments":
                object = new THREE.LineSegments(
                    getGeometry(data.geometry) as any,
                    getMaterial(data.material)
                );
                break;

            case "PointCloud":
            case "Points":
                object = new THREE.Points(
                    getGeometry(data.geometry),
                    getMaterial(data.material)
                );
                break;

            case "Sprite":
                object = new THREE.Sprite(getMaterial(data.material) as any);
                break;

            case "Group":
                object = new THREE.Group();
                break;

            default:
                object = new THREE.Object3D();
                //console.warn(`ObjectLoader: 未知的对象类型 "${data.type}"`);
        }

        // 设置公共属性
        this.setCommonProperties(object, data);

        var child;
        for (child in data.children) {
            object.add(this.parseObject(data.children[child], geometries, materials));
        }

        // 处理LOD级别
        if ("LOD" === data.type) {
            var levels = data.levels;
            /** @type {number} */
            var i = 0;
            for (; i < levels.length; i++) {
                var level = levels[i];
                child = object.getObjectByProperty("uuid", level.object);
                if (void 0 !== child) {
                    object.addLevel(child, level.distance);
                }
            }
        }

        if (data.layers)
            object.layers.mask = data.layers;

        return object;
    }

    /**
     * 设置公共属性
     * 
     * @param object Three.js对象
     * @param data 对象数据
     */
    private setCommonProperties(object: any, data: any): void {
        object.uuid = data.uuid;

        if (data.name) object.name = data.name;

        if (data.matrix) {
            var matrix = new THREE.Matrix4;
            matrix.fromArray(data.matrix);
            matrix.decompose(object.position, object.quaternion, object.scale);
        } else {
            if (data.position) object.position.fromArray(data.position);
            if (data.rotation) object.rotation.fromArray(data.rotation);
            if (data.scale) object.scale.fromArray(data.scale);
        }

        if (data.castShadow !== undefined) object.castShadow = data.castShadow;
        if (data.receiveShadow !== undefined) object.receiveShadow = data.receiveShadow;
        if (data.visible !== undefined) object.visible = data.visible;
        if (data.userData) object.userData = data.userData;
        if (data.layers !== undefined) object.layers.mask = data.layers;
    }

    /**
     * 解析材质相关的细节。
     * @param jsdata 
     * @param textures 
     * @returns 
     */
    protected parseMaterials(jsdata: Array<any>, textures: any): any {
        var materials: any = {};
        if (jsdata && (jsdata.length > 0)) {
            var loader = new THREE.MaterialLoader;
            loader.setTextures(textures);
            var jsonLength = jsdata.length;
            for (let i: number = 0; i < jsonLength; i++) {
                // 生成Pbr材质:
                //var material = loader.parse(jsdata[i]);

                // 
                // 生成一个基本Mat用于测试效果:ATTENTION TO OPP:
                //let tmat : THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({ map: textures[jsdata[i].map] });
                let jd : any = jsdata[i];
                let tpmat : THREE.MeshPhysicalMaterial = new THREE.MeshPhysicalMaterial({ map: textures[jd.map] });
                if( jd.color ){
                    tpmat.color = new THREE.Color( jd.color );
                }
                if( jd.aoMap ){
                    tpmat.aoMap = textures[jd.aoMap];
                    tpmat.aoMapIntensity = jd.aoFactor;
                    tpmat.aoMap!.channel = 1;
                }
                if(jd.glossFactor){
                    tpmat.roughness = jd.glossFactor;
                }
                //debugger;
                if( jd.metalFactor )
                    tpmat.metalness = jd.metalFactor;
                tpmat.envMapIntensity  = 1.3;
             
                materials[jd.uuid] = tpmat;
            }
        }
        return materials;
    }

    /**
     * 加载图片数据.
     */
    protected parseImages(jsdata: Array<any>, onLoad: any): void {
        let manager: THREE.LoadingManager = new THREE.LoadingManager(onLoad);
        let images: any = {};

        /**
         * 加载单个图像
         * @param url 图像URL
         * @param uuid 图像唯一标识符
         */
        const loadImage = (url: string, uuid: string): void => {
            manager.itemStart(url);
            loader.load(url, (image) => {
                const texture = new THREE.Texture(image);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;
                images[uuid] = texture;
                manager.itemEnd(url);
            }, undefined, (error) => {
                console.error(`Failed to load image: ${url}`, error);
                manager.itemEnd(url);
            });
        };


        if (jsdata && jsdata.length > 0) {
            var loader = new THREE.ImageLoader(manager);

            /** @type {number} */
            var i = 0;
            var jsonLength = jsdata.length;
            for (; i < jsonLength; i++) {
                var image: any = jsdata[i];
                var url = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(image.url) ? image.url : this.texturePath + image.url;
                loadImage(url, image.uuid);
            }
        }
        return images;
    }

    // Function to parse Three.js constants
    protected parseConstant(value: string | number): number {
        if (typeof value === 'number') {
            return value;
        }
        console.warn("THREE.ObjectLoader.parseTexture: Constant should be in numeric form.", value);
        return THREE[value as keyof typeof THREE] as number;
    }

    /**
     * 解析纹理数据：
     */
    protected parseTextures(arrtex: Array<any>, images: any): any {
        const textures: { [key: string]: THREE.Texture | THREE.CubeTexture } = {};

        if (arrtex) {
            arrtex.forEach((data) => {
                let texture: THREE.Texture | THREE.CubeTexture;

                if (data.images) {
                    // Handle cube textures
                    const cubeImages: any[] = [];
                    data.images.forEach((uuid: any) => {
                        if (!images[uuid]) {
                            console.warn("THREE.ObjectLoader: Undefined image", uuid);
                        }
                        cubeImages.push(images[uuid]);
                    });
                    texture = new THREE.CubeTexture(cubeImages);
                } else {
                    // Handle regular textures
                    if (!data.image) {
                        console.warn('THREE.ObjectLoader: No "image" specified for', data.uuid);
                    }
                    if (!images[data.image]) {
                        console.warn("THREE.ObjectLoader: Undefined image", data.image);
                    }
                    texture = new THREE.Texture(images[data.image].image);
                }

                // Set common texture properties
                texture.needsUpdate = true;
                texture.uuid = data.uuid;
                if (data.name) texture.name = data.name;
                
                if (data.mapping)
                    texture.mapping = this.parseConstant(data.mapping) as any;
                if (data.offset) texture.offset.fromArray(data.offset);
                if (data.repeat) texture.repeat.fromArray(data.repeat);
                
                if (data.wrap) {
                    texture.wrapS = this.parseConstant(data.wrap[0]) as any;
                    texture.wrapT = this.parseConstant(data.wrap[1]) as any;
                }
                if (data.minFilter)
                    texture.minFilter = this.parseConstant(data.minFilter) as any;
                if (data.magFilter)
                    texture.magFilter = this.parseConstant(data.magFilter) as any;
                if (data.anisotropy) texture.anisotropy = data.anisotropy;
                if (data.flipY !== undefined) texture.flipY = data.flipY;

                textures[data.uuid] = texture;
            });
        }

        return textures;
    }

    /**
     * 二进制解晰函数:
     * @param result 
     * @returns 
     */
    protected parseBinaryGeometries(result: any): any {
        let geometries: any = {};
        if (!result)
            return geometries;

        var length = result.length;
        for (let i = 0; i < length; i++) {
            var geometry = new THREE.BufferGeometry();
            var data = result[i];
            var key;
            for (key in data.offsets) {
                if (data.offsets.hasOwnProperty(key)) {
                    var tex = data.offsets[key];
                    var c = tex[0];
                    var n = tex[1] + 1;
                    var len = this.geometryBuffer.slice(c, n);
                    if ("index" === key) {
                        /** @type {!Uint32Array} */
                        var indices = new Uint32Array(len);
                        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                    } else {
                        let size: number = 0;
                        /** @type {!Float32Array} */
                        var arrFloat32 = new Float32Array(len);
                        if ("uv" === key || "uv2" === key) {
                            /** @type {number} */
                            size = 2;
                        } else {
                            if ("position" === key || "normal" === key || "color" === key) {
                                /** @type {number} */
                                size = 3;
                            } else {
                                if ("tangent" === key) {
                                    /** @type {number} */
                                    size = 4;
                                }
                            }
                        }
                        geometry.setAttribute(key, new THREE.BufferAttribute(arrFloat32, size));
                    }
                }
            }
            geometry.uuid = data.uuid;
            if (void 0 !== data.name) {
                geometry.name = data.name;
            }
            geometries[data.uuid] = geometry;
        }


        // ATTENTION TO OPP:删除当前的ArrayBuffer
        this.geometryBuffer = new ArrayBuffer();

        return geometries;
    }
}