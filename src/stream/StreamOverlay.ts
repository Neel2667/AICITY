/**
 * StreamOverlay.ts — Phase 4
 * Adds: bus arrival tickers, audio mute button, pedestrian count stat,
 *        fireworks announcement, enhanced dynamic ticker pool.
 */
import type { CityClockSnapshot } from './CityClock';
import type { StreamConfig } from './StreamConfig';
import type { WeatherSnapshot } from '../weather/WeatherState';
import { getActiveEvents, CITY_MAP } from '../city/CityMap';
import type { CityStateSnapshot } from '../city/CityState';
import { CityEventBus } from '../city/CityEventBus';

export class StreamOverlay {
  private readonly root: HTMLDivElement;
  private readonly clockEl: HTMLDivElement;
  private readonly dayEl: HTMLDivElement;
  private readonly weatherEl: HTMLDivElement;
  private readonly eventEl: HTMLDivElement;
  private readonly statsEl: HTMLDivElement;
  private readonly tickerEl: HTMLDivElement;
  private readonly locationEl: HTMLDivElement;
  private lastUpdate = 0;
  private lastTickerRotate = 0;
  private tickerIndex = 0;
  private dynamicTickers: string[] = [];

  private readonly staticTickers = [
    '📡 Camera Director: cinematic city patrol active',
    '🏗️ Ironworks Expansion Wing — under construction',
    '🗳️ Type !vote in chat to shape the next city build',
    '🌆 AICITY: a persistent little city that never sleeps',
    `🏙️ ${CITY_MAP.districts.length} districts · ${CITY_MAP.landmarks.length} named landmarks`,
    '☕ The Anchor Cafe opens at dawn in the Harbor District',
    '🎉 Festival Plaza hosts events every evening in Greenway',
    '🚌 3 bus routes connect all districts — running all night',
    '🚶 Residents walk the sidewalks day and night',
    '🎆 Super Chat to trigger fireworks over Festival Plaza!',
    '🗳️ Type !mayor to enter the next Mayor raffle',
    '📷 Type !camera follow to watch a city bus live',
  ];

  constructor(config: StreamConfig) {
    this.root = document.createElement('div');
    this.root.className = 'stream-overlay';

    const brand = document.createElement('div');
    brand.className = 'stream-card stream-brand';
    brand.innerHTML = `
      <div class="stream-kicker">LIVE CITY SIMULATION</div>
      <div class="stream-title">${this.escape(config.cityName)}</div>
      <div class="stream-tagline">${this.escape(config.tagline)}</div>
    `;

    const status = document.createElement('div');
    status.className = 'stream-card stream-status';

    this.clockEl   = document.createElement('div'); this.clockEl.className   = 'stream-clock';
    this.dayEl     = document.createElement('div'); this.dayEl.className     = 'stream-day';
    this.weatherEl = document.createElement('div'); this.weatherEl.className = 'stream-weather';
    this.eventEl   = document.createElement('div'); this.eventEl.className   = 'stream-event';
    this.statsEl   = document.createElement('div'); this.statsEl.className   = 'stream-stats';

    status.appendChild(this.clockEl);
    status.appendChild(this.dayEl);
    status.appendChild(this.weatherEl);
    status.appendChild(this.eventEl);
    status.appendChild(this.statsEl);

    this.tickerEl = document.createElement('div');
    this.tickerEl.className = 'stream-ticker';

    // "Now Touring" location badge — follows the guided tour camera.
    this.locationEl = document.createElement('div');
    this.locationEl.className = 'stream-location';
    this.locationEl.style.display = 'none';

    this.root.appendChild(brand);
    this.root.appendChild(this.locationEl);
    this.root.appendChild(status);
    this.root.appendChild(this.tickerEl);
    document.body.appendChild(this.root);

    this.bindCityEvents();
  }

