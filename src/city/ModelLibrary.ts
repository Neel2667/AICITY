/**
 * ModelLibrary.ts — loads CC0 Kenney City Kit glTF models.
 * Kenney pieces: 2×2 unit footprint. Our tiles: TILE (60) units.
 * Scale = TILE / 2 = 30 → one piece fills one tile.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TILE } from './CityDesign';

const KENNEY_UNIT = 2;
export const MODEL_SCALE = TILE / KENNEY_UNIT;   // 30

const BASE = 'models';

const MANIFEST = {
  roads: [
    'road-straight', 'road-straight-half',
    'road-crossroad', 'road-crossroad-line', 'road-crossroad-path',
    'road-intersection', 'road-intersection-line', 'road-intersection-path',
    'road-curve', 'road-curve-pavement',
    'road-bend', 'road-bend-sidewalk', 'road-bend-square',
    'road-split', 'road-end', 'road-end-round',
    'road-side', 'road-square', 'road-roundabout', 'road-crossing',
    'construction-barrier', 'construction-cone', 'construction-light',
    'light-square', 'light-square-double', 'light-square-cross',
    'light-curved', 'light-curved-double', 'light-curved-cross',
  ],
  commercial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'building-m','building-n',
    'building-skyscraper-a','building-skyscraper-b','building-skyscraper-c',
    'building-skyscraper-d','building-skyscraper-e',
    'detail-awning','detail-awning-wide','detail-parasol-a','detail-parasol-b',
    'low-detail-building-a','low-detail-building-b',
    'low-detail-building-c','low-detail-building-d',
  ],
  industrial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'building-m','building-n','building-o','building-p','building-q','building-r',
    'building-s',
  ],
  suburban: [
    'building-type-a','building-type-b','building-type-c','building-type-d',
    'building-type-e','building-type-f','building-type-g','building-type-h',
    'building-type-i','building-type-j','building-type-k','building-type-l',
    'building-type-m','building-type-n','building-type-o','building-type-p',
    'building-type-q','building-type-r','building-type-s',
    'tree-small','tree-large',
    'fence','fence-low','planter',
    'path-long','path-short',
    'driveway-long','driveway-short',
  ],
  modular: [
    'building-sample-tower-a','building-sample-tower-b',
    'building-sample-tower-c','building-sample-tower-d',
    'building-sample-house-a','building-sample-house-b','building-sample-house-c',
  ],
} as const;

export type ModelGroup = keyof typeof MANIFEST;

export class ModelLibrary {
  private cache = new Map<string, THREE.Object3D>();
  private loader = new GLTFLoader();
  public loaded = false;

  public async preload(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const group of Object.keys(MANIFEST) as ModelGroup[]) {
      for (const name of MANIFEST[group]) {
        jobs.push(this.loadOne(group, name));
      }
    }
    await Promise.all(jobs);
    this.loaded = true;
    console.log(`[ModelLibrary] Loaded ${this.cache.size} models`);
  }

  private loadOne(group: ModelGroup, name: string): Promise<void> {
    const key = `${group}/${name}`;
    const url = `${BASE}/${group}/${name}.glb`;
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const proto = gltf.scene;
          proto.traverse((o: THREE.Object3D) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const m of mats) {
                if (m) {
                  (m as THREE.MeshStandardMaterial).fog = true;
                  const sm = m as THREE.MeshStandardMaterial;
                  if (sm.map) sm.map.anisotropy = 4;
                }
              }
            }
          });
          this.cache.set(key, proto);
          resolve();
        },
        undefined,
        () => resolve(),
      );
    });
  }

  public has(group: ModelGroup, name: string): boolean {
    return this.cache.has(`${group}/${name}`);
  }

  public get(group: ModelGroup, name: string): THREE.Object3D | null {
    const proto = this.cache.get(`${group}/${name}`);
    if (!proto) return null;
    const inst = proto.clone(true);
    inst.scale.setScalar(MODEL_SCALE);
    return inst;
  }

  public names(group: ModelGroup): string[] {
    return (MANIFEST[group] as readonly string[]).filter(n => this.has(group, n));
  }
}

export const modelLibrary = new ModelLibrary();
