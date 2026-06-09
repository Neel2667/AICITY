/**
 * LandmarkFactory.ts
 * ----------------------------------------------------------------------------
 * Builds the *bespoke* low-poly geometry for tiles that don't exist as baked
 * InfiniTown blocks: the airport runway/terminal, train station/tracks, market
 * stalls, town plaza, seaside promenade, and the natural edges (ocean, beach
 * sand, fields, forest).
 *
 * Every factory returns a THREE.Object3D with a ~TILE (60u) footprint, centred
 * on the origin and sitting on ground (y=0). The CityBuilder positions it.
 *
 * Art direction: chunky, flat, cozy — matching InfiniTown's toy-city look.
 */
import * as THREE from 'three';
import { TILE } from './CityDesign';

// ─── small helpers ───────────────────────────────────────────────────────────
function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
}

function box(w: number, h: number, d: number, color: number, y = h / 2): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function plane(w: number, d: number, color: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

function cyl(rt: number, rb: number, h: number, color: number, y = h / 2, seg = 8): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A simple low-poly tree. */
function tree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(1.1 * scale, 1.4 * scale, 6 * scale, 0x8d6e63, 3 * scale, 6);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(5 * scale, 0), mat(0x66bb6a));
  leaves.position.y = 8.5 * scale;
  leaves.castShadow = true;
  g.add(trunk, leaves);
  return g;
}

/** A palm tree for the seaside. */
function palm(): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.6, 1.0, 10, 0xa1887f, 5, 6);
  trunk.rotation.z = 0.12;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 8, 4), mat(0x4caf50));
    frond.position.set(Math.cos((i / 6) * Math.PI * 2) * 3, 10, Math.sin((i / 6) * Math.PI * 2) * 3);
    frond.rotation.z = Math.PI / 2.6;
    frond.rotation.y = (i / 6) * Math.PI * 2;
    frond.castShadow = true;
    g.add(frond);
  }
  return g;
}

// Deterministic pseudo-random from tile coords (stable layout, no flicker).
function rng(x: number, y: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// ─── Shared animated water material (all ocean tiles shimmer together) ────────
const _waterMat = new THREE.MeshStandardMaterial({
  color: 0x2f7fb5, roughness: 0.22, metalness: 0.15,
});
let _waterTime = 0;
/** Call each frame to make the ocean gently shimmer. */
export function updateWater(elapsed: number): void {
  _waterTime = elapsed;
  // subtle hue + brightness ripple
  const s = 0.5 + 0.5 * Math.sin(_waterTime * 0.6);
  _waterMat.color.setHSL(0.56, 0.55, 0.40 + s * 0.06);
}

// ─── Natural / edge tiles ────────────────────────────────────────────────────
export function makeOcean(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(TILE + 1, TILE + 1), _waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.4;
  water.receiveShadow = true;
  g.add(water);
  // a couple of gentle "wave" strips
  if (rng(x, y) > 0.5) {
    const foam = plane(TILE * 0.7, 2.2, 0xbfe3f2, -0.2);
    foam.position.z = (rng(x, y, 2) - 0.5) * TILE * 0.5;
    g.add(foam);
  }
  return g;
}

export function makeBeach(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE + 1, TILE + 1, 0xf2e0b0, 0.02));
  // wet sand strip toward the ocean (south, +z)
  const wet = plane(TILE + 1, TILE * 0.3, 0xe9d191, 0.03);
  wet.position.z = TILE * 0.34;
  g.add(wet);
  // a few beach umbrellas / details
  if (rng(x, y, 5) > 0.55) {
    const pole = cyl(0.3, 0.3, 4, 0xffffff, 2, 5);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.2, 8), mat(0xef5350));
    top.position.y = 5;
    const u = new THREE.Group();
    u.add(pole, top);
    u.position.set((rng(x, y, 6) - 0.5) * 30, 0, (rng(x, y, 7) - 0.6) * 20);
    g.add(u);
  }
  return g;
}

export function makeField(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE + 1, TILE + 1, 0x8bc34a));
  // occasional crop rows / hedge
  if (rng(x, y, 9) > 0.6) {
    for (let i = -2; i <= 2; i++) {
      const row = box(TILE * 0.8, 0.6, 2, 0x7cb342, 0.4);
      row.position.set(0, 0.4, i * 7);
      g.add(row);
    }
  }
  return g;
}

export function makeForest(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE + 1, TILE + 1, 0x7cb342));
  const n = 3 + Math.floor(rng(x, y, 11) * 3);
  for (let i = 0; i < n; i++) {
    const t = tree(0.9 + rng(x, y, 20 + i) * 0.5);
    t.position.set((rng(x, y, 30 + i) - 0.5) * (TILE - 12), 0, (rng(x, y, 40 + i) - 0.5) * (TILE - 12));
    g.add(t);
  }
  return g;
}

