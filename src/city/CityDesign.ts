/**
 * CityDesign.ts — THE MAP IS THE MAIN CHARACTER  (v2 — 24×24)
 * Single source of truth for AICITY's finite, authored, memorable city.
 *
 * Grid: 24 cols (x → EAST) × 24 rows (y → SOUTH).
 * World pos of tile centre = ((x - ORIGIN_X) * TILE, 0, (y - ORIGIN_Y) * TILE).
 */

export const GRID_W = 24;
export const GRID_H = 24;
export const TILE   = 60;

export const ORIGIN_X = (GRID_W - 1) / 2;
export const ORIGIN_Y = (GRID_H - 1) / 2;

export function tileToWorld(tx: number, ty: number): { x: number; z: number } {
  return { x: (tx - ORIGIN_X) * TILE, z: (ty - ORIGIN_Y) * TILE };
}

export type TileKind =
  | 'ocean' | 'beachSand' | 'field' | 'forest'
  | 'downtown' | 'midtown' | 'residential' | 'village'
  | 'industrial' | 'park' | 'road'
  | 'marketSquare' | 'townPlaza' | 'promenade'
  | 'trainTracks' | 'trainStation'
  | 'airportRunway' | 'airportTerminal'
  | 'construction';

export interface Zone {
  id: string;
  name: string;
  blurb: string;
  color: string;
  centerTile: [number, number];
}

export const ZONES: Zone[] = [
  { id: 'industrial',  name: 'Ironworks Yard',      blurb: 'Factories, depots, and the city\'s industrial backbone', color: '#bcaaa4', centerTile: [3,  4]  },
  { id: 'downtown',    name: 'Downtown',             blurb: 'Glass towers, City Hall plaza, and the beating heart',   color: '#4fc3f7', centerTile: [6,  9]  },
  { id: 'midtown',     name: 'Midtown',              blurb: 'Cafes, shops, and mid-rise city living',                 color: '#fff59d', centerTile: [11, 10] },
  { id: 'market',      name: 'Old Market',           blurb: 'Colourful stalls, street food, and weekend bustle',      color: '#ffcc80', centerTile: [18, 9]  },
  { id: 'residential', name: 'Maple Quarter',        blurb: 'Quiet streets, suburban houses, and tree-lined lanes',   color: '#a5d6a7', centerTile: [5,  14] },
  { id: 'park',        name: 'Greenway Park',        blurb: 'Lawns, ponds, joggers, and the city\'s green lungs',    color: '#c8e6c9', centerTile: [16, 13] },
  { id: 'seaside',     name: 'Seaside Promenade',    blurb: 'Boardwalk, palms, beach, and glittering ocean',         color: '#ffe082', centerTile: [11, 20] },
  { id: 'airport',     name: 'Skyhaven Airport',     blurb: 'Under construction — the city\'s future gateway',       color: '#90caf9', centerTile: [4,  1]  },
  { id: 'station',     name: 'Central Station',      blurb: 'Under construction — the future transit hub',           color: '#ce93d8', centerTile: [11, 6]  },
  { id: 'university',  name: 'Westfield University', blurb: 'Coming soon — campus and knowledge district',           color: '#f48fb1', centerTile: [20, 3]  },
  { id: 'hospital',    name: 'City Hospital',        blurb: 'Coming soon — medical district',                        color: '#80cbc4', centerTile: [11, 4]  },
  { id: 'stadium',     name: 'Arena District',       blurb: 'Coming soon — sports and events',                       color: '#ffab91', centerTile: [19, 5]  },
];

export interface DesignLandmark {
  name: string;
  tile: [number, number];
  zoneId: string;
  blurb: string;
  icon: string;
}

