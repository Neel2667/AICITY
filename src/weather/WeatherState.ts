import type { CityClockSnapshot } from '../stream/CityClock';

export type WeatherKind = 'Clear' | 'Cloudy' | 'Morning Fog' | 'Light Rain';

export interface WeatherSnapshot {
  kind: WeatherKind;
  icon: string;
  description: string;
  fogBoost: number;
  lightMultiplier: number;
}

export function getWeatherFor(clock: CityClockSnapshot): WeatherSnapshot {
  const pattern = clock.dayNumber % 8;

  if (clock.phase === 'dawn' && (pattern === 1 || pattern === 4 || pattern === 7)) {
    return {
      kind: 'Morning Fog',
      icon: '🌫️',
      description: 'soft fog over the avenues',
      fogBoost: 0.45,
      lightMultiplier: 0.9,
    };
  }

  if ((pattern === 2 || pattern === 6) && clock.timeOfDay > 0.34 && clock.timeOfDay < 0.64) {
    return {
      kind: 'Cloudy',
      icon: '☁️',
      description: 'clouds drifting across downtown',
      fogBoost: 0.18,
      lightMultiplier: 0.82,
    };
  }

  if (pattern === 5 && clock.timeOfDay > 0.58 && clock.timeOfDay < 0.78) {
    return {
      kind: 'Light Rain',
      icon: '🌧️',
      description: 'a light shower passing through',
      fogBoost: 0.28,
      lightMultiplier: 0.74,
    };
  }

  return {
    kind: 'Clear',
    icon: '✨',
    description: 'calm skies over the city',
    fogBoost: 0,
    lightMultiplier: 1,
  };
}
