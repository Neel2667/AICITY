/**
 * ChatBot.ts
 * Frontend WebSocket client that connects to the AICITY chat server.
 *
 * The server (server/chatServer.ts) polls the YouTube Live Chat API and
 * forwards parsed messages as JSON over WebSocket. This client receives
 * them, runs them through the command parser, and dispatches to VoteManager
 * and CityEventBus.
 *
 * In dev mode (no server running), you can inject fake chat via:
 *   window.__aicityChat('!vote park', 'TestViewer', 'fake-channel-id')
 */

import { parseCommand, type ChatMessage } from './ChatCommand';
import { voteManager } from './VoteManager';
import { CityEventBus } from '../city/CityEventBus';
import { CityState } from '../city/CityState';

// Cooldowns per channel per command kind (ms)
const COOLDOWNS: Record<string, number> = {
  vote:      0,           // unlimited (VoteManager enforces 1-per-poll)
  name:      120_000,     // 2 minutes between name submissions
  camera:    30_000,      // 30 seconds between camera votes
  event:     300_000,     // 5 minutes for fireworks
  where:     15_000,      // 15 seconds for !where
  mayor:     3_600_000,   // 1 hour for mayor raffle
};

interface CooldownRecord {
  [channelId: string]: {
    [kind: string]: number; // last used timestamp
  };
}

export class ChatBot {
  private ws: WebSocket | null = null;
  private cooldowns: CooldownRecord = {};
  private mayorPool: Set<string> = new Set();
  private mayorRaffleTimer: ReturnType<typeof setInterval> | null = null;
  private readonly serverUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  constructor(serverUrl: string = 'ws://localhost:3717') {
    this.serverUrl = serverUrl;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  public connect(): void {
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.ws.onopen = () => {
        this.connected = true;
        console.log('[ChatBot] Connected to chat server');
        CityEventBus.emit('chatConnected', { url: this.serverUrl });
      };
      this.ws.onmessage = (event) => {
        try {
          const msg: ChatMessage = JSON.parse(event.data as string);
          this.handleMessage(msg);
        } catch (e) {
          // ignore malformed messages
        }
      };
      this.ws.onclose = () => {
        this.connected = false;
        console.warn('[ChatBot] Disconnected. Reconnecting in 5s...');
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      };
      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }

    // Register dev injection helper on window
    this.registerDevHelper();

    // Mayor raffle every 30 minutes
    this.mayorRaffleTimer = setInterval(() => this.runMayorRaffle(), 30 * 60_000);
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.mayorRaffleTimer) clearInterval(this.mayorRaffleTimer);
    this.ws?.close();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // ─── Message handling ──────────────────────────────────────────────────────

  private handleMessage(msg: ChatMessage): void {
    // Emit raw message for overlay to show activity
    CityEventBus.emit('chatMessage', {
      author: msg.authorName,
      text: msg.text,
      isSuperChat: msg.isSuperChat,
      amount: msg.superChatAmount,
    });

    const cmd = parseCommand(msg);
    if (!cmd) return;

    // Cooldown gate
    if (!this.checkCooldown(msg.authorChannelId, cmd.kind)) {
      console.log(`[ChatBot] Cooldown: ${msg.authorName} tried !${cmd.kind} too soon`);
      return;
    }

    this.recordCooldown(msg.authorChannelId, cmd.kind);

    switch (cmd.kind) {
      case 'vote':
        if (voteManager.isPollOpen() && cmd.voteOption) {
          const accepted = voteManager.castVote(msg.authorChannelId, cmd.voteOption);
          if (accepted) {
            CityEventBus.emit('chatVoteCast', { author: msg.authorName, option: cmd.voteOption });
          }
        }
        break;

      case 'name':
        if (cmd.nameText) {
          CityState.addContribution({
            name: cmd.authorName,
            action: 'submitted name',
            target: cmd.nameText,
            dayNumber: 0, // filled in by caller if needed
          });
          CityEventBus.emit('nameSubmitted', {
            author: msg.authorName,
            nameText: cmd.nameText,
            isModerator: msg.isModerator,
          });
        }
        break;

      case 'camera':
        if (cmd.cameraMode) {
          CityEventBus.emit('cameraVote', { author: msg.authorName, mode: cmd.cameraMode });
        }
        break;

      case 'event':
        if (cmd.eventId === 'fireworks') {
          // Super Chat required or moderator override
          if (msg.isSuperChat || msg.isModerator) {
            CityEventBus.emit('fireworksRequested', {
              author: msg.authorName,
              amount: msg.superChatAmount ?? 0,
            });
          }
        }
        break;

      case 'where':
        CityEventBus.emit('whereRequested', { author: msg.authorName });
        break;

      case 'mayor':
        this.mayorPool.add(msg.authorChannelId);
        CityEventBus.emit('mayorEntered', { author: msg.authorName });
        break;
    }
  }

  // ─── Cooldowns ─────────────────────────────────────────────────────────────

  private checkCooldown(channelId: string, kind: string): boolean {
    const cooldownMs = COOLDOWNS[kind] ?? 0;
    if (cooldownMs === 0) return true;
    const last = this.cooldowns[channelId]?.[kind] ?? 0;
    return Date.now() - last >= cooldownMs;
  }

  private recordCooldown(channelId: string, kind: string): void {
    if (!this.cooldowns[channelId]) this.cooldowns[channelId] = {};
    this.cooldowns[channelId][kind] = Date.now();
  }

  // ─── Mayor Raffle ──────────────────────────────────────────────────────────

  private runMayorRaffle(): void {
    if (this.mayorPool.size === 0) return;
    const pool = Array.from(this.mayorPool);
    const winnerChannelId = pool[Math.floor(Math.random() * pool.length)];
    this.mayorPool.clear();
    CityEventBus.emit('mayorElected', { channelId: winnerChannelId });
    console.log(`[ChatBot] Mayor elected: ${winnerChannelId}`);
  }

  // ─── Dev helper ────────────────────────────────────────────────────────────

  private registerDevHelper(): void {
    (window as any).__aicityChat = (
      text: string,
      authorName = 'DevViewer',
      authorChannelId = 'dev-channel-001',
    ) => {
      const msg: ChatMessage = {
        id: `dev_${Date.now()}`,
        authorName,
        authorChannelId,
        text,
        publishedAt: new Date().toISOString(),
        isModerator: false,
        isSuperChat: false,
      };
      this.handleMessage(msg);
    };
    console.log('[ChatBot] Dev helper ready: window.__aicityChat("!vote park")');
  }
}

export const chatBot = new ChatBot();
