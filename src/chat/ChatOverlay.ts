/**
 * ChatOverlay.ts
 * Renders the in-stream chat activity panel:
 *   - Active vote poll with live tally bars
 *   - Vote countdown timer
 *   - Recent chat messages (last 5 visible)
 *   - Super Chat highlight
 *   - Mayor election result
 *   - !where city status reply
 *
 * This is a separate DOM layer, injected alongside StreamOverlay.
 * All elements use inline CSS via class names defined in style.css.
 */

import { CityEventBus } from '../city/CityEventBus';
import { voteManager } from './VoteManager';
import type { VoteOption } from './ChatCommand';
import { CITY_MAP } from '../city/CityMap';
import type { CityStateSnapshot } from '../city/CityState';
import type { CityClockSnapshot } from '../stream/CityClock';

interface ChatLine {
  author: string;
  text: string;
  isSuperChat: boolean;
  amount?: number;
  ts: number;
}

const MAX_CHAT_LINES = 5;
const CHAT_LINE_TTL_MS = 30_000; // lines disappear after 30s
const BANNER_TTL_MS = 8_000;     // mayor / superchat banner duration

export class ChatOverlay {
  private readonly root: HTMLDivElement;
  private readonly pollCard: HTMLDivElement;
  private readonly pollQuestion: HTMLDivElement;
  private readonly pollBars: HTMLDivElement;
  private readonly pollTimer: HTMLDivElement;
  private readonly chatCard: HTMLDivElement;
  private readonly chatLines: HTMLDivElement;
  private readonly bannerCard: HTMLDivElement;
  private readonly bannerText: HTMLDivElement;

  private lines: ChatLine[] = [];
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRender = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'chat-overlay';

    // ── Poll card (bottom-left) ──
    this.pollCard = document.createElement('div');
    this.pollCard.className = 'chat-card poll-card';
    this.pollCard.style.display = 'none';

    this.pollQuestion = document.createElement('div');
    this.pollQuestion.className = 'poll-question';

    this.pollBars = document.createElement('div');
    this.pollBars.className = 'poll-bars';

    this.pollTimer = document.createElement('div');
    this.pollTimer.className = 'poll-timer';

    this.pollCard.appendChild(this.pollQuestion);
    this.pollCard.appendChild(this.pollBars);
    this.pollCard.appendChild(this.pollTimer);

    // ── Chat feed card (left side, above poll) ──
    this.chatCard = document.createElement('div');
    this.chatCard.className = 'chat-card chat-feed-card';

    this.chatLines = document.createElement('div');
    this.chatLines.className = 'chat-lines';
    this.chatCard.appendChild(this.chatLines);

    // ── Banner (center, temporary announcements) ──
    this.bannerCard = document.createElement('div');
    this.bannerCard.className = 'chat-banner';
    this.bannerCard.style.display = 'none';

    this.bannerText = document.createElement('div');
    this.bannerText.className = 'chat-banner-text';
    this.bannerCard.appendChild(this.bannerText);

    this.root.appendChild(this.pollCard);
    this.root.appendChild(this.chatCard);
    this.root.appendChild(this.bannerCard);
    document.body.appendChild(this.root);

