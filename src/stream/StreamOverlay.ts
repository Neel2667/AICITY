import type { CityClockSnapshot } from './CityClock';
import type { StreamConfig } from './StreamConfig';
import type { WeatherSnapshot } from '../weather/WeatherState';

export class StreamOverlay {
  private readonly root: HTMLDivElement;
  private readonly clockEl: HTMLDivElement;
  private readonly dayEl: HTMLDivElement;
  private readonly weatherEl: HTMLDivElement;
  private readonly tickerEl: HTMLDivElement;
  private lastUpdate = 0;

  private readonly tickerMessages = [
    'Camera Director: cinematic city patrol active',
    'Harbor’s End — A real city that never sleeps',
    'Fixed persistent city active — no more random generation',
    'Day/Night cycle running • Watch it grow over time',
  ];

  constructor(config: StreamConfig) {
    this.root = document.createElement('div');
    this.root.className = 'stream-overlay'; // M3: Stream overlay finalized

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

    status.appendChild(this.clockEl);
    status.appendChild(this.dayEl);
    status.appendChild(this.weatherEl);

    this.tickerEl = document.createElement('div');
    this.tickerEl.className = 'stream-ticker'; // M3: Ticker finalized for stream

    this.root.appendChild(brand);
    this.root.appendChild(status);
    this.root.appendChild(this.tickerEl);
    document.body.appendChild(this.root);
  }

  public update(clock: CityClockSnapshot, weather: WeatherSnapshot): void {
    if (clock.nowMs - this.lastUpdate < 250) return;
    this.lastUpdate = clock.nowMs;

    const tickerIndex = Math.floor(clock.elapsedSeconds / 12) % this.tickerMessages.length;

    this.clockEl.textContent = clock.cityTimeText;
    this.dayEl.textContent = `${clock.dayLabel} • ${clock.phaseLabel}`;
    this.weatherEl.textContent = `${weather.icon} ${weather.kind}`;
    this.tickerEl.textContent = this.tickerMessages[tickerIndex];
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case "'":
          return '&#39;';
        case '"':
          return '&quot;';
        default:
          return char;
      }
    });
  }
}
