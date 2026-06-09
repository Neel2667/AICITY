import type { StreamConfig } from './StreamConfig';

export type CityPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface CityClockSnapshot {
  nowMs: number;
  elapsedSeconds: number;
  dayNumber: number;
  timeOfDay: number;
  hour: number;
  minute: number;
  phase: CityPhase;
  phaseLabel: string;
  cityTimeText: string;
  dayLabel: string;
}

export class CityClock {
  private readonly config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  public getSnapshot(nowMs: number = Date.now()): CityClockSnapshot {
    const dayLength = Math.max(60, this.config.cityDayLengthSeconds);
    const elapsedSeconds = Math.max(0, (nowMs - this.config.launchEpochMs) / 1000);
    const dayIndex = Math.floor(elapsedSeconds / dayLength);
    const secondsIntoDay = elapsedSeconds - dayIndex * dayLength;
    const timeOfDay = secondsIntoDay / dayLength;
    const totalMinutes = Math.floor(timeOfDay * 24 * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const phase = this.getPhase(timeOfDay);

    return {
      nowMs,
      elapsedSeconds,
      dayNumber: dayIndex + 1,
      timeOfDay,
      hour,
      minute,
      phase,
      phaseLabel: this.getPhaseLabel(phase),
      cityTimeText: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      dayLabel: `Day ${dayIndex + 1}`,
    };
  }

  private getPhase(timeOfDay: number): CityPhase {
    if (timeOfDay >= 0.21 && timeOfDay < 0.30) return 'dawn';
    if (timeOfDay >= 0.30 && timeOfDay < 0.70) return 'day';
    if (timeOfDay >= 0.70 && timeOfDay < 0.81) return 'dusk';
    return 'night';
  }

  private getPhaseLabel(phase: CityPhase): string {
    switch (phase) {
      case 'dawn':
        return 'Sunrise';
      case 'day':
        return 'Daylight';
      case 'dusk':
        return 'Sunset';
      case 'night':
        return 'Night';
    }
  }
}
