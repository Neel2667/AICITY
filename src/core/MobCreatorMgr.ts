/**
 * 动态创建新移动物品的管理器.
 */
export class MobCreatorMgr {
    private static _ins: MobCreatorMgr | null = null;
    public static get ins(): MobCreatorMgr {
        if (this._ins == null) {
            this._ins = new MobCreatorMgr();
        }
        return this._ins;
    }

    //private _mobiles: any[] = [];

    /**
     * WORK START: 在场景内创建出来一个新的CarObj，并开始动画。
     */
    public addMobileCar(): void {
        //this._mobiles.push(mobile);
    }

    public addPlane() : void{

    }

    public addHighSpeedTrain() : void{

    }

}