export const LANDMARKS: DesignLandmark[] = [
  { name: 'City Hall Plaza',       tile: [5,  9],  zoneId: 'downtown',    blurb: 'The civic heart of AICITY',              icon: '🏛️' },
  { name: 'Central Tower',         tile: [7,  8],  zoneId: 'downtown',    blurb: 'Tallest building in the city',            icon: '🏙️' },
  { name: 'Old Market',            tile: [18, 9],  zoneId: 'market',      blurb: 'Best street food in town',                icon: '🛒' },
  { name: 'Ironworks Yard',        tile: [3,  4],  zoneId: 'industrial',  blurb: 'The industrial backbone',                 icon: '🏭' },
  { name: 'Greenway Park',         tile: [16, 13], zoneId: 'park',        blurb: 'The largest park in AICITY',              icon: '🌳' },
  { name: 'Seaside Promenade',     tile: [11, 20], zoneId: 'seaside',     blurb: 'Sunset walks and ocean views',            icon: '🌴' },
  { name: 'AICITY Beach',          tile: [11, 21], zoneId: 'seaside',     blurb: 'Golden sand and gentle waves',            icon: '🏖️' },
  { name: 'Maple Quarter',         tile: [5,  14], zoneId: 'residential', blurb: 'Quiet tree-lined streets',                icon: '🏘️' },
  { name: 'Skyhaven Airport',      tile: [4,  1],  zoneId: 'airport',     blurb: 'Future gateway — under construction',     icon: '✈️' },
  { name: 'Central Station',       tile: [11, 6],  zoneId: 'station',     blurb: 'Future transit hub — under construction', icon: '🚂' },
  { name: 'Westfield University',  tile: [20, 3],  zoneId: 'university',  blurb: 'Coming soon',                             icon: '🎓' },
  { name: 'City Hospital',         tile: [11, 4],  zoneId: 'hospital',    blurb: 'Coming soon',                             icon: '🏥' },
  { name: 'Arena District',        tile: [19, 5],  zoneId: 'stadium',     blurb: 'Coming soon',                             icon: '🏟️' },
];

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
  zoneId?: string;
  rot?: number;
  name?: string;
}

// 24 columns × 24 rows.  Row 0 = NORTH, Row 23 = SOUTH (ocean).
const MAP_ASCII: string[] = [
  'ffffffffffffffffffffffff', // 0  forest N edge
  'ffCCCCCffffffffffffffCff', // 1  airport construction (NW) + university (NE)
  'ffCCCCCfRRRRRRRRRRRRfCff', // 2  approach road + university fields
  'fIIRIIIfR.....R....RfCff', // 3  industrial (W), hospital/university (E)
  'fIIRIIIfRCCCCCR.CCCRffff', // 4  industrial + hospital + stadium construction
  'fIIRIIIfRCCCCCRRCCCRffff', // 5  industrial + station + stadium
  'RRRRRRRRRRRRRRRRRRRRRRRR', // 6  main N ring road
  'f..R...f.R...R...R...fff', // 7  approach roads
  'fDDRDDDz.R.MMM.R.mmm.fff', // 8  downtown + midtown + market
  'fDDRDDDz.RRMMMRRR.mm.fff', // 9  downtown plaza + midtown + market
  'fDDRDDD..RRMMMRRR.mm.fff', // 10 downtown south + midtown + market
  'RRRRRRRRRRRRRRRRRRRRRRRR', // 11 S ring road
  'f.HRH.f..R....R.GGGGG.ff', // 12 residential + park
  'f.HRH.f..R....R.GGGGG.ff', // 13 residential + park
  'f.HRH.f..RRRRRRRGGGGG.ff', // 14 residential + park connector
  'f.HRH.f..R.....RGGGGG.ff', // 15 residential + park
  'f.HRRRHRRR.....R.GGG..ff', // 16 residential south road
  'f..H...H...R...R.....fff', // 17 residential south
  'f......f...RRRRR.....fff', // 18 fields — promenade approach
  'RRRRRRRRRRRRRRRRRRRRRRRR', // 19 coastal road
  'pppppppppppppppppppppppp', // 20 promenade boardwalk
  'bbbbbbbbbbbbbbbbbbbbbbbb', // 21 beach sand
  '~~~~~~~~~~~~~~~~~~~~~~~~', // 22 ocean
  '~~~~~~~~~~~~~~~~~~~~~~~~', // 23 ocean deep
];

