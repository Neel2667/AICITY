/**
 * Fireworks.ts
 * Particle-based fireworks effect triggered by:
 *   - Viewer !event fireworks (via Super Chat or mod)
 *   - City milestones (district unlock, construction complete)
 *
 * Uses THREE.Points with a custom BufferGeometry for performance.
 * Each burst is self-managed and auto-removes after its lifetime.
 */
import * as THREE from 'three';
import type { IUpdate } from '../interfaces/IUpdate';

const BURST_PARTICLES = 180;
const BURST_LIFETIME  = 3.2; // seconds
const GRAVITY = new THREE.Vector3(0, -4.5, 0);

const PALETTE = [
  0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff,
  0xff922b, 0xcc5de8, 0xffffff, 0x74c0fc,
];

class FireworkBurst extends THREE.Points {
  private velocities: THREE.Vector3[] = [];
  private age = 0;
  private readonly lifetime: number;

  constructor(origin: THREE.Vector3) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(BURST_PARTICLES * 3);
    const colors    = new Float32Array(BURST_PARTICLES * 3);

    const color = new THREE.Color(PALETTE[Math.floor(Math.random() * PALETTE.length)]);

    for (let i = 0; i < BURST_PARTICLES; i++) {
      positions[i * 3]     = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;
      colors[i * 3]     = color.r + (Math.random() - 0.5) * 0.3;
      colors[i * 3 + 1] = color.g + (Math.random() - 0.5) * 0.3;
      colors[i * 3 + 2] = color.b + (Math.random() - 0.5) * 0.3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const mat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    super(geo, mat);

    this.lifetime = BURST_LIFETIME;

    // Random burst velocities in a sphere
    for (let i = 0; i < BURST_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 15 + Math.random() * 20;
      this.velocities.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ));
    }
  }

  /** Returns true when burst is done and should be removed */
  public tick(ud: IUpdate): boolean {
    this.age += ud.delta;
    const t = this.age / this.lifetime;
    if (t >= 1) return true;

    const pos = this.geometry.attributes['position'] as THREE.BufferAttribute;
    const origin = new THREE.Vector3(
      (pos.array as Float32Array)[0],
      (pos.array as Float32Array)[1],
      (pos.array as Float32Array)[2],
    );

    for (let i = 0; i < BURST_PARTICLES; i++) {
      const v = this.velocities[i];
      const drag = Math.exp(-t * 3.5);
      (pos.array as Float32Array)[i * 3]     = origin.x + v.x * t * drag;
      (pos.array as Float32Array)[i * 3 + 1] = origin.y + v.y * t * drag + 0.5 * GRAVITY.y * t * t;
      (pos.array as Float32Array)[i * 3 + 2] = origin.z + v.z * t * drag;
    }

    pos.needsUpdate = true;
    (this.material as THREE.PointsMaterial).opacity = 1 - Math.pow(t, 1.5);
    return false;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}

export class FireworksController {
  private scene: THREE.Object3D;
  private bursts: FireworkBurst[] = [];
  private autoLaunchTimer = 0;
  private isActive = false;
  private autoLaunchDuration = 0;

  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  /**
   * Launch a single firework burst at a world position.
   */
  public launch(position?: THREE.Vector3): void {
    const origin = position ?? new THREE.Vector3(
      (Math.random() - 0.5) * 120,
      55 + Math.random() * 40,
      (Math.random() - 0.5) * 120,
    );
    const burst = new FireworkBurst(origin);
    this.scene.add(burst);
    this.bursts.push(burst);
  }

  /**
   * Trigger a multi-burst fireworks show lasting `durationSeconds`.
   */
  public show(durationSeconds = 20): void {
    this.isActive = true;
    this.autoLaunchDuration = durationSeconds;
    this.autoLaunchTimer = 0;
    console.log(`[Fireworks] Show started (${durationSeconds}s)`);
  }

  public update(ud: IUpdate): void {
    // Auto-launch during a show
    if (this.isActive) {
      this.autoLaunchTimer += ud.delta;
      if (this.autoLaunchTimer >= this.autoLaunchDuration) {
        this.isActive = false;
      } else {
        // Launch a burst every ~0.9 seconds
        if (Math.floor(this.autoLaunchTimer / 0.9) > Math.floor((this.autoLaunchTimer - ud.delta) / 0.9)) {
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) this.launch();
        }
      }
    }

    // Update existing bursts
    const toRemove: FireworkBurst[] = [];
    for (const burst of this.bursts) {
      const done = burst.tick(ud);
      if (done) toRemove.push(burst);
    }
    for (const burst of toRemove) {
      this.scene.remove(burst);
      burst.dispose();
    }
    this.bursts = this.bursts.filter(b => !toRemove.includes(b));
  }
}
