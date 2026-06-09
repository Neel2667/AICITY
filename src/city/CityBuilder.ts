/**
 * CityBuilder.ts
 * ----------------------------------------------------------------------------
 * Builds the entire FINITE city ONCE as static geometry from the authored
 * CityDesign map. This replaces the old infinite procedural treadmill
 * (CityChunkTbl + gridCoords + refreshChunkScene + SceneMoveController).
 *
 * - Urban tiles (downtown/midtown/residential/village/industrial/park) reuse
 *   the baked InfiniTown blocks passed in from the loaded main.json.
 * - Bespoke tiles (airport, station, market, plaza, promenade, ocean, beach,
 *   field, forest, road) are built procedurally by LandmarkFactory.
 *
 * Result: one THREE.Group containing the whole city at fixed world positions,
 * with edges (ocean/fields) — a real place you can tour, not an endless loop.
 */
import * as THREE from 'three';
import { TILES, GRID_W, GRID_H, TILE, tileToWorld, type TileKind } from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';

// Urban tile kind → which baked block names are acceptable (first match wins).
// Baked pool: block_1_merged .. block_11_merged, park_2_merged, park_3_merged.
const URBAN_BLOCKS: Record<string, string[]> = {
  // tall / dense
  downtown:    ['block_1_merged', 'block_2_merged', 'block_3_merged'],
  midtown:     ['block_7_merged', 'block_9_merged', 'block_3_merged'],
  residential: ['block_4_merged', 'block_5_merged', 'block_6_merged'],
  village:     ['block_4_merged', 'block_6_merged', 'block_5_merged'],
  industrial:  ['block_11_merged', 'block_10_merged'],
  park:        ['park_2_merged', 'park_3_merged'],
};

export class CityBuilder {
  /** name → list of baked block prototypes (from main.json "blocks" group). */
  private pool = new Map<string, THREE.Object3D[]>();
  public readonly root = new THREE.Group();

  constructor() {
    this.root.name = 'authoredCity';
  }

  /** Ingest the baked block prototypes once after asset load. */
  public ingest(arrBlocks: any[]): void {
    this.pool.clear();
    for (const b of arrBlocks) {
      const n: string = (b.name as string) || '';
      if (!this.pool.has(n)) this.pool.set(n, []);
      this.pool.get(n)!.push(b);
    }
  }

  private resolveBaked(kind: string, x: number, y: number): THREE.Object3D | null {
    const wants = URBAN_BLOCKS[kind] ?? [];
    // deterministic pick so the same tile always looks the same
    const pick = Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1) * 1000));
    for (let off = 0; off < wants.length; off++) {
      const want = wants[(pick + off) % wants.length];
      for (const [name, arr] of this.pool.entries()) {
        if (name.includes(want) && arr.length) {
          const clone = arr[0].clone();
          this.prepShadows(clone);
          return clone;
        }
      }
    }
    // fallback: any block
    for (const [, arr] of this.pool.entries()) {
      if (arr.length) { const c = arr[0].clone(); this.prepShadows(c); return c; }
    }
    return null;
  }

  private prepShadows(obj: THREE.Object3D): void {
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const m: any = o.material;
        if (m && m.defines) m.defines.USE_FOG = true;
      }
    });
  }

  /** Build the whole city. Call once after ingest(). */
  public build(): THREE.Group {
    // clear any prior build
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
    // bespoke landmark / natural tile?
    const bespoke = buildLandmarkTile(kind, x, y);
    if (bespoke) {
      // give urban-adjacent landmark tiles a grass base so they sit nicely
      return bespoke;
    }
    // urban tile → baked block on a grass+road-edge base
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color: 0x9ccc65, roughness: 1 }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.03;
    base.receiveShadow = true;
    g.add(base);

    const block = this.resolveBaked(kind, x, y);
    if (block) {
      block.position.set(0, 0, 0);
      g.add(block);
    }
    return g;
  }

  /** World-space ground extent of the whole map (for camera clamping). */
  public extent() {
    return {
      width:  GRID_W * TILE,
      depth:  GRID_H * TILE,
    };
  }
}
