/**
 * CityMap.ts
 * Persistent city layout definition for AICITY Live.
 * This replaces random generation with an authored, named, saved city.
 * The city has fixed districts, named landmarks, and a growth state.
 */

export type DistrictMood = 'busy' | 'calm' | 'industrial' | 'residential' | 'commercial' | 'park';

export interface District {
  id: string;
  name: string;
  mood: DistrictMood;
  description: string;
  color: string;
}

export interface CityChunkEntry {
  x: number;
  y: number;
  districtId: string;
  blockHint?: string;
  rotation?: number;
  name?: string;
  level?: number;
  underConstruction?: boolean;
}

export interface CityLandmark {
  name: string;
  chunkX: number;
  chunkY: number;
  description: string;
}

export interface CityEvent {
  id: string;
  label: string;
  districtId?: string;
  startDayFraction: number;
  durationDayFraction: number;
  icon: string;
}

export interface CityMapData {
  cityName: string;
  tagline: string;
  foundingDay: number;
  population: number;
  buildings: number;
  districts: District[];
  chunks: CityChunkEntry[];
  landmarks: CityLandmark[];
  recurringEvents: CityEvent[];
}

export const CITY_MAP: CityMapData = {
  cityName: 'AICITY Live',
  tagline: 'A little city that never sleeps.',
  foundingDay: 1,
  population: 4200,
  buildings: 81,

  districts: [
    { id: 'downtown',  name: 'Downtown Core',    mood: 'busy',        description: 'Glass towers and busy avenues',            color: '#4fc3f7' },
    { id: 'maple',     name: 'Maple Quarter',    mood: 'residential', description: 'Tree-lined streets and row houses',          color: '#a5d6a7' },
    { id: 'harbor',    name: 'Harbor District',  mood: 'commercial',  description: 'Shops, cafes, and waterfront stalls',        color: '#ffcc80' },
    { id: 'ironworks', name: 'Ironworks',        mood: 'industrial',  description: 'Factories, depots, and freight lanes',       color: '#bcaaa4' },
    { id: 'greenway',  name: 'Greenway',         mood: 'park',        description: 'Parks, plazas, and open recreation',        color: '#c8e6c9' },
    { id: 'midtown',   name: 'Midtown',          mood: 'commercial',  description: 'Restaurants, gas stations, mid-rise offices',color: '#fff9c4' },
  ],

  chunks: [
    // Downtown Core (3x3 center)
    { x:3,y:3, districtId:'downtown',  blockHint:'apartments', rotation:0, name:'City Hall Plaza',  level:3 },
    { x:4,y:3, districtId:'downtown',  blockHint:'apartments', rotation:1,                         level:3 },
    { x:5,y:3, districtId:'downtown',  blockHint:'apartments', rotation:0,                         level:3 },
    { x:3,y:4, districtId:'downtown',  blockHint:'apartments', rotation:2, name:'Central Tower',    level:3 },
    { x:4,y:4, districtId:'downtown',  blockHint:'apartments', rotation:0, name:'Arena Square',     level:3 },
    { x:5,y:4, districtId:'downtown',  blockHint:'apartments', rotation:1,                         level:3 },
    { x:3,y:5, districtId:'downtown',  blockHint:'apartments', rotation:3,                         level:3 },
    { x:4,y:5, districtId:'downtown',  blockHint:'apartments', rotation:2,                         level:3 },
    { x:5,y:5, districtId:'downtown',  blockHint:'apartments', rotation:0, name:'Glass Bridge',     level:3 },

    // Maple Quarter (top-left)
    { x:0,y:0, districtId:'maple',     blockHint:'house',      rotation:0,                         level:1 },
    { x:1,y:0, districtId:'maple',     blockHint:'house2',     rotation:1,                         level:1 },
    { x:2,y:0, districtId:'maple',     blockHint:'house3',     rotation:0,                         level:1 },
    { x:0,y:1, districtId:'maple',     blockHint:'residence',  rotation:2,                         level:2 },
    { x:1,y:1, districtId:'maple',     blockHint:'house',      rotation:0, name:'Maple Park',       level:1 },
    { x:2,y:1, districtId:'maple',     blockHint:'house2',     rotation:3,                         level:1 },
    { x:0,y:2, districtId:'maple',     blockHint:'residence',  rotation:1,                         level:2 },
    { x:1,y:2, districtId:'maple',     blockHint:'house3',     rotation:0,                         level:1 },
    { x:2,y:2, districtId:'maple',     blockHint:'house',      rotation:2,                         level:1 },

    // Harbor District (top-right)
    { x:6,y:0, districtId:'harbor',    blockHint:'shoparea',   rotation:0, name:'Harbor Market',    level:2 },
    { x:7,y:0, districtId:'harbor',    blockHint:'shops',      rotation:1,                         level:2 },
    { x:8,y:0, districtId:'harbor',    blockHint:'coffeeshop', rotation:0, name:'The Anchor Cafe',  level:2 },
    { x:6,y:1, districtId:'harbor',    blockHint:'supermarket',rotation:2,                         level:2 },
    { x:7,y:1, districtId:'harbor',    blockHint:'shoparea',   rotation:0,                         level:2 },
    { x:8,y:1, districtId:'harbor',    blockHint:'shops',      rotation:3,                         level:2 },
    { x:6,y:2, districtId:'harbor',    blockHint:'coffeeshop', rotation:1,                         level:2 },
    { x:7,y:2, districtId:'harbor',    blockHint:'fastfood',   rotation:0, name:'Pier Row',         level:2 },
    { x:8,y:2, districtId:'harbor',    blockHint:'shoparea',   rotation:2,                         level:2 },

    // Ironworks (bottom-left)
    { x:0,y:6, districtId:'ironworks', blockHint:'factory',    rotation:0, name:'Ironworks Plant',  level:2 },
    { x:1,y:6, districtId:'ironworks', blockHint:'factory',    rotation:1,                         level:2 },
    { x:2,y:6, districtId:'ironworks', blockHint:'factory',    rotation:0,                         level:2 },
    { x:0,y:7, districtId:'ironworks', blockHint:'factory',    rotation:2,                         level:2 },
    { x:1,y:7, districtId:'ironworks', blockHint:'gas',        rotation:0, name:'Depot Fuel',       level:1 },
    { x:2,y:7, districtId:'ironworks', blockHint:'factory',    rotation:3,                         level:2 },
    { x:0,y:8, districtId:'ironworks', blockHint:'factory',    rotation:1,                         level:2 },
    { x:1,y:8, districtId:'ironworks', blockHint:'factory',    rotation:0,                         level:2 },
    { x:2,y:8, districtId:'ironworks', blockHint:'factory',    rotation:2,                         level:2, underConstruction:true },

    // Greenway (bottom-right)
    { x:6,y:6, districtId:'greenway',  blockHint:'park',       rotation:0, name:'City Green',       level:1 },
    { x:7,y:6, districtId:'greenway',  blockHint:'park',       rotation:1,                         level:1 },
    { x:8,y:6, districtId:'greenway',  blockHint:'park',       rotation:0,                         level:1 },
    { x:6,y:7, districtId:'greenway',  blockHint:'park',       rotation:2,                         level:1 },
    { x:7,y:7, districtId:'greenway',  blockHint:'park',       rotation:0, name:'Festival Plaza',   level:2 },
    { x:8,y:7, districtId:'greenway',  blockHint:'park',       rotation:3,                         level:1 },
    { x:6,y:8, districtId:'greenway',  blockHint:'park',       rotation:1,                         level:1 },
    { x:7,y:8, districtId:'greenway',  blockHint:'park',       rotation:0,                         level:1 },
    { x:8,y:8, districtId:'greenway',  blockHint:'park',       rotation:2, name:'Sunset Lawn',      level:1 },

    // Midtown (remaining)
    { x:3,y:0, districtId:'midtown',   blockHint:'residence',  rotation:0,                         level:2 },
    { x:4,y:0, districtId:'midtown',   blockHint:'apartments', rotation:1,                         level:2 },
    { x:5,y:0, districtId:'midtown',   blockHint:'shoparea',   rotation:0,                         level:2 },
    { x:3,y:1, districtId:'midtown',   blockHint:'coffeeshop', rotation:2, name:'Midtown Grind',    level:2 },
    { x:4,y:1, districtId:'midtown',   blockHint:'supermarket',rotation:0,                         level:2 },
    { x:5,y:1, districtId:'midtown',   blockHint:'fastfood',   rotation:1,                         level:2 },
    { x:3,y:2, districtId:'midtown',   blockHint:'gas',        rotation:0,                         level:1 },
    { x:4,y:2, districtId:'midtown',   blockHint:'shops',      rotation:3,                         level:2 },
    { x:5,y:2, districtId:'midtown',   blockHint:'residence',  rotation:0,                         level:2 },
    { x:0,y:3, districtId:'midtown',   blockHint:'apartments', rotation:1,                         level:2 },
    { x:1,y:3, districtId:'midtown',   blockHint:'shoparea',   rotation:0,                         level:2 },
    { x:2,y:3, districtId:'midtown',   blockHint:'coffeeshop', rotation:2,                         level:2 },
    { x:0,y:4, districtId:'midtown',   blockHint:'residence',  rotation:0,                         level:2 },
    { x:1,y:4, districtId:'midtown',   blockHint:'house',      rotation:1,                         level:1 },
    { x:2,y:4, districtId:'midtown',   blockHint:'shops',      rotation:0,                         level:2 },
    { x:0,y:5, districtId:'midtown',   blockHint:'factory',    rotation:3,                         level:1 },
    { x:1,y:5, districtId:'midtown',   blockHint:'gas',        rotation:0,                         level:1 },
    { x:2,y:5, districtId:'midtown',   blockHint:'apartments', rotation:1,                         level:2 },
    { x:6,y:3, districtId:'midtown',   blockHint:'shoparea',   rotation:0,                         level:2 },
    { x:7,y:3, districtId:'midtown',   blockHint:'residence',  rotation:1,                         level:2 },
    { x:8,y:3, districtId:'midtown',   blockHint:'apartments', rotation:2,                         level:2 },
    { x:6,y:4, districtId:'midtown',   blockHint:'coffeeshop', rotation:0,                         level:2 },
    { x:7,y:4, districtId:'midtown',   blockHint:'supermarket',rotation:3,                         level:2 },
    { x:8,y:4, districtId:'midtown',   blockHint:'shops',      rotation:0,                         level:2 },
    { x:6,y:5, districtId:'midtown',   blockHint:'house2',     rotation:1,                         level:1 },
    { x:7,y:5, districtId:'midtown',   blockHint:'residence',  rotation:0,                         level:2 },
    { x:8,y:5, districtId:'midtown',   blockHint:'fastfood',   rotation:2,                         level:2 },
    { x:3,y:6, districtId:'midtown',   blockHint:'apartments', rotation:0,                         level:2 },
    { x:4,y:6, districtId:'midtown',   blockHint:'shoparea',   rotation:1,                         level:2 },
    { x:5,y:6, districtId:'midtown',   blockHint:'shops',      rotation:0,                         level:2 },
    { x:3,y:7, districtId:'midtown',   blockHint:'house3',     rotation:2,                         level:1 },
    { x:4,y:7, districtId:'midtown',   blockHint:'coffeeshop', rotation:0, name:'Southside Brew',   level:2 },
    { x:5,y:7, districtId:'midtown',   blockHint:'supermarket',rotation:1,                         level:2 },
    { x:3,y:8, districtId:'midtown',   blockHint:'gas',        rotation:0,                         level:1 },
    { x:4,y:8, districtId:'midtown',   blockHint:'residence',  rotation:3,                         level:2 },
    { x:5,y:8, districtId:'midtown',   blockHint:'house',      rotation:0,                         level:1 },
  ],

  landmarks: [
    { name:'City Hall Plaza',  chunkX:3, chunkY:3, description:'Heart of civic life in AICITY' },
    { name:'Central Tower',    chunkX:3, chunkY:4, description:'Tallest building in downtown' },
    { name:'Arena Square',     chunkX:4, chunkY:4, description:'Public square at the city center' },
    { name:'The Anchor Cafe',  chunkX:8, chunkY:0, description:'Famous waterfront coffee spot' },
    { name:'Harbor Market',    chunkX:6, chunkY:0, description:'Daily fresh produce and goods' },
    { name:'Ironworks Plant',  chunkX:0, chunkY:6, description:"The city's industrial backbone" },
    { name:'Festival Plaza',   chunkX:7, chunkY:7, description:'Events, concerts, and fireworks' },
    { name:'Maple Park',       chunkX:1, chunkY:1, description:'Quiet neighborhood green' },
    { name:'Southside Brew',   chunkX:4, chunkY:7, description:'Popular late-night coffee shop' },
    { name:'City Green',       chunkX:6, chunkY:6, description:'The largest park in AICITY' },
  ],

  recurringEvents: [
    { id:'sunrise_jog',      label:'Sunrise Joggers',       districtId:'greenway', startDayFraction:0.21, durationDayFraction:0.07, icon:'🏃' },
    { id:'morning_commute',  label:'Morning Commute',                              startDayFraction:0.30, durationDayFraction:0.08, icon:'🚗' },
    { id:'market_day',       label:'Market Day',            districtId:'harbor',   startDayFraction:0.38, durationDayFraction:0.14, icon:'🛒' },
    { id:'lunch_rush',       label:'Lunch Rush',            districtId:'harbor',   startDayFraction:0.46, durationDayFraction:0.06, icon:'🍜' },
    { id:'evening_traffic',  label:'Evening Traffic',                              startDayFraction:0.67, durationDayFraction:0.09, icon:'🚦' },
    { id:'night_cleanup',    label:'Night Cleanup Crews',                          startDayFraction:0.87, durationDayFraction:0.10, icon:'🧹' },
  ],
};

export function getDistrict(x: number, y: number) {
  const chunk = CITY_MAP.chunks.find(c => c.x === x && c.y === y);
  if (!chunk) return undefined;
  return CITY_MAP.districts.find(d => d.id === chunk.districtId);
}

export function getActiveEvents(timeOfDay: number): CityEvent[] {
  return CITY_MAP.recurringEvents.filter(ev => {
    const end = ev.startDayFraction + ev.durationDayFraction;
    return timeOfDay >= ev.startDayFraction && timeOfDay < end;
  });
}

export function getChunkEntry(x: number, y: number): CityChunkEntry | undefined {
  return CITY_MAP.chunks.find(c => c.x === x && c.y === y);
}
