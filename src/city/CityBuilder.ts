/**
 * CityBuilder.ts — builds the FINITE 24×24 authored city entirely from
 * Kenney CC0 models. Every tile is a Kenney piece — no procedural boxes.
 *
 * ROAD ORIENTATION (critical fix):
 *   Kenney road-straight runs along the Z axis (road goes North-South).
 *   To make it run East-West, rotate Y by Math.PI/2.
 *   All other road pieces follow the same convention.
 *
 * ROAD SCALE:
 *   Kenney roads are 1×1 unit. ROAD_SCALE = TILE = 60.
 *   Kenney curves are 2×2 unit. CURVE_SCALE = TILE/2 = 30.
 *
 * BUILDING SCALE:
 *   Buildings ~1.5u wide → BLDG_SCALE = TILE*0.46 ≈ 28 → ~42u = 70% of tile.
 */
import * as THREE from 'three';
import {
  TILES, GRID_W, GRID_H, TILE,
  tileToWorld, isRoad,
  type TileKind,
} from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';
import { modelLibrary } from './ModelLibrary';

// Ground colour per tile kind (flat plate visible at tile edges/gaps)
const GROUND_COLOR: Partial<Record<TileKind, number>> = {
  downtown:    0x6d7f8a,
  midtown:     0x7a8f9a,
  residential: 0x5a8a3a,
  village:     0x5a8a3a,
  industrial:  0x6b7265,
  park:        0x4e8028,
  road:        0x4a5055,
  marketSquare:0xb8a882,
  townPlaza:   0xb0bec5,
};

// Tile kinds handled by LandmarkFactory (natural + special procedural)
const LANDMARK_KINDS = new Set<TileKind>([
  'ocean','beachSand','field','forest',
  'airportRunway','airportTerminal',
  'trainTracks','trainStation',
  'marketSquare','townPlaza',
  'promenade','construction',
]);

const CONSTRUCTION_LABELS: Record<string, string> = {
  airport:    '✈️ SKYHAVEN AIRPORT',
  station:    '🚂 CENTRAL STATION',
  university: '🎓 WESTFIELD UNIVERSITY',
  hospital:   '🏥 CITY HOSPITAL',
  stadium:    '🏟️ ARENA DISTRICT',
};

export class CityBuilder {
  public readonly root = new THREE.Group();

  constructor() { this.root.name = 'authoredCity'; }

  public async preload(): Promise<void> {
    if (!modelLibrary.loaded) await modelLibrary.preload();
  }

