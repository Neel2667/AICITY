/**
 * OAuthBot.ts
 * Handles OAuth 2.0 token management for the YouTube bot account.
 * Enables the server to POST messages back to YouTube Live Chat.
 *
 * Setup (one-time):
 *   1. Create an OAuth 2.0 "Desktop App" credential in Google Cloud Console
 *   2. Place credentials.json in server/auth/
 *   3. Run: npm run auth   (opens browser for bot account login)
 *   4. Token saved to server/auth/token.json and auto-refreshed thereafter
 */
import fs   from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH  = path.join(__dirname, 'token.json');
const CREDS_PATH  = path.join(__dirname, 'credentials.json');

interface OAuthToken {
  access_token:  string;
  refresh_token: string;
  expiry_date:   number;
}

interface OAuthCredentials {
  client_id:     string;
  client_secret: string;
}

export class OAuthBot {
  private token: OAuthToken | null = null;
  private creds: OAuthCredentials | null = null;
  private liveChatId: string;
  private enabled = false;

  constructor(liveChatId: string) {
    this.liveChatId = liveChatId;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(CREDS_PATH)) {
        const raw = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
        this.creds = raw.installed ?? raw.web;
      }
      if (fs.existsSync(TOKEN_PATH)) {
        this.token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        this.enabled = true;
        console.log('[OAuthBot] Token loaded — bot replies ENABLED');
      } else {
        console.warn('[OAuthBot] No token.json found — bot replies DISABLED. Run: npm run auth');
      }
    } catch (e) {
      console.warn('[OAuthBot] Load error:', e);
    }
  }

  public isEnabled(): boolean { return this.enabled && !!this.token; }

  public async postMessage(text: string): Promise<boolean> {
    if (!this.enabled || !this.token || !this.creds) return false;
    if (Date.now() >= this.token.expiry_date - 60_000) {
      const ok = await this.refreshToken();
      if (!ok) return false;
    }
    const body = JSON.stringify({
      snippet: {
        liveChatId: this.liveChatId,
        type: 'textMessageEvent',
        textMessageDetails: { messageText: text.slice(0, 200) },
      },
    });
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'www.googleapis.com',
        path: '/youtube/v3/liveChat/messages?part=snippet',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token!.access_token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c.toString(); });
        res.on('end', () => resolve(res.statusCode === 200 || res.statusCode === 201));
      });
      req.on('error', () => resolve(false));
      req.write(body); req.end();
    });
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.creds || !this.token?.refresh_token) return false;
    const body = new URLSearchParams({
      client_id: this.creds.client_id, client_secret: this.creds.client_secret,
      refresh_token: this.token.refresh_token, grant_type: 'refresh_token',
    }).toString();
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c.toString(); });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.access_token) {
              this.token!.access_token = json.access_token;
              this.token!.expiry_date = Date.now() + (json.expires_in ?? 3600) * 1000;
              fs.writeFileSync(TOKEN_PATH, JSON.stringify(this.token, null, 2));
              console.log('[OAuthBot] Token refreshed');
              resolve(true);
            } else { resolve(false); }
          } catch { resolve(false); }
        });
      });
      req.on('error', () => resolve(false));
      req.write(body); req.end();
    });
  }
}
