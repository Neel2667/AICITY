/**
 * LandmarkLife.ts
 * ----------------------------------------------------------------------------
 * Animated set-pieces that make the signature landmarks feel alive on the
 * 24/7 stream:
 *   🚂 a train that pulls into Central Station, dwells, then departs (loop)
 *   ✈️ a plane that taxis down the runway, "takes off", and resets (loop)
 *   ⛵ a few boats drifting across the ocean
 *
 * All procedural low-poly, matching the city's toy look. Built once, updated
 * each frame from the main loop.
 */
import * as THREE from 'three';
import type { IUpdate } from '../interfaces/IUpdate';
import { LANDMARKS, tileToWorld, TILE, GRID_H, ORIGIN_Y } from './CityDesign';
import { CityEventBus } from './CityEventBus';

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
}
function box(w: number, h: number, d: number, color: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  return m;
}

// ─── Train ───────────────────────────────────────────────────────────────────
class Train {
  public readonly group = new THREE.Group();
  private x = 0;
  private state: 'arriving' | 'dwell' | 'departing' | 'gone' = 'arriving';
  private timer = 0;
  private readonly stationX: number;
  private readonly z: number;
  private readonly speed = 26;
  private announced = false;

  constructor() {
    const lm = LANDMARKS.find(l => l.name === 'Central Station');
    const w = lm ? tileToWorld(lm.tile[0], lm.tile[1]) : { x: 0, z: 0 };
    this.stationX = w.x;
    this.z = w.z + 3; // sit on the near rail

    // build a 3-car train
    const colors = [0x37474f, 0xef5350, 0x42a5f5];
    let off = 0;
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      const body = box(16, 5, 6, colors[i % colors.length]);
      body.position.y = 3.5;
      const windows = box(16.2, 1.6, 6.2, 0xb3e5fc);
      (windows.material as THREE.MeshStandardMaterial).transparent = true;
      (windows.material as THREE.MeshStandardMaterial).opacity = 0.6;
      windows.position.y = 4.6;
      const roof = box(15, 0.8, 6.2, 0x263238);
      roof.position.y = 6.3;
      car.add(body, windows, roof);
      car.position.x = off;
      off -= 18;
      this.group.add(car);
    }
    this.reset();
  }

  public reset(): void {
    this.x = this.stationX - 360;
    this.group.position.set(this.x, 0, this.z);
    this.state = 'arriving';
    this.timer = 0;
    this.announced = false;
    this.group.visible = true;
  }

  public update(ud: IUpdate): void {
    switch (this.state) {
      case 'arriving':
        this.x += this.speed * ud.delta;
        if (this.x >= this.stationX) {
          this.x = this.stationX;
          this.state = 'dwell';
          this.timer = 0;
          if (!this.announced) {
            this.announced = true;
            CityEventBus.emit('trainArrived', { station: 'Central Station' });
          }
        }
        break;
      case 'dwell':
        this.timer += ud.delta;
        if (this.timer > 10) { this.state = 'departing'; }
        break;
      case 'departing':
        this.x += this.speed * ud.delta;
        if (this.x > this.stationX + 380) { this.state = 'gone'; this.timer = 0; this.group.visible = false; }
        break;
      case 'gone':
        this.timer += ud.delta;
        if (this.timer > 18) this.reset();   // next train in ~18s
        break;
    }
    this.group.position.x = this.x;
  }
}

// ─── Plane ───────────────────────────────────────────────────────────────────
class Plane {
  public readonly group = new THREE.Group();
  private x = 0;
  private y = 0;
  private state: 'taxi' | 'takeoff' | 'gone' = 'taxi';
  private timer = 0;
  private readonly startX: number;
  private readonly z: number;