const CHAR_KIND: Record<string, TileKind> = {
  '.': 'field',      'f': 'forest',     '~': 'ocean',       'b': 'beachSand',
  'p': 'promenade',  'R': 'road',       'D': 'downtown',    'M': 'midtown',
  'H': 'residential','I': 'industrial', 'G': 'park',        'm': 'marketSquare',
  'z': 'townPlaza',  'C': 'construction',
  'A': 'airportRunway', 'T': 'airportTerminal',
  'S': 'trainStation',  't': 'trainTracks',
};

function zoneForKind(kind: TileKind, x: number, y: number): string | undefined {
  switch (kind) {
    case 'airportRunway':
    case 'airportTerminal': return 'airport';
    case 'trainStation':
    case 'trainTracks':     return 'station';
    case 'marketSquare':    return 'market';
    case 'downtown':
    case 'townPlaza':       return 'downtown';
    case 'midtown':         return 'midtown';
    case 'residential':     return 'residential';
    case 'village':         return 'village';
    case 'industrial':      return 'industrial';
    case 'park':            return 'park';
    case 'promenade':
    case 'beachSand':       return 'seaside';
    case 'construction': {
      if (x <= 7  && y <= 3)  return 'airport';
      if (x >= 18 && y <= 4)  return 'university';
      if (x >= 8  && x <= 14 && y <= 5) {
        if (y <= 4) return 'hospital';
        return 'station';
      }
      if (x >= 15 && y >= 4 && y <= 6) return 'stadium';
      return undefined;
    }
    default: return undefined;
  }
}

function buildTiles(): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const rowStr = MAP_ASCII[y] ?? '';
    const row: Tile[] = [];
    for (let x = 0; x < GRID_W; x++) {
      const ch = rowStr[x] ?? '.';
      const kind = CHAR_KIND[ch] ?? 'field';
      row.push({ x, y, kind, zoneId: zoneForKind(kind, x, y) });
    }
    grid.push(row);
  }
  return grid;
}

export const TILES: Tile[][] = buildTiles();

export function getTile(x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
  return TILES[y][x];
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
}

export function getZone(id: string): Zone | undefined {
  return ZONES.find(z => z.id === id);
}

export function landmarkAt(x: number, y: number): DesignLandmark | undefined {
  return LANDMARKS.find(l => l.tile[0] === x && l.tile[1] === y);
}

export function worldBounds() {
  const half = TILE / 2;
  return {
    minX: -ORIGIN_X * TILE - half,
    maxX: (GRID_W - 1 - ORIGIN_X) * TILE + half,
    minZ: -ORIGIN_Y * TILE - half,
    maxZ: (GRID_H - 1 - ORIGIN_Y) * TILE + half,
  };
}

const WALKABLE: Set<TileKind> = new Set([
  'road', 'marketSquare', 'townPlaza', 'promenade',
  'trainStation', 'airportTerminal',
]);

export function isRoad(x: number, y: number): boolean {
  const t = getTile(x, y);
  return !!t && t.kind === 'road';
}

export function roadTiles(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (TILES[y][x].kind === 'road') out.push([x, y]);
  return out;
}

export function walkableTiles(): Tile[] {
  const out: Tile[] = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (WALKABLE.has(TILES[y][x].kind)) out.push(TILES[y][x]);
  return out;
}

export function isDrivable(x: number, y: number): boolean {
  const t = getTile(x, y);
  return !!t && t.kind === 'road';
}

export function intersectionTiles(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [x, y] of roadTiles()) {
    const h = isRoad(x - 1, y) || isRoad(x + 1, y);
    const v = isRoad(x, y - 1) || isRoad(x, y + 1);
    if (h && v) out.push([x, y]);
  }
  return out;
}

export function tilesToPath(
  tiles: Array<[number, number]>,
  yLevel = 0.5,
): Array<{ x: number; y: number; z: number }> {
  return tiles.map(([tx, ty]) => {
    const w = tileToWorld(tx, ty);
    return { x: w.x, y: yLevel, z: w.z };
  });
}
