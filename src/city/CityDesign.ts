/**
 * CityDesign.ts — THE MAP IS THE MAIN CHARACTER
 * ----------------------------------------------------------------------------
 * Single source of truth for AICITY's *finite, authored, memorable* city.
 *
 * Unlike the old infinite procedural engine, this is a hand-designed, fixed
 * layout. Every tile has a permanent identity, so viewers can build a mental
 * map: "the airport is north, the beach is south, downtown is the centre,
 * the market is east." A real place you can give a tour of.
 *
 * Grid: GRID_W x GRID_H tiles. Tile (col x → EAST, row y → SOUTH).
 * World position of a tile centre = ((x - originX) * TILE, 0, (y - originY) * TILE).
 *
 * This module is pure data + helpers. No THREE imports — safe to use anywhere
 * (renderer, camera, overlay, pedestrians, traffic, server).
 */

// ─── Grid dimensions ─────────────────────────────────────────────────────────
export const GRID_W = 16;
export const GRID_H = 16;
export const TILE   = 60;          // world units per tile (matches GVar.CHUNK_SIZE)

// Centre the map on the world origin so the existing camera framing still works.
export const ORIGIN_X = (GRID_W - 1) / 2;   // 7.5
export const ORIGIN_Y = (GRID_H - 1) / 2;   // 7.5

/** World-space centre (x,z) of a tile. y is always ground level (0). */
export function tileToWorld(tx: number, ty: number): { x: number; z: number } {
  return { x: (tx - ORIGIN_X) * TILE, z: (ty - ORIGIN_Y) * TILE };
}

// ─── Tile kinds ──────────────────────────────────────────────────────────────
/**
 * Every tile is one of these. The renderer decides what geometry to build for
 * each kind. "Landmark" kinds get bespoke procedural meshes (LandmarkFactory);
 * the generic urban kinds reuse the existing baked InfiniTown blocks.
 */
export type TileKind =
  // ── Natural / edge (no city geometry; define the bounded world) ──
  | 'ocean'        // water — the southern edge
  | 'beachSand'    // sandy shore band
  | 'field'        // grass / farmland — northern & side edges
  | 'forest'       // tree backdrop edge
  // ── Generic urban (reuse baked blocks) ──
  | 'downtown'     // tall towers
  | 'midtown'      // mid-rise mixed
  | 'residential'  // houses / row houses
  | 'village'      // small cottages, loose layout
  | 'industrial'   // factories / depots
  | 'park'         // greenery, plaza
  | 'road'         // pure road/intersection tile
  // ── Bespoke landmarks (procedural LandmarkFactory) ──
  | 'airportRunway'
  | 'airportTerminal'
  | 'trainStation'
  | 'trainTracks'
  | 'marketSquare'
  | 'townPlaza'
  | 'promenade';   // seaside boardwalk between city and beach

/** Districts/zones a viewer should learn by name. */
export interface Zone {
  id: string;
  name: string;
  blurb: string;        // one-line description for overlay / bot
  color: string;        // minimap / label accent
  /** Approx centre tile, used for camera tour + labels. */
  centerTile: [number, number];
}

export const ZONES: Zone[] = [
  { id: 'airport',   name: 'Skyhaven Airport',    blurb: 'Runway, terminal, and the city gateway',     color: '#90caf9', centerTile: [2, 1] },
  { id: 'village',   name: 'Maple Village',       blurb: 'Cottages, lanes, and quiet fields',          color: '#a5d6a7', centerTile: [12, 1] },
  { id: 'industrial',name: 'Ironworks Yard',      blurb: 'Factories, depots, and freight',             color: '#bcaaa4', centerTile: [2, 5] },
  { id: 'station',   name: 'Central Station',      blurb: 'The beating heart hub — all lines meet here', color: '#ce93d8', centerTile: [9, 5] },
  { id: 'downtown',  name: 'Downtown',            blurb: 'Glass towers and City Hall plaza',           color: '#4fc3f7', centerTile: [3, 8] },
  { id: 'market',    name: 'Old Market',          blurb: 'Stalls, awnings, and street food',           color: '#ffcc80', centerTile: [12, 8] },
  { id: 'midtown',   name: 'Midtown',             blurb: 'Cafes, shops, and mid-rise living',          color: '#fff59d', centerTile: [9, 10] },
  { id: 'park',      name: 'Greenway Park',       blurb: 'Lawns, ponds, and weekend crowds',           color: '#c8e6c9', centerTile: [13, 11] },
  { id: 'seaside',   name: 'Seaside Promenade',   blurb: 'Boardwalk, palms, and the beach',            color: '#ffe082', centerTile: [7, 13] },
];

/** Named landmarks placed at specific tiles (for camera focus + signage). */
export interface DesignLandmark {
  name: string;
  tile: [number, number];
  zoneId: string;
  blurb: string;
  icon: string;
}

export const LANDMARKS: DesignLandmark[] = [
  { name: 'Skyhaven Airport',  tile: [2, 1],   zoneId: 'airport',    blurb: 'Watch the planes taxi at dawn',        icon: '✈️' },
  { name: 'Central Station',   tile: [9, 5],   zoneId: 'station',     blurb: 'Trains every few minutes',             icon: '🚂' },
  { name: 'City Hall Plaza',   tile: [3, 8],   zoneId: 'downtown',    blurb: 'The civic heart of the city',          icon: '🏛️' },
  { name: 'Central Tower',     tile: [4, 8],   zoneId: 'downtown',    blurb: 'Tallest building in AICITY',           icon: '🏙️' },
  { name: 'Old Market',        tile: [12, 8],  zoneId: 'market',      blurb: 'Best street food in town',             icon: '🛒' },
  { name: 'Maple Village',     tile: [12, 1],  zoneId: 'village',     blurb: 'Cottages by the northern fields',      icon: '🏘️' },
  { name: 'Ironworks Yard',    tile: [2, 5],   zoneId: 'industrial',  blurb: 'The city\u2019s industrial backbone',  icon: '🏭' },
  { name: 'Greenway Park',     tile: [13, 11], zoneId: 'park',        blurb: 'The largest park in AICITY',           icon: '🌳' },
  { name: 'Seaside Promenade', tile: [7, 13],  zoneId: 'seaside',     blurb: 'Sunset walks by the water',            icon: '🌴' },
  { name: 'AICITY Beach',      tile: [7, 14],  zoneId: 'seaside',     blurb: 'Golden sand and gentle waves',         icon: '🏖️' },
];

