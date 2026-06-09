import * as THREE from 'three';
import { GVar } from './GVar';
/**
 * 杂项函数：
 */
export class MiscFunc {

    /**
     * exp2Fog的参数计算.
     * @param d 
     * @param threshold 
     * @returns 
     */
    public static getDensity(d: number, threshold: number = 0.01) {
        return Math.sqrt(-Math.log(threshold)) / d;
    }

    // ─── Deterministic seeded PRNG ──────────────────────────────────────────────
    // When GVar.RANDOM_SEED_ENABLED is true, random() becomes a stable, seeded
    // stream so the SAME city is generated on every reload — the foundation of a
    // persistent, recognizable place (instead of a different random city each time).
    private static _seeded = false;
    private static _state = 0;

    private static _initSeed(): void {
        // Hash the seed string into a 32-bit integer (xfnv1a-ish).
        let h = 2166136261 >>> 0;
        const s = GVar.RANDOM_SEED || 'aicity';
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        MiscFunc._state = h || 1;
        MiscFunc._seeded = true;
    }

    public static random(): number {
        if (!GVar.RANDOM_SEED_ENABLED) return Math.random();
        if (!MiscFunc._seeded) MiscFunc._initSeed();
        // Mulberry32 — fast, good-quality, deterministic.
        MiscFunc._state = (MiscFunc._state + 0x6D2B79F5) >>> 0;
        let t = MiscFunc._state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Reset the seeded stream (so generation restarts from the same point). */
    public static resetSeed(): void {
        MiscFunc._seeded = false;
    }

    /**
     * 从数组中随机选择一个元素
     * @param options 数组
     * @returns 随机元素
     */
    public static getRandElement<T>(options: T[]): T {
        return options[Math.floor(MiscFunc.random() * options.length)];
    }

    /**
     * 对三维向量进行四舍五入处理
     * @param center 要处理的三维向量
     * @param size 要保留的小数位数（默认为0，即取整）
     * @returns 处理后的向量（原地修改）
     */
    public static roundVector(center: THREE.Vector3, size: number = 0): THREE.Vector3 {
        if (size === 0) {
            center.round(); // 直接使用Vector3的round方法取整
            return center;
        }

        const scale = Math.pow(10, size);
        center.x = Math.round(center.x * scale) / scale;
        center.y = Math.round(center.y * scale) / scale;
        center.z = Math.round(center.z * scale) / scale;

        return center;
    }


    /**
     * 定义一个异步函数，用于获取 JSON 数据
     * @param filePath 
     * @returns 
     */
    public static async fetchJsonData(filePath: string): Promise<any> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Network response was not ok`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            return null;
        }
    }

}