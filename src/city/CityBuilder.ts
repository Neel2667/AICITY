/**
 * CityBuilder.ts
 * ----------------------------------------------------------------------------
 * Builds the entire FINITE city ONCE as static geometry from the authored
 * CityDesign map — but using the ORIGINAL InfiniTown textured assets so it
 * looks as good as the original engine.
 *
 * Each urban tile is assembled with the same recipe the original used:
 *   textured block  +  4 textured road lanes (merged)  +  textured intersection
 * placed deterministically (no randomness, no infinite wrap).
 *
 * Natural/landmark tiles (ocean, beach, fields, airport, station, market…) use
 * LandmarkFactory geometry, sitting on the same textured road grid so they
 * blend into the city instead of floating on flat colored squares.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILES, GRID_W, GRID_H, TILE, tileToWorld, type TileKind } from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';
import { GVar } from '../utils/GVar';

// Urban tile kind → acceptable baked block names (first match wins, deterministic).
const URBAN_BLOCKS: Record<string, string[]> = {
  downtown:    ['block_1_merged', 'block_2_merged', 'block_3_merged'],
  midtown:     ['block_7_merged', 'block_9_merged', 'block_3_merged'],
  residential: ['block_4_merged', 'block_5_merged', 'block_6_merged'],
  village:     ['block_4_merged', 'block_6_merged', 'block_5_merged'],
  industrial:  ['block_11_merged', 'block_10_merged'],
  park:        ['park_2_merged', 'park_3_merged'],
};

// Kinds that should be built as a full textured "city block" tile.
const URBAN_KINDS = new Set<TileKind>(['downtown', 'midtown', 'residential', 'village', 'industrial', 'park']);

export class CityBuilder {
  private blockPool = new Map<string, THREE.Object3D[]>();
  private lanes: THREE.Object3D[] = [];
  private intersections: THREE.Object3D[] = [];
  public readonly root = new THREE.Group();

  constructor() {
    this.root.name = 'authoredCity';
  }

  /** Ingest the baked prototypes once after asset load. */
  public ingest(arrBlocks: any[], arrLanes: any[] = [], arrIntersections: any[] = []): void {
    this.blockPool.clear();
    for (const b of arrBlocks) {
      const n: string = (b.name as string) || '';
      if (!this.blockPool.has(n)) this.blockPool.set(n, []);
      this.blockPool.get(n)!.push(b);
    }
    // expand lanes like the original (more 01s than 03s for variety)
    this.lanes = [];
    for (const t of arrLanes) {
      const reps = (t.name === 'Road_Lane_03_fixed') ? 5 : 10;
      for (let i = 0; i < reps; i++) this.lanes.push(t);
    }
    if (this.lanes.length === 0) this.lanes = arrLanes.slice();
    this.intersections = arrIntersections.slice();
  }

  // deterministic pick from an array based on tile coords
  private pick<T>(arr: T[], x: number, y: number, salt = 0): T | null {
    if (!arr.length) return null;
    const h = Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1 + salt * 13.1) * 10000));
    return arr[h % arr.length];
  }

  private resolveBaked(kind: string, x: number, y: number): THREE.Object3D | null {
    const wants = URBAN_BLOCKS[kind] ?? [];
    for (let off = 0; off < Math.max(1, wants.length); off++) {
      const want = wants.length ? wants[(this.idx(x, y) + off) % wants.length] : '';
      for (const [name, arr] of this.blockPool.entries()) {
        if (arr.length && (want === '' || name.includes(want))) {
          const c = arr[0].clone();
          this.prepShadows(c);
          return c;
        }
      }
    }
    return null;
  }

  private idx(x: number, y: number): number {
    return Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1) * 10000));
  }

  private prepShadows(obj: THREE.Object3D): void {
    obj.traverse((o: any) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material && o.material.defines) {
          o.material.defines.USE_FOG = true;
          o.material.defines.USE_SHADOWMAP = true;
          o.material.defines[GVar.SHADOWMAP_TYPE] = true;
        }
      }
    });
  }

  /**
   * Build the textured road frame (4 lanes merged + intersection) exactly like
   * the original _genRandomChunk did, so the streets look identical to before.
   */
  private buildRoadFrame(x: number, y: number): THREE.Object3D {
    const group = new THREE.Object3D();
    if (!this.lanes.length) return group;

    const matrix = new THREE.Matrix4();
    const rot90 = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const d: THREE.Mesh[] = [];

    const result = (this.pick(this.lanes, x, y, 1) as any).clone() as THREE.Mesh;
    result.position.set(-30, 0, 10);
    result.geometry = result.geometry.clone();
    group.add(result);
    d.push(result);

    const object = (this.pick(this.lanes, x, y, 2) as any).clone() as THREE.Mesh;
    object.position.set(-30, 0, -10);
    object.geometry = object.geometry.clone();
    matrix.makeTranslation(0, 0, -20);
    object.geometry.applyMatrix4(matrix);
    d.push(object);

    const mesh = (this.pick(this.lanes, x, y, 3) as any).clone() as THREE.Mesh;
    mesh.position.set(-10, 0, -30);
    mesh.rotation.y = Math.PI / 2;
    mesh.geometry = mesh.geometry.clone();
    matrix.makeTranslation(20, 0, -40);
    mesh.geometry.applyMatrix4(rot90);
    mesh.geometry.applyMatrix4(matrix);
    d.push(mesh);

    const o = (this.pick(this.lanes, x, y, 4) as any).clone() as THREE.Mesh;
    o.position.set(10, 0, -30);
    o.rotation.y = Math.PI / 2;
    o.geometry = o.geometry.clone();
    matrix.makeTranslation(40, 0, -40);
    o.geometry.applyMatrix4(rot90);
    o.geometry.applyMatrix4(matrix);
    d.push(o);

    try {
      const merged = mergeGeometries(d.map(m => m.geometry), true);
      if (merged) {
        result.geometry = merged;
        d.forEach(m => { if (m !== result) group.remove(m); });
      }
    } catch { /* keep separate lanes on failure */ }

    if (this.intersections.length) {
      const r = (this.pick(this.intersections, x, y, 5) as any).clone() as THREE.Object3D;
      r.position.set(-30, 0, 30);
      group.add(r);
    }

    this.prepShadows(group);
    return group;
  }

  /** Build the whole city. Call once after ingest(). */
  public build(): THREE.Group {
    while (this.root.children.length) this.root.remove(this.root.children[0]);

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = TILES[y][x];
        const node = this.buildTile(tile.kind, x, y);
        if (!node) continue;

        const { x: wx, z: wz } = tileToWorld(x, y);
        node.position.set(wx, 0, wz);
        if (tile.rot) node.rotation.y = tile.rot * (Math.PI / 2);

        (node as any).tileX = x;
        (node as any).tileY = y;
        (node as any).zoneId = tile.zoneId;
        node.name = node.name || `tile_${x}_${y}`;
        this.root.add(node);
      }
    }
    return this.root;
  }

  private buildTile(kind: TileKind, x: number, y: number): THREE.Object3D | null {
    // Full textured city block (block + textured roads + intersection)
    if (URBAN_KINDS.has(kind)) {
      const g = new THREE.Group();
      const block = this.resolveBaked(kind, x, y);
      if (block) { block.position.set(0, 0, 0); g.add(block); }
      g.add(this.buildRoadFrame(x, y));
      return g;
    }

    // Pure road tile → textured road frame only (no flat planes)
    if (kind === 'road') {
      const g = new THREE.Group();
      g.add(this.buildRoadFrame(x, y));
      return g;
    }

    // Natural / landmark tiles → procedural geometry from LandmarkFactory.
    // (ocean/beach/fields have no textured assets in the original bake.)
    return buildLandmarkTile(kind, x, y);
  }

  public extent() {
    return { width: GRID_W * TILE, depth: GRID_H * TILE };
  }
}
