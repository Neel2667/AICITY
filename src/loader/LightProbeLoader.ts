import { Vector3 } from "three";
import * as THREE from 'three';
import { MiscFunc } from "../utils/MiscFunc";

/**
 * 环境光照加载.
 */
export class LightProbeLoader {
    private static _ins: LightProbeLoader;
    public static getins(): LightProbeLoader {
        if (!this._ins) {
            this._ins = new LightProbeLoader();
        }
        return this._ins;
    }

    public initLightProbe(url: string, cb : any ): void {
        MiscFunc.fetchJsonData(url).then((data) => {
            console.log(data.length);
            //debugger;
            // 设置全局的EnvLightProbe:
            let shCoefficients: Array<Vector3> = [];
            for (let ti: number = 0; ti < 9; ti++) {
                let idx: number = ti * 3;
                shCoefficients.push(new Vector3(data[idx], data[idx + 1], data[idx + 2]));
            }
            const sh = new THREE.SphericalHarmonics3();
            sh.set(shCoefficients);
            // 3. 创建LightProbe并设置球谐数据
            const lightProbe = new THREE.LightProbe();
            lightProbe.sh = sh;
            lightProbe.intensity = 4;

            cb( lightProbe );
        });
    }
}