import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GVar } from '../utils/GVar';

const SaturationShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount: { value: 1.3 },  // 默认更鲜艳
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float avg = (color.r + color.g + color.b) / 3.0;
            color.rgb = mix(vec3(avg), color.rgb, amount);
            gl_FragColor = color;
        }
    `
};

export class Renderer {
    public renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private renderPass: RenderPass;
    private saturationPass: ShaderPass;

    constructor(container: HTMLElement) {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true
        });

        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;

        container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';

        // 
        // 后处理 composer 初始化,目标是达到Infitown那种场景更加鲜艳的效果，更绿，更蓝而非更亮，更白。
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(new THREE.Scene(), new THREE.Camera()); // 临时 → 后续 render() 绑定
        this.saturationPass = new ShaderPass(SaturationShader);

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.saturationPass);
    }

    public initDirLight(): THREE.DirectionalLight {
        const light = new THREE.DirectionalLight(0xffeeaa, 1.25);
        light.position.set(100, 150, -40);
        light.castShadow = true;
        light.shadow.radius = 1;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.set(GVar.SHADOWMAP_RESOLUTION, GVar.SHADOWMAP_RESOLUTION);
        light.shadow.camera.near = 50;
        light.shadow.camera.far = 300;
        return light;
    }

    public setSaturation(amount: number): void {
        this.saturationPass.uniforms.amount.value = amount;
    }

    public render(scene: THREE.Scene, camera: THREE.Camera): void {
        this.renderPass.scene = scene;
        this.renderPass.camera = camera;
        this.composer.render();
    }

    public onWindowResize(container: HTMLElement): void {
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.composer.setSize(container.clientWidth, container.clientHeight);
    }

    public dispose(): void {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer.domElement.remove();
        this.composer.dispose();
    }
}