  // Deterministic index from tile coordinates + salt
  private idx(x: number, y: number, salt = 0): number {
    return Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1 + salt * 13.7) * 10000));
  }

  // ─── Ground plate ──────────────────────────────────────────────────────────
  private groundPlate(kind: TileKind): THREE.Mesh {
    const color = GROUND_COLOR[kind] ?? 0x5a8a3a;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y  = -0.05;
    m.receiveShadow = true;
    return m;
  }

  // ─── Road piece with correct orientation ───────────────────────────────────
  /**
   * Pick the right Kenney road piece and rotate it correctly.
   *
   * Kenney road-straight runs N-S (along +Z).
   * Convention used here:
   *   rotY = 0           → road runs N-S (Z axis)
   *   rotY = Math.PI/2   → road runs E-W (X axis)
   *
   * All curve/bend/intersection rotations follow the same convention
   * (the model opens toward +Z / +X by default).
   */
  private roadPiece(x: number, y: number): THREE.Object3D | null {
    const N = isRoad(x, y - 1);
    const S = isRoad(x, y + 1);
    const E = isRoad(x + 1, y);
    const W = isRoad(x - 1, y);
    const count = (N?1:0)+(S?1:0)+(E?1:0)+(W?1:0);

    let name = 'road-straight';
    let rotY  = 0;

    if (count === 0 || count === 1) {
      // Dead-end or isolated
      name = 'road-end';
      if (N)       rotY = Math.PI;       // open toward S
      else if (S)  rotY = 0;             // open toward N
      else if (E)  rotY = -Math.PI / 2;  // open toward W
      else         rotY =  Math.PI / 2;  // open toward E (or isolated)

    } else if (count === 2) {
      if (N && S) { name = 'road-straight'; rotY = 0;              }  // N-S straight
      else if (E && W) { name = 'road-straight'; rotY = Math.PI/2; }  // E-W straight
      // Curves (Kenney road-curve: open corner facing SE by default)
      else if (S && E) { name = 'road-bend'; rotY = 0;              }  // SE corner
      else if (S && W) { name = 'road-bend'; rotY = Math.PI/2;      }  // SW corner
      else if (N && W) { name = 'road-bend'; rotY = Math.PI;        }  // NW corner
      else             { name = 'road-bend'; rotY = -Math.PI/2;     }  // NE corner

    } else if (count === 3) {
      // T-intersection (road-intersection: missing one direction)
      name = 'road-intersection';
      if (!N)      rotY = 0;             // T opens N-E-W (missing N → bottom of T)
      else if (!S) rotY = Math.PI;       // missing S
      else if (!E) rotY = Math.PI/2;     // missing E
      else         rotY = -Math.PI/2;    // missing W

    } else {
      // Full crossroad
      name = 'road-crossroad';
      rotY = 0;
    }

    // Try exact model, fall back gracefully
    let obj = modelLibrary.get('roads', name);
    if (!obj) {
      for (const fb of ['road-straight','road-crossroad','road-bend','road-end']) {
        obj = modelLibrary.get('roads', fb);
        if (obj) break;
      }
    }
    if (obj) obj.rotation.y = rotY;
    return obj;
  }

  // ─── Main build ────────────────────────────────────────────────────────────
  public build(): THREE.Group {
    while (this.root.children.length) this.root.remove(this.root.children[0]);

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile  = TILES[y][x];
        const node  = this.buildTile(tile.kind, x, y, tile.zoneId);
        if (!node) continue;
        const { x: wx, z: wz } = tileToWorld(x, y);
        node.position.set(wx, 0, wz);
        (node as any).tileX  = x;
        (node as any).tileY  = y;
        (node as any).zoneId = tile.zoneId;
        node.name = node.name || `tile_${x}_${y}`;
        this.root.add(node);
      }
    }
    return this.root;
  }

  private buildTile(kind: TileKind, x: number, y: number, zoneId?: string): THREE.Object3D | null {
    // Landmark / natural / construction → procedural geometry
    if (LANDMARK_KINDS.has(kind)) {
      const label = zoneId ? CONSTRUCTION_LABELS[zoneId] : undefined;
      return buildLandmarkTile(kind, x, y, label);
    }

    // Road tile
    if (kind === 'road') {
      const g = new THREE.Group();
      g.add(this.groundPlate('road'));
      const r = this.roadPiece(x, y);
      if (r) g.add(r);
      return g;
    }

    // Urban building tiles
    const g = new THREE.Group();
    g.add(this.groundPlate(kind));

    switch (kind) {
      case 'downtown':    this.buildDowntown(g, x, y);    break;
      case 'midtown':     this.buildMidtown(g, x, y);     break;
      case 'residential': this.buildResidential(g, x, y); break;
      case 'village':     this.buildVillage(g, x, y);     break;
      case 'industrial':  this.buildIndustrial(g, x, y);  break;
      case 'park':        this.buildPark(g, x, y);        break;
    }
    return g;
  }

  // ─── District builders ─────────────────────────────────────────────────────

  private buildDowntown(g: THREE.Group, x: number, y: number): void {
    // 60% skyscrapers, 40% regular commercial
    const useSkyscraper = this.idx(x, y, 1) % 5 < 3;
    const allNames = modelLibrary.names('commercial');

    let name: string | null = null;
    if (useSkyscraper) {
      const ss = allNames.filter(n => n.startsWith('building-skyscraper'));
      name = ss.length ? ss[this.idx(x, y, 2) % ss.length] : null;
    }
    if (!name) {
      const bs = allNames.filter(n =>
        n.startsWith('building-') &&
        !n.startsWith('building-skyscraper') &&
        !n.startsWith('low-detail')
      );
      name = bs.length ? bs[this.idx(x, y, 3) % bs.length] : null;
    }

    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) {
      model.rotation.y = (this.idx(x, y, 4) % 4) * (Math.PI / 2);
      g.add(model);
    }

    // Street-level detail: awning on some tiles
    if (this.idx(x, y, 8) % 3 === 0) {
      const detail = modelLibrary.get('commercial', 'detail-awning')
                  ?? modelLibrary.get('commercial', 'detail-awning-wide');
      if (detail) {
        detail.position.z = 12;
        detail.rotation.y = (this.idx(x, y, 9) % 4) * (Math.PI / 2);
        g.add(detail);
      }
    }
  }

  private buildMidtown(g: THREE.Group, x: number, y: number): void {
    // Regular commercial + some low-detail buildings for variety
    const allNames = modelLibrary.names('commercial');
    const useRegular = this.idx(x, y, 10) % 3 !== 0;
    let name: string | null = null;

    if (useRegular) {
      const regular = allNames.filter(n =>
        n.startsWith('building-') &&
        !n.startsWith('building-skyscraper') &&
        !n.startsWith('low-detail')
      );
      name = regular.length ? regular[this.idx(x, y, 11) % regular.length] : null;
    } else {
      const low = allNames.filter(n => n.startsWith('low-detail'));
      name = low.length ? low[this.idx(x, y, 12) % low.length] : null;
    }

    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) {
      model.rotation.y = (this.idx(x, y, 13) % 4) * (Math.PI / 2);
      g.add(model);
    }

    // Cafe parasol outside on some tiles
    if (this.idx(x, y, 14) % 4 === 0) {
      const p = modelLibrary.get('commercial', 'detail-parasol-a')
             ?? modelLibrary.get('commercial', 'detail-parasol-b');
      if (p) {
        p.position.set(14, 0, 14);
        p.rotation.y = (this.idx(x, y, 15) % 4) * (Math.PI / 2);
        g.add(p);
      }
    }
  }

  private buildResidential(g: THREE.Group, x: number, y: number): void {
    // Kenney suburban houses
    const houses = modelLibrary.names('suburban').filter(n => n.startsWith('building-type'));
    const name   = houses.length ? houses[this.idx(x, y, 20) % houses.length] : null;
    const house  = name ? modelLibrary.get('suburban', name) : null;
    if (house) {
      house.rotation.y = (this.idx(x, y, 21) % 4) * (Math.PI / 2);
      g.add(house);
    }

    // Yard tree (50% chance)
    if (this.idx(x, y, 22) % 2 === 0) {
      const tName = this.idx(x, y, 23) % 2 ? 'tree-large' : 'tree-small';
      const t = modelLibrary.get('suburban', tName);
      if (t) { t.position.set(18, 0, 18); g.add(t); }
    }

    // Fence (33% chance)
    if (this.idx(x, y, 24) % 3 === 0) {
      const fName = ['fence','fence-low','fence-1x2','fence-1x3'][this.idx(x,y,25) % 4];
      const f = modelLibrary.get('suburban', fName);
      if (f) { f.position.set(-20, 0, 0); f.rotation.y = Math.PI/2; g.add(f); }
    }

    // Driveway or path (25% chance)
    if (this.idx(x, y, 26) % 4 === 0) {
      const dName = this.idx(x,y,27) % 2 ? 'driveway-short' : 'path-short';
      const d = modelLibrary.get('suburban', dName);
      if (d) { d.position.set(0, 0.02, 22); g.add(d); }
    }
  }

  private buildVillage(g: THREE.Group, x: number, y: number): void {
    // Smaller suburban houses, more trees, more greenery
    const houses = modelLibrary.names('suburban').filter(n => n.startsWith('building-type'));
    // Prefer smaller types (a, b, c, e, g ...)
    const small  = houses.filter((_n, i) => i < 8);
    const pool   = small.length ? small : houses;
    const name   = pool.length ? pool[this.idx(x, y, 30) % pool.length] : null;
    const house  = name ? modelLibrary.get('suburban', name) : null;
    if (house) {
      house.rotation.y = (this.idx(x, y, 31) % 4) * (Math.PI / 2);
      g.add(house);
    }

    // More trees in village
    const tCount = 1 + (this.idx(x, y, 32) % 2);
    for (let i = 0; i < tCount; i++) {
      const t = modelLibrary.get('suburban', i % 2 ? 'tree-large' : 'tree-small');
      if (t) {
        t.position.set(
          (this.idx(x, y, 33+i) % 28) - 14,
          0,
          (this.idx(x, y, 40+i) % 28) - 14,
        );
        g.add(t);
      }
    }
  }

  private buildIndustrial(g: THREE.Group, x: number, y: number): void {
    const buildings = modelLibrary.names('industrial').filter(n => n.startsWith('building-'));
    const name      = buildings.length ? buildings[this.idx(x, y, 50) % buildings.length] : null;
    const building  = name ? modelLibrary.get('industrial', name) : null;
    if (building) {
      building.rotation.y = (this.idx(x, y, 51) % 4) * (Math.PI / 2);
      g.add(building);
    }

    // Chimney on some tiles (industrial skyline)
    if (this.idx(x, y, 52) % 3 === 0) {
      const chimneyNames = ['chimney-small','chimney-basic','chimney-medium','chimney-large'];
      const cn = chimneyNames[this.idx(x, y, 53) % chimneyNames.length];
      const chimney = modelLibrary.get('industrial', cn);
      if (chimney) {
        chimney.position.set(
          (this.idx(x, y, 54) % 14) - 7,
          0,
          (this.idx(x, y, 55) % 14) - 7,
        );
        g.add(chimney);
      }
    }

    // Tank detail
    if (this.idx(x, y, 56) % 5 === 0) {
      const tank = modelLibrary.get('industrial', 'detail-tank');
      if (tank) { tank.position.set(16, 0, -16); g.add(tank); }
    }
  }

  private buildPark(g: THREE.Group, x: number, y: number): void {
    // Pure Kenney trees + planters + paths — NO building
    const treeCount = 2 + (this.idx(x, y, 60) % 3);
    const positions: Array<[number, number]> = [
      [-18, -18], [18, -18], [-18, 18], [18, 18], [0, -20], [0, 20], [-20, 0], [20, 0],
    ];

    for (let i = 0; i < treeCount; i++) {
      const pos   = positions[i % positions.length];
      const tName = this.idx(x, y, 61+i) % 3 !== 0 ? 'tree-large' : 'tree-small';
      const t     = modelLibrary.get('suburban', tName);
      if (t) {
        t.position.set(pos[0], 0, pos[1]);
        t.rotation.y = (this.idx(x, y, 62+i) % 8) * (Math.PI / 4);
        g.add(t);
      }
    }

    // Planter (33%)
    if (this.idx(x, y, 65) % 3 === 0) {
      const p = modelLibrary.get('suburban', 'planter');
      if (p) { p.position.set(0, 0.02, 0); g.add(p); }
    }

    // Stone path (50%)
    if (this.idx(x, y, 66) % 2 === 0) {
      const pName = this.idx(x,y,67) % 2
        ? 'path-stones-long'
        : 'path-long';
      const path  = modelLibrary.get('suburban', pName)
                 ?? modelLibrary.get('suburban', 'path-long');
      if (path) {
        path.position.set(0, 0.02, 0);
        path.rotation.y = (this.idx(x, y, 68) % 2) * (Math.PI / 2);
        g.add(path);
      }
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────────
  public extent(): { width: number; depth: number } {
    return { width: GRID_W * TILE, depth: GRID_H * TILE };
  }
}
