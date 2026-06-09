/**
 * chatServer.ts — AICITY Chat Server (Phase 5)
 *
 * Additions over Phase 3:
 *   - SQLite persistence (CityDatabase) — survives restarts
 *   - OAuth bot replies to !where and poll results on YouTube chat
 *   - Admin REST API on port 3718 (protected by ADMIN_SECRET)
 *   - Chat log stored to DB (pruned to 24h)
 *   - Mayor names persisted to DB
 *   - Vote results persisted to DB
 *   - District unlock ticks driven by DB day_number on startup
 */
import { WebSocketServer, WebSocket } from 'ws';
import https from 'https';
import http  from 'http';
import { cityDB } from './db/CityDatabase.js';
import { OAuthBot } from './auth/OAuthBot.js';

// ─── Config ────────────────────────────────────────────────────────────────────
const WS_PORT        = Number(process.env.CHAT_SERVER_PORT ?? 3717);
const ADMIN_PORT     = Number(process.env.ADMIN_PORT       ?? 3718);
const YT_API_KEY     = process.env.YOUTUBE_API_KEY         ?? '';
const LIVE_CHAT_ID   = process.env.LIVE_CHAT_ID            ?? '';
const POLL_MS        = Number(process.env.POLL_INTERVAL_MS ?? 3000);
const ADMIN_SECRET   = process.env.ADMIN_SECRET            ?? 'aicity-dev-secret';

// ─── Singletons ────────────────────────────────────────────────────────────────
const oauthBot = new OAuthBot(LIVE_CHAT_ID);
let pageToken: string | undefined;
const clients = new Set<WebSocket>();
const recentMsgs = new Map<string, number[]>();
const SPAM_MAX = 5;
const SPAM_WIN = 10_000;
const BLOCKED = new Set<string>();

// ─── Restore persistent city state ────────────────────────────────────────────
const meta = cityDB.getMeta();
console.log(`[Server] Restored state — Day ${meta.dayNumber} · Pop ${meta.population} · ${meta.buildings} bldgs`);

// Tick district unlocks based on saved day
const savedDay = meta.dayNumber;
if (savedDay >= 3) cityDB.unlockDistrict('ironworks');
if (savedDay >= 6) cityDB.unlockDistrict('greenway');

// Prune old chat on startup
cityDB.pruneOldChat();

// ─── WebSocket server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });
wss.on('listening', () => {
  console.log(`[WS] Listening on ws://localhost:${WS_PORT}`);
  if (!YT_API_KEY || !LIVE_CHAT_ID) {
    console.warn('[WS] No YOUTUBE_API_KEY/LIVE_CHAT_ID — polling disabled, dev mode only');
  } else {
    startPolling();
  }
});

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send persisted state snapshot immediately on connect
  ws.send(JSON.stringify({ type: 'stateSnapshot', payload: cityDB.getFullSnapshot() }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; [k: string]: any };
      handleClientMessage(msg, ws);
    } catch { /* ignore */ }
  });
  ws.on('close', () => { clients.delete(ws); });
});

