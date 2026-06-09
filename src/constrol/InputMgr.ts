import { EventMgr } from "../utils/EventMgr";

/**
 * InputMgr管理器.
 */
export class InputMgr {

    protected bIsDragging : boolean = false;

    constructor() {
        this.init();
    }

    /**
     * 响应函数.
     * @param key 
     * @param callback 
     */
    public on(key: string, callback: any): void {
        EventMgr.getins().on(key, callback);
    }

    protected trigger(event: string, data: any): void {
        EventMgr.getins().trigger(event, data);
        //console.log( "Trigger Event:" + event + " Value:" + JSON.stringify( data ) );
    }
    protected init(): void {
        window.addEventListener("mousedown", (evt: any) => {
            if( evt.button != 0) return;
            this.bIsDragging = true;
            var e = {
                x: evt.pageX,
                y: evt.pageY
            };
            this.trigger("startdrag", e);
        });
        window.addEventListener("mouseup", (evt : any)=> {
            if( evt.button != 2) return;
            this.bIsDragging = false;
            var e = {
                x: evt.pageX,
                y: evt.pageY
            };
            this.trigger("enddrag", e);
        });
        
        window.addEventListener("mousemove", (evt: any) => {
            if( !this.bIsDragging ) return;
            var e = {
                x: evt.pageX,
                y: evt.pageY
            };
            this.trigger("drag", e);
        });
        window.addEventListener( "mouseleave", (evt: any) => {
            if( evt.button != 2) return;
            this.bIsDragging = false;
            var e = {
                x: evt.pageX,  
                y: evt.pageY
            };
            this.trigger("enddrag", e);
        });

        window.addEventListener( "mousewheel", (value: any) => {
            this.trigger( "mousewheel", value );
        });
    }
}