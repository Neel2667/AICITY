/**
 * setupOAuth.ts — run once: npm run auth
 * Opens browser for bot account login, saves token to server/auth/token.json.
 */
import https from 'https';
import http  from 'http';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CREDS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const REDIRECT   = 'http://localhost:8085/oauth2callback';
const SCOPE      = 'https://www.googleapis.com/auth/youtube.force-ssl';

if (!fs.existsSync(CREDS_PATH)) {
  console.error('Place your OAuth credentials at server/auth/credentials.json');
  process.exit(1);
}

const creds = (() => { const r = JSON.parse(fs.readFileSync(CREDS_PATH,'utf8')); return r.installed ?? r.web; })();
const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${creds.client_id}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

console.log('\n🔗 Open in browser (bot account):\n\n' + authUrl + '\n\nWaiting on http://localhost:8085 ...\n');

const server = http.createServer((req, res) => {
  const code = new URL(req.url!, 'http://localhost:8085').searchParams.get('code');
  if (!code) { res.end('No code'); return; }
  const body = new URLSearchParams({ code, client_id: creds.client_id, client_secret: creds.client_secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }).toString();
  const pr = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, (pres) => {
    let d = '';
    pres.on('data', (c: Buffer) => { d += c; });
    pres.on('end', () => {
      const tok = JSON.parse(d);
      tok.expiry_date = Date.now() + (tok.expires_in ?? 3600) * 1000;
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tok, null, 2));
      console.log('✅ Token saved. Restart the chat server.');
      res.end('<h2>✅ AICITY Bot authorised! Close this tab.</h2>');
      server.close();
    });
  });
  pr.write(body); pr.end();
});
server.listen(8085);
