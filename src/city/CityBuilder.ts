/**
 * CityBuilder.ts — builds the FINITE 24×24 authored city from Kenney CC0 models.
 */
import * as THREE from 'three';
import {
  TILES, GRID_W, GRID_H, TILE,
  tileToWorld, isRoad,
  type TileKind,
} from './CityDesign';
import { buildLandmarkTile } from './LandmarkFactory';
import { modelLibrary } from './ModelLibrary';

const GROUND: Partial<Record<TileKind, number>> = {
  downtown:    0x78909c,  midtown:     0x90a4ae,
  residential: 0x9ccc65, village:     0x9ccc65,
  industrial:  0x8d9b8c, park:        0x7cb342,
  road:        0x6b7178, marketSquare:0xd7c4a1,
  townPlaza:   0xcfd8dc,
};

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

  private idx(x: number, y: number, salt = 0): number {
    return Math.abs(Math.floor(Math.sin(x * 49.3 + y * 97.1 + salt * 13.7) * 10000));
  }

  private groundPlate(kind: TileKind): THREE.Mesh {
    const color = GROUND[kind] ?? 0x9ccc65;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.rotation.x = -Math.PI / 2; m.position.y = -0.02; m.receiveShadow = true;
    return m;
  }

  private roadPiece(x: number, y: number): THREE.Object3D | null {
    const n = isRoad(x, y - 1), s = isRoad(x, y + 1);
    const e = isRoad(x + 1, y), w = isRoad(x - 1, y);
    const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

    let name = 'road-straight';
    let rotY = 0;

    if (count >= 4) {
      name = 'road-crossroad';
    } else if (count === 3) {
      name = 'road-intersection';
      if (!n) rotY = Math.PI;
      else if (!s) rotY = 0;
      else if (!e) rotY = Math.PI / 2;
      else rotY = -Math.PI / 2;
    } else if (count === 2) {
      if ((n && s) || (e && w)) {
        name = 'road-straight';
        rotY = (e && w) ? Math.PI / 2 : 0;
      } else {
        name = 'road-curve';
        if (n && e) rotY = Math.PI / 2;
        else if (n && w) rotY = Math.PI;
        else if (s && e) rotY = 0;
        else rotY = -Math.PI / 2;
      }
    } else {
      name = 'road-end';
      if (n) rotY = Math.PI; else if (e) rotY = Math.PI / 2;
      else if (w) rotY = -Math.PI / 2; else rotY = 0;
    }

    let obj = modelLibrary.get('roads', name);
    if (!obj) {
      for (const fb of ['road-straight', 'road-crossroad', 'road-curve']) {
        obj = modelLibrary.get('roads', fb);
        if (obj) break;
      }
    }
    if (obj) obj.rotation.y = rotY;
    return obj;
  }

  public build(): THREE.Group {
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = TILES[y][x];
        const node = this.buildTile(tile.kind, x, y, tile.zoneId);
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

  private buildTile(kind: TileKind, x: number, y: number, zoneId?: string): THREE.Object3D | null {
    const bespokeKinds: TileKind[] = [
      'ocean','beachSand','field','forest',
      'airportRunway','airportTerminal',
      'trainTracks','trainStation',
      'marketSquare','townPlaza',
      'promenade','construction',
    ];
    if (bespokeKinds.includes(kind)) {
      const label = zoneId ? CONSTRUCTION_LABELS[zoneId] : undefined;
      return buildLandmarkTile(kind, x, y, label);
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

    if (kind === 'park')        { this.buildPark(g, x, y); return g; }
    if (kind === 'downtown')    { this.buildDowntown(g, x, y); return g; }
    if (kind === 'midtown')     { this.buildMidtown(g, x, y); return g; }
    if (kind === 'residential' || kind === 'village') { this.buildResidential(g, x, y); return g; }
    if (kind === 'industrial')  { this.buildIndustrial(g, x, y); return g; }

    return g;
  }

  private buildDowntown(g: THREE.Group, x: number, y: number): void {
    const useSkyscraper = this.idx(x, y, 1) % 3 !== 0;
    let name: string | null = null;
    if (useSkyscraper) {
      const ss = modelLibrary.names('commercial').filter(n => n.startsWith('building-skyscraper'));
      name = ss.length ? ss[this.idx(x, y, 2) % ss.length] : null;
    }
    if (!name) {
      const bs = modelLibrary.names('commercial').filter(n => n.startsWith('building-') && !n.startsWith('building-skyscraper') && !n.startsWith('low-detail'));
      name = bs.length ? bs[this.idx(x, y, 3) % bs.length] : null;
    }
    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) { model.rotation.y = (this.idx(x, y, 4) % 4) * (Math.PI / 2); g.add(model); }
    if (this.idx(x, y, 8) % 4 === 0) {
      const awn = modelLibrary.get('commercial', 'detail-awning');
      if (awn) { awn.position.set(0, 0, 10); g.add(awn); }
    }
  }

  private buildMidtown(g: THREE.Group, x: number, y: number): void {
    const allComm = modelLibrary.names('commercial').filter(n => !n.startsWith('building-skyscraper'));
    const name = allComm.length ? allComm[this.idx(x, y, 5) % allComm.length] : null;
    const model = name ? modelLibrary.get('commercial', name) : null;
    if (model) { model.rotation.y = (this.idx(x, y, 6) % 4) * (Math.PI / 2); g.add(model); }
    if (this.idx(x, y, 9) % 5 === 0) {
      const p = modelLibrary.get('commercial', 'detail-parasol-a') ?? modelLibrary.get('commercial', 'detail-parasol-b');
      if (p) { p.position.set(12, 0, 12); g.add(p); }
    }
  }

  private buildResidential(g: THREE.Group, x: number, y: number): void {
    const houses = modelLibrary.names('suburban').filter(n => n.startsWith('building-type'));
    const hName = houses.length ? houses[this.idx(x, y, 10) % houses.length] : null;
    const house = hName ? modelLibrary.get('suburban', hName) : null;
    if (house) { house.rotation.y = (this.idx(x, y, 11) % 4) * (Math.PI / 2); g.add(house); }
    if (this.idx(x, y, 12) % 2 === 0) {
      const tName = this.idx(x, y, 13) % 2 ? 'tree-large' : 'tree-small';
      const t = modelLibrary.get('suburban', tName);
      if (t) { t.position.set(16, 0, 16); g.add(t); }
    }
    if (this.idx(x, y, 14) % 3 === 0) {
      const f = modelLibrary.get('suburban', 'fence');
      if (f) { f.position.set(-18, 0, 0); g.add(f); }
    }
    if (this.idx(x, y, 15) % 4 === 0) {
      const d = modelLibrary.get('suburban', 'driveway-short') ?? modelLibrary.get('suburban', 'path-short');
      if (d) { d.position.set(0, 0.05, 18); g.add(d); }
    }
  }

  private buildIndustrial(g: THREE.Group, x: number, y: number): void {
    const buildings = modelLibrary.names('industrial').filter(n => n.startsWith('building-'));
    const bName = buildings.length ? buildings[this.idx(x, y, 20) % buildings.length] : null;
    const building = bName ? modelLibrary.get('industrial', bName) : null;
    if (building) { building.rotation.y = (this.idx(x, y, 21) % 4) * (Math.PI / 2); g.add(building); }
    if (this.idx(x, y, 22) % 5 === 0) {
      const t = modelLibrary.get('modular', 'building-sample-tower-a') ?? modelLibrary.get('modular', 'building-sample-tower-b');
      if (t) { t.position.set(-10, 0, -10); t.rotation.y = Math.PI / 4; g.add(t); }
    }
  }

  private buildPark(g: THREE.Group, x: number, y: number): void {
    const treeCount = 2 + (this.idx(x, y, 30) % 3);
    const positions: Array<[number, number]> = [[-16,-16],[16,-16],[-16,16],[16,16],[0,-14],[0,14]];
    for (let i = 0; i < treeCount; i++) {
      const pos = positions[i % positions.length];
      const tName = this.idx(x, y, 31 + i) % 3 !== 0 ? 'tree-large' : 'tree-small';
      const t = modelLibrary.get('suburban', tName);
      if (t) { t.position.set(pos[0], 0, pos[1]); t.rotation.y = (this.idx(x, y, 32 + i) % 8) * (Math.PI / 4); g.add(t); }
    }
    if (this.idx(x, y, 35) % 3 === 0) {
      const p = modelLibrary.get('suburban', 'planter');
      if (p) g.add(p);
    }
    if (this.idx(x, y, 36) % 2 === 0) {
      const path = modelLibrary.get('suburban', 'path-long') ?? modelLibrary.get('suburban', 'path-short');
      if (path) { path.position.set(0, 0.05, 0); g.add(path); }
    }
  }

  public extent(): { width: number; depth: number } {
    return { width: GRID_W * TILE, depth: GRID_H * TILE };
  }
}
