/**
 * BusManager.ts
 * Spawns one CityBus per route, staggered at different starting stops.
 * Also responds to camera votes (!camera follow) by providing a bus target.
 */
import * as THREE from 'three';
import { CityBus } from './CityBus';
import { BUS_ROUTES } from './BusRoute';
import { CityEventBus } from '../city/CityEventBus';
import type { IUpdate } from '../interfaces/IUpdate';
import type { CityClockSnapshot } from '../stream/CityClock';

export class BusManager {
  private buses: CityBus[] = [];
  private scene: THREE.Object3D;


  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  public spawn(): void {
    BUS_ROUTES.forEach((route, i) => {
      // Stagger start stops so buses aren't all at the same position
      const startStop = i % route.stops.length;
      const bus = new CityBus(route, startStop);
      this.scene.add(bus);
      this.buses.push(bus);
    });

    // Listen for bus-arrival events to feed the stream overlay ticker
    CityEventBus.on('busArrived', (p) => {
      // Debounced: only log, overlay picks it up via StreamOverlay ticker
      console.log(`[Bus] ${p['routeName']} arrived at ${p['stopName']}`);
    });

    console.log(`[BusManager] ${this.buses.length} buses deployed on ${BUS_ROUTES.length} routes`);
  }

  public update(ud: IUpdate, clock: CityClockSnapshot): void {
    // Buses run all day but slow down slightly at night
    const nightFactor = clock.phase === 'night' ? 0.6 : 1.0;

    for (const bus of this.buses) {
      const scaledUd: IUpdate = { delta: ud.delta * nightFactor, elapsed: ud.elapsed };
      bus.update(scaledUd);
    }
  }

  /** Return a random bus as a camera-follow target */
  public getRandomBus(): CityBus | null {
    if (this.buses.length === 0) return null;
    const idx = Math.floor(Math.random() * this.buses.length);
    return this.buses[idx];
  }

  public dispose(): void {
    for (const bus of this.buses) this.scene.remove(bus);
    this.buses = [];
  }
}
