/**
 * TourCamera.ts
 * ----------------------------------------------------------------------------
 * A guided, cinematic "city tour" camera for the 24/7 stream.
 *
 * It slowly flies a fixed loop of landmarks:
 *   Airport → Station → Downtown → Market → Park → Seaside/Beach → (loop)
 *
 * At each stop it eases in, holds with a gentle slow orbit/drift (so the shot
 * is alive, never static), then eases on to the next stop. Smooth lerping, no
 * hard cuts — comfortable to watch for hours.
 *
 * It drives CameraController's camera + OrbitControls target directly, the same
 * way the old CameraDirector did, so it slots into the existing render loop.
 *
 * Chat can still nudge it (fireworks pull-back, "visit X"), and it falls back to
 * the loop automatically.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraController } from '../constrol/CameraController';
import type { IUpdate } from '../interfaces/IUpdate';
import type { CityClockSnapshot } from '../stream/CityClock';
import { GVar } from '../utils/GVar';
import { CityEventBus } from '../city/CityEventBus';
import { LANDMARKS, tileToWorld, getZone } from '../city/CityDesign';

interface TourStop {
  name: string;
  zoneId: string;
  icon: string;
  target: THREE.Vector3;   // look-at point (ground)
  height: number;          // camera height
  radius: number;          // orbit distance
  hold: number;            // seconds to linger
}

// Build the tour route from the authored landmarks (a pleasing geographic loop).
function buildRoute(): TourStop[] {
  // Order chosen so the path sweeps across the map naturally.
  const order = ['Skyhaven Airport', 'Maple Village', 'Central Station', 'Old Market',
                 'Greenway Park', 'AICITY Beach', 'City Hall Plaza', 'Ironworks Yard'];
  const stops: TourStop[] = [];
  for (const wanted of order) {
    const lm = LANDMARKS.find(l => l.name === wanted);
    if (!lm) continue;
    const w = tileToWorld(lm.tile[0], lm.tile[1]);
    // beach / seaside want a lower, wider, sunset-friendly framing
    const seaside = lm.zoneId === 'seaside';
    stops.push({
      name: lm.name,
      zoneId: lm.zoneId,
      icon: lm.icon,
      target: new THREE.Vector3(w.x, seaside ? 2 : 6, w.z),
      height: seaside ? 55 : 70,
      radius: seaside ? 95 : 78,
      hold: 14,
    });
  }
  return stops;
}

const EASE_TIME = 9;          // seconds to travel between stops
const LERP_POS  = 0.020;
const LERP_TGT  = 0.024;

export class TourCamera {
  private readonly cc: CameraController;
  private readonly route: TourStop[] = buildRoute();
  private idx = 0;
  private phase: 'travel' | 'hold' = 'travel';
  private timer = 0;
  private orbit = 0;

  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredTgt = new THREE.Vector3();

  // forced override (fireworks / chat visit)
  private forcedSeconds = 0;
  private forced: 'fireworks' | null = null;

  constructor(cc: CameraController) {
    this.cc = cc;
    if (this.route.length) {
      this.desiredTgt.copy(this.route[0].target);
      this.computeStopPose(this.route[0]);
    }
    this.bindEvents();
    this.announce();
  }

  private current(): TourStop { return this.route[this.idx]; }

  private computeStopPose(stop: TourStop): void {
    this.desiredPos.set(
      stop.target.x + Math.cos(this.orbit) * stop.radius,
      stop.height,
      stop.target.z + Math.sin(this.orbit) * stop.radius,
    );
  }

  private announce(): void {
    const s = this.current();
    const zone = getZone(s.zoneId);
    CityEventBus.emit('tourStop', {
      name: s.name, icon: s.icon, zoneId: s.zoneId,
      zoneName: zone?.name ?? s.name, blurb: zone?.blurb ?? '',
    });
  }

  public update(ud: IUpdate, _clock?: CityClockSnapshot): void {
    if (GVar.bCameraAnimState) return;
    if (!(this.cc.controls instanceof OrbitControls)) return;
    if (!this.route.length) return;

    const controls = this.cc.controls;
    const camera = this.cc.camera;
    controls.enabled = false;

    // gentle continuous orbit so every shot breathes
    this.orbit += ud.delta * 0.05;

    // ── forced fireworks pull-back ──
    if (this.forced === 'fireworks' && this.forcedSeconds > 0) {
      this.forcedSeconds -= ud.delta;
      this.desiredTgt.set(0, 30, 0);
      this.desiredPos.set(Math.cos(this.orbit) * 200, 210, Math.sin(this.orbit) * 200);
      controls.target.lerp(this.desiredTgt, LERP_TGT);
      camera.position.lerp(this.desiredPos, LERP_POS);
      camera.lookAt(controls.target);
      if (this.forcedSeconds <= 0) { this.forced = null; this.phase = 'travel'; this.timer = 0; }
      return;
    }

    const stop = this.current();

    if (this.phase === 'travel') {
      this.timer += ud.delta;
      this.desiredTgt.lerp(stop.target, 0.05);
      this.computeStopPose(stop);
      if (this.timer >= EASE_TIME) { this.phase = 'hold'; this.timer = 0; }
    } else {
      // hold: linger with slow orbit
      this.timer += ud.delta;
      this.desiredTgt.lerp(stop.target, 0.04);
      this.computeStopPose(stop);
      if (this.timer >= stop.hold) {
        this.idx = (this.idx + 1) % this.route.length;
        this.phase = 'travel';
        this.timer = 0;
        this.announce();
      }
    }

    controls.target.lerp(this.desiredTgt, LERP_TGT);
    camera.position.lerp(this.desiredPos, LERP_POS);
    camera.lookAt(controls.target);
  }

  /** Jump the tour to a named zone (chat / admin). */
  public visitZone(zoneId: string): void {
    const i = this.route.findIndex(s => s.zoneId === zoneId);
    if (i >= 0) {
      this.idx = i;
      this.phase = 'hold';
      this.timer = 0;
      this.announce();
    }
  }

  private bindEvents(): void {
    CityEventBus.on('fireworksRequested', () => {
      this.forced = 'fireworks';
      this.forcedSeconds = 22;
    });
    CityEventBus.on('cameraVote', (p) => {
      const zone = (p['zoneId'] ?? p['mode']) as string;
      if (zone) this.visitZone(zone);
    });
    CityEventBus.on('districtUnlocked', (p) => {
      const z = p['districtId'] as string;
      if (z) this.visitZone(z);
    });
  }
}
