/**
 * 全局设置以及变量。
 */
export class GVar {
    // 清空背景的颜色，远处雾的颜色也是这个颜色。
    public static bgColor: number = 0xe0e0e0;

    public static isMobile(): boolean {
        // 检查用户代理字符串
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

        // 常见的移动设备用户代理关键字
        const mobileKeywords = [
            'Android', 'iPhone', 'iPod', 'iPad',
            'Windows Phone', 'BlackBerry', 'PlayBook',
            'Kindle', 'Silk', 'Opera Mini', 'Mobile'
        ];

        // 检查触摸支持（现代移动设备通常支持触摸）
        const hasTouchSupport = 'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator as any).msMaxTouchPoints > 0;

        // 检查屏幕尺寸（移动设备通常较小）
        const isSmallScreen = window.innerWidth <= 768;

        // 检查用户代理是否包含任何移动设备关键字
        const isMobileUserAgent = mobileKeywords.some(keyword =>
            userAgent.indexOf(keyword) >= 0
        );

        // 综合考虑多个因素判断是否为移动设备
        return isMobileUserAgent || hasTouchSupport || isSmallScreen;
    }

    /**
     * 获取两个Touches之间的距离.
     * @param touches 
     * @returns 
     */
    public static getTouchDistance(touches: any): number {
        return Math.sqrt((touches[0].clientX - touches[1].clientX) * 
        (touches[0].clientX - touches[1].clientX) + (touches[0].clientY - touches[1].clientY) * 
        (touches[0].clientY - touches[1].clientY));
    }

    public static bUseProbe : boolean = true;


    //!　全局变量:
    public static FPS: boolean = false;
    public static LOG_CALLS: boolean = false;
    public static RANDOM_SEED: string = "infinitown";
    public static RANDOM_SEED_ENABLED: boolean = false;
    public static MAX_PIXEL_RATIO: number = 1.25;
    public static SHADOWMAP_RESOLUTION: number = GVar.isMobile() ? 1024 : 2048;
    public static SHADOWMAP_TYPE: "SHADOWMAP_TYPE_PCF";
    public static TABLE_SIZE: number = 9;
    public static CHUNK_COUNT: number = 9;
    public static CHUNK_SIZE: number = 60;
    public static CAMERA_ANGLE: number = .5;
    public static PAN_SPEED: number = this.isMobile() ? 0.4 : 0.1;
    public static FOG_NEAR: number = 225;
    public static FOG_FAR: number = 325;
    public static FOG_COLOR: number = 10676479;

    // 是否显示相关的调试信息:
    public static bVisDebug : boolean = false;

    // 当前是否处于相机动画状态.
    public static bCameraAnimState : boolean = false;

    //! 屏幕宽高和像素比:
    public static gWidth : number = window.innerWidth;
    public static gHeight : number = window.innerHeight;
    public static gRation : number = window.devicePixelRatio;


}