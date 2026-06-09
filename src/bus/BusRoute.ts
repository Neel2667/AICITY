/**
 * BusRoute.ts
 * Defines fixed bus routes between districts.
 * Each route is a looping sequence of world-space waypoints.
 * Buses follow their route at steady speed, stopping briefly at each stop.
 *
 * CHUNK_SIZE = 60, TABLE_SIZE = 9 → grid runs from 0 to 540 world units.
 * Chunk (cx, cy) centre in world space ≈ (cx*60 - 240, 0, cy*60 - 240)
 * (the scene recentres, but for route purposes we use relative chunk offsets)
 */
import * as THREE from 'three';

const C = 60; // CHUNK_SIZE — keep in sync with GVar.CHUNK_SIZE

export interface BusStop {
  name: string;
  position: THREE.Vector3;
  districtId: string;
}

export interface BusRoute {
  id: string;
  name: string;
  color: number;        // bus body colour
  stops: BusStop[];
  speedKmh: number;     // city speed, ~20–40
  dwellSeconds: number; // time stopped at each stop
}

/** Convert chunk grid coords to approximate world position */
function cp(cx: number, cy: number, offX = 0, offZ = 0): THREE.Vector3 {
  return new THREE.Vector3((cx - 4) * C + offX, 0.5, (cy - 4) * C + offZ);
}

export const BUS_ROUTES: BusRoute[] = [
  // ── Route A: Downtown ↔ Harbor ──────────────────────────────────────────
  {
    id: 'routeA',
    name: 'Harbor Express',
    color: 0x29b6f6,
    speedKmh: 28,
    dwellSeconds: 6,
    stops: [
      { name: 'Arena Square',   position: cp(4, 4,  0, 0),   districtId: 'downtown' },
      { name: 'Midtown North',  position: cp(4, 2,  0, 0),   districtId: 'midtown'  },
      { name: 'Harbor Market',  position: cp(6, 0, -8, 10),  districtId: 'harbor'   },
      { name: 'The Anchor Cafe',position: cp(8, 0, -8,  8),  districtId: 'harbor'   },
      { name: 'Pier Row',       position: cp(7, 2,  0,  0),  districtId: 'harbor'   },
      { name: 'Midtown East',   position: cp(7, 4,  0,  0),  districtId: 'midtown'  },
    ],
  },

  // ── Route B: Maple Quarter ↔ Ironworks ─────────────────────────────────
  {
    id: 'routeB',
    name: 'West Connector',
    color: 0x66bb6a,
    speedKmh: 22,
    dwellSeconds: 8,
    stops: [
      { name: 'Maple Park',     position: cp(1, 1,  0,  0),  districtId: 'maple'    },
      { name: 'Midtown West',   position: cp(1, 4,  0,  0),  districtId: 'midtown'  },
      { name: 'Ironworks Gate', position: cp(1, 6,  8,  0),  districtId: 'ironworks'},
      { name: 'Depot Fuel',     position: cp(1, 7,  0,  0),  districtId: 'ironworks'},
      { name: 'Midtown SW',     position: cp(1, 5,  0,  0),  districtId: 'midtown'  },
    ],
  },

  // ── Route C: City Green → Festival Plaza → Southside ───────────────────
  {
    id: 'routeC',
    name: 'Greenway Loop',
    color: 0xffca28,
    speedKmh: 18,
    dwellSeconds: 10,
    stops: [
      { name: 'City Green',     position: cp(6, 6,  0,  0),  districtId: 'greenway' },
      { name: 'Festival Plaza', position: cp(7, 7,  0,  0),  districtId: 'greenway' },
      { name: 'Sunset Lawn',    position: cp(8, 8, -8, -8),  districtId: 'greenway' },
      { name: 'Southside Brew', position: cp(4, 7,  0, -8),  districtId: 'midtown'  },
      { name: 'Midtown S',      position: cp(4, 6,  0,  0),  districtId: 'midtown'  },
    ],
  },
];