// ─── Roads ───────────────────────────────────────────────────────────────────
/** A full road tile (asphalt + centre lines + sidewalk edges). */
export function makeRoad(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0x9ccc65, -0.02)); // grass base showing at corners
  const asphalt = plane(TILE, TILE * 0.55, 0x424650, 0.04); // E-W road
  g.add(asphalt);
  const asphalt2 = plane(TILE * 0.55, TILE, 0x424650, 0.04); // N-S road (crossroads)
  g.add(asphalt2);
  // dashed centre lines
  for (let i = -2; i <= 2; i++) {
    const dash = box(5, 0.05, 1.1, 0xf6c84a, 0.07);
    dash.position.set(i * 11, 0.07, 0);
    g.add(dash);
    const dash2 = box(1.1, 0.05, 5, 0xf6c84a, 0.07);
    dash2.position.set(0, 0.07, i * 11);
    g.add(dash2);
  }
  return g;
}

// ─── Airport ─────────────────────────────────────────────────────────────────
export function makeRunway(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE + 1, TILE + 1, 0x6d7a52, -0.02)); // grass apron
  const strip = plane(TILE + 2, TILE * 0.5, 0x3a3f47, 0.03); // runway runs E-W
  g.add(strip);
  // centre dashes
  for (let i = -2; i <= 2; i++) {
    const dash = box(7, 0.05, 1.4, 0xffffff, 0.06);
    dash.position.set(i * 12, 0.06, 0);
    g.add(dash);
  }
  // edge lights
  for (let i = -2; i <= 2; i++) {
    const l1 = box(0.8, 0.4, 0.8, 0xffee88, 0.2); l1.position.set(i * 12, 0.2, TILE * 0.26); g.add(l1);
    const l2 = box(0.8, 0.4, 0.8, 0xffee88, 0.2); l2.position.set(i * 12, 0.2, -TILE * 0.26); g.add(l2);
  }
  return g;
}

export function makeTerminal(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xb0bec5, 0.01)); // tarmac
  const hall = box(TILE * 0.8, 12, TILE * 0.5, 0xeceff1, 6);
  hall.position.z = -8;
  g.add(hall);
  // glass front
  const glass = box(TILE * 0.8, 8, 0.6, 0x4fc3f7, 4);
  glass.position.set(0, 4, -8 + TILE * 0.25);
  g.add(glass);
  // control tower
  const tower = cyl(2, 2.4, 22, 0xcfd8dc, 11, 8);
  tower.position.set(TILE * 0.3, 0, -TILE * 0.25);
  const cab = box(7, 4, 7, 0x37474f, 24); cab.position.set(TILE * 0.3, 24, -TILE * 0.25);
  g.add(tower, cab);
  // a parked plane nose
  const fuselage = cyl(2.2, 2.2, 16, 0xffffff, 3, 10); fuselage.rotation.z = Math.PI / 2;
  fuselage.position.set(-6, 3, 14);
  const wing = box(18, 0.6, 4, 0xeceff1, 3); wing.position.set(-6, 3, 14);
  const tail = box(0.6, 6, 4, 0xef5350, 6); tail.position.set(-13, 5, 14);
  g.add(fuselage, wing, tail);
  return g;
}

// ─── Train ───────────────────────────────────────────────────────────────────
export function makeTracks(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0x9ccc65, -0.02));
  const bed = plane(TILE + 2, 14, 0x6d4c41, 0.02); // ballast E-W
  g.add(bed);
  // two rails
  for (const z of [-3, 3]) {
    const rail = box(TILE + 2, 0.5, 0.6, 0xb0bec5, 0.4);
    rail.position.set(0, 0.4, z);
    g.add(rail);
  }
  // sleepers
  for (let i = -4; i <= 4; i++) {
    const s = box(1.4, 0.4, 11, 0x5d4037, 0.2);
    s.position.set(i * 6.5, 0.2, 0);
    g.add(s);
  }
  return g;
}

