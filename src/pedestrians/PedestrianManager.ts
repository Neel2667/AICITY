/**
 * PedestrianManager.ts
 * Spawns and updates pedestrians across all chunks.
 * Count scales with time of day: busy in morning/evening, sparse at night.
 * District mood drives pedestrian type distribution.
 */
import * as THREE from 'three';
import { Pedestrian, type PedestrianMood } from './Pedestrian';
import type { IUpdate } from '../interfaces/IUpdate';
import type { CityClockSnapshot } from '../stream/CityClock';
import { CITY_MAP } from '../city/CityMap';
import { MiscFunc } from '../utils/MiscFunc';
import { GVar } from '../utils/GVar';

const MAX_PEDS_PER_CHUNK = GVar.isMobile() ? 2 : 4;
const DISTRICT_MOOD_MAP: Record<string, PedestrianMood[]> = {
  downtown:   ['commuter', 'worker', 'commuter'],
  maple:      ['shopper', 'jogger', 'shopper'],
  harbor:     ['shopper', 'shopper', 'commuter'],
  ironworks:  ['worker', 'worker', 'commuter'],
  greenway:   ['jogger', 'jogger', 'shopper'],
  midtown:    ['commuter', 'shopper', 'worker'],
};

export class PedestrianManager {
  private pedestrians: Map<string, Pedestrian[]> = new Map(); // chunkKey → peds
  private scene: THREE.Object3D;

  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  /**
   * Call once after city chunks have been added to the scene.
   * Spawns initial pedestrians across all mapped chunks.
   */
  public spawnInitial(): void {
    for (const entry of CITY_MAP.chunks) {
      const key = `${entry.x}_${entry.y}`;
      const moods = DISTRICT_MOOD_MAP[entry.districtId] ?? ['commuter'];
      const count = 1 + Math.floor(MiscFunc.random() * MAX_PEDS_PER_CHUNK);
      const peds: Pedestrian[] = [];
      for (let i = 0; i < count; i++) {
        const mood = MiscFunc.getRandElement(moods);
        const ped = new Pedestrian(mood);
        this.scene.add(ped);
        peds.push(ped);
      }
      this.pedestrians.set(key, peds);
    }
    console.log(`[PedestrianManager] Spawned pedestrians across ${this.pedestrians.size} chunks`);
  }

  /**
   * Per-frame update. Adjusts pedestrian activity based on time of day.
   */
  public update(ud: IUpdate, clock: CityClockSnapshot): void {
    const activityScale = this.getActivityScale(clock);

    for (const [, peds] of this.pedestrians) {
      for (const ped of peds) {
        // Night: freeze most pedestrians (just pause them, keep in scene)
        if (activityScale < 0.15 && MiscFunc.random() < 0.998) continue;
        ped.update(ud);
      }
    }
  }

  /**
   * Returns 0..1 activity multiplier based on time of day.
   * Dawn: ramp up. Day: full. Dusk: busy. Night: sparse.
   */
  private getActivityScale(clock: CityClockSnapshot): number {
    const t = clock.timeOfDay;
    if (t < 0.21) return 0.05;                    // pre-dawn, near empty
    if (t < 0.30) return 0.05 + (t - 0.21) / 0.09 * 0.7;  // dawn ramp
    if (t < 0.40) return 0.75 + (t - 0.30) / 0.10 * 0.25; // morning rush → full
    if (t < 0.68) return 1.0;                     // full day
    if (t < 0.78) return 1.0 - (t - 0.68) / 0.10 * 0.6;   // evening wind-down
    if (t < 0.86) return 0.4 - (t - 0.78) / 0.08 * 0.35;  // late evening
    return 0.05;                                  // deep night
  }

  public dispose(): void {
    for (const [, peds] of this.pedestrians) {
      for (const ped of peds) this.scene.remove(ped);
    }
    this.pedestrians.clear();
  }
}
