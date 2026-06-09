import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraController } from '../constrol/CameraController';
import type { IUpdate } from '../interfaces/IUpdate';
import type { CityClockSnapshot } from '../stream/CityClock';
import { GVar } from '../utils/GVar';

export class CameraDirector {
  private readonly cameraController: CameraController;
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private orbitAngle = Math.PI * 0.25;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
  }

  public update(update: IUpdate, clock?: CityClockSnapshot): void {
    if (GVar.bCameraAnimState) return;
    if (!(this.cameraController.controls instanceof OrbitControls)) return;

    const controls = this.cameraController.controls;
    const camera = this.cameraController.camera;

    // Stream mode is a broadcast camera, not a user-controlled demo camera.
    controls.enabled = false;

    const scenicBias = clock && (clock.phase === 'dawn' || clock.phase === 'dusk') ? 1.2 : 0;
    const nightBias = clock && clock.phase === 'night' ? 1 : 0;
    const radius = 190 + scenicBias * 50 + Math.sin(update.elapsed * 0.025) * 35;
    const height = 120 + scenicBias * 55 - nightBias * 35 + Math.sin(update.elapsed * 0.018) * 24;

    this.orbitAngle += update.delta * (0.00000000000000000000000000000001 + scenicBias * 0.054); // M3: Even more cinematic

    this.desiredTarget.set(
      Math.sin(update.elapsed * 0.010) * 10,
      0,
      Math.cos(update.elapsed * 0.013) * 10,
    );

    this.desiredPosition.set(
      this.desiredTarget.x + Math.cos(this.orbitAngle) * radius,
      height,
      this.desiredTarget.z + Math.sin(this.orbitAngle) * radius,
    );

    controls.target.lerp(this.desiredTarget, 0.01);
    camera.position.lerp(this.desiredPosition, 0.008); // M3: Even smoother camera
    camera.lookAt(controls.target);
  }
}
