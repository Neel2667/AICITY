/**
 * AmbientAudio.ts
 * Procedurally generates ambient city soundscape using the Web Audio API.
 * NO external audio files required — all sounds are synthesised.
 *
 * Layers:
 *   1. Base city hum (low-freq filtered noise) — always on
 *   2. Traffic whoosh layer — scales with time of day
 *   3. Bird/nature layer — dawn and greenway phase
 *   4. Rain layer — active when weather is 'Light Rain'
 *   5. Night ambience (crickets + distant sirens)
 *
 * All synthesis uses OscillatorNode + AudioBufferSourceNode (white noise).
 * Volume fades smoothly between layers as time of day changes.
 */
import type { CityClockSnapshot } from '../stream/CityClock';
import type { WeatherSnapshot } from '../weather/WeatherState';

type AudioLayer = {
  gainNode: GainNode;
  targetGain: number;
};

export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: Map<string, AudioLayer> = new Map();
  private started = false;
  private lastUpdate = 0;

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Must be called from a user gesture (click/keydown) to unlock AudioContext.
   * After that, audio runs automatically.
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.18; // overall quiet — city background
    this.masterGain.connect(this.ctx.destination);

    this.buildCityHum();
    this.buildTrafficLayer();
    this.buildBirdLayer();
    this.buildRainLayer();
    this.buildNightLayer();

    console.log('[AmbientAudio] Synthesised city soundscape started');
  }

  public stop(): void {
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
    this.layers.clear();
  }

  public isStarted(): boolean { return this.started; }

  /**
   * Call every frame (or on a 1s interval) to blend layers.
   */
  public update(clock: CityClockSnapshot, weather: WeatherSnapshot): void {
    if (!this.ctx || !this.started) return;
    const now = Date.now();
    if (now - this.lastUpdate < 1000) return; // update once per second
    this.lastUpdate = now;

    const t = clock.timeOfDay;
    const phase = clock.phase;

    // Traffic: busy during commute hours
    let traffic = 0;
    if (t >= 0.30 && t < 0.40) traffic = (t - 0.30) / 0.10;        // morning ramp
    else if (t >= 0.40 && t < 0.68) traffic = 1.0;                   // full day
    else if (t >= 0.68 && t < 0.80) traffic = 1.0 - (t - 0.68) / 0.12; // evening
    else if (t >= 0.21 && t < 0.30) traffic = (t - 0.21) / 0.09 * 0.4;  // pre-dawn trickle
    this.setTarget('traffic', traffic * 0.55);

    // Birds: dawn and early morning
    const birds = (phase === 'dawn') ? 0.8 : (t > 0.30 && t < 0.45) ? 0.4 : 0.0;
    this.setTarget('birds', birds);

    // Rain
    this.setTarget('rain', weather.kind === 'Light Rain' ? 0.85 : 0.0);

    // Night: crickets and sparse distant traffic
    const night = (phase === 'night') ? 0.6 : 0.0;
    this.setTarget('night', night);

    // Apply smooth fades
    this.applyFades();
  }

  // ─── Layer builders ────────────────────────────────────────────────────────

  private buildCityHum(): void {
    if (!this.ctx || !this.masterGain) return;
    const bufSec = 4;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * bufSec, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.28;

    src.connect(filter).connect(gain).connect(this.masterGain);
    src.start();
    // Hum doesn't vary — not tracked in layers
  }

  private buildTrafficLayer(): void {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.layers.set('traffic', { gainNode: gain, targetGain: 0 });

    // Filtered broadband noise
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.92;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.5;

    src.connect(filter).connect(gain);
    src.start();
  }

  private buildBirdLayer(): void {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.layers.set('birds', { gainNode: gain, targetGain: 0 });

    // High-pass filtered chirp simulation via oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2400;

    const tremolo = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5.5;
    lfo.connect(tremolo.gain);
    lfo.start();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    osc.connect(filter).connect(tremolo).connect(gain);
    osc.start();

    // Vary pitch slowly
    setInterval(() => {
      if (!this.ctx) return;
      osc.frequency.linearRampToValueAtTime(
        2200 + Math.random() * 800,
        this.ctx.currentTime + 1.5,
      );
    }, 1800);
  }

  private buildRainLayer(): void {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.layers.set('rain', { gainNode: gain, targetGain: 0 });

    // White noise through a resonant bandpass = rain
    const buf = this.ctx.createBuffer(2, this.ctx.sampleRate * 5, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.2;

    src.connect(filter).connect(gain);
    src.start();
  }

  private buildNightLayer(): void {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    this.layers.set('night', { gainNode: gain, targetGain: 0 });

    // Cricket-like high-freq oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 3800;

    const trem = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 14;
    lfo.connect(trem.gain);
    lfo.start();

    osc.connect(trem).connect(gain);
    osc.start();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private setTarget(id: string, value: number): void {
    const layer = this.layers.get(id);
    if (layer) layer.targetGain = Math.max(0, Math.min(1, value));
  }

  private applyFades(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [, layer] of this.layers) {
      layer.gainNode.gain.linearRampToValueAtTime(
        layer.targetGain,
        now + 3.0, // 3-second smooth crossfade
      );
    }
  }
}

export const ambientAudio = new AmbientAudio();
