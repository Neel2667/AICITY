/**
 * CityBuilder.ts — 24×24 Kenney-only city.
 *
 * DEFINITIVE ROAD ROTATION TABLE (proven by rotating actual vertex positions):
 *
 *   road-straight  default = runs N-S (along Z axis)
 *     N-S:  rotY = 0
 *     E-W:  rotY = PI/2
 *
 *   road-bend      default = opens W + S  (SW corner piece)
 *     S+W:  rotY = 0          S+E:  rotY = -PI/2
 *     N+W:  rotY = PI/2       N+E:  rotY = PI
 *
 *   road-intersection (T-junction)  default = closes NORTH, opens S+E+W
 *     missing N:  rotY = 0        missing W:  rotY = PI/2
 *     missing S:  rotY = PI       missing E:  rotY = -PI/2
 *
 *   road-end       default = opens EAST
 *     open E:  rotY = 0        open N:  rotY = PI/2
 *     open W:  rotY = PI       open S:  rotY = -PI/2
 *
 *   road-crossroad  symmetric → rotY = 0 always
 */
import * as THREE from 'three';
import {
  TILES, GRID_W, GRID_H, TILE,
  tileToWorld, isRoad, type TileKind,
} from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';
import { modelLibrary } from './ModelLibrary';

const GROUND_COLOR: Partial<Record<TileKind, number>> = {
  downtown: 0x6d7f8a, midtown: 0x7a8f9a,
  residential: 0x5a8a3a, village: 0x5a8a3a,
  industrial: 0x6b7265, park: 0x4e8028,
  road: 0x4a5055, marketSquare: 0xb8a882, townPlaza: 0xb0bec5,
};

const LANDMARK_KINDS = new Set<TileKind>([
  'ocean','beachSand','field','forest',
  'airportRunway','airportTerminal','trainTracks','trainStation',
  'marketSquare','townPlaza','promenade','construction',
]);

const CONSTRUCTION_LABELS: Record<string, string> = {
  airport: '✈️ SKYHAVEN AIRPORT', station: '🚂 CENTRAL STATION',
  university: '🎓 WESTFIELD UNIVERSITY', hospital: '🏥 CITY HOSPITAL',
  stadium: '🏟️ ARENA DISTRICT',
};

export class CityBuilder {
  public readonly root = new THREE.Group();
  constructor() { this.root.name = 'authoredCity'; }

  public async preload(): Promise<void> {
    if (!modelLibrary.loaded) await modelLibrary.preload();
  }