export function makeStation(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xbcaaa4, 0.01));
  // track through the middle
  const bed = plane(TILE + 2, 14, 0x6d4c41, 0.02); g.add(bed);
  for (const z of [-3, 3]) { const rail = box(TILE + 2, 0.5, 0.6, 0xb0bec5, 0.4); rail.position.set(0, 0.4, z); g.add(rail); }
  // platforms either side
  const p1 = box(TILE, 1.2, 9, 0xe0e0e0, 0.6); p1.position.set(0, 0.6, -12); g.add(p1);
  const p2 = box(TILE, 1.2, 9, 0xe0e0e0, 0.6); p2.position.set(0, 0.6, 12); g.add(p2);
  // station hall
  const hall = box(TILE * 0.6, 14, 16, 0xd7ccc8, 7); hall.position.set(0, 7, -20); g.add(hall);
  const roof = box(TILE * 0.7, 1.2, 20, 0x8d6e63, 14.5); roof.position.set(0, 14.5, -19); g.add(roof);
  const clock = cyl(2.2, 2.2, 0.6, 0xfff8e1, 12, 12); clock.rotation.x = Math.PI / 2; clock.position.set(0, 12, -20 + 8.2); g.add(clock);
  // canopy over platforms
  const canopy = box(TILE, 0.6, 9, 0x90a4ae, 7); canopy.position.set(0, 7, -12);
  const canopy2 = box(TILE, 0.6, 9, 0x90a4ae, 7); canopy2.position.set(0, 7, 12);
  g.add(canopy, canopy2);
  return g;
}

// ─── Market & plaza ──────────────────────────────────────────────────────────
const AWNING = [0xef5350, 0x42a5f5, 0xffca28, 0x66bb6a, 0xab47bc, 0xff7043];
export function makeMarket(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xd7c4a1, 0.01)); // cobble
  // 4 stalls in a 2x2
  let k = 0;
  for (const sx of [-14, 14]) {
    for (const sz of [-14, 14]) {
      const stall = new THREE.Group();
      const counter = box(12, 4, 8, 0xa1887f, 2);
      const awn = box(14, 0.6, 10, AWNING[(Math.floor(rng(x, y, k) * AWNING.length)) % AWNING.length], 6.5);
      awn.rotation.x = 0.12;
      const post1 = box(0.6, 6, 0.6, 0x6d4c41, 3); post1.position.set(-6, 3, -4);
      const post2 = box(0.6, 6, 0.6, 0x6d4c41, 3); post2.position.set(6, 3, -4);
      stall.add(counter, awn, post1, post2);
      stall.position.set(sx, 0, sz);
      g.add(stall);
      k++;
    }
  }
  return g;
}

export function makePlaza(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xcfd8dc, 0.01));
  // fountain
  const basin = cyl(8, 9, 1.6, 0xb0bec5, 0.8, 16);
  const water = cyl(7, 7, 0.4, 0x4fc3f7, 1.7, 16);
  const spout = cyl(0.8, 1.2, 5, 0x90a4ae, 2.5, 8);
  g.add(basin, water, spout);
  // benches & trees at corners
  for (const [cx, cz] of [[-20, -20], [20, -20], [-20, 20], [20, 20]] as [number, number][]) {
    const t = tree(0.8); t.position.set(cx, 0, cz); g.add(t);
  }
  return g;
}

export function makePromenade(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xc9a36b, 0.0)); // sand under
  // boardwalk planks (run E-W)
  const deck = plane(TILE + 1, TILE * 0.55, 0xb98a4b, 0.05);
  g.add(deck);
  for (let i = -4; i <= 4; i++) {
    const plank = box(1.0, 0.2, TILE * 0.5, 0xa9772f, 0.1);
    plank.position.set(i * 6.4, 0.1, 0);
    g.add(plank);
  }
  // railing toward the ocean (south, +z)
  const rail = box(TILE, 0.4, 0.4, 0xe0c39b, 3); rail.position.set(0, 3, TILE * 0.28); g.add(rail);
  for (let i = -3; i <= 3; i++) { const post = box(0.5, 3, 0.5, 0xe0c39b, 1.5); post.position.set(i * 9, 1.5, TILE * 0.28); g.add(post); }
  // a palm
  if (rng(x, y, 3) > 0.4) { const p = palm(); p.position.set((rng(x, y, 4) - 0.5) * 30, 0, -TILE * 0.22); g.add(p); }
  return g;
}

/** Map a tile kind to its bespoke geometry (returns null if it's a baked-block kind). */
export function buildLandmarkTile(kind: string, x: number, y: number): THREE.Object3D | null {
  switch (kind) {
    case 'ocean':           return makeOcean(x, y);
    case 'beachSand':       return makeBeach(x, y);
    case 'field':           return makeField(x, y);
    case 'forest':          return makeForest(x, y);
    case 'road':            return makeRoad();
    case 'airportRunway':   return makeRunway();
    case 'airportTerminal': return makeTerminal();
    case 'trainTracks':     return makeTracks();
    case 'trainStation':    return makeStation();
    case 'marketSquare':    return makeMarket(x, y);
    case 'townPlaza':       return makePlaza();
    case 'promenade':       return makePromenade(x, y);
    default:                return null; // urban kinds use baked blocks
  }
}
