/**
 * CityState.ts
 * Runtime mutable state for the city that grows over time.
 * Phase 3 will persist this to SQLite / WebSocket state server.
 */
import { CITY_MAP } from './CityMap';
import { CityEventBus } from './CityEventBus';

export interface ConstructionProject {
  chunkX: number;
  chunkY: number;
  label: string;
  startDayNumber: number;
  completionDayNumber: number;
  complete: boolean;
}

export interface ViewerContribution {
  name: string;
  action: string;
  target: string;
  dayNumber: number;
}

export interface CityStateSnapshot {
  dayNumber: number;
  population: number;
  buildings: number;
  unlockedDistrictIds: string[];
  activeConstruction: ConstructionProject[];
  recentContributions: ViewerContribution[];
  growthRate: number;
}

class CityStateClass {
  private dayNumber = 1;
  private population = CITY_MAP.population;
  private buildings = CITY_MAP.buildings;
  private unlockedDistrictIds: string[] = ['downtown', 'maple', 'harbor', 'midtown'];
  private activeConstruction: ConstructionProject[] = [
    { chunkX:2, chunkY:8, label:'Ironworks Expansion Wing', startDayNumber:1, completionDayNumber:5, complete:false },
  ];
  private recentContributions: ViewerContribution[] = [];

  public tick(currentDayNumber: number): void {
    if (currentDayNumber === this.dayNumber) return;
    const daysElapsed = currentDayNumber - this.dayNumber;
    this.dayNumber = currentDayNumber;
    this.population += daysElapsed * 50;

    for (const project of this.activeConstruction) {
      if (!project.complete && currentDayNumber >= project.completionDayNumber) {
        project.complete = true;
        this.buildings += 1;
        CityEventBus.emit('constructionComplete', { chunkX: project.chunkX, chunkY: project.chunkY, label: project.label });
      }
    }

    if (currentDayNumber >= 3 && !this.unlockedDistrictIds.includes('ironworks')) {
      this.unlockedDistrictIds.push('ironworks');
      CityEventBus.emit('districtUnlocked', { districtId: 'ironworks', name: 'Ironworks' });
    }

    if (currentDayNumber >= 6 && !this.unlockedDistrictIds.includes('greenway')) {
      this.unlockedDistrictIds.push('greenway');
      CityEventBus.emit('districtUnlocked', { districtId: 'greenway', name: 'Greenway' });
    }
  }

  public addContribution(contribution: ViewerContribution): void {
    this.recentContributions.unshift(contribution);
    if (this.recentContributions.length > 20) this.recentContributions.pop();
    CityEventBus.emit('viewerContribution', contribution as any);
  }

  public addConstruction(project: Omit<ConstructionProject, 'complete'>): void {
    this.activeConstruction.push({ ...project, complete: false });
    CityEventBus.emit('constructionStarted', project as any);
  }

  public getSnapshot(): CityStateSnapshot {
    return {
      dayNumber: this.dayNumber,
      population: this.population,
      buildings: this.buildings,
      unlockedDistrictIds: [...this.unlockedDistrictIds],
      activeConstruction: this.activeConstruction.filter(p => !p.complete),
      recentContributions: this.recentContributions.slice(0, 5),
      growthRate: 1,
    };
  }
}

export const CityState = new CityStateClass();
