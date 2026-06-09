/**
 * LandmarkFactory.ts — procedural geometry for special tiles.
 * Covers: natural edges, roads (fallback), market, plaza, promenade,
 * train station/tracks, airport runway/terminal, and construction sites.
 */
import * as THREE from 'three';
import { TILE } from './CityDesign';

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
}
function box(w: number, h: number, d: number, color: number, y = h / 2): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.y = y; m.castShadow = true; m.receiveShadow = true; return m;
}
function plane(w: number, d: number, color: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m;
}
function cyl(rt: number, rb: number, h: number, color: number, y = h / 2, seg = 8): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.y = y; m.castShadow = true; m.receiveShadow = true; return m;
}
function tree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(1.1 * scale, 1.4 * scale, 6 * scale, 0x8d6e63, 3 * scale, 6));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(5 * scale, 0), mat(0x66bb6a));
  leaves.position.y = 8.5 * scale; leaves.castShadow = true; g.add(leaves); return g;
}
function palm(): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.6, 1.0, 10, 0xa1887f, 5, 6); trunk.rotation.z = 0.12; g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 8, 4), mat(0x4caf50));
    frond.position.set(Math.cos((i/6)*Math.PI*2)*3, 10, Math.sin((i/6)*Math.PI*2)*3);
    frond.rotation.z = Math.PI/2.6; frond.rotation.y = (i/6)*Math.PI*2;
    frond.castShadow = true; g.add(frond);
  }
  return g;
}
function rng(x: number, y: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Animated water
const _waterMat = new THREE.MeshStandardMaterial({ color: 0x2f7fb5, roughness: 0.22, metalness: 0.15 });
let _waterTime = 0;
export function updateWater(elapsed: number): void {
  _waterTime = elapsed;
  const s = 0.5 + 0.5 * Math.sin(_waterTime * 0.6);
  _waterMat.color.setHSL(0.56, 0.55, 0.40 + s * 0.06);
}

export function makeOcean(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(TILE+1, TILE+1), _waterMat);
  water.rotation.x = -Math.PI/2; water.position.y = -0.4; water.receiveShadow = true; g.add(water);
  if (rng(x,y) > 0.5) { const foam = plane(TILE*0.7, 2.2, 0xbfe3f2, -0.2); foam.position.z = (rng(x,y,2)-0.5)*TILE*0.5; g.add(foam); }
  return g;
}

export function makeBeach(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE+1, TILE+1, 0xf2e0b0, 0.02));
  const wet = plane(TILE+1, TILE*0.3, 0xe9d191, 0.03); wet.position.z = TILE*0.34; g.add(wet);
  if (rng(x,y,5) > 0.55) {
    const pole = cyl(0.3,0.3,4,0xffffff,2,5);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.5,2.2,8), mat(0xef5350)); top.position.y = 5;
    const u = new THREE.Group(); u.add(pole,top);
    u.position.set((rng(x,y,6)-0.5)*30, 0, (rng(x,y,7)-0.6)*20); g.add(u);
  }
  return g;
}

export function makeField(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE+1, TILE+1, 0x8bc34a));
  if (rng(x,y,9) > 0.55) { for (let i=-2;i<=2;i++) { const row=box(TILE*0.8,0.6,2,0x7cb342,0.4); row.position.set(0,0.4,i*7); g.add(row); } }
  return g;
}

export function makeForest(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE+1, TILE+1, 0x558b2f));
  const n = 4 + Math.floor(rng(x,y,11)*4);
  for (let i=0;i<n;i++) {
    const t = tree(0.9+rng(x,y,20+i)*0.6);
    t.position.set((rng(x,y,30+i)-0.5)*(TILE-10), 0, (rng(x,y,40+i)-0.5)*(TILE-10)); g.add(t);
  }
  return g;
}

export function makeRoad(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0x9ccc65, -0.02));
  g.add(plane(TILE, TILE*0.55, 0x424650, 0.04));
  g.add(plane(TILE*0.55, TILE, 0x424650, 0.04));
  for (let i=-2;i<=2;i++) {
    const d1=box(5,0.05,1.1,0xf6c84a,0.07); d1.position.set(i*11,0.07,0); g.add(d1);
    const d2=box(1.1,0.05,5,0xf6c84a,0.07); d2.position.set(0,0.07,i*11); g.add(d2);
  }
  return g;
}

