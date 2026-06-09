import * as THREE from 'three';
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

    public static random(): number {
        return Math.random();
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