  private bindCityEvents(): void {
    CityEventBus.on('busArrived', (p) => {
      this.pushDynamic(`🚌 ${p['routeName']} arrived at ${p['stopName']}`);
    });
    CityEventBus.on('fireworksRequested', (p) => {
      this.pushDynamic(`🎆 Fireworks launched by ${p['author']}!`);
    });
    CityEventBus.on('mayorElected', () => {
      this.pushDynamic('🎖️ A new Mayor has been elected in AICITY!');
    });
    CityEventBus.on('districtUnlocked', (p) => {
      this.pushDynamic(`🗺️ New district unlocked: ${p['name']}!`);
    });
    CityEventBus.on('constructionComplete', (p) => {
      this.pushDynamic(`🏗️ "${p['label']}" is now complete!`);
    });
    CityEventBus.on('nameSubmitted', (p) => {
      this.pushDynamic(`💬 ${p['author']} suggested name: "${p['nameText']}"`);
    });
    CityEventBus.on('trainArrived', (p) => {
      this.pushDynamic(`🚂 Train now arriving at ${p['station'] ?? 'Central Station'}`);
    });
    // Guided tour: show the place we're currently flying over.
    CityEventBus.on('tourStop', (p) => {
      const icon = (p['icon'] as string) ?? '📍';
      const name = (p['zoneName'] as string) ?? (p['name'] as string) ?? '';
      const blurb = (p['blurb'] as string) ?? '';
      this.locationEl.innerHTML =
        `<div class="loc-kicker">NOW TOURING</div>` +
        `<div class="loc-name">${icon} ${this.escape(name)}</div>` +
        (blurb ? `<div class="loc-blurb">${this.escape(blurb)}</div>` : '');
      this.locationEl.style.display = 'block';
      this.pushDynamic(`${icon} Now showing: ${name}`);
    });
  }

  private pushDynamic(msg: string): void {
    this.dynamicTickers.unshift(msg);
    if (this.dynamicTickers.length > 12) this.dynamicTickers.pop();
    // Show immediately
    this.tickerEl.textContent = msg;
    this.lastTickerRotate = Date.now();
  }

  public update(
    clock: CityClockSnapshot,
    weather: WeatherSnapshot,
    cityState?: CityStateSnapshot,
  ): void {
    if (clock.nowMs - this.lastUpdate < 250) return;
    this.lastUpdate = clock.nowMs;

    this.clockEl.textContent   = clock.cityTimeText;
    this.dayEl.textContent     = `${clock.dayLabel} · ${clock.phaseLabel}`;
    this.weatherEl.textContent = `${weather.icon} ${weather.kind} — ${weather.description}`;

    const activeEvents = getActiveEvents(clock.timeOfDay);
    if (activeEvents.length > 0) {
      this.eventEl.textContent = `${activeEvents[0].icon} ${activeEvents[0].label}`;
      this.eventEl.style.display = 'block';
    } else {
      this.eventEl.style.display = 'none';
    }

    if (cityState) {
      this.statsEl.textContent =
        `👥 ${cityState.population.toLocaleString()} · 🏢 ${cityState.buildings} bldgs`;
    } else {
      this.statsEl.textContent =
        `👥 ${CITY_MAP.population.toLocaleString()} · 🏢 ${CITY_MAP.buildings} bldgs`;
    }

    // Rotate ticker every 12 seconds
    if (clock.nowMs - this.lastTickerRotate > 12000) {
      this.lastTickerRotate = clock.nowMs;
      const pool = [
        ...this.dynamicTickers,
        ...this.staticTickers,
      ];
      if (cityState?.activeConstruction.length) {
        for (const p of cityState.activeConstruction) {
          pool.push(`🏗️ ${p.label} — completes Day ${p.completionDayNumber}`);
        }
      }
      this.tickerIndex = (this.tickerIndex + 1) % pool.length;
      this.tickerEl.textContent = pool[this.tickerIndex];
    }
  }

  private escape(v: string): string {
    return v.replace(/[&<>'"]/g, c => (
      {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c
    ));
  }
}