export function makeMarket(x: number, y: number): THREE.Object3D {
  const AWNING = [0xef5350,0x42a5f5,0xffca28,0x66bb6a,0xab47bc,0xff7043,0x26c6da];
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xd7c4a1, 0.01));
  let k = 0;
  for (const sx of [-14,14]) for (const sz of [-14,14]) {
    const stall = new THREE.Group();
    const counter = box(12,4,8,0xa1887f,2);
    const awn = box(14,0.6,10,AWNING[Math.floor(rng(x,y,k)*AWNING.length)%AWNING.length],6.5); awn.rotation.x=0.12;
    const p1=box(0.6,6,0.6,0x6d4c41,3); p1.position.set(-6,3,-4);
    const p2=box(0.6,6,0.6,0x6d4c41,3); p2.position.set(6,3,-4);
    stall.add(counter,awn,p1,p2); stall.position.set(sx,0,sz); g.add(stall); k++;
  }
  return g;
}

export function makePlaza(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xcfd8dc, 0.01));
  const basin=cyl(9,10,1.8,0xb0bec5,0.9,16), water=cyl(7.5,7.5,0.4,0x4fc3f7,1.8,16), spout=cyl(0.9,1.3,6,0x90a4ae,3,8);
  g.add(basin,water,spout);
  for (const [cx,cz] of [[-22,-22],[22,-22],[-22,22],[22,22]] as [number,number][]) { const t=tree(0.85); t.position.set(cx,0,cz); g.add(t); }
  for (const [cx,cz] of [[-10,0],[10,0],[0,-10],[0,10]] as [number,number][]) { const b=box(5,1.4,1.4,0x8d6e63,0.7); b.position.set(cx,0.7,cz); g.add(b); }
  return g;
}

export function makePromenade(x: number, y: number): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE, TILE, 0xc9a36b, 0.0));
  const deck=plane(TILE+1, TILE*0.6, 0xb98a4b, 0.05); g.add(deck);
  for (let i=-4;i<=4;i++) { const plank=box(1.0,0.2,TILE*0.55,0xa9772f,0.1); plank.position.set(i*6.4,0.1,0); g.add(plank); }
  const rail=box(TILE,0.4,0.4,0xe0c39b,3); rail.position.set(0,3,TILE*0.3); g.add(rail);
  for (let i=-3;i<=3;i++) { const post=box(0.5,3,0.5,0xe0c39b,1.5); post.position.set(i*9,1.5,TILE*0.3); g.add(post); }
  const nPalms=1+Math.floor(rng(x,y,3)*2);
  for (let i=0;i<nPalms;i++) { const p=palm(); p.position.set((rng(x,y,4+i)-0.5)*40,0,-TILE*0.22); g.add(p); }
  return g;
}

export function makeTracks(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE,TILE,0x9ccc65,-0.02));
  const bed=plane(TILE+2,14,0x6d4c41,0.02); g.add(bed);
  for (const z of [-3,3]) { const rail=box(TILE+2,0.5,0.6,0xb0bec5,0.4); rail.position.set(0,0.4,z); g.add(rail); }
  for (let i=-4;i<=4;i++) { const s=box(1.4,0.4,11,0x5d4037,0.2); s.position.set(i*6.5,0.2,0); g.add(s); }
  return g;
}

export function makeStation(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE,TILE,0xbcaaa4,0.01));
  const bed=plane(TILE+2,14,0x6d4c41,0.02); g.add(bed);
  for (const z of [-3,3]) { const rail=box(TILE+2,0.5,0.6,0xb0bec5,0.4); rail.position.set(0,0.4,z); g.add(rail); }
  const p1=box(TILE,1.2,9,0xe0e0e0,0.6); p1.position.set(0,0.6,-12); g.add(p1);
  const p2=box(TILE,1.2,9,0xe0e0e0,0.6); p2.position.set(0,0.6,12); g.add(p2);
  const hall=box(TILE*0.6,14,16,0xd7ccc8,7); hall.position.set(0,7,-20); g.add(hall);
  const roof=box(TILE*0.7,1.2,20,0x8d6e63,14.5); roof.position.set(0,14.5,-19); g.add(roof);
  return g;
}

export function makeRunway(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE+1,TILE+1,0x6d7a52,-0.02));
  const strip=plane(TILE+2,TILE*0.5,0x3a3f47,0.03); g.add(strip);
  for (let i=-2;i<=2;i++) { const d=box(7,0.05,1.4,0xffffff,0.06); d.position.set(i*12,0.06,0); g.add(d); }
  return g;
}

