/**
 * chatServer.ts — AICITY Chat Server (Phase 3)
 *
 * Runs as a standalone Node.js process alongside the Vite dev/prod frontend.
 *
 * Responsibilities:
 *   1. Polls the YouTube Live Chat API every ~3 seconds using your API key + liveChatId
 *   2. Forwards parsed chat messages to all connected WebSocket clients (the frontend)
 *   3. Listens for !where requests from the frontend and posts replies back to YouTube chat
 *   4. Handles moderation: blocklist, spam throttle, command flood prevention
 *
 * Setup:
 *   cd server
 *   npm install
 *   YOUTUBE_API_KEY=AIza... LIVE_CHAT_ID=xxx npm run start
 *
 * WebSocket message format (server → client):
 *   { id, authorName, authorChannelId, text, publishedAt, isModerator, isSuperChat, superChatAmount? }
 *
 * WebSocket message format (client → server):
 *   { type: 'reply', text: string }   — posts a message to YouTube chat (bot account)
 */

import { WebSocketServer, WebSocket } from 'ws';
import https from 'https';

// ─── Config (from env) ────────────────────────────────────────────────────────
const PORT              = Number(process.env.CHAT_SERVER_PORT   ?? 3717);
const YT_API_KEY        = process.env.YOUTUBE_API_KEY           ?? '';
const LIVE_CHAT_ID      = process.env.LIVE_CHAT_ID              ?? '';
const POLL_INTERVAL_MS  = Number(process.env.POLL_INTERVAL_MS   ?? 3000);

// ─── State ────────────────────────────────────────────────────────────────────
let pageToken: string | undefined;
let clients: Set<WebSocket> = new Set();
// Simple spam guard: track message count per channelId in last 10s window
const recentMessages: Map<string, number[]> = new Map();
const SPAM_MAX = 5;        // max 5 messages per 10s per channel
const SPAM_WINDOW_MS = 10_000;

// Blocklist (extend as needed)
const BLOCKED_CHANNEL_IDS = new Set<string>([]);

// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`[ChatServer] WebSocket listening on ws://localhost:${PORT}`);
  if (!YT_API_KEY || !LIVE_CHAT_ID) {
    console.warn('[ChatServer] ⚠️  YOUTUBE_API_KEY or LIVE_CHAT_ID not set.');
    console.warn('[ChatServer]    Chat polling disabled. Frontend dev helper still works.');
  } else {
    startPolling();
  }
});

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[ChatServer] Client connected. Total: ${clients.size}`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; text?: string };
      if (msg.type === 'reply' && msg.text) {
        postReplyToYouTube(msg.text);
      }
    } catch { /* ignore */ }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[ChatServer] Client disconnected. Total: ${clients.size}`);
  });
});

// ─── YouTube Chat Polling ─────────────────────────────────────────────────────
function startPolling(): void {
  console.log('[ChatServer] Starting YouTube Live Chat polling...');
  pollOnce();
}

function pollOnce(): void {
  const params = new URLSearchParams({
    liveChatId: LIVE_CHAT_ID,
    part: 'snippet,authorDetails',
    key: YT_API_KEY,
    maxResults: '200',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    res.on('end', () => {
      try {
        const json = JSON.parse(data) as any;

        if (json.error) {
          console.error('[ChatServer] YouTube API error:', json.error.message);
          setTimeout(pollOnce, POLL_INTERVAL_MS * 3);
          return;
        }

        pageToken = json.nextPageToken;
        const pollingIntervalMs = json.pollingIntervalMillis ?? POLL_INTERVAL_MS;
        const items: any[] = json.items ?? [];

        for (const item of items) {
          const snippet = item.snippet ?? {};
          const author  = item.authorDetails ?? {};
          const channelId: string = author.channelId ?? '';

          if (BLOCKED_CHANNEL_IDS.has(channelId)) continue;
          if (isSpam(channelId)) continue;

          const isLiveChatSuperChatEvent =
            snippet.type === 'superChatEvent' || snippet.type === 'superStickerEvent';
          const superChatDetails = snippet.superChatDetails ?? {};

          const msg = {
            id: item.id as string,
            authorName: (author.displayName ?? 'Viewer') as string,
            authorChannelId: channelId,
            text: isLiveChatSuperChatEvent
              ? (superChatDetails.userComment ?? '') as string
              : (snippet.displayMessage ?? '') as string,
            publishedAt: (snippet.publishedAt ?? new Date().toISOString()) as string,
            isModerator: (author.isChatModerator ?? false) as boolean,
            isSuperChat: isLiveChatSuperChatEvent,
            superChatAmount: isLiveChatSuperChatEvent
              ? (Number(superChatDetails.amountDisplayString?.replace(/[^0-9.]/g, '')) || undefined)
              : undefined,
          };

          // Skip empty messages
          if (!msg.text.trim()) continue;

          broadcast(msg);
        }

        setTimeout(pollOnce, pollingIntervalMs);
      } catch (e) {
        console.error('[ChatServer] Parse error:', e);
        setTimeout(pollOnce, POLL_INTERVAL_MS);
      }
    });
  }).on('error', (e) => {
    console.error('[ChatServer] HTTP error:', e.message);
    setTimeout(pollOnce, POLL_INTERVAL_MS * 2);
  });
}

// ─── Post reply to YouTube ────────────────────────────────────────────────────
function postReplyToYouTube(text: string): void {
  // Requires OAuth 2.0 — not available with API key alone.
  // In Phase 4 we will add OAuth bot account support.
  // For now, log the reply so it can be manually posted or piped to a bot.
  console.log(`[ChatServer] [BOT REPLY] ${text}`);
}

// ─── Broadcast to all WebSocket clients ──────────────────────────────────────
function broadcast(msg: object): void {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ─── Spam guard ───────────────────────────────────────────────────────────────
function isSpam(channelId: string): boolean {
  const now = Date.now();
  const window_start = now - SPAM_WINDOW_MS;
  const times = (recentMessages.get(channelId) ?? []).filter(t => t > window_start);
  times.push(now);
  recentMessages.set(channelId, times);
  return times.length > SPAM_MAX;
}
