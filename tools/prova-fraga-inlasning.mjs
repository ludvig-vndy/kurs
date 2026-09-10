// Isolerat prov av befintlig PDF-extraktion. Skriver aldrig produktionsdata.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash, createPublicKey } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { extraheraLLM } from '../motor/extract-llm.mjs';
import { FALT } from '../motor/faltlistor.mjs';
import { extraheraNyckeltal, periodFor } from '../functions/api/_nyckeltal.js';
import { byggArkiv, kryptera } from './prova-fraga-publikt.mjs';
import { Budget } from './prova-fraga-granskning.mjs';

export function reservation(tokens, output) {
  if (!Number.isSafeInteger(tokens) || tokens < 0 || output !== 4000) throw new Error('tokenbudget');
  // Haiku: input $1/M, output $5/M. Reserv för avvikelse i förhandsräkningen.
  return tokens + Math.max(16384, Math.ceil(tokens * 0.2)) + output * 5;
}
async function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pub = createPublicKey(Buffer.from(event.inputs.public_receipt_key || '', 'base64'));
  if (pub.asymmetricKeyType !== 'rsa' || pub.asymmetricKeyDetails.modulusLength < 2048) throw new Error('publik nyckel');
  const sources = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const archive = byggArkiv(sources); // befintlig kontroll av båda låsta källversionerna
  const budget = new Budget(500000), originalFetch = globalThis.fetch;
  let audit = [], knownMicroUSD = 0, unknownCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.anthropic.com/v1/messages') throw new Error('oväntat nätanrop');
    const body = JSON.parse(init.body);
    if (body.model !== 'claude-haiku-4-5-20251001' || body.max_tokens !== 4000) throw new Error('modellbudget');
    const counted = await originalFetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST', headers: init.headers, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model: body.model, system: body.system, messages: body.messages }) });
    if (!counted.ok) throw new Error('tokenräkning misslyckades');
    const count = (await counted.json()).input_tokens;
    const ticket = budget.reservera(reservation(count, body.max_tokens));
    if (!ticket) throw new Error('provbudget');
    let actual = null;
    try {
      const response = await originalFetch(url, { ...init, signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error('extraktionsanrop misslyckades');
      const data = await response.json(), u = data.usage;
      if (![u?.input_tokens, u?.output_tokens].every(n => Number.isSafeInteger(n) && n >= 0) ||
          u.cache_read_input_tokens || u.cache_creation_input_tokens) throw new Error('usage');
      actual = u.input_tokens + u.output_tokens * 5;
      knownMicroUSD += actual;
      const request = structuredClone(body);
      for (const m of request.messages) for (const c of m.content) if (c.type === 'document')
        c.source.data = '[PDF ersatt i granskningskopian; sha256 och originalkälla redovisas separat]';
      audit.push({ request, response: data, countedInput: count, costUSD: actual / 1e6 });
      return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
    } finally { if (actual === null) unknownCalls++; budget.avsluta(ticket, actual); }
  };
  console.log('PUBLIKT_START ' + JSON.stringify({ mode: 'inlasning', documents: 2, budgetUSD: 0.5 }));
  try {
    for (const s of sources) {
      audit = [];
      const pdf = readFileSync(join(dirname(process.argv[2]), s.id + '.pdf'));
      if (createHash('sha256').update(pdf).digest('hex') !== s.sha256) throw new Error('PDF-version');
      const start = Date.now();
      try {
      const extracted = await extraheraLLM(null, FALT.rapport, 'claude-haiku', { pdfBase64: pdf.toString('base64') });
      const company = structuredClone(archive['arkiv:' + s.id]);
      Object.assign(company.dokument[0], { fakta: extracted.fakta, kallor: extracted.kallor });
      const mapped = extraheraNyckeltal([company]);
      const row = { id: s.id, ms: Date.now() - start, sha256: s.sha256,
        extracted: Object.keys(extracted.fakta), mapped: mapped.map(p => ({ matt: p.metrik, ar: p.ar, kvartal: p.kvartal, langd: p.langd })),
        costUSD: audit.reduce((n, a) => n + a.costUSD, 0), budgetChargedUSD: budget.forbrukat / 1e6 };
      console.log('PUBLIKT_RESULTAT ' + JSON.stringify(row));
      console.log('PUBLIKT_KRYPTERAT ' + JSON.stringify(kryptera({ row, extracted, mapped, company,
        parsedPeriod: periodFor(s.rubrik, company.dokument[0].bitar.join(' ')), audit }, pub)));
      } catch {
        const row = { id: s.id, error: true, ms: Date.now() - start, sha256: s.sha256,
          costUSD: audit.reduce((n, a) => n + a.costUSD, 0), budgetChargedUSD: budget.forbrukat / 1e6 };
        console.log('PUBLIKT_RESULTAT ' + JSON.stringify(row));
        console.log('PUBLIKT_KRYPTERAT ' + JSON.stringify(kryptera({ row, audit }, pub)));
        throw new Error('inläsning misslyckades');
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.log('PUBLIKT_SLUT ' + JSON.stringify({ budgetChargedUSD: budget.forbrukat / 1e6,
      knownCostUSD: knownMicroUSD / 1e6, unknownCalls }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error('Inläsningsprovet avbrutet; inga nycklar eller modelltexter loggas öppet.'); process.exitCode = 1; });