    this.bindEvents();
  }

  // ─── Event bindings ────────────────────────────────────────────────────────

  private bindEvents(): void {
    CityEventBus.on('chatMessage', (p) => {
      this.addLine({
        author: p['author'] as string,
        text: p['text'] as string,
        isSuperChat: p['isSuperChat'] as boolean,
        amount: p['amount'] as number | undefined,
        ts: Date.now(),
      });
      if (p['isSuperChat']) {
        this.showBanner(`💛 Super Chat from ${p['author']}: $${p['amount'] ?? '?'} — Thank you!`);
      }
    });

    CityEventBus.on('pollOpened', (p) => {
      this.pollCard.style.display = 'block';
      this.pollQuestion.textContent = `🗳️ ${p['question']}`;
    });

    CityEventBus.on('pollClosed', (p) => {
      const winner = p['winner'] as VoteOption | null;
      if (winner) {
        this.showBanner(`✅ Vote closed! "${winner}" wins — building soon!`);
      }
      setTimeout(() => {
        this.pollCard.style.display = 'none';
      }, 20_000);
    });

    CityEventBus.on('mayorElected', () => {
      this.showBanner('🎖️ A new Mayor has been elected! Congrats to our new city leader!');
    });

    CityEventBus.on('fireworksRequested', (p) => {
      this.showBanner(`🎆 Fireworks requested by ${p['author']}! Stand by...`);
    });

    CityEventBus.on('districtUnlocked', (p) => {
      this.showBanner(`🗺️ New district unlocked: ${p['name']}! Welcome to the city.`);
    });

    CityEventBus.on('constructionComplete', (p) => {
      this.showBanner(`🏗️ "${p['label']}" construction complete!`);
    });

    CityEventBus.on('buildVoteWon', (p) => {
      this.showBanner(`🏆 Build vote won: ${p['buildType']} — breaking ground now!`);
    });
  }

  // ─── Chat lines ────────────────────────────────────────────────────────────

  private addLine(line: ChatLine): void {
    this.lines.unshift(line);
    // Prune old / excess lines
    const cutoff = Date.now() - CHAT_LINE_TTL_MS;
    this.lines = this.lines.filter(l => l.ts > cutoff).slice(0, MAX_CHAT_LINES);
    this.renderLines();
  }

  private renderLines(): void {
    this.chatLines.innerHTML = '';
    for (const line of this.lines) {
      const el = document.createElement('div');
      el.className = line.isSuperChat ? 'chat-line chat-line--super' : 'chat-line';
      const author = document.createElement('span');
      author.className = 'chat-author';
      author.textContent = line.author + ': ';
      const msg = document.createElement('span');
      msg.className = 'chat-msg';
      msg.textContent = line.text;
      el.appendChild(author);
      el.appendChild(msg);
      this.chatLines.appendChild(el);
    }
  }

  // ─── Banner ────────────────────────────────────────────────────────────────

  private showBanner(text: string): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerText.textContent = text;
    this.bannerCard.style.display = 'flex';
    this.bannerTimer = setTimeout(() => {
      this.bannerCard.style.display = 'none';
    }, BANNER_TTL_MS);
  }

  // ─── Per-frame update ──────────────────────────────────────────────────────

  public update(clock: CityClockSnapshot, cityState?: CityStateSnapshot): void {
    if (clock.nowMs - this.lastRender < 500) return;
    this.lastRender = clock.nowMs;

    // Expire stale chat lines
    const cutoff = Date.now() - CHAT_LINE_TTL_MS;
    const before = this.lines.length;
    this.lines = this.lines.filter(l => l.ts > cutoff);
    if (this.lines.length !== before) this.renderLines();

    // Poll tally
    voteManager.tick();
    if (voteManager.isPollOpen()) {
      const tally = voteManager.getTally();
      const secs = voteManager.getSecondsRemaining();
      this.renderPollBars(tally);
      this.pollTimer.textContent = `⏱ ${secs}s remaining · ${voteManager.getPoll()!.votes.size} votes`;
      this.pollCard.style.display = 'block';
    }
  }

  private renderPollBars(tally: { option: VoteOption; count: number; percent: number }[]): void {
    this.pollBars.innerHTML = '';
    for (const t of tally) {
      const row = document.createElement('div');
      row.className = 'poll-row';

      const label = document.createElement('div');
      label.className = 'poll-label';
      label.textContent = `${t.option}`;

      const barWrap = document.createElement('div');
      barWrap.className = 'poll-bar-wrap';

      const bar = document.createElement('div');
      bar.className = 'poll-bar';
      bar.style.width = `${t.percent}%`;

      const pct = document.createElement('div');
      pct.className = 'poll-pct';
      pct.textContent = `${t.percent}% (${t.count})`;

      barWrap.appendChild(bar);
      row.appendChild(label);
      row.appendChild(barWrap);
      row.appendChild(pct);
      this.pollBars.appendChild(row);
    }
  }

  /**
   * Helper — generates the !where city status string for the chat bot server
   * to reply with (the server pings this and posts it back to YouTube chat).
   */
  public static buildWhereReply(clock: CityClockSnapshot, cityState: CityStateSnapshot): string {
    const district = CITY_MAP.districts[Math.floor(Math.random() * CITY_MAP.districts.length)];
    return (
      `📍 AICITY — Day ${clock.dayNumber}, ${clock.cityTimeText} (${clock.phaseLabel}) · ` +
      `Pop ${cityState.population.toLocaleString()} · ${cityState.buildings} buildings · ` +
      `Currently in ${district.name} — ${district.description}`
    );
  }
}
