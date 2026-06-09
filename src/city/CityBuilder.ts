/**
 * CityBuilder.ts
 * ----------------------------------------------------------------------------
 * Builds the FINITE authored city ONCE from real CC0 Kenney City Kit models
 * (loaded via ModelLibrary), placed deterministically on the CityDesign grid.
 *
 * Every tile is a flat ground plate + a real glTF model on top:
 *   road tiles      → Kenney road pieces (straight / intersection)
 *   downtown/midtown→ Kenney commercial buildings + skyscrapers
 *   residential/vil → Kenney suburban houses (+ trees/fences)
 *   industrial      → Kenney industrial buildings + chimneys
 *   park            → grass + suburban trees
 *   natural/landmark→ LandmarkFactory (ocean, beach, fields, airport, station,
 *                     market, plaza, promenade) — bespoke low-poly geometry.
 */
import * as THREE from 'three';
import { TILES, GRID_W, GRID_H, TILE, tileToWorld, isRoad, type TileKind } from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';
import { modelLibrary, type ModelGroup } from './ModelLibrary';

// Ground colours per kind (a clean plate under each model).
const GROUND: Partial<Record<TileKind, number>> = {
  downtown: 0x8d9aa5, midtown: 0x95a0a8, residential: 0x9ccc65, village: 0x9ccc65,
  industrial: 0x9aa0a3, park: 0x7cb342, road: 0x6b7178,
};

export class CityBuilder {
  public readonly root = new THREE.Group();

  constructor() {
    this.root.name = 'authoredCity';
  }

  /** Ensure models are loaded. */
  public async preload(): Promise<void> {
    if (!modelLibrary.loaded) await modelLibrary.preload();
  }

  // deterministic index from tile coords
  private idx(x: number, y: number, salt = 0): number {
    return Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1 + salt * 13.7) * 10000));
  }

  private pickName(group: ModelGroup, x: number, y: number, salt = 0): string | null {
    const names = modelLibrary.names(group);
    if (!names.length) return null;
    return names[this.idx(x, y, salt) % names.length];
  }

  private groundPlate(kind: TileKind): THREE.Mesh {
    const color = GROUND[kind] ?? 0x9ccc65;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = -0.02;
    m.receiveShadow = true;
    return m;
  }

  /** Pick a road piece + rotation that matches neighbouring roads. */
  private roadPiece(x: number, y: number): THREE.Object3D | null {
    const n = isRoad(x, y - 1), s = isRoad(x, y + 1);
    const e = isRoad(x + 1, y), w = isRoad(x - 1, y);
    const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

    let name = 'road-straight';
    let rotY = 0; // straight runs along Z by default; rotate to run along X
    if (count >= 3) {
      name = 'road-intersection';
    } else if (count === 2 && ((n && s) || (e && w))) {
      name = 'road-straight';
      rotY = (e && w) ? Math.PI / 2 : 0;
    } else if (count === 2) {
      name = 'road-curve';
      // orient curve toward the two open sides
      if (s && e) rotY = 0;
      else if (s && w) rotY = Math.PI / 2;
      else if (n && w) rotY = Math.PI;
      else rotY = -Math.PI / 2;
    } else {
      name = 'road-straight';
      rotY = (e || w) ? Math.PI / 2 : 0;
    }

    const obj = modelLibrary.get('roads', name) ?? modelLibrary.get('roads', 'road-straight');
    if (obj) obj.rotation.y = rotY;
    return obj;
  }

  public build(): THREE.Group {
    while (this.root.children.length) this.root.remove(this.root.children[0]);

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = TILES[y][x];
        const node = this.buildTile(tile.kind, x, y);
        if (!node) continue;
        const { x: wx, z: wz } = tileToWorld(x, y);
        node.position.set(wx, 0, wz);
        (node as any).tileX = x; (node as any).tileY = y; (node as any).zoneId = tile.zoneId;
        node.name = node.name || `tile_${x}_${y}`;
        this.root.add(node);
      }
    }
    return this.root;
  }

  private buildTile(kind: TileKind, x: number, y: number): THREE.Object3D | null {
    // Bespoke natural / landmark tiles use LandmarkFactory geometry.
    const bespoke = buildLandmarkTile(kind, x, y);
    const bespokeKinds: TileKind[] = [
      'ocean','beachSand','field','forest','airportRunway','airportTerminal',
      'trainTracks','trainStation','marketSquare','townPlaza','promenade',
    ];
    if (bespokeKinds.includes(kind) && bespoke) return bespoke;

    const g = new THREE.Group();
    g.add(this.groundPlate(kind));

    if (kind === 'road') {
      const r = this.roadPiece(x, y);
      if (r) g.add(r);
      return g;
    }

    // Building tiles: place a glTF model centred on the tile.
    let group: ModelGroup | null = null;
    if (kind === 'downtown' || kind === 'midtown') group = 'commercial';
    else if (kind === 'residential' || kind === 'village') group = 'suburban';
    else if (kind === 'industrial') group = 'industrial';
    else if (kind === 'park') group = 'suburban'; // trees

    if (group) {
      if (kind === 'park') {
        // a couple of trees rather than a building
        for (let i = 0; i < 3; i++) {
          const t = modelLibrary.get('suburban', i % 2 ? 'tree-large' : 'tree-small');
          if (t) {
            t.position.set((this.idx(x, y, i) % 30) - 15, 0, (this.idx(x, y, i + 7) % 30) - 15);
            t.rotation.y = (this.idx(x, y, i + 3) % 360) * Math.PI / 180;
            g.add(t);
          }
        }
      } else {
        const name = (kind === 'downtown' && this.idx(x, y, 9) % 2 === 0)
          ? (this.pickName('commercial', x, y, 5)?.startsWith('building-skyscraper')
              ? this.pickName('commercial', x, y, 5)!
              : `building-skyscraper-${'abcde'[this.idx(x, y, 2) % 5]}`)
          : this.pickName(group, x, y);
        const model = name ? modelLibrary.get(group, name) : null;
        if (model) {
          model.rotation.y = (this.idx(x, y, 4) % 4) * (Math.PI / 2);
          g.add(model);
        }
      }
    }
    return g;
  }

  public extent() {
    return { width: GRID_W * TILE, depth: GRID_H * TILE };
  }
}