  private idx(x: number, y: number, salt = 0): number {
    return Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1 + salt * 13.7) * 10000));
  }

  private groundPlate(kind: TileKind): THREE.Mesh {
    const color = GROUND_COLOR[kind] ?? 0x5a8a3a;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = -0.05;
    m.receiveShadow = true;
    return m;
  }

  // ─── Road piece selection with CORRECT rotations ───────────────────────────
  private roadPiece(x: number, y: number): THREE.Object3D | null {
    const N = isRoad(x, y - 1);
    const S = isRoad(x, y + 1);
    const E = isRoad(x + 1, y);
    const W = isRoad(x - 1, y);
    const count = (N?1:0)+(S?1:0)+(E?1:0)+(W?1:0);

    let name = 'road-straight';
    let rotY = 0;

    if (count === 4) {
      // ── Full crossroad ── symmetric
      name = 'road-crossroad';
      rotY = 0;

    } else if (count === 3) {
      // ── T-junction ──  default closes NORTH (opens S+E+W)
      name = 'road-intersection';
      if      (!N) rotY = 0;            // missing N → default
      else if (!W) rotY = Math.PI / 2;  // missing W
      else if (!S) rotY = Math.PI;      // missing S
      else         rotY = -Math.PI / 2; // missing E

    } else if (count === 2 && ((N && S) || (E && W))) {
      // ── Straight through ──
      name = 'road-straight';
      rotY = (E && W) ? Math.PI / 2 : 0;

    } else if (count === 2) {
      // ── Corner/bend ──  default opens W + S  (SW corner)
      name = 'road-bend';
      if      (S && W) rotY = 0;            // SW → default
      else if (N && W) rotY = Math.PI / 2;  // NW
      else if (N && E) rotY = Math.PI;      // NE
      else             rotY = -Math.PI / 2; // SE  (S && E)

    } else if (count === 1) {
      // ── Dead-end ──  default opens EAST
      name = 'road-end';
      if      (E) rotY = 0;            // open E → default
      else if (N) rotY = Math.PI / 2;  // open N
      else if (W) rotY = Math.PI;      // open W
      else        rotY = -Math.PI / 2; // open S

    } else {
      // isolated tile — flat surface
      name = 'road-crossroad';
      rotY = 0;
    }

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
        (node as any).tileX = x; (node as any).tileY = y;
        (node as any).zoneId = tile.zoneId;
        node.name = node.name || `tile_${x}_${y}`;
        this.root.add(node);
      }
    }
    return this.root;
  }

  private buildTile(kind: TileKind, x: number, y: number, zoneId?: string): THREE.Object3D | null {
    if (LANDMARK_KINDS.has(kind)) {
      return buildLandmarkTile(kind, x, y, zoneId ? CONSTRUCTION_LABELS[zoneId] : undefined);
    }

    if (kind === 'road') {
      const g = new THREE.Group();
      g.add(this.groundPlate('road'));
      const r = this.roadPiece(x, y);
      if (r) g.add(r);
      return g;
    }

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
    const all = modelLibrary.names('commercial');
    const useSkyscraper = this.idx(x, y, 1) % 5 < 3;
    let name: string | null = null;
    if (useSkyscraper) {
      const ss = all.filter(n => n.startsWith('building-skyscraper'));
      name = ss.length ? ss[this.idx(x, y, 2) % ss.length] : null;
    }
    if (!name) {
      const bs = all.filter(n => n.startsWith('building-') && !n.startsWith('building-skyscraper') && !n.startsWith('low-detail'));
      name = bs.length ? bs[this.idx(x, y, 3) % bs.length] : null;
    }
    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) { model.rotation.y = (this.idx(x, y, 4) % 4) * (Math.PI / 2); g.add(model); }
    if (this.idx(x, y, 8) % 3 === 0) {
      const d = modelLibrary.get('commercial', 'detail-awning') ?? modelLibrary.get('commercial', 'detail-awning-wide');
      if (d) { d.position.z = 12; g.add(d); }
    }
  }

  private buildMidtown(g: THREE.Group, x: number, y: number): void {
    const all = modelLibrary.names('commercial');
    const useLow = this.idx(x, y, 10) % 3 === 0;
    let name: string | null = null;
    if (useLow) {
      const low = all.filter(n => n.startsWith('low-detail'));
      name = low.length ? low[this.idx(x, y, 11) % low.length] : null;
    }
    if (!name) {
      const reg = all.filter(n => n.startsWith('building-') && !n.startsWith('building-skyscraper') && !n.startsWith('low-detail'));
      name = reg.length ? reg[this.idx(x, y, 12) % reg.length] : null;
    }
    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) { model.rotation.y = (this.idx(x, y, 13) % 4) * (Math.PI / 2); g.add(model); }
    if (this.idx(x, y, 14) % 4 === 0) {
      const p = modelLibrary.get('commercial', 'detail-parasol-a') ?? modelLibrary.get('commercial', 'detail-parasol-b');
      if (p) { p.position.set(14, 0, 14); g.add(p); }
    }
  }

  private buildResidential(g: THREE.Group, x: number, y: number): void {
    const houses = modelLibrary.names('suburban').filter(n => n.startsWith('building-type'));
    const name = houses.length ? houses[this.idx(x, y, 20) % houses.length] : null;
    const house = name ? modelLibrary.get('suburban', name) : null;
    if (house) { house.rotation.y = (this.idx(x, y, 21) % 4) * (Math.PI / 2); g.add(house); }
    if (this.idx(x, y, 22) % 2 === 0) {
      const t = modelLibrary.get('suburban', this.idx(x, y, 23) % 2 ? 'tree-large' : 'tree-small');
      if (t) { t.position.set(18, 0, 18); g.add(t); }
    }
    if (this.idx(x, y, 24) % 3 === 0) {
      const fOpts = ['fence','fence-low','fence-1x2','fence-1x3'];
      const f = modelLibrary.get('suburban', fOpts[this.idx(x, y, 25) % fOpts.length]);
      if (f) { f.position.set(-20, 0, 0); f.rotation.y = Math.PI / 2; g.add(f); }
    }
    if (this.idx(x, y, 26) % 4 === 0) {
      const d = modelLibrary.get('suburban', this.idx(x, y, 27) % 2 ? 'driveway-short' : 'path-short');
      if (d) { d.position.set(0, 0.02, 22); g.add(d); }
    }
  }

  private buildVillage(g: THREE.Group, x: number, y: number): void {
    const houses = modelLibrary.names('suburban').filter(n => n.startsWith('building-type'));
    const pool = houses.slice(0, 8).length ? houses.slice(0, 8) : houses;
    const name = pool.length ? pool[this.idx(x, y, 30) % pool.length] : null;
    const house = name ? modelLibrary.get('suburban', name) : null;
    if (house) { house.rotation.y = (this.idx(x, y, 31) % 4) * (Math.PI / 2); g.add(house); }
    for (let i = 0; i < 1 + (this.idx(x, y, 32) % 2); i++) {
      const t = modelLibrary.get('suburban', i % 2 ? 'tree-large' : 'tree-small');
      if (t) {
        t.position.set((this.idx(x, y, 33 + i) % 28) - 14, 0, (this.idx(x, y, 40 + i) % 28) - 14);
        g.add(t);
      }
    }
  }

  private buildIndustrial(g: THREE.Group, x: number, y: number): void {
    const buildings = modelLibrary.names('industrial').filter(n => n.startsWith('building-'));
    const name = buildings.length ? buildings[this.idx(x, y, 50) % buildings.length] : null;
    const b = name ? modelLibrary.get('industrial', name) : null;
    if (b) { b.rotation.y = (this.idx(x, y, 51) % 4) * (Math.PI / 2); g.add(b); }
    if (this.idx(x, y, 52) % 3 === 0) {
      const cnames = ['chimney-small','chimney-basic','chimney-medium','chimney-large'];
      const c = modelLibrary.get('industrial', cnames[this.idx(x, y, 53) % cnames.length]);
      if (c) { c.position.set((this.idx(x, y, 54) % 14) - 7, 0, (this.idx(x, y, 55) % 14) - 7); g.add(c); }
    }
    if (this.idx(x, y, 56) % 5 === 0) {
      const t = modelLibrary.get('industrial', 'detail-tank');
      if (t) { t.position.set(16, 0, -16); g.add(t); }
    }
  }

  private buildPark(g: THREE.Group, x: number, y: number): void {
    const positions: [number, number][] = [[-18,-18],[18,-18],[-18,18],[18,18],[0,-20],[0,20],[-20,0],[20,0]];
    for (let i = 0; i < 2 + (this.idx(x, y, 60) % 3); i++) {
      const pos = positions[i % positions.length];
      const t = modelLibrary.get('suburban', this.idx(x, y, 61 + i) % 3 !== 0 ? 'tree-large' : 'tree-small');
      if (t) { t.position.set(pos[0], 0, pos[1]); t.rotation.y = (this.idx(x, y, 62 + i) % 8) * (Math.PI / 4); g.add(t); }
    }
    if (this.idx(x, y, 65) % 3 === 0) {
      const p = modelLibrary.get('suburban', 'planter');
      if (p) { p.position.set(0, 0.02, 0); g.add(p); }
    }
    if (this.idx(x, y, 66) % 2 === 0) {
      const pOpts = ['path-stones-long', 'path-long', 'path-short'];
      const path = modelLibrary.get('suburban', pOpts[this.idx(x, y, 67) % pOpts.length]);
      if (path) { path.position.set(0, 0.02, 0); path.rotation.y = (this.idx(x, y, 68) % 2) * (Math.PI / 2); g.add(path); }
    }
  }

  public extent() { return { width: GRID_W * TILE, depth: GRID_H * TILE }; }
}
