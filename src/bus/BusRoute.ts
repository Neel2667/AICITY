/**
 * BusRoute.ts
 * Bus routes that follow the REAL roads of the authored finite city.
 *
 * Each route is a dense sequence of waypoints laid along actual road tiles
 * (from CityDesign), so buses visibly drive down streets instead of cutting
 * across blocks. Only waypoints flagged with `dwell` are timed "stops" where
 * the bus pauses and announces an arrival.
 */
import * as THREE from 'three';
import { tileToWorld } from '../city/CityDesign';

export interface BusStop {
  name: string;
  position: THREE.Vector3;
  districtId: string;
  /** seconds to dwell here; undefined / 0 = drive straight through */
  dwell?: number;
}

export interface BusRoute {
  id: string;
  name: string;
  color: number;
  stops: BusStop[];
  speedKmh: number;
  dwellSeconds: number; // default dwell for flagged stops
}

// Helper: a road waypoint from tile coords (pass-through unless named+dwell).
function wp(tx: number, ty: number): BusStop {
  const w = tileToWorld(tx, ty);
  return { name: '', position: new THREE.Vector3(w.x, 0.5, w.z), districtId: '' };
}
// Helper: a named timed stop.
function stop(tx: number, ty: number, name: string, districtId: string, dwell = 6): BusStop {
  const w = tileToWorld(tx, ty);
  return { name, position: new THREE.Vector3(w.x, 0.5, w.z), districtId, dwell };
}

export const BUS_ROUTES: BusRoute[] = [
  // ── Route A: Cross-Town Avenue (the central row-7 boulevard, W↔E) ──────────
  {
    id: 'routeA',
    name: 'Cross-Town Line',
    color: 0x29b6f6,
    speedKmh: 30,
    dwellSeconds: 6,
    stops: [
      stop(0, 7, 'Ironworks West', 'industrial'),
      wp(2, 7), wp(4, 7),
      stop(4, 7, 'Downtown North', 'downtown'),
      wp(7, 7), wp(9, 7),
      stop(9, 7, 'Central Station', 'station', 8),
      wp(11, 7), wp(13, 7),
      stop(13, 7, 'Greenway Gate', 'park'),
      wp(15, 7),
      // return leg along the same avenue
      wp(13, 7), wp(11, 7), wp(9, 7), wp(7, 7), wp(4, 7), wp(2, 7),
    ],
  },

  // ── Route B: North Ring + Airport spur (row 3 avenue + col 10 up to airport)
  {
    id: 'routeB',
    name: 'Airport Connector',
    color: 0x66bb6a,
    speedKmh: 26,
    dwellSeconds: 7,
    stops: [
      stop(10, 0, 'Skyhaven Airport', 'airport', 9),
      wp(10, 1), wp(10, 2), wp(10, 3),
      stop(4, 3, 'North Avenue', 'downtown'),
      wp(2, 3),
      stop(0, 3, 'Maple Village Rd', 'village'),
      wp(2, 3), wp(4, 3), wp(9, 3),
      stop(13, 3, 'Greenway North', 'park'),
      wp(10, 3), wp(10, 2), wp(10, 1),
    ],
  },

  // ── Route C: Downtown ↔ Seaside loop (col 4 spine + promenade row 13) ──────
  {
    id: 'routeC',
    name: 'Seaside Loop',
    color: 0xffca28,
    speedKmh: 22,
    dwellSeconds: 8,
    stops: [
      stop(4, 8, 'City Hall Plaza', 'downtown', 8),
      wp(4, 9), wp(4, 10), wp(4, 11), wp(4, 12),
      wp(4, 13),
      stop(4, 13, 'West Promenade', 'seaside'),
      wp(7, 13),
      stop(7, 13, 'Seaside Beach', 'seaside', 9),
      wp(11, 13),
      stop(11, 13, 'East Promenade', 'seaside'),
      wp(7, 13), wp(4, 13), wp(4, 12), wp(4, 11), wp(4, 10), wp(4, 9),
    ],
  },
];
