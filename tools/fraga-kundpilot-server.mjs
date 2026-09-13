import http from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { onRequestPost } from '../functions/api/fraga.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = new AsyncLocalStorage();
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (local.getStore() && url.origin === 'https://kundpilot.invalid') {
    if (url.pathname === '/auth/v1/user') return Promise.resolve(Response.json({ id: 'local-public-test' }));
    if (url.pathname === '/rest/v1/holdings') return Promise.resolve(Response.json(local.getStore().holdings));
    if (url.pathname === '/rest/v1/theses') return Promise.resolve(Response.json([]));
    return Promise.resolve(new Response('Unknown local stub', { status: 404 }));
  }
  return nativeFetch(input, init);
};

async function readKeys(envFile) {
  let contents = '';
  try { contents = await readFile(envFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parsed = parseEnv(contents);
  return { ANTHROPIC_API_KEY: parsed.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '', CHAT_API: parsed.CHAT_API || process.env.CHAT_API || '' };
}

export async function createCustomerPilot({ envFile = 'C:/dev/kurs/.env', fixture, outDir = path.join(root, 'motor/out/researchpilot'), port = 8789 } = {}) {
  const sourceBucket = fixture ? JSON.parse(await readFile(fixture, 'utf8')) : {};
  if (!sourceBucket || Array.isArray(sourceBucket) || typeof sourceBucket !== 'object') throw new Error('Fixture must be a JSON object keyed by archive keys.');
  const publicWatchlist = (Array.isArray(sourceBucket['arkiv:index']) ? sourceBucket['arkiv:index'] : []).filter(b => b?.id && b?.namn).map(b => ({ id: 'test-' + b.id, name: b.namn, relation: 'bevakar' }));
  const contextLabel = fixture ? 'Lokalt arkiv från publik JSON-fixtur. Publik testbevakningslista från arkivindex, inga privata innehav.' : 'Tomt lokalt arkiv, inte produktionsdata. Inga privata innehav.';
  const tradSecret = randomBytes(32).toString('hex');
  let busy = false;
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: 'Endast samma lokala ursprung tillåts.' });
    try {
      if (req.method === 'GET' && req.url === '/') {
        const nonce = randomBytes(20).toString('base64');
        const html = (await readFile(new URL('./fraga-kundpilot.html', import.meta.url), 'utf8')).replaceAll('__NONCE__', nonce);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` });
        return res.end(html);
      }
      if (req.method === 'GET' && req.url === '/fraga-svar.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        return res.end(await readFile(new URL('../public/fraga-svar.js', import.meta.url)));
      }
      if (req.method === 'GET' && req.url === '/config') {
        const keys = await readKeys(envFile);
        return json(200, { context: contextLabel, anthropicReady: !!keys.ANTHROPIC_API_KEY, researchReady: !!keys.CHAT_API, model: 'Samma djupa Fråga-motor som produktionen (Sonnet, eventuell Haiku-reservmodell).' });
      }
      if (req.method !== 'POST' || req.url !== '/api/fraga') return json(404, { error: 'Finns inte.' });
      if (req.headers.origin !== origin) return json(403, { error: 'Origin måste matcha den lokala sidan.' });
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: 'JSON krävs.' });
      if (busy) return json(409, { error: 'En fråga körs redan. Vänta tills den är klar.' });
      busy = true;
      try {
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 256 * 1024) return json(413, { error: 'För stor begäran.' });
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(400, { error: 'Ogiltig JSON.' }); }
        if (!input || typeof input.question !== 'string' || !['baseline', 'pilot'].includes(input.mode) || (input.trad !== undefined && typeof input.trad !== 'string')) return json(400, { error: 'Fråga och giltigt läge krävs.' });
        const keys = await readKeys(envFile);
        if (!keys.ANTHROPIC_API_KEY) return json(501, { error: 'ANTHROPIC_API_KEY saknas i lokal .env. Lägg till nyckeln och försök igen; filen läses om vid varje fråga.' });
        if (input.mode === 'pilot' && !keys.CHAT_API) return json(501, { error: 'CHAT_API saknas i lokal .env för researchpiloten.' });
        const bucket = structuredClone(sourceBucket), events = [], documents = [], started = Date.now();
        const env = { ANTHROPIC_API_KEY: keys.ANTHROPIC_API_KEY, SUPABASE_URL: 'https://kundpilot.invalid', SUPABASE_SECRET_KEY: 'local-stub', FRAGA_TRAD_SECRET: tradSecret,
          DATA: { async get(key, type) { const value = bucket[key]; return value === undefined ? null : type === 'json' ? structuredClone(value) : typeof value === 'string' ? value : JSON.stringify(value); }, async put(key, value) { try { bucket[key] = JSON.parse(value); } catch { bucket[key] = value; } } } };
        const controller = new AbortController();
        res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        const request = new Request(origin + '/api/fraga', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson', Origin: origin }, body: JSON.stringify({ question: input.question, trad: input.trad || '', token: 'local-test', djup: true }), signal: controller.signal });
        const context = { request, env };
        if (input.mode === 'pilot') {
          const { createPilotResearch } = await import('./lib/pilot-research.mjs');
          context.researchPilot = ({ question, register, tackning }) => createPilotResearch({ key: keys.CHAT_API, register, question, tackning, onEvent: event => events.push(event), onDocument: document => documents.push(document) });
        }
        await local.run({ holdings: publicWatchlist }, async () => {
          const response = await onRequestPost(context);
          res.writeHead(response.status, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Content-Type-Options': 'nosniff' });
          let raw = ''; const decoder = new TextDecoder();
          for await (const chunk of response.body) { raw += decoder.decode(chunk, { stream: true }); if (!res.destroyed) res.write(chunk); }
          raw += decoder.decode();
          let saved = JSON.stringify({ started: new Date(started).toISOString(), elapsedMs: Date.now() - started, mode: input.mode, question: input.question, context: contextLabel, events, documents, messages: raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) }, (key, value) => key === 'trad' ? '[signed conversation omitted]' : value, 2);
          for (const secret of [...Object.values(keys), tradSecret].filter(Boolean)) saved = saved.split(secret).join('[redacted]');
          const dir = path.join(outDir, `customer-${new Date(started).toISOString().replaceAll(':', '-')}-${randomBytes(3).toString('hex')}`);
          await mkdir(dir, { recursive: true });
          await writeFile(path.join(dir, 'result.json'), saved + '\n', { mode: 0o600 });
          res.end();
        });
      } finally { busy = false; }
    } catch {
      if (!res.headersSent) json(500, { error: 'Lokalt testfel. Kontrollera miljöfil och arkivfixtur.' });
      else { res.write(JSON.stringify({ type: 'result', status: 500, data: { error: 'Lokalt testfel eller resultatet kunde inte sparas.' } }) + '\n'); res.end(); }
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const flag = process.argv[i], value = process.argv[i + 1];
    if (!value || !['--env', '--fixture', '--port'].includes(flag)) throw new Error('Usage: node tools/fraga-kundpilot-server.mjs [--env file] [--fixture file] [--port 8789]');
    options[flag === '--env' ? 'envFile' : flag.slice(2)] = flag === '--port' ? Number(value) : path.resolve(value);
  }
  const server = await createCustomerPilot(options);
  console.log(`Lokal kundpilot: http://127.0.0.1:${server.address().port} (endast denna dator)`);
}
