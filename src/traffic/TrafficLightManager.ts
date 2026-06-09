/**
 * TrafficLightManager.ts
 * Places traffic lights at chunk intersection corners across the city.
 * One light per chunk corner (4 corners × 81 chunks = up to 324 lights).
 * Uses instancing-friendly shared geometry and only places lights in
 * unlocked districts to keep the scene clean.
 */
import * as THREE from 'three';
import { TrafficLight } from './TrafficLight';
import type { IUpdate } from '../interfaces/IUpdate';
import { CITY_MAP } from '../city/CityMap';
import { GVar } from '../utils/GVar';
import { MiscFunc } from '../utils/MiscFunc';

const CHUNK = GVar.CHUNK_SIZE;   // 60
const CORNER_OFFSET = 28;        // how far from chunk centre to place the light

export class TrafficLightManager {
  private lights: TrafficLight[] = [];
  private scene: THREE.Object3D;

  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  public spawn(unlockedDistrictIds: string[]): void {
    // Place one light per chunk corner — only for unlocked districts
    const corners: [number, number][] = [
      [-CORNER_OFFSET, -CORNER_OFFSET],
      [ CORNER_OFFSET, -CORNER_OFFSET],
      [-CORNER_OFFSET,  CORNER_OFFSET],
      [ CORNER_OFFSET,  CORNER_OFFSET],
    ];

    let count = 0;
    for (const entry of CITY_MAP.chunks) {
      if (!unlockedDistrictIds.includes(entry.districtId)) continue;
      // Only place on every other chunk to avoid overcrowding
      if ((entry.x + entry.y) % 2 !== 0) continue;

      const cx = (entry.x - 4) * CHUNK;
      const cz = (entry.y - 4) * CHUNK;

      for (let i = 0; i < corners.length; i++) {
        const [ox, oz] = corners[i];
        const light = new TrafficLight(MiscFunc.random()); // random phase offset
        light.position.set(cx + ox, 0, cz + oz);
        this.scene.add(light);
        this.lights.push(light);
        count++;
      }
    }
    console.log(`[TrafficLightManager] Spawned ${count} traffic lights`);
  }

  public update(ud: IUpdate): void {
    for (const light of this.lights) light.update(ud);
  }

  public addForDistrict(districtId: string): void {
    // Called when a new district unlocks mid-session
    const corners: [number, number][] = [
      [-CORNER_OFFSET, -CORNER_OFFSET],
      [ CORNER_OFFSET, -CORNER_OFFSET],
      [-CORNER_OFFSET,  CORNER_OFFSET],
      [ CORNER_OFFSET,  CORNER_OFFSET],
    ];
    for (const entry of CITY_MAP.chunks) {
      if (entry.districtId !== districtId) continue;
      if ((entry.x + entry.y) % 2 !== 0) continue;
      const cx = (entry.x - 4) * CHUNK;
      const cz = (entry.y - 4) * CHUNK;
      for (const [ox, oz] of corners) {
        const light = new TrafficLight(MiscFunc.random());
        light.position.set(cx + ox, 0, cz + oz);
        this.scene.add(light);
        this.lights.push(light);
      }
    }
  }

  public dispose(): void {
    for (const l of this.lights) this.scene.remove(l);
    this.lights = [];
  }
}