export function makeTerminal(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE,TILE,0xb0bec5,0.01));
  const hall=box(TILE*0.8,12,TILE*0.5,0xeceff1,6); hall.position.z=-8; g.add(hall);
  const tower=cyl(2,2.4,22,0xcfd8dc,11,8); tower.position.set(TILE*0.3,0,-TILE*0.25); g.add(tower);
  const cab=box(7,4,7,0x37474f,24); cab.position.set(TILE*0.3,24,-TILE*0.25); g.add(cab);
  return g;
}

export function makeConstruction(x: number, y: number, _label?: string): THREE.Object3D {
  const g = new THREE.Group();
  g.add(plane(TILE+1,TILE+1,0xbcaaa4,0.0));
  g.add(plane(TILE*0.75,TILE*0.75,0x8d6e63,0.01));

  // perimeter fence
  const FENCE_COLOR = 0xff6f00;
  const panels: Array<[number,number,number]> = [[0,-TILE*0.44,0],[0,TILE*0.44,0],[-TILE*0.44,0,Math.PI/2],[TILE*0.44,0,Math.PI/2]];
  for (const [fx,fz,fy] of panels) {
    const panel=box(TILE,5,1.2,FENCE_COLOR,2.5); panel.position.set(fx,0,fz); panel.rotation.y=fy; g.add(panel);
    for (let i=-3;i<=3;i++) { const stripe=box(1.6,5,1.3,0xffffff,2.5); stripe.position.set(fx+Math.cos(fy)*i*8,0,fz+Math.sin(fy)*i*8); stripe.rotation.y=fy; g.add(stripe); }
  }

  // crane
  const craneX=(rng(x,y,1)-0.5)*20, craneZ=(rng(x,y,2)-0.5)*20;
  const mast=box(2,38,2,0xffd600,19); mast.position.set(craneX,0,craneZ); g.add(mast);
  const boom=box(28,1.5,1.5,0xffd600,37.5); boom.position.set(craneX+8,0,craneZ); g.add(boom);
  const cable=box(0.4,10,0.4,0x9e9e9e,32); cable.position.set(craneX+16,0,craneZ); g.add(cable);
  const hook=box(3,3,3,0x607d8b,22); hook.position.set(craneX+16,0,craneZ); g.add(hook);

  // cones
  for (let i=0;i<4;i++) {
    const cone=new THREE.Mesh(new THREE.ConeGeometry(2,5,6),mat(0xff6f00));
    cone.position.set((rng(x,y,10+i)-0.5)*TILE*0.6,2.5,(rng(x,y,20+i)-0.5)*TILE*0.6);
    cone.castShadow=true; g.add(cone);
  }

  // construction light
  const lp=cyl(0.4,0.4,14,0x757575,7,6); lp.position.set(craneX-12,0,craneZ+5); g.add(lp);
  const lh=box(4,2,2,0xfff9c4,14.5); lh.position.set(craneX-12,0,craneZ+5); g.add(lh);

  // sign board
  const sp1=cyl(0.5,0.5,10,0x616161,5,6); sp1.position.set(-8,0,-TILE*0.38); g.add(sp1);
  const sp2=cyl(0.5,0.5,10,0x616161,5,6); sp2.position.set(8,0,-TILE*0.38); g.add(sp2);
  const sign=box(20,7,0.8,0x1a237e,10.5); sign.position.set(0,0,-TILE*0.38); g.add(sign);
  const stripe=box(20,1.2,0.9,0xffd600,13.5); stripe.position.set(0,0,-TILE*0.38); g.add(stripe);

  return g;
}

export function buildLandmarkTile(kind: string, x: number, y: number, label?: string): THREE.Object3D | null {
  switch (kind) {
    case 'ocean':           return makeOcean(x, y);
    case 'beachSand':       return makeBeach(x, y);
    case 'field':           return makeField(x, y);
    case 'forest':          return makeForest(x, y);
    case 'road':            return null;
    case 'airportRunway':   return makeRunway();
    case 'airportTerminal': return makeTerminal();
    case 'trainTracks':     return makeTracks();
    case 'trainStation':    return makeStation();
    case 'marketSquare':    return makeMarket(x, y);
    case 'townPlaza':       return makePlaza();
    case 'promenade':       return makePromenade(x, y);
    case 'construction':    return makeConstruction(x, y, label);
    default:                return null;
  }
}