function handleClientMessage(msg: { type: string; [k: string]: any }, ws: WebSocket): void {
  switch (msg.type) {
    case 'reply':
      // Frontend requested bot post to YouTube chat
      if (typeof msg['text'] === 'string') {
        oauthBot.postMessage(msg['text']).then(ok => {
          if (!ok) console.warn('[OAuthBot] Reply not sent (disabled or failed)');
        });
      }
      break;

    case 'voteResult':
      // Frontend closed a poll — persist result
      if (msg['pollId'] && msg['winner']) {
        cityDB.addVoteResult(msg['pollId'], msg['winner'], msg['totalVotes'] ?? 0);
        cityDB.addConstruction(4, 4, `Community ${msg['winner']} Project`,
          msg['dayNumber'] ?? savedDay, (msg['dayNumber'] ?? savedDay) + 3);
        // Bot reply
        const reply = `🗳️ Vote closed! "${msg['winner']}" wins — breaking ground now! 🏗️`;
        oauthBot.postMessage(reply);
        broadcast({ type: 'tickerPush', text: reply });
      }
      break;

    case 'mayorElected':
      // Frontend elected a mayor — persist it
      if (msg['channelId']) {
        cityDB.addMayor(msg['channelId'], msg['authorName'] ?? 'Unknown', savedDay);
        const reply = `🎖️ Congratulations to our new Mayor! Long may they serve AICITY!`;
        oauthBot.postMessage(reply);
      }
      break;

    case 'dayAdvance':
      // Frontend advanced a city day — persist
      if (typeof msg['dayNumber'] === 'number') {
        cityDB.advanceDay(msg['dayNumber']);
        if (msg['dayNumber'] >= 3) cityDB.unlockDistrict('ironworks');
        if (msg['dayNumber'] >= 6) cityDB.unlockDistrict('greenway');
      }
      break;

    case 'constructionComplete':
      if (typeof msg['constructionId'] === 'number') {
        cityDB.completeConstruction(msg['constructionId']);
        const reply = `🏗️ "${msg['label']}" construction complete! The city grows! 🌆`;
        oauthBot.postMessage(reply);
        broadcast({ type: 'tickerPush', text: reply });
      }
      break;

    case 'viewerContribution':
      cityDB.addContribution(
        msg['channelId'] ?? '', msg['authorName'] ?? '',
        msg['action'] ?? 'action', msg['target'] ?? '',
        msg['dayNumber'] ?? savedDay,
      );
      break;

    case 'ping':
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

// ─── YouTube polling ──────────────────────────────────────────────────────────
function startPolling(): void {
  console.log('[Polling] YouTube Live Chat polling started');
  pollOnce();
}

function pollOnce(): void {
  const params = new URLSearchParams({
    liveChatId: LIVE_CHAT_ID, part: 'snippet,authorDetails',
    key: YT_API_KEY, maxResults: '200',
  });
  if (pageToken) params.set('pageToken', pageToken);

  https.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`, (res) => {
    let data = '';
    res.on('data', (c: Buffer) => { data += c.toString(); });
    res.on('end', () => {
      try {
        const json = JSON.parse(data) as any;
        if (json.error) {
          console.error('[Polling] YT API error:', json.error.message);
          setTimeout(pollOnce, POLL_MS * 4); return;
        }
        pageToken = json.nextPageToken;
        const interval = json.pollingIntervalMillis ?? POLL_MS;
        for (const item of (json.items ?? [])) {
          const snippet = item.snippet ?? {};
          const author  = item.authorDetails ?? {};
          const chanId: string = author.channelId ?? '';
          if (BLOCKED.has(chanId) || isSpam(chanId)) continue;
          const isSuper = snippet.type === 'superChatEvent' || snippet.type === 'superStickerEvent';
          const superDet = snippet.superChatDetails ?? {};
          const chatMsg = {
            id: item.id as string,
            authorName: (author.displayName ?? 'Viewer') as string,
            authorChannelId: chanId,
            text: isSuper ? (superDet.userComment ?? '') : (snippet.displayMessage ?? ''),
            publishedAt: snippet.publishedAt ?? new Date().toISOString(),
            isModerator: Boolean(author.isChatModerator),
            isSuperChat: isSuper,
            superChatAmount: isSuper ? (Number(superDet.amountDisplayString?.replace(/[^0-9.]/g,'')) || undefined) : undefined,
          };
          if (!chatMsg.text.trim()) continue;
          cityDB.logChat({ id: chatMsg.id, channelId: chatMsg.authorChannelId, authorName: chatMsg.authorName, text: chatMsg.text, isSuperChat: chatMsg.isSuperChat, amount: chatMsg.superChatAmount, publishedAt: chatMsg.publishedAt });
          broadcast(chatMsg);
          handleWhereCommand(chatMsg);
        }
        setTimeout(pollOnce, interval);
      } catch (e) {
        console.error('[Polling] Parse error:', e);
        setTimeout(pollOnce, POLL_MS);
      }
    });
  }).on('error', (e) => {
    console.error('[Polling] HTTP error:', e.message);
    setTimeout(pollOnce, POLL_MS * 2);
  });
}

// Auto !where reply
function handleWhereCommand(msg: any): void {
  if (!msg.text.trim().toLowerCase().startsWith('!where')) return;
  const m = cityDB.getMeta();
  const districts = cityDB.getDistricts().filter(d => d.unlocked).map(d => d.name).join(', ');
  const reply = `📍 AICITY — Day ${m.dayNumber} · Pop ${m.population.toLocaleString()} · ${m.buildings} bldgs · Districts: ${districts}`;
  oauthBot.postMessage(reply);
}

// ─── Admin REST API (port 3718) ───────────────────────────────────────────────
const adminServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Auth check
  const auth = req.headers['authorization'] ?? '';
  if (!auth.includes(ADMIN_SECRET)) {
    res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return;
  }

  const url = new URL(req.url!, `http://localhost:${ADMIN_PORT}`);

  if (req.method === 'GET') {
    switch (url.pathname) {
      case '/state':
        res.writeHead(200); res.end(JSON.stringify(cityDB.getFullSnapshot())); break;
      case '/chat':
        res.writeHead(200); res.end(JSON.stringify(cityDB.getRecentChat(100))); break;
      case '/mayors':
        res.writeHead(200); res.end(JSON.stringify(cityDB.getMayorHistory(20))); break;
      case '/votes':
        res.writeHead(200); res.end(JSON.stringify(cityDB.getVoteHistory(30))); break;
      case '/contributions':
        res.writeHead(200); res.end(JSON.stringify(cityDB.getRecentContributions(50))); break;
      default:
        res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        switch (url.pathname) {
          case '/broadcast':
            broadcast({ type: 'adminMessage', text: data.text ?? '' });
            oauthBot.postMessage(`📢 [AICITY Admin] ${data.text}`);
            res.writeHead(200); res.end(JSON.stringify({ ok: true })); break;
          case '/construction/add':
            const id = cityDB.addConstruction(data.chunkX??4, data.chunkY??4, data.label??'Project', data.startDay??savedDay, data.completionDay??savedDay+3);
            broadcast({ type: 'constructionAdded', id, ...data });
            res.writeHead(200); res.end(JSON.stringify({ ok: true, id })); break;
          case '/block':
            if (data.channelId) BLOCKED.add(data.channelId);
            res.writeHead(200); res.end(JSON.stringify({ ok: true })); break;
          case '/unblock':
            if (data.channelId) BLOCKED.delete(data.channelId);
            res.writeHead(200); res.end(JSON.stringify({ ok: true })); break;
          case '/poll/open':
            broadcast({ type: 'adminOpenPoll', question: data.question ?? 'What should the city build next?' });
            res.writeHead(200); res.end(JSON.stringify({ ok: true })); break;
          case '/fireworks':
            broadcast({ type: 'adminFireworks', duration: data.duration ?? 15 });
            res.writeHead(200); res.end(JSON.stringify({ ok: true })); break;
          default:
            res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' }));
});

adminServer.listen(ADMIN_PORT, () => {
  console.log(`[Admin] REST API on http://localhost:${ADMIN_PORT} (secret: ${ADMIN_SECRET})`);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function broadcast(msg: object): void {
  const data = JSON.stringify(msg);
  for (const c of clients) if (c.readyState === WebSocket.OPEN) c.send(data);
}

function isSpam(channelId: string): boolean {
  const now = Date.now();
  const times = (recentMsgs.get(channelId) ?? []).filter(t => t > now - SPAM_WIN);
  times.push(now);
  recentMsgs.set(channelId, times);
  return times.length > SPAM_MAX;
}

// Cleanup on exit
process.on('SIGTERM', () => { cityDB.close(); process.exit(0); });
process.on('SIGINT',  () => { cityDB.close(); process.exit(0); });
