/**
 * StreamOverlay.ts — Phase 2
 * Rich overlay: city time, day, weather, active events, city stats, rotating ticker.
 */
import type { CityClockSnapshot } from './CityClock';
import type { StreamConfig } from './StreamConfig';
import type { WeatherSnapshot } from '../weather/WeatherState';
import { getActiveEvents, CITY_MAP } from '../city/CityMap';
import type { CityStateSnapshot } from '../city/CityState';

export class StreamOverlay {
  private readonly root: HTMLDivElement;
  private readonly clockEl: HTMLDivElement;
  private readonly dayEl: HTMLDivElement;
  private readonly weatherEl: HTMLDivElement;
  private readonly eventEl: HTMLDivElement;
  private readonly statsEl: HTMLDivElement;
  private readonly tickerEl: HTMLDivElement;
  private lastUpdate = 0;
  private lastTickerRotate = 0;
  private tickerIndex = 0;

  private readonly staticTickers = [
    '📡 Camera Director: cinematic city patrol active',
    '🏗️ Ironworks Expansion Wing — under construction',
    '🗳️ Coming soon: viewer votes will shape the city',
    '🌆 AICITY remembers: this is a persistent living city',
    `🏙️ ${CITY_MAP.districts.length} districts · ${CITY_MAP.landmarks.length} named landmarks`,
    '☕ The Anchor Cafe opens at dawn in the Harbor District',
    '🎉 Festival Plaza hosts events every evening in Greenway',
    '🚌 City buses run all night between Downtown and Midtown',
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

    this.clockEl = document.createElement('div');
    this.clockEl.className = 'stream-clock';

    this.dayEl = document.createElement('div');
    this.dayEl.className = 'stream-day';

    this.weatherEl = document.createElement('div');
    this.weatherEl.className = 'stream-weather';

    this.eventEl = document.createElement('div');
    this.eventEl.className = 'stream-event';

    this.statsEl = document.createElement('div');
    this.statsEl.className = 'stream-stats';

    status.appendChild(this.clockEl);
    status.appendChild(this.dayEl);
    status.appendChild(this.weatherEl);
    status.appendChild(this.eventEl);
    status.appendChild(this.statsEl);

    this.tickerEl = document.createElement('div');
    this.tickerEl.className = 'stream-ticker';

    this.root.appendChild(brand);
    this.root.appendChild(status);
    this.root.appendChild(this.tickerEl);
    document.body.appendChild(this.root);
  }

  public update(
    clock: CityClockSnapshot,
    weather: WeatherSnapshot,
    cityState?: CityStateSnapshot,
  ): void {
    if (clock.nowMs - this.lastUpdate < 250) return;
    this.lastUpdate = clock.nowMs;

    this.clockEl.textContent = clock.cityTimeText;
    this.dayEl.textContent = `${clock.dayLabel} · ${clock.phaseLabel}`;
    this.weatherEl.textContent = `${weather.icon} ${weather.kind} — ${weather.description}`;

    const activeEvents = getActiveEvents(clock.timeOfDay);
    if (activeEvents.length > 0) {
      const ev = activeEvents[0];
      this.eventEl.textContent = `${ev.icon} ${ev.label}`;
      this.eventEl.style.display = 'block';
    } else {
      this.eventEl.style.display = 'none';
    }

    if (cityState) {
      this.statsEl.textContent = `👥 Pop ${cityState.population.toLocaleString()} · 🏢 ${cityState.buildings} buildings`;
    } else {
      this.statsEl.textContent = `👥 Pop ${CITY_MAP.population.toLocaleString()} · 🏢 ${CITY_MAP.buildings} buildings`;
    }

    if (clock.nowMs - this.lastTickerRotate > 14000) {
      this.lastTickerRotate = clock.nowMs;
      const tickers = [...this.staticTickers];
      if (cityState?.activeConstruction.length) {
        for (const proj of cityState.activeConstruction) {
          tickers.push(`🏗️ ${proj.label} — completes Day ${proj.completionDayNumber}`);
        }
      }
      if (cityState?.recentContributions.length) {
        const c = cityState.recentContributions[0];
        tickers.push(`💬 @${c.name} ${c.action} "${c.target}"`);
      }
      this.tickerIndex = (this.tickerIndex + 1) % tickers.length;
      this.tickerEl.textContent = tickers[this.tickerIndex];
    }
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, (char) => {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        default: return char;
      }
    });
  }
}