// ─── Tile metadata ───────────────────────────────────────────────────────────
export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
  zoneId?: string;
  /** 0..3 quarter-turn rotation for oriented pieces. */
  rot?: number;
  /** Optional fixed name shown in-world / overlay. */
  name?: string;
}

/**
 * The authored layout, drawn as ASCII for human editing, then expanded to Tiles.
 * Legend (one char per tile):
 *   .  field          f  forest        ~  ocean         b  beachSand   p  promenade
 *   R  road           D  downtown      M  midtown       H  residential v  village
 *   I  industrial     G  park(green)   m  marketSquare  z  townPlaza
 *   A  airportRunway  T  airportTerminal
 *   S  trainStation   t  trainTracks
 *
 * 16 columns × 16 rows. Row 0 = NORTH, row 15 = SOUTH (ocean).
 */
const MAP_ASCII: string[] = [
  // 0123456789012345   (x →)
  'f..TAAAA..R.vvv.f',  // 0  airport terminal+runway (NW) | village (NE)
  'f..TAAAA..R.vvv..',  // 1
  '...R.....RRR.vv..',  // 2  approach road
  'RRRRRRRRRRRRRRRRR',  // 3  main east-west avenue (north ring)
  'I.I.R..ttttt..G.f',  // 4  industrial (W) | tracks approach station
  'I.I.RR.tSSSt.RG.f',  // 5  Central Station hub (centre)
  'I.I.R..ttttt.RG..',  // 6
  'RRRRRRRRRRRRRRRRR',  // 7  central avenue
  'DDz.R.M.R.Rmmm.G.',  // 8  downtown plaza (W) | market (E)
  'DDD.R.MM..RmmmRG.',  // 9
  '.DD.RRMMM.RR..RG.',  // 10 midtown
  'HHH.R.MM.R.GGGGG.',  // 11 residential + park (E)
  'HHH.RRRRRRR.GGGG.',  // 12
  'pppppppppppppppp',   // 13 seaside promenade (full coast road)
  'bbbbbbbbbbbbbbbbb',  // 14 beach sand band
  '~~~~~~~~~~~~~~~~~',  // 15 ocean
];

// Map ASCII char → TileKind
const CHAR_KIND: Record<string, TileKind> = {
  '.': 'field',      'f': 'forest',     '~': 'ocean',         'b': 'beachSand',  'p': 'promenade',
  'R': 'road',       'D': 'downtown',   'M': 'midtown',       'H': 'residential','v': 'village',
  'I': 'industrial', 'G': 'park',       'm': 'marketSquare',  'z': 'townPlaza',
  'A': 'airportRunway', 'T': 'airportTerminal',
  'S': 'trainStation',  't': 'trainTracks',
};

// Which zone a kind belongs to (for labels / pedestrians / traffic).
function zoneForKind(kind: TileKind): string | undefined {
  switch (kind) {
    case 'airportRunway':
    case 'airportTerminal': return 'airport';
    case 'trainStation':
    case 'trainTracks':     return 'station';
    case 'marketSquare':    return 'market';
    case 'downtown':
    case 'townPlaza':       return 'downtown';
    case 'midtown':         return 'midtown';
    case 'residential':     return 'downtown';
    case 'village':         return 'village';
    case 'industrial':      return 'industrial';
    case 'park':            return 'park';
    case 'promenade':
    case 'beachSand':       return 'seaside';
    default:                return undefined;
  }
}

// ─── Build the tile table from ASCII ─────────────────────────────────────────
function buildTiles(): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const rowStr = MAP_ASCII[y] ?? '';
    const row: Tile[] = [];
    for (let x = 0; x < GRID_W; x++) {
      const ch = rowStr[x] ?? '.';
      const kind = CHAR_KIND[ch] ?? 'field';
      row.push({ x, y, kind, zoneId: zoneForKind(kind) });
    }
    grid.push(row);
  }
  return grid;
}

export const TILES: Tile[][] = buildTiles();

/** Get a tile, or null if outside the finite map (the bounded edge). */
export function getTile(x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
  return TILES[y][x];
}

/** Is this coordinate inside the authored map? */
export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
}

/** Lookup helpers used across the app. */
export function getZone(id: string): Zone | undefined {
  return ZONES.find(z => z.id === id);
}

export function landmarkAt(x: number, y: number): DesignLandmark | undefined {
  return LANDMARKS.find(l => l.tile[0] === x && l.tile[1] === y);
}

/** World-space pan limits (with a little margin) so the camera stays on the map. */
export function worldBounds() {
  const half = TILE / 2;
  return {
    minX: -ORIGIN_X * TILE - half,
    maxX: (GRID_W - 1 - ORIGIN_X) * TILE + half,
    minZ: -ORIGIN_Y * TILE - half,
    maxZ: (GRID_H - 1 - ORIGIN_Y) * TILE + half,
  };
}
