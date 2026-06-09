/**
 * VoteManager.ts
 * Manages the city vote lifecycle:
 *   - Opens a poll for a fixed duration
 *   - Tallies unique votes (1 vote per channel ID per poll)
 *   - Applies the winning option via CityEventBus
 *   - Enforces cooldowns between polls
 *
 * Vote options map to city build actions:
 *   park        → add a park chunk in the next available slot
 *   apartments  → upgrade a midtown chunk to apartments
 *   factory     → expand Ironworks by one chunk
 *   shops       → add a shop row to Harbor District
 *   stadium     → unlock the stadium landmark (once only)
 */

import type { VoteOption } from './ChatCommand';
import { CityEventBus } from '../city/CityEventBus';

export interface VotePoll {
  id: string;
  question: string;
  options: VoteOption[];
  openedAt: number;       // Date.now()
  durationMs: number;
  votes: Map<string, VoteOption>; // channelId → choice
  closed: boolean;
  winner: VoteOption | null;
}

export interface VoteTally {
  option: VoteOption;
  count: number;
  percent: number;
}

// How long viewers vote (ms)
const POLL_DURATION_MS = 60_000;         // 60 seconds
// Minimum gap between polls (ms)
const POLL_COOLDOWN_MS = 5 * 60_000;     // 5 minutes
// How long to show results after poll closes (ms)
const RESULTS_DISPLAY_MS = 20_000;       // 20 seconds

export class VoteManager {
  private currentPoll: VotePoll | null = null;
  private lastPollEndedAt = 0;
  private stadiumBuilt = false;

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Open a new vote. Returns false if a poll is already open or in cooldown.
   */
  public openPoll(question?: string): boolean {
    if (this.isPollOpen()) return false;
    const now = Date.now();
    if (now - this.lastPollEndedAt < POLL_COOLDOWN_MS) return false;

    const options: VoteOption[] = this.stadiumBuilt
      ? ['park', 'apartments', 'factory', 'shops']
      : ['park', 'apartments', 'factory', 'shops', 'stadium'];

    this.currentPoll = {
      id: `poll_${now}`,
      question: question ?? 'What should the city build next?',
      options,
      openedAt: now,
      durationMs: POLL_DURATION_MS,
      votes: new Map(),
      closed: false,
      winner: null,
    };

    CityEventBus.emit('pollOpened', {
      id: this.currentPoll.id,
      question: this.currentPoll.question,
      options: this.currentPoll.options,
      durationMs: POLL_DURATION_MS,
    });

    console.log(`[VoteManager] Poll opened: "${this.currentPoll.question}"`);
    return true;
  }

  /**
   * Record a vote from a viewer. Silent no-op if poll is closed or option invalid.
   */
  public castVote(channelId: string, option: VoteOption): boolean {
    if (!this.currentPoll || this.currentPoll.closed) return false;
    if (!this.currentPoll.options.includes(option)) return false;
    this.currentPoll.votes.set(channelId, option);
    CityEventBus.emit('voteCast', { channelId, option, total: this.currentPoll.votes.size });
    return true;
  }

  /**
   * Should be called every frame / tick. Closes the poll when its duration expires.
   */
  public tick(): void {
    if (!this.currentPoll || this.currentPoll.closed) return;
    const age = Date.now() - this.currentPoll.openedAt;
    if (age >= this.currentPoll.durationMs) {
      this.closePoll();
    }
  }

  /**
   * Force-close the current poll and apply result.
   */
  public closePoll(): void {
    if (!this.currentPoll || this.currentPoll.closed) return;

    const tally = this.getTally();
    const winner = tally.length > 0 ? tally[0].option : null;

    this.currentPoll.closed = true;
    this.currentPoll.winner = winner;
    this.lastPollEndedAt = Date.now();

    if (winner) {
      this.applyWinner(winner);
    }

    CityEventBus.emit('pollClosed', {
      id: this.currentPoll.id,
      winner,
      tally: tally.map(t => ({ option: t.option, count: t.count, percent: t.percent })),
    });

    console.log(`[VoteManager] Poll closed. Winner: ${winner ?? 'no votes'}`);

    // Auto-clear poll after results display window
    setTimeout(() => {
      this.currentPoll = null;
    }, RESULTS_DISPLAY_MS);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  public isPollOpen(): boolean {
    return !!this.currentPoll && !this.currentPoll.closed;
  }

  public isInCooldown(): boolean {
    return Date.now() - this.lastPollEndedAt < POLL_COOLDOWN_MS;
  }

  public getSecondsUntilNextPoll(): number {
    if (this.isPollOpen()) return 0;
    const remaining = POLL_COOLDOWN_MS - (Date.now() - this.lastPollEndedAt);
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  public getSecondsRemaining(): number {
    if (!this.currentPoll || this.currentPoll.closed) return 0;
    const elapsed = Date.now() - this.currentPoll.openedAt;
    return Math.max(0, Math.ceil((this.currentPoll.durationMs - elapsed) / 1000));
  }

  public getPoll(): VotePoll | null {
    return this.currentPoll;
  }

  public getTally(): VoteTally[] {
    if (!this.currentPoll) return [];
    const counts: Map<VoteOption, number> = new Map();
    for (const opt of this.currentPoll.options) counts.set(opt, 0);
    for (const vote of this.currentPoll.votes.values()) {
      counts.set(vote, (counts.get(vote) ?? 0) + 1);
    }
    const total = this.currentPoll.votes.size || 1;
    return Array.from(counts.entries())
      .map(([option, count]) => ({ option, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private applyWinner(winner: VoteOption): void {
    if (winner === 'stadium') this.stadiumBuilt = true;
    CityEventBus.emit('buildVoteWon', { buildType: winner });
    console.log(`[VoteManager] Applying build vote: ${winner}`);
  }
}

export const voteManager = new VoteManager();
