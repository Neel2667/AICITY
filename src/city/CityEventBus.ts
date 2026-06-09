/**
 * CityEventBus.ts
 * Lightweight pub/sub bus for city-wide events.
 */
type EventPayload = Record<string, any>;
type EventHandler = (payload: EventPayload) => void;

class CityEventBusClass {
  private listeners: Map<string, EventHandler[]> = new Map();

  public on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler);
  }

  public off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  public emit(event: string, payload: EventPayload = {}): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const h of handlers) {
      try { h(payload); } catch (err) {
        console.error(`[CityEventBus] Error in handler for "${event}":`, err);
      }
    }
  }
}

export const CityEventBus = new CityEventBusClass();
