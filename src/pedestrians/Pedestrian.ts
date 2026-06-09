/**
 * Pedestrian.ts
 * A tiny walking pedestrian that follows a sidewalk path within one chunk.
 * Uses simple waypoint navigation: pick a random point on the sidewalk ring,
 * walk there at human speed, pause briefly, then pick the next point.
 *
 * Geometry: a small capsule-shaped instanced mesh so thousands of pedestrians
 * can exist with minimal draw calls. Colour varies by district mood.
 */
import * as THREE from 'three';
import type { IUpdate } from '../interfaces/IUpdate';
import { MiscFunc } from '../utils/MiscFunc';

export type PedestrianMood = 'worker' | 'shopper' | 'jogger' | 'commuter';

// Sidewalk waypoints are offsets from chunk centre (chunk is 60×60 units)
// Pedestrians walk along the inner ring of the chunk boundary (~±22 units)
const SIDEWALK_RING = 22;
const WAYPOINTS_PER_SIDE = 3;

function buildSidewalkWaypoints(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const step = (SIDEWALK_RING * 2) / WAYPOINTS_PER_SIDE;
  for (let i = 0; i <= WAYPOINTS_PER_SIDE; i++) {
    const t = -SIDEWALK_RING + i * step;
    pts.push(new THREE.Vector3(t,  0,  SIDEWALK_RING));  // north edge
    pts.push(new THREE.Vector3(t,  0, -SIDEWALK_RING));  // south edge
    pts.push(new THREE.Vector3( SIDEWALK_RING, 0, t));   // east edge
    pts.push(new THREE.Vector3(-SIDEWALK_RING, 0, t));   // west edge
  }
  return pts;
}

const SHARED_WAYPOINTS = buildSidewalkWaypoints();

// Shared geometry + material (all pedestrians reuse these)
const _geo  = new THREE.CapsuleGeometry(0.28, 0.65, 2, 6);
const _mats: Record<string, THREE.MeshStandardMaterial> = {
  worker:   new THREE.MeshStandardMaterial({ color: 0x607d8b }),
  shopper:  new THREE.MeshStandardMaterial({ color: 0xf06292 }),
  jogger:   new THREE.MeshStandardMaterial({ color: 0x81c784 }),
  commuter: new THREE.MeshStandardMaterial({ color: 0x90a4ae }),
};

export class Pedestrian extends THREE.Object3D {
  private target: THREE.Vector3;
  private speed: number;
  private pauseTimer = 0;
  private readonly mood: PedestrianMood;
  private readonly mesh: THREE.Mesh;
  private readonly bobPhase: number;

  constructor(mood: PedestrianMood = 'commuter') {
    super();
    this.mood = mood;
    this.name = 'pedestrian';

    // Random start on the sidewalk ring
    const startWp = MiscFunc.getRandElement(SHARED_WAYPOINTS);
    this.position.copy(startWp);
    this.position.x += (MiscFunc.random() - 0.5) * 4;
    this.position.z += (MiscFunc.random() - 0.5) * 4;
    this.position.y = 0.65; // stand on ground

    this.target = MiscFunc.getRandElement(SHARED_WAYPOINTS).clone();
    this.speed  = (mood === 'jogger') ? 4.5 : 1.2 + MiscFunc.random() * 0.8;
    this.bobPhase = MiscFunc.random() * Math.PI * 2;

    this.mesh = new THREE.Mesh(_geo, _mats[mood]);
    this.mesh.castShadow = true;
    this.add(this.mesh);

    // Scale slightly for variety
    const s = 0.88 + MiscFunc.random() * 0.24;
    this.scale.setScalar(s);
  }

  public update(ud: IUpdate): void {
    // Pause at waypoint
    if (this.pauseTimer > 0) {
      this.pauseTimer -= ud.delta;
      return;
    }

    const toTarget = this.target.clone().sub(this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 0.6) {
      // Reached waypoint — pause then pick next
      this.pauseTimer = (this.mood === 'jogger') ? 0.1 : 0.5 + MiscFunc.random() * 2.0;
      this.target.copy(MiscFunc.getRandElement(SHARED_WAYPOINTS));
      this.target.x += (MiscFunc.random() - 0.5) * 4;
      this.target.z += (MiscFunc.random() - 0.5) * 4;
      return;
    }

    const dir = toTarget.normalize();
    const step = Math.min(this.speed * ud.delta, dist);
    this.position.addScaledVector(dir, step);

    // Face direction of travel
    const angle = Math.atan2(dir.x, dir.z);
    this.rotation.y = angle;

    // Bob up and down while walking
    const bobAmt = (this.mood === 'jogger') ? 0.18 : 0.06;
    const bobFreq = (this.mood === 'jogger') ? 5.0 : 2.5;
    this.position.y = 0.65 + Math.abs(Math.sin(ud.elapsed * bobFreq + this.bobPhase)) * bobAmt;
  }

  /** Dispose shared resources (call once on app shutdown, not per instance) */
  public static disposeShared(): void {
    _geo.dispose();
    for (const mat of Object.values(_mats)) mat.dispose();
  }
}
