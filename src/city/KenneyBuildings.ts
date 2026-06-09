/**
 * KenneyBuildings.ts
 * ----------------------------------------------------------------------------
 * Loads the CC0 Kenney building models (commercial, industrial, suburban houses,
 * and the modular "sample" buildings from the isometric-city repo) and serves
 * cloned, chunk-scaled instances for the fixed 16x16 city.
 *
 * Activated with ?buildings=kenney (default stays the original textured city).
 *
 * Kenney pieces are ~2 unit footprint; our chunk is CHUNK_SIZE (60) so we scale
 * each building to fill a comfortable share of the tile.
 *
 * License: CC0 (Kenney.nl) — free for commercial use, no attribution required.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GVar } from '../utils/GVar';

const KENNEY_UNIT = 2;                          // model footprint
// Fill ~70% of a 60u chunk → scale = (60*0.7)/2 = 21
export const BUILDING_SCALE = (GVar.CHUNK_SIZE * 0.7) / KENNEY_UNIT;

// Complete, standalone buildings grouped by district feel.
const MANIFEST: Record<string, { dir: string; names: string[] }> = {
  downtown: {
    dir: 'commercial',
    names: [
      'building-skyscraper-a','building-skyscraper-b','building-skyscraper-c',
      'building-skyscraper-d','building-skyscraper-e',
      'building-a','building-b','building-c','building-d','building-e','building-f',
      'building-g','building-h','building-i','building-j','building-k','building-l',
      'building-m','building-n',
    ],
  },
  modular: {
    dir: 'modular',
    names: [
      'building-sample-tower-a','building-sample-tower-b','building-sample-tower-c',
      'building-sample-tower-d','building-sample-house-a','building-sample-house-b',
      'building-sample-house-c',
    ],
  },
  suburb: {
    dir: 'suburban',
    names: [
      'building-type-a','building-type-b','building-type-c','building-type-d',
      'building-type-e','building-type-f','building-type-g','building-type-h',
      'building-type-i','building-type-j','building-type-k','building-type-l',
      'building-type-m','building-type-n','building-type-o','building-type-p',
    ],
  },
  industrial: {
    dir: 'industrial',
    names: [
      'building-a','building-b','building-c','building-d','building-e','building-f',
      'building-g','building-h','building-i','building-j','building-k','building-l',
    ],
  },
  trees: {
    dir: 'suburban',
    names: ['tree-large','tree-small'],
  },
};

export class KenneyBuildings {
  private cache = new Map<string, THREE.Object3D>(); // "dir/name" → prototype
  private loader = new GLTFLoader();
  public loaded = false;

  public async preload(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const group of Object.values(MANIFEST)) {
      for (const name of group.names) jobs.push(this.loadOne(group.dir, name));
    }
    await Promise.all(jobs);
    this.loaded = true;
    console.log(`[KenneyBuildings] Loaded ${this.cache.size} CC0 building models`);
  }

  private loadOne(dir: string, name: string): Promise<void> {
    const key = `${dir}/${name}`;
    const url = `models/${dir}/${name}.glb`;
    return new Promise((resolve) => {
      this.loader.load(url, (gltf) => {
        const proto = gltf.scene;
        proto.traverse((o: any) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) {
              o.material.fog = true;
              if (o.material.map) o.material.map.anisotropy = 4;
            }
          }
        });
        this.cache.set(key, proto);
        resolve();
      }, undefined, () => resolve());
    });
  }

  public names(group: keyof typeof MANIFEST): string[] {
    const g = MANIFEST[group];
    return g.names.filter(n => this.cache.has(`${g.dir}/${n}`));
  }

  public get(group: keyof typeof MANIFEST, name: string): THREE.Object3D | null {
    const dir = MANIFEST[group].dir;
    const proto = this.cache.get(`${dir}/${name}`);
    if (!proto) return null;
    const inst = proto.clone(true);
    inst.scale.setScalar(BUILDING_SCALE);
    return inst;
  }

  public hasAny(): boolean { return this.cache.size > 0; }
}

export const kenneyBuildings = new KenneyBuildings();
export type KenneyGroup = keyof typeof MANIFEST;