  constructor() {
    // runway tiles are the airport area (rows 0-1). Use the airport landmark row.
    const lm = LANDMARKS.find(l => l.name === 'Skyhaven Airport');
    const w = lm ? tileToWorld(lm.tile[0], lm.tile[1]) : { x: 0, z: 0 };
    this.startX = w.x - TILE; // start at west end of runway strip
    this.z = w.z + 18;        // on the runway band (south of terminal)

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 16, 10), mat(0xffffff));
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.y = 3;
    fuselage.castShadow = true;
    const wing = box(4, 0.5, 18, 0xeceff1); wing.position.y = 3;
    const tail = box(0.6, 5, 4, 0xef5350); tail.position.set(-7, 5.5, 0);
    const tailWing = box(0.6, 0.5, 8, 0xeceff1); tailWing.position.set(-7, 4, 0);
    this.group.add(fuselage, wing, tail, tailWing);
    this.reset();
  }

  public reset(): void {
    this.x = this.startX;
    this.y = 0;
    this.state = 'taxi';
    this.timer = 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.z = 0;
    this.group.visible = true;
  }

  public update(ud: IUpdate): void {
    switch (this.state) {
      case 'taxi':
        this.x += 18 * ud.delta;
        if (this.x > this.startX + TILE * 1.4) this.state = 'takeoff';
        break;
      case 'takeoff':
        this.x += 42 * ud.delta;
        this.y += 26 * ud.delta;
        this.group.rotation.z = Math.min(0.32, this.group.rotation.z + ud.delta * 0.3);
        if (this.y > 140) { this.state = 'gone'; this.timer = 0; this.group.visible = false; }
        break;
      case 'gone':
        this.timer += ud.delta;
        if (this.timer > 22) this.reset();   // next departure in ~22s
        break;
    }
    this.group.position.set(this.x, this.y, this.z);
  }
}

// ─── Boats ───────────────────────────────────────────────────────────────────
class Boat {
  public readonly group = new THREE.Group();
  private x: number;
  private readonly z: number;
  private readonly speed: number;
  private readonly span: number;

  constructor(seed: number) {
    const hull = box(10, 2.4, 4, 0xffffff); hull.position.y = 1.4;
    const cabin = box(4, 2, 3, 0xef5350); cabin.position.set(-1, 3.4, 0);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 4), mat(0xfff3e0));
    sail.position.set(1, 5, 0); sail.rotation.y = Math.PI / 4;
    this.group.add(hull, cabin, sail);

    const oceanZ = (GRID_H - 1 - ORIGIN_Y) * TILE; // south edge row
    this.z = oceanZ + 10 + (seed % 3) * 18;
    this.span = TILE * (GRID_H);
    this.x = -this.span / 2 + (seed * 137) % this.span;
    this.speed = 5 + (seed % 4) * 2;
    this.group.position.set(this.x, 0, this.z);
  }

  public update(ud: IUpdate): void {
    this.x += this.speed * ud.delta;
    if (this.x > this.span / 2 + 40) this.x = -this.span / 2 - 40;
    this.group.position.x = this.x;
    this.group.position.y = Math.sin(ud.elapsed * 1.1 + this.z) * 0.4;
    this.group.rotation.z = Math.sin(ud.elapsed * 0.9 + this.z) * 0.05;
  }
}

// ─── Manager ─────────────────────────────────────────────────────────────────
export class LandmarkLife {
  public readonly root = new THREE.Group();
  private train: Train | null = null;
  private plane: Plane | null = null;
  private boats: Boat[] = [];

  constructor(scene: THREE.Object3D) {
    this.root.name = 'landmarkLife';
    scene.add(this.root);
  }

  public build(): void {
    this.train = new Train();
    this.train.reset();
    this.root.add(this.train.group);

    this.plane = new Plane();
    this.root.add(this.plane.group);

    for (let i = 0; i < 3; i++) {
      const b = new Boat(i + 1);
      this.boats.push(b);
      this.root.add(b.group);
    }
    console.log('[LandmarkLife] Train, plane, and boats deployed');
  }

  public update(ud: IUpdate): void {
    this.train?.update(ud);
    this.plane?.update(ud);
    for (const b of this.boats) b.update(ud);
  }
}
