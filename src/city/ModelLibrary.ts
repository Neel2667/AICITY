/**
 * ModelLibrary.ts
 * ----------------------------------------------------------------------------
 * Loads the CC0 Kenney City Kit glTF models (roads, commercial, industrial,
 * suburban) and serves cloned, correctly-scaled instances to the CityBuilder.
 *
 * Kenney pieces are authored on a 2x2 unit footprint. Our tiles are TILE (60)
 * units, so we scale by TILE/2 = 30 to make one Kenney piece fill one tile.
 *
 * License: CC0 (Kenney.nl) — free for commercial use, no attribution required.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TILE } from './CityDesign';

const KENNEY_UNIT = 2;                 // Kenney models are 2x2 footprint
export const MODEL_SCALE = TILE / KENNEY_UNIT; // 30 → one piece fills one tile

const BASE = 'models';

// The model files we use, grouped. Names are the glb basenames (no extension).
const MANIFEST = {
  roads: [
    'road-straight', 'road-intersection', 'road-curve', 'road-end', 'road-split',
    'road-side', 'road-square',
  ],
  commercial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'building-m','building-n',
    'building-skyscraper-a','building-skyscraper-b','building-skyscraper-c',
    'building-skyscraper-d','building-skyscraper-e',
    'detail-awning','detail-parasol-a','detail-parasol-b',
  ],
  industrial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'chimney-large','chimney-medium','detail-tank',
  ],
  suburban: [
    'building-type-a','building-type-b','building-type-c','building-type-d',
    'building-type-e','building-type-f','building-type-g','building-type-h',
    'building-type-i','building-type-j','building-type-k','building-type-l',
    'tree-small','tree-large','fence','planter','path-long',
  ],
} as const;

type Group = keyof typeof MANIFEST;

export class ModelLibrary {
  private cache = new Map<string, THREE.Object3D>(); // "group/name" → prototype
  private loader = new GLTFLoader();
  public loaded = false;

  /** Preload every model in the manifest. Resolves when all are ready. */
  public async preload(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const group of Object.keys(MANIFEST) as Group[]) {
      for (const name of MANIFEST[group]) {
        jobs.push(this.loadOne(group, name));
      }
    }
    await Promise.all(jobs);
    this.loaded = true;
    console.log(`[ModelLibrary] Loaded ${this.cache.size} CC0 models`);
  }

  private loadOne(group: Group, name: string): Promise<void> {
    const key = `${group}/${name}`;
    const url = `${BASE}/${group}/${name}.glb`;
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const proto = gltf.scene;
          proto.traverse((o: any) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material) {
                o.material.fog = true;
                // Kenney uses a tiny color-atlas texture; keep it crisp.
                if (o.material.map) o.material.map.anisotropy = 4;
              }
            }
          });
          this.cache.set(key, proto);
          resolve();
        },
        undefined,
        (err) => { console.warn(`[ModelLibrary] failed ${url}`, err); resolve(); },
      );
    });
  }

  public has(group: Group, name: string): boolean {
    return this.cache.has(`${group}/${name}`);
  }

  /** Return a cloned, tile-scaled instance, or null if missing. */
  public get(group: Group, name: string): THREE.Object3D | null {
    const proto = this.cache.get(`${group}/${name}`);
    if (!proto) return null;
    const inst = proto.clone(true);
    inst.scale.setScalar(MODEL_SCALE);
    return inst;
  }

  /** Names available in a group (those that loaded). */
  public names(group: Group): string[] {
    return MANIFEST[group].filter(n => this.has(group, n));
  }
}

export const modelLibrary = new ModelLibrary();
export type { Group as ModelGroup };
