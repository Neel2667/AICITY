/**
 * CityBus.ts
 * A single bus following a fixed BusRoute.
 * Renders as a coloured box (matching the existing bus.gltf proportions)
 * but uses a procedural mesh so it works even if bus.gltf fails to load.
 * If a gltf bus mesh is provided it will be used instead.
 */
import * as THREE from 'three';
import type { IUpdate } from '../interfaces/IUpdate';
import type { BusRoute, BusStop } from './BusRoute';
import { CityEventBus } from '../city/CityEventBus';
import { MiscFunc } from '../utils/MiscFunc';

const UNITS_PER_KMH = 1 / 3.6; // convert km/h → units/sec (1 unit ≈ 1 metre)

export class CityBus extends THREE.Object3D {
  private readonly route: BusRoute;
  private stopIndex: number;
  private dwellTimer = 0;
  private readonly speedUps: number;
  private readonly mesh: THREE.Mesh;
  private readonly destLabel: THREE.Sprite;
  private arrived = false;

  // reuse across all buses
  private static _busGeo: THREE.BoxGeometry | null = null;

  constructor(route: BusRoute, startStopIndex = 0) {
    super();
    this.route = route;
    this.stopIndex = startStopIndex % route.stops.length;
    this.speedUps = route.speedKmh * UNITS_PER_KMH;
    this.name = 'cityBus';

    // Geometry
    if (!CityBus._busGeo) {
      CityBus._busGeo = new THREE.BoxGeometry(4.5, 2.4, 10.5);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: route.color,
      roughness: 0.55,
      metalness: 0.3,
    });
    this.mesh = new THREE.Mesh(CityBus._busGeo, mat);
    this.mesh.position.y = 1.2;
    this.mesh.castShadow = true;
    this.add(this.mesh);

    // Window stripe
    const windowGeo = new THREE.BoxGeometry(4.6, 0.75, 9.6);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xb3e5fc, transparent: true, opacity: 0.55,
    });
    const windows = new THREE.Mesh(windowGeo, windowMat);
    windows.position.set(0, 2.15, 0);
    this.add(windows);

    // Destination label sprite
    this.destLabel = this.makeLabel(route.name);
    this.destLabel.position.set(0, 3.8, 0);
    this.add(this.destLabel);

    // Teleport to first stop
    const firstStop = this.currentStop();
    this.position.copy(firstStop.position);
  }

  public update(ud: IUpdate): void {
    if (this.dwellTimer > 0) {
      this.dwellTimer -= ud.delta;
      if (this.dwellTimer <= 0) {
        // Depart — advance to next stop
        this.stopIndex = (this.stopIndex + 1) % this.route.stops.length;
        this.arrived = false;
      }
      return;
    }

    const target = this.currentStop().position;
    const toTarget = target.clone().sub(this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 1.5) {
      if (!this.arrived) {
        this.arrived = true;
        this.dwellTimer = this.route.dwellSeconds;
        const stop = this.currentStop();
        CityEventBus.emit('busArrived', {
          routeId: this.route.id,
          routeName: this.route.name,
          stopName: stop.name,
          districtId: stop.districtId,
        });
      }
      return;
    }

    const dir = toTarget.normalize();
    const step = Math.min(this.speedUps * ud.delta, dist);
    this.position.addScaledVector(dir, step);

    // Smoothly face direction of travel
    const targetAngle = Math.atan2(dir.x, dir.z);
    const currentAngle = this.rotation.y;
    const diff = ((targetAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.rotation.y += diff * Math.min(ud.delta * 4, 1);
  }

  private currentStop(): BusStop {
    return this.route.stops[this.stopIndex];
  }

  private makeLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(8, 2, 1);
    return sprite;
  }
}
