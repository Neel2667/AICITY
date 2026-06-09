/**
 * TrafficLight.ts
 * Procedural traffic light mesh placed at chunk intersections.
 * Cycles: Green → Yellow → Red on a shared city-time clock.
 *
 * Phase offset per intersection ensures not all lights are in sync,
 * creating realistic stop-and-go traffic flow.
 */
import * as THREE from 'three';
import type { IUpdate } from '../interfaces/IUpdate';

type LightPhase = 'green' | 'yellow' | 'red';

const PHASE_DURATIONS: Record<LightPhase, number> = {
  green:  18,   // seconds
  yellow:  3,
  red:    20,
};

const COLORS: Record<LightPhase, number> = {
  green:  0x00e676,
  yellow: 0xffea00,
  red:    0xff1744,
};
const OFF_COLOR = 0x222222;

// Shared pole geometry
const POLE_GEO  = new THREE.CylinderGeometry(0.12, 0.14, 6.5, 6);
const POLE_MAT  = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
const BOX_GEO   = new THREE.BoxGeometry(0.55, 1.5, 0.42);
const BOX_MAT   = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
const LENS_GEO  = new THREE.SphereGeometry(0.14, 8, 6);

export class TrafficLight extends THREE.Object3D {
  private phase: LightPhase = 'red';
  private phaseTimer: number;
  private readonly lensMap: Record<LightPhase, THREE.Mesh>;
  private readonly phaseOffset: number;

  constructor(phaseOffset = 0) {
    super();
    this.name = 'trafficLight';
    this.phaseOffset = phaseOffset;

    // Advance timer past offset so intersections are out of phase
    this.phaseTimer = PHASE_DURATIONS[this.phase] * (phaseOffset % 1);

    // Pole
    const pole = new THREE.Mesh(POLE_GEO, POLE_MAT);
    pole.position.y = 3.25;
    pole.castShadow = true;
    this.add(pole);

    // Housing box
    const box = new THREE.Mesh(BOX_GEO, BOX_MAT);
    box.position.y = 7.2;
    this.add(box);

    // Lenses
    this.lensMap = {} as any;
    const positions: [LightPhase, number][] = [['green', 6.65], ['yellow', 7.2], ['red', 7.75]];
    for (const [phase, y] of positions) {
      const mat = new THREE.MeshStandardMaterial({
        color: OFF_COLOR, emissive: OFF_COLOR, emissiveIntensity: 0,
        roughness: 0.2, metalness: 0.1,
      });
      const lens = new THREE.Mesh(LENS_GEO, mat);
      lens.position.set(0, y, 0.22);
      this.add(lens);
      this.lensMap[phase] = lens;
    }

    this.applyPhase();
  }

  public update(ud: IUpdate): void {
    this.phaseTimer += ud.delta;
    if (this.phaseTimer >= PHASE_DURATIONS[this.phase]) {
      this.phaseTimer = 0;
      this.phase = this.nextPhase();
      this.applyPhase();
    }
  }

  public getPhase(): LightPhase { return this.phase; }

  private nextPhase(): LightPhase {
    const order: LightPhase[] = ['green', 'yellow', 'red'];
    return order[(order.indexOf(this.phase) + 1) % 3];
  }

  private applyPhase(): void {
    for (const [p, lens] of Object.entries(this.lensMap) as [LightPhase, THREE.Mesh][]) {
      const mat = lens.material as THREE.MeshStandardMaterial;
      if (p === this.phase) {
        mat.color.setHex(COLORS[p]);
        mat.emissive.setHex(COLORS[p]);
        mat.emissiveIntensity = 1.8;
      } else {
        mat.color.setHex(OFF_COLOR);
        mat.emissive.setHex(OFF_COLOR);
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    }
  }
}
