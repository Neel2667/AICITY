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
  // M3: Enhanced weather for better stream experience
  const pattern = clock.dayNumber % 8;

  if (clock.phase === 'dawn' && (pattern === 1 || pattern === 4 || pattern === 7)) {
    return {
      kind: 'Morning Fog',
      icon: '🌫️',
      description: 'soft fog over the harbor',
      fogBoost: 0.55,
      lightMultiplier: 0.85,
    };
  }

  if ((pattern === 2 || pattern === 6) && clock.timeOfDay > 0.34 && clock.timeOfDay < 0.64) {
    return {
      kind: 'Cloudy',
      icon: '☁️',
      description: 'clouds over Harbor’s End',
      fogBoost: 0.22,
      lightMultiplier: 0.78,
    };
  }

  if (pattern === 5 && clock.timeOfDay > 0.58 && clock.timeOfDay < 0.78) {
    return {
      kind: 'Light Rain',
      icon: '🌧️',
      description: 'gentle rain on the waterfront',
      fogBoost: 0.35,
      lightMultiplier: 0.7,
    };
  }

  return {
    kind: 'Clear',
    icon: '✨',
    description: 'clear skies over the city',
    fogBoost: 0,
    lightMultiplier: 1,
  };
}
