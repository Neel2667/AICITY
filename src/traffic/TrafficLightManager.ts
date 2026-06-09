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
import { intersectionTiles, tileToWorld } from '../city/CityDesign';
import { MiscFunc } from '../utils/MiscFunc';

const CORNER_OFFSET = 16;        // how far from intersection centre to place lights

export class TrafficLightManager {
  private lights: TrafficLight[] = [];
  private scene: THREE.Object3D;

  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  public spawn(_unlockedDistrictIds?: string[]): void {
    // Place lights at REAL road intersections of the authored city.
    const corners: [number, number][] = [
      [-CORNER_OFFSET, -CORNER_OFFSET],
      [ CORNER_OFFSET,  CORNER_OFFSET],
    ];

    let count = 0;
    for (const [tx, ty] of intersectionTiles()) {
      const { x: cx, z: cz } = tileToWorld(tx, ty);
      const phase = MiscFunc.random();
      for (const [ox, oz] of corners) {
        const light = new TrafficLight(phase);
        light.position.set(cx + ox, 0, cz + oz);
        this.scene.add(light);
        this.lights.push(light);
        count++;
      }
    }
    console.log(`[TrafficLightManager] Spawned ${count} traffic lights at ${intersectionTiles().length} intersections`);
  }

  public update(ud: IUpdate): void {
    for (const light of this.lights) light.update(ud);
  }

  public addForDistrict(_districtId: string): void {
    // No-op in the finite authored city: all intersections are placed at spawn().
    // Kept for API compatibility with the legacy district-unlock flow.
  }

  public dispose(): void {
    for (const l of this.lights) this.scene.remove(l);
    this.lights = [];
  }
}
