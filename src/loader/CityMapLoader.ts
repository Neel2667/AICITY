import type { StreamConfig } from '../stream/StreamConfig';

export interface CityChunkData {
  x: number;
  y: number;
  district: string;
  blockType: string;
  rotation: number;
  level: number;
  name: string;
  construction: {
    status: 'complete' | 'in_progress' | 'planned';
    progress: number;
  };
}

export interface CityMap {
  version: number;
  cityName: string;
  currentDay: number;
  districts: Array<{
    id: string;
    name: string;
    mood: string;
  }>;
  chunks: CityChunkData[];
  meta: {
    population: number;
    growthRate: number;
  };
}

export class CityMapLoader {
  private map: CityMap | null = null;

  async loadMap(): Promise<CityMap> {
    if (this.map) return this.map;

    try {
      const response = await fetch('/assets/citymap.json');
      if (!response.ok) {
        throw new Error('Failed to load citymap.json');
      }
      this.map = await response.json();
      console.log('[CityMapLoader] Loaded persistent city map:', this.map.cityName);
      return this.map;
    } catch (error) {
      console.error('[CityMapLoader] Error loading map, falling back to empty map', error);
      // Fallback empty map
      this.map = {
        version: 1,
        cityName: "Harbor’s End",
        currentDay: 1,
        districts: [],
        chunks: [],
        meta: { population: 0, growthRate: 0 }
      };
      return this.map;
    }
  }

  getChunkAt(x: number, y: number): CityChunkData | null {
    if (!this.map) return null;
    return this.map.chunks.find(c => c.x === x && c.y === y) || null;
  }

  getAllChunks(): CityChunkData[] {
    return this.map?.chunks || [];
  }
}