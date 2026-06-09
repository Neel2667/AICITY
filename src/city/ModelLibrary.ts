/**
 * ModelLibrary.ts — loads ALL CC0 Kenney City Kit glTF models.
 *
 * SCALE FACTS (measured from actual .glb bounding boxes):
 *   Roads (straight/crossroad/intersection/end/bend): 1×1 unit footprint
 *   Road-curve: 2×2 unit footprint
 *   Road-roundabout: 3×3 unit footprint
 *   Buildings (commercial): ~0.9–1.6 unit footprint
 *   Buildings (industrial): ~1.7–2.1 unit footprint
 *   Buildings (suburban): ~1.3–1.8 unit footprint
 *
 * Our TILE = 60 world units.
 * ROAD_SCALE  = 60   (1-unit roads fill one 60u tile perfectly)
 * BLDG_SCALE  = 28   (buildings ~1.5u wide → ~42u = 70% of tile)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TILE } from './CityDesign';

// Correct per-category scales
export const ROAD_SCALE  = TILE;           // 60  — roads are 1×1 unit
export const CURVE_SCALE = TILE / 2;       // 30  — curves are 2×2 unit
export const BLDG_SCALE  = TILE * 0.46;    // 27.6 — buildings ~1.5u → ~42u wide
export const TREE_SCALE  = TILE * 0.40;    // 24

const BASE = 'models';

// Everything on disk, used to drive loading
export const MANIFEST = {
  roads: [
    // 1×1 tiles
    'road-straight', 'road-straight-half', 'road-straight-barrier',
    'road-crossroad', 'road-crossroad-line', 'road-crossroad-path', 'road-crossroad-barrier',
    'road-intersection', 'road-intersection-line', 'road-intersection-path', 'road-intersection-barrier',
    'road-end', 'road-end-round', 'road-end-barrier', 'road-end-round-barrier',
    'road-bend', 'road-bend-sidewalk', 'road-bend-square', 'road-bend-barrier',
    'road-bend-square-barrier',
    'road-split', 'road-split-barrier',
    'road-side', 'road-side-barrier',
    'road-square', 'road-square-barrier',
    'road-crossing',
    'road-driveway-single', 'road-driveway-double',
    'road-driveway-single-barrier', 'road-driveway-double-barrier',
    // 2×2 tiles (need CURVE_SCALE)
    'road-curve', 'road-curve-pavement', 'road-curve-barrier',
    'road-curve-intersection', 'road-curve-intersection-barrier',
    // traffic lights (props, not tiles)
    'light-square', 'light-square-double', 'light-square-cross',
    'light-curved', 'light-curved-double', 'light-curved-cross',
    // construction props
    'construction-barrier', 'construction-cone', 'construction-light',
  ],
  commercial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'building-m','building-n',
    'building-skyscraper-a','building-skyscraper-b','building-skyscraper-c',
    'building-skyscraper-d','building-skyscraper-e',
    'low-detail-building-a','low-detail-building-b','low-detail-building-c',
    'low-detail-building-d','low-detail-building-e','low-detail-building-f',
    'low-detail-building-g','low-detail-building-h','low-detail-building-i',
    'low-detail-building-j','low-detail-building-k','low-detail-building-l',
    'low-detail-building-m','low-detail-building-n',
    'low-detail-building-wide-a','low-detail-building-wide-b',
    'detail-awning','detail-awning-wide',
    'detail-overhang','detail-overhang-wide',
    'detail-parasol-a','detail-parasol-b',
  ],
  industrial: [
    'building-a','building-b','building-c','building-d','building-e','building-f',
    'building-g','building-h','building-i','building-j','building-k','building-l',
    'building-m','building-n','building-o','building-p','building-q','building-r',
    'building-s','building-t',
    'chimney-basic','chimney-small','chimney-medium','chimney-large',
    'detail-tank',
  ],
  suburban: [
    'building-type-a','building-type-b','building-type-c','building-type-d',
    'building-type-e','building-type-f','building-type-g','building-type-h',
    'building-type-i','building-type-j','building-type-k','building-type-l',
    'building-type-m','building-type-n','building-type-o','building-type-p',
    'building-type-q','building-type-r','building-type-s','building-type-t',
    'building-type-u',
    'tree-small','tree-large',
    'fence','fence-low',
    'fence-1x2','fence-1x3','fence-1x4',
    'fence-2x2','fence-2x3','fence-3x2','fence-3x3',
    'planter',
    'path-short','path-long',
    'path-stones-short','path-stones-long','path-stones-messy',
    'driveway-short','driveway-long',
  ],
  modular: [
    'building-sample-house-a','building-sample-house-b','building-sample-house-c',
    'building-sample-tower-a','building-sample-tower-b',
    'building-sample-tower-c','building-sample-tower-d',
  ],
} as const;

export type ModelGroup = keyof typeof MANIFEST;

// Which roads need CURVE_SCALE (2×2 footprint)
const CURVE_ROADS = new Set([
  'road-curve','road-curve-pavement','road-curve-barrier',
  'road-curve-intersection','road-curve-intersection-barrier',
]);

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
    console.log(`[ModelLibrary] Loaded ${this.cache.size} / ${this.totalModels()} Kenney models`);
  }

  private totalModels(): number {
    return Object.values(MANIFEST).reduce((s, a) => s + a.length, 0);
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
              mesh.castShadow    = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const m of mats) {
                if (!m) continue;
                (m as THREE.MeshStandardMaterial).fog = true;
                const sm = m as THREE.MeshStandardMaterial;
                if (sm.map) sm.map.anisotropy = 4;
              }
            }
          });
          this.cache.set(key, proto);
          resolve();
        },
        undefined,
        () => resolve(),   // silently skip missing
      );
    });
  }

  public has(group: ModelGroup, name: string): boolean {
    return this.cache.has(`${group}/${name}`);
  }

  /**
   * Return a cloned instance with correct scale applied.
   *   roads group:   ROAD_SCALE or CURVE_SCALE depending on model
   *   commercial/industrial/modular: BLDG_SCALE
   *   suburban trees: TREE_SCALE; suburban buildings: BLDG_SCALE
   */
  public get(group: ModelGroup, name: string): THREE.Object3D | null {
    const proto = this.cache.get(`${group}/${name}`);
    if (!proto) return null;
    const inst = proto.clone(true);
    inst.scale.setScalar(this.scaleFor(group, name));
    return inst;
  }

  public scaleFor(group: ModelGroup, name: string): number {
    if (group === 'roads') {
      return CURVE_ROADS.has(name) ? CURVE_SCALE : ROAD_SCALE;
    }
    if (group === 'suburban') {
      if (name === 'tree-small' || name === 'tree-large') return TREE_SCALE;
    }
    return BLDG_SCALE;
  }

  public names(group: ModelGroup): string[] {
    return (MANIFEST[group] as readonly string[]).filter(n => this.has(group, n));
  }
}

export const modelLibrary = new ModelLibrary();
