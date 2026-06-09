/**
 * 事件管理器.
 */
export class EventMgr {
    private static _instance: EventMgr;
    private _events: Record<string, any[]> = {};
    private _listeningTo: Record<string, EventMgr> = {};
    private _listenId = `l${EventMgr._uniqueId()}`;

    static _idCounter = 0;
    private static _uniqueId(prefix = "l") {
        return prefix + (++EventMgr._idCounter);
    }

    private constructor() { } // 禁止外部 new

    static getins(): EventMgr {
        if (!EventMgr._instance) {
            EventMgr._instance = new EventMgr();
        }
        return EventMgr._instance;
    }

    on(name: string | any, callback?: any, context?: any): this {
        if (!this.eventsApi("on", name, [callback, context]) || !callback) return this;
        const names = name.toString().split(/\s+/);
        names.forEach( (eventName:any) => {
            (this._events[eventName] ||= []).push({
                callback,
                context,
                ctx: context || this,
            });
        });
        return this;
    }

    once(name: string | any, callback?: any, context?: any): this {
        if (!this.eventsApi("once", name, [callback, context]) || !callback) return this;

        const once = (...args: any[]) => {
            this.off(name, once);
            callback.apply(context, args);
        };
        (once as any)._callback = callback;

        return this.on(name, once, context);
    }

    off(name?: string | any, callback?: any, context?: any): this {
        if (!this._events || !this.eventsApi("off", name, [callback, context])) return this;

        if (!name && !callback && !context) {
            this._events = {};
            return this;
        }

        const names = name ? name.toString().split(/\s+/) : Object.keys(this._events);

        names.forEach( (eventName:any) => {
            const handlers = this._events[eventName];
            if (!handlers) return;

            const remaining = handlers.filter(handler => {
                return (
                    (callback && callback !== handler.callback && callback !== handler.callback._callback) ||
                    (context && context !== handler.context)
                );
            });

            if (remaining.length) {
                this._events[eventName] = remaining;
            } else {
                delete this._events[eventName];
            }
        });

        return this;
    }

    trigger(name: string | any, ...args: any[]): this {
        if (!this._events || !this.eventsApi("trigger", name, args)) return this;

        const names = name.toString().split(/\s+/);
        names.forEach((eventName:any) => {
            const handlers = this._events[eventName];
            if (handlers) this.invokeHandlers(handlers, args);
            const allHandlers = this._events.all;
            if (allHandlers) this.invokeHandlers(allHandlers, [eventName, ...args]);
        });

        return this;
    }

    listenTo(obj: EventMgr, name: string, callback?: any): this {
        const id = obj._listenId || (obj._listenId = EventMgr._uniqueId());
        this._listeningTo[id] = obj;
        obj.on(name, callback, this);
        return this;
    }

    listenToOnce(obj: EventMgr, name: string, callback?: any): this {
        const id = obj._listenId || (obj._listenId = EventMgr._uniqueId());
        this._listeningTo[id] = obj;
        obj.once(name, callback, this);
        return this;
    }

    stopListening(obj?: EventMgr, name?: string, callback?: any): this {
        const listeningTo = this._listeningTo;
        if (!listeningTo) return this;

        if (obj) {
            const id = obj._listenId;
            if (id) {
                obj.off(name, callback, this);
                if (!name && !callback) delete this._listeningTo[id];
            }
        } else {
            for (const id in listeningTo) {
                listeningTo[id].off(name, callback, this);
                if (!name && !callback) delete listeningTo[id];
            }
        }
        return this;
    }

    private eventsApi(action: string, name: any, rest: any[] = []): boolean {
        if (!name) return true;
        if (typeof name === "object") {
            for (const key in name) {
                (this as any)[action](key, name[key], ...rest);
            }
            return false;
        }
        if (/\s+/.test(name.toString())) {
            name.toString().split(/\s+/).forEach( (n:any) => (this as any)[action](n, ...rest));
            return false;
        }
        return true;
    }

    private invokeHandlers(handlers: any[], args: any[]): void {
        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i];
            handler.callback.apply(handler.ctx, args);
        }
    }
}
