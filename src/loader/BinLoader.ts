import * as THREE from 'three';
/**
 * 加载main.bin的二进制文件.
 */
export class BinLoader {

    public static loadBin(url: string, cb : any): void {
        const loader = new THREE.FileLoader();
        loader.setResponseType('arraybuffer'); // 设置为二进制模式

        loader.load(
            url,
            function (data) {
                // data 是 ArrayBuffer 对象
                // 在这里处理你的二进制数据
                (data as any).filename = "main.bin";
                cb( data );
            },
            function (xhr) {
                // 加载进度回调
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                // 错误处理
                console.error('加载错误:', error);
            }
        );
    }
}