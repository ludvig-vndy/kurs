// Riktiga, daterade bolagsrapporter. Inga gamla chatsvar, inget facit eller kundkonto.
import { onRequestPost } from '../functions/api/fraga.js';
import { bitar } from '../functions/api/_mfn.js';
import { Budget } from './prova-fraga-granskning.mjs';
import { readFileSync } from 'node:fs';
import { createCipheriv, publicEncrypt, randomBytes, createPublicKey } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const fragor = [
  { id: 'volvo-kassaflode', question: 'Granska Volvo Group Q2 2025 mot Q2 2024. Vad förklarar förändringen i marginal och operativt kassaflöde i Industriverksamheten? Skilj justerat från rapporterat resultat och kontrollera vad kassaflödesmåttet omfattar. Vilken uppgift bör jag undersöka först? Använd bara rapporten publicerad den 17 juli 2025.', djup: true },
  { id: 'volvo-traton', question: 'Jämför Volvo Group och TRATON under första halvåret 2025. Vilket stöd finns för att den ena verksamheten var mer lönsam? Kontrollera period, justerade respektive rapporterade marginaler och skillnaden mellan koncern och segment innan du jämför. Vad kan jämförelsen inte säga om vilket bolag som är bäst? Använd bara underlag publicerat senast den 25 juli 2025.', djup: true },
  { id: 'traton-positiv-tes', question: 'Min positiva tes är att TRATONs ökade orderingång under första halvåret 2025 bäddar för en återhämtning. Vad i halvårsrapporteringen stödjer tesen, vad talar emot och vilken konkret uppgift skulle starkast ändra bedömningen? Skilj ledningens utsikter från rapporterade utfall. Utgå från vad som var känt den 25 juli 2025.', djup: true },
];
const hashes = { volvo: 'c94cb789f19145b6b74db8fb332be205d58b766a907d152769371c082051dc57',
  traton: 'f93c9ca5a65bbfbab4676f219bd2cadf973fe0062abec363a930975c92ec3067' };
export function byggArkiv(sources) {
  if (sources.length !== 2 || new Set(sources.map(s => s.id)).size !== 2) throw new Error('källor');
  const archive = { 'arkiv:index': sources.map(s => ({ id: s.id, namn: s.namn })) };
  for (const s of sources) {
    if (s.sha256 !== hashes[s.id] || s.datum > '2025-07-25' || !s.pages?.length) throw new Error('källversion');
    archive['arkiv:' + s.id] = { id: s.id, namn: s.namn, dokument: [{ url: s.url, datum: s.datum,
      rubrik: s.rubrik, bitar: bitar(s.pages.join('\n').replace(/\s+/g, ' ')) }] };
  }
  return archive;
}
export function kryptera(data, pem) {
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return { key: publicEncrypt({ key: pem, oaepHash: 'sha256' }, key).toString('base64'),
    iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
}
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('nyckel');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pem = Buffer.from(event.inputs.public_receipt_key || '', 'base64').toString('utf8');
  const pub = createPublicKey(pem);
  if (pub.asymmetricKeyType !== 'rsa' || pub.asymmetricKeyDetails.modulusLength < 2048) throw new Error('publik nyckel');
  const sources = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const base = byggArkiv(sources), budget = new Budget(2_000_000);
  const originalFetch = globalThis.fetch;
  let calls = [], audit = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'sb.stub.test') {
      if (u.pathname === '/auth/v1/user') return json({ id: '00000000-0000-4000-8000-000000000000' });
      if (u.pathname === '/rest/v1/holdings') return json(sources.map(s => ({ id: s.id, name: s.namn, ticker: s.id.toUpperCase(), relation: 'bevakar' })));
      if (u.pathname === '/rest/v1/theses') return json([]);
      throw new Error('okänd stubb');
    }
    if (u.hostname !== 'api.anthropic.com' || u.pathname !== '/v1/messages')
      return new Response('Det daterade provarkivet tillåter ingen extern historik efter låsningen.', { status: 503 });
    const body = JSON.parse(init.body);
    const price = body.model === 'claude-sonnet-5' ? [2, 10] : body.model === 'claude-haiku-4-5-20251001' ? [1, 5] : null;
    if (!price || !Number.isInteger(body.max_tokens) || body.max_tokens > 4096) throw new Error('modellbudget');
    const maximum = (Buffer.byteLength(init.body) + 16384) * price[0] + body.max_tokens * price[1];
    const ticket = budget.reservera(maximum);
    if (!ticket) throw new Error('provbudget');
    let actual = null; const start = Date.now(); let row = { model: body.model,
      moment: body.system.startsWith('Du granskar') ? 'granskning' : body.system.startsWith('Du redigerar') ? 'kortning' : 'svar' };
    try {
      const response = await originalFetch(url, init);
      if (!response.ok) { row.status = response.status; return response; }
      const data = await response.json();
      const usage = data.usage;
      if (![usage?.input_tokens, usage?.output_tokens].every(n => Number.isSafeInteger(n) && n >= 0) ||
          usage.cache_read_input_tokens || usage.cache_creation_input_tokens) throw new Error('usage');
      actual = usage.input_tokens * price[0] + usage.output_tokens * price[1];
      row = { ...row, usage, stop: data.stop_reason, costUSD: actual / 1e6 };
      audit.push({ request: body, response: data });
      return json(data);
    } finally { budget.avsluta(ticket, actual); calls.push({ ...row, ms: Date.now() - start, costUnknown: actual === null }); }
  };
  console.log('PUBLIKT_START ' + JSON.stringify({ questions: fragor.length, repeats: 2, budgetUSD: 2, hashes }));
  try {
    for (let rep = 0; rep < 2; rep++) for (const p of fragor) {
      const archive = structuredClone(base); calls = []; audit = [];
      const env = { ANTHROPIC_API_KEY: apiKey, SUPABASE_SECRET_KEY: 'stubbad', SUPABASE_URL: 'https://sb.stub.test',
        DATA: { get: async (k, typ) => archive[k] == null ? null : typ === 'json' ? structuredClone(archive[k]) : JSON.stringify(archive[k]),
          put: async (k, v) => { archive[k] = JSON.parse(v); } } };
      const start = Date.now();
      let d;
      try {
        const request = new Request('https://kurs.test/api/fraga', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question: p.question, djup: p.djup, token: 'stubbad' }) });
        const response = await onRequestPost({ request, env }); d = await response.json();
      } catch { d = { error: 'provanrop misslyckades' }; }
      const row = { id: p.id, rep, ms: Date.now() - start, blockerat: !!d.blockerat, error: !!d.error,
        words: (d.block || []).filter(b => ['metod', 'tolkning', 'saknas'].includes(b.typ)).map(b => b.text).join(' ').split(/\s+/).filter(Boolean).length,
        calls, costUSD: calls.reduce((n, c) => n + (c.costUSD || 0), 0), budgetChargedUSD: budget.forbrukat / 1e6,
        lasta: d.tackning?.lasta, hamtade: d.tackning?.hamtade, tider: d.tackning?.tider };
      console.log('PUBLIKT_RESULTAT ' + JSON.stringify(row));
      console.log('PUBLIKT_KRYPTERAT ' + JSON.stringify(kryptera({ row, question: p.question, response: d, audit }, pub)));
    }
  } finally { globalThis.fetch = originalFetch; }
  console.log('PUBLIKT_SLUT ' + JSON.stringify({ budgetChargedUSD: budget.forbrukat / 1e6 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error('Publikt prov avbrutet. Inga nycklar eller fullständiga svar loggas öppet.'); process.exitCode = 1; });
