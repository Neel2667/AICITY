/**
 * CameraDirector.ts — Phase 4
 * Full cinematic camera system with 5 modes:
 *   orbit      — slow panoramic orbit (default, always available)
 *   follow     — track a moving vehicle or bus
 *   district   — slow flyover of a named district area
 *   event      — zoom to an active city event location
 *   fireworks  — pull back for sky view during fireworks show
 *
 * Mode switching:
 *   - Auto-rotates between orbit / district / event every SCENE_DURATION seconds
 *   - Responds to CityEventBus 'cameraVote' and 'fireworksRequested'
 *   - Smooth lerp transitions between all positions (no hard cuts)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraController } from '../constrol/CameraController';
import type { IUpdate } from '../interfaces/IUpdate';
import type { CityClockSnapshot } from '../stream/CityClock';
import { GVar } from '../utils/GVar';
import { CityEventBus } from '../city/CityEventBus';
import { CITY_MAP } from '../city/CityMap';
import { MiscFunc } from '../utils/MiscFunc';

export type CameraMode = 'orbit' | 'follow' | 'district' | 'event' | 'fireworks';

const SCENE_DURATION = 45;      // seconds before auto-switching scene
const LERP_POS  = 0.012;

const LERP_FAST = 0.035;        // faster lerp when explicitly voted

// District focal points (world-space approximations, chunk-centre based)
// chunk(cx,cy) world ≈ ((cx-4)*60, 0, (cy-4)*60)
const DISTRICT_TARGETS: Record<string, THREE.Vector3> = {
  downtown:   new THREE.Vector3(0,    0, 0),
  maple:      new THREE.Vector3(-180, 0, -180),
  harbor:     new THREE.Vector3(120,  0, -180),
  ironworks:  new THREE.Vector3(-180, 0,  120),
  greenway:   new THREE.Vector3(120,  0,  120),
  midtown:    new THREE.Vector3(-60,  0,  60),
};

export class CameraDirector {
  private readonly cc: CameraController;
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredTgt = new THREE.Vector3();
  private orbitAngle = Math.PI * 0.25;
  private mode: CameraMode = 'orbit';
  private sceneTimer = 0;
  private lerpSpeed = LERP_POS;
  private followTarget: THREE.Object3D | null = null;
  private activeDistrictId = 'downtown';
  private forcedModeDuration = 0; // seconds remaining for a forced mode

  constructor(cc: CameraController) {
    this.cc = cc;
    this.bindEvents();
  }

  // ─── Public mode setters ──────────────────────────────────────────────────

  public setMode(mode: CameraMode, target?: THREE.Object3D, forced = false): void {
    this.mode = mode;
    this.lerpSpeed = forced ? LERP_FAST : LERP_POS;
    if (forced) this.forcedModeDuration = 30; // hold for 30s
    if (target) this.followTarget = target;
    console.log(`[CameraDirector] Mode → ${mode}`);
  }

  public setFollowTarget(obj: THREE.Object3D | null): void {
    this.followTarget = obj;
    if (obj) this.setMode('follow', obj, false);
  }

  // ─── Main update ──────────────────────────────────────────────────────────

  public update(ud: IUpdate, clock?: CityClockSnapshot): void {
    if (GVar.bCameraAnimState) return;
    if (!(this.cc.controls instanceof OrbitControls)) return;

    const controls = this.cc.controls;
    const camera   = this.cc.camera;
    controls.enabled = false;

    // Forced mode countdown
    if (this.forcedModeDuration > 0) {
      this.forcedModeDuration -= ud.delta;
      if (this.forcedModeDuration <= 0) {
        this.forcedModeDuration = 0;
        this.mode = 'orbit';
      }
    }

    // Auto-scene rotation (only when not forced)
    if (this.forcedModeDuration <= 0) {
      this.sceneTimer += ud.delta;
      if (this.sceneTimer >= SCENE_DURATION) {
        this.sceneTimer = 0;
        this.autoNextScene(clock);
      }
    }

    // Compute desired camera position & target per mode
    switch (this.mode) {
      case 'orbit':     this.computeOrbit(ud, clock);    break;
      case 'follow':    this.computeFollow(ud);          break;
      case 'district':  this.computeDistrict(ud, clock); break;
      case 'event':     this.computeEvent(ud, clock);    break;
      case 'fireworks': this.computeFireworks(ud);       break;
    }

    controls.target.lerp(this.desiredTgt, this.lerpSpeed * 1.1);
    camera.position.lerp(this.desiredPos,  this.lerpSpeed);
    camera.lookAt(controls.target);
  }

  // ─── Mode computations ────────────────────────────────────────────────────

  private computeOrbit(ud: IUpdate, clock?: CityClockSnapshot): void {
    const scenicBias = clock && (clock.phase === 'dawn' || clock.phase === 'dusk') ? 1 : 0;
    const nightBias  = clock && clock.phase === 'night' ? 1 : 0;
    const radius = 135 + scenicBias * 20 + Math.sin(ud.elapsed * 0.025) * 8;
    const height = 90 + scenicBias * 28 - nightBias * 10 + Math.sin(ud.elapsed * 0.018) * 7;

    this.orbitAngle += ud.delta * (0.018 + scenicBias * 0.006);

    this.desiredTgt.set(
      Math.sin(ud.elapsed * 0.010) * 14,
      0,
      Math.cos(ud.elapsed * 0.013) * 14,
    );
    this.desiredPos.set(
      this.desiredTgt.x + Math.cos(this.orbitAngle) * radius,
      height,
      this.desiredTgt.z + Math.sin(this.orbitAngle) * radius,
    );
  }

  private computeFollow(_ud: IUpdate): void {
    if (!this.followTarget) { this.mode = 'orbit'; return; }

    const wp = new THREE.Vector3();
    this.followTarget.getWorldPosition(wp);
    this.desiredTgt.copy(wp);

    // Camera sits behind and above the target
    const back = new THREE.Vector3(0, 0, 1).applyEuler(this.followTarget.rotation);
    this.desiredPos.copy(wp)
      .addScaledVector(back, 22)
      .setY(14);
  }

  private computeDistrict(ud: IUpdate, clock?: CityClockSnapshot): void {
    const centre = DISTRICT_TARGETS[this.activeDistrictId] ?? DISTRICT_TARGETS['downtown'];

    const night  = clock && clock.phase === 'night';
    const radius = 110 + Math.sin(ud.elapsed * 0.020) * 12;
    const height = night ? 72 : 88 + Math.sin(ud.elapsed * 0.015) * 10;
    const angle  = ud.elapsed * 0.014;

    this.desiredTgt.copy(centre);
    this.desiredPos.set(
      centre.x + Math.cos(angle) * radius,
      height,
      centre.z + Math.sin(angle) * radius,
    );
  }

  private computeEvent(_ud: IUpdate, _clock?: CityClockSnapshot): void {
    // Point camera at a named landmark location for active event
    const landmark = MiscFunc.getRandElement(CITY_MAP.landmarks);
    const lx = (Math.round(landmark.chunkX) - 4) * 60;
    const lz = (Math.round(landmark.chunkY) - 4) * 60;

    this.desiredTgt.lerp(new THREE.Vector3(lx, 0, lz), 0.005);
    this.desiredPos.set(lx + 60, 65, lz + 60);
  }

  private computeFireworks(_ud: IUpdate): void {
    // Pull back high to see the full sky show
    this.desiredTgt.set(0, 30, 0);
    this.desiredPos.set(0, 220, 180);
  }

  // ─── Auto scene rotation ──────────────────────────────────────────────────

  private autoNextScene(clock?: CityClockSnapshot): void {
    const roll = Math.random();

    if (clock?.phase === 'dawn' || clock?.phase === 'dusk') {
      // Scenic transitions: prefer orbit with wide view
      this.mode = 'orbit';
      return;
    }

    if (roll < 0.45) {
      this.mode = 'orbit';
    } else if (roll < 0.78) {
      this.mode = 'district';
      const ids = Object.keys(DISTRICT_TARGETS);
      this.activeDistrictId = MiscFunc.getRandElement(ids);
    } else {
      this.mode = 'event';
    }
  }

  // ─── Event bindings ───────────────────────────────────────────────────────

  private bindEvents(): void {
    CityEventBus.on('cameraVote', (p) => {
      const mode = p['mode'] as CameraMode;
      this.setMode(mode, undefined, true);
    });

    CityEventBus.on('fireworksRequested', () => {
      this.setMode('fireworks', undefined, true);
      this.forcedModeDuration = 22; // hold for the show
    });

    CityEventBus.on('districtUnlocked', (p) => {
      this.activeDistrictId = p['districtId'] as string;
      this.setMode('district', undefined, true);
    });

    CityEventBus.on('constructionComplete', () => {
      this.mode = 'event';
      this.forcedModeDuration = 15;
    });
  }
}
