/**
 * CityScene.ts
 * ----------------------------------------------------------------------------
 * Loads ONE complete, artist-designed city model (a real city layout, not a
 * tile grid) and drops it into the scene, auto-centred on the origin and
 * scaled to a comfortable size for the camera.
 *
 * This replaces the tile-by-tile CityBuilder (which produced a "square block"
 * because it placed one building per grid cell). A pre-made city already has
 * irregular streets, varied density, and real layout — exactly the goal.
 *
 * Scenes (CC-BY, credit the authors in the video description):
 *   sf-street   "SF Street" — Alan Zimmerman   (default, ~942 objects)
 *   rio         "Rio de Janeiro" — Alan Zimmerman
 *   city-small  small low-poly city
 *   city-blocks blocky city
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type CitySceneId = 'sf-street' | 'rio' | 'city-small' | 'city-blocks';

const FILES: Record<CitySceneId, string> = {
  'sf-street':   'cityscene/sf-street.glb',
  'rio':         'cityscene/rio.glb',
  'city-small':  'cityscene/city-small.glb',
  'city-blocks': 'cityscene/city-blocks.glb',
};

// Target footprint (largest horizontal dimension) in world units.
const TARGET_SPAN = 600;

export interface LoadedCity {
  group: THREE.Group;
  /** horizontal radius of the city (for camera framing) */
  radius: number;
  /** world-space bounding box after placement */
  box: THREE.Box3;
}

export class CityScene {
  private loader = new GLTFLoader();
  public root = new THREE.Group();
  public radius = 400;

  constructor() {
    this.root.name = 'cityScene';
  }

  public load(id: CitySceneId = 'sf-street'): Promise<LoadedCity> {
    const url = FILES[id] ?? FILES['sf-street'];
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(this.place(gltf.scene)),
        undefined,
        (err) => { console.error('[CityScene] load failed', url, err); reject(err); },
      );
    });
  }

  private place(scene: THREE.Object3D): LoadedCity {
    // 1) Measure raw bounds
    const raw = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    raw.getSize(size);
    const span = Math.max(size.x, size.z) || 1;

    // 2) Scale so the city fills TARGET_SPAN
    const scale = TARGET_SPAN / span;
    scene.scale.setScalar(scale);

    // 3) Re-measure, then centre on origin and rest on ground (y=0)
    const box = new THREE.Box3().setFromObject(scene);
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    scene.position.x -= centre.x;
    scene.position.z -= centre.z;
    scene.position.y -= box.min.y; // sit on the ground

    // 4) Shadows + fog on every mesh
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m) {
            m.fog = true;
            if (m.side === THREE.FrontSide) m.side = THREE.FrontSide;
          }
        }
      }
    });

    this.root.clear();
    this.root.add(scene);

    const finalBox = new THREE.Box3().setFromObject(this.root);
    const fsize = new THREE.Vector3();
    finalBox.getSize(fsize);
    this.radius = Math.max(fsize.x, fsize.z) * 0.5;

    console.log(`[CityScene] Loaded city · span≈${Math.round(Math.max(fsize.x, fsize.z))}u · ${this.countMeshes(scene)} meshes`);
    return { group: this.root, radius: this.radius, box: finalBox };
  }

  private countMeshes(obj: THREE.Object3D): number {
    let n = 0;
    obj.traverse((o: any) => { if (o.isMesh) n++; });
    return n;
  }
}

export const cityScene = new CityScene();
