export interface StreamConfig {
  cityName: string;
  tagline: string;
  launchEpochMs: number;
  cityDayLengthSeconds: number;
  streamMode: boolean;
  devMode: boolean;
  overlayEnabled: boolean;
  cameraDirectorEnabled: boolean;
  atmosphereEnabled: boolean;
}

const params = new URLSearchParams(window.location.search);
const devMode = params.get('dev') === '1';
const streamMode = params.get('stream') !== '0' && !devMode;

export const streamConfig: StreamConfig = {
  cityName: params.get('city') || 'AICITY Live',
  tagline: 'A little city that never sleeps.',
  // June 9, 2026 UTC. This gives the stream a stable Day-N counter from project kickoff.
  launchEpochMs: Date.UTC(2026, 5, 9, 0, 0, 0),
  cityDayLengthSeconds: Number(params.get('dayLength') || 60 * 60),
  streamMode,
  devMode,
  overlayEnabled: params.get('overlay') !== '0',
  cameraDirectorEnabled: params.get('camera') !== '0',
  atmosphereEnabled: params.get('atmosphere') !== '0',
  fixedCity: params.get('fixed') !== '0', // Fixed bounded city mode (default on)
};
