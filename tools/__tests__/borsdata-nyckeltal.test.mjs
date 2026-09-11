/* Borsdata hela vagen: fran API-svaret till en post i faktaregistret.

   Anledningen att kedjan finns ar matt, inte antagen. tools/matning-borsdata.mjs
   jamforde var LLM-extraktion mot Borsdatas tal i 131 fall: 51 lika, 33
   avvikande, 25 rena skalfel, och antal aktier ratt i noll fall av 22. Det som
   gar sonder i var egen vag ar metadatan, alltsa period och skala, och det ar
   precis det ett strukturerat API bar med sig.

   Proven halller fast de tre sakerna som far kedjan att vara vard nagot:
   att perioden foljer med, att enheten foljer med, och att slaget ar kvot sa
   berakningsverktyget vagrar summera tva marginaler. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NYCKELTAL, AR_TILL_REGISTRET } from '../../motor/borsdata.mjs';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';

const LIFCO = {
  bolag: 'Lifco',
  nyckeltal: [
    { kpi: 29, namn: 'Rörelsemarginal', enhet: 'procent', ar: 2025, varde: 21.4,
      historik: [{ ar: 2024, varde: 20.1 }, { ar: 2023, varde: 19.8 }],
      median: { nu: 21.4, median: 18.9, ar: 9, fran: 2016, till: 2024, avvikelse: 13 } },
    { kpi: 37, namn: 'ROIC', enhet: 'procent', ar: null, varde: 16.2, historik: [], median: null },
  ],
};

const registrera = (bolag) => {
  const r = skapaFaktaregister();
  r.synka({ nyckeltal: bolag });
  return r.poster();
};

test('nyckeltalstabellen ar hel och alla matt ar kvoter', () => {
  assert.equal(NYCKELTAL.length, 15);
  assert.equal(NYCKELTAL.filter(r => r.summary).length, 11, 'elva ska rymmas i ett summary-anrop');
  for (const r of NYCKELTAL) {
    assert.ok(['procent', 'gånger'].includes(r.enhet), r.namn + ' har okand enhet');
    assert.equal(typeof r.kpi, 'number');
  }
  assert.equal(new Set(NYCKELTAL.map(r => r.kpi)).size, 15, 'dubblerat kpi-id');
});

test('ett nyckeltal blir en post per ar, med period och enhet fran kallan', () => {
  const poster = registrera([LIFCO]);
  const marginaler = poster.filter(p => p.matt === 'Rörelsemarginal');
  assert.equal(marginaler.length, 1 + AR_TILL_REGISTRET, 'senaste aret plus historiken');
  const nu = marginaler.find(p => p.period === '2025');
  assert.ok(nu, 'perioden foljde inte med');
  assert.equal(nu.varde, 21.4);
  assert.equal(nu.enhet, 'procent');
  assert.equal(nu.typ, 'rapporterat');
  assert.equal(nu.bolag, 'Lifco');
  assert.ok(marginaler.some(p => p.period === '2024' && p.varde === 20.1));
});

/* Slaget ar inte kosmetika. Utan det kan berakningsverktyget summera tva
   marginaler till ett tal som ser meningsfullt ut och inte ar det. */
test('nyckeltal ar kvoter och kan darfor inte summeras', () => {
  const poster = registrera([LIFCO]);
  for (const p of poster.filter(p => p.matt !== undefined)) assert.equal(p.slag, 'kvot', p.matt);
  const r = skapaFaktaregister();
  r.synka({ nyckeltal: [LIFCO] });
  const tva = r.poster().filter(p => p.matt === 'Rörelsemarginal').slice(0, 2).map(p => p.id);
  const dom = r.laggBeraknad({ operation: 'summa', indata: tva });
  assert.equal(dom.ok, false, 'tva marginaler gick att summera');
});

/* Medianen raknas i kod, over bolagets egna avslutade ar. Den ar darfor
   beraknad och inte rapporterad, och skillnaden ska sta i posten. */
test('medianen blir en beraknad post med sin formel, inte en rapporterad', () => {
  const median = registrera([LIFCO]).find(p => p.matt === 'Rörelsemarginal, median');
  assert.ok(median, 'medianposten saknas');
  assert.equal(median.typ, 'beraknat');
  assert.equal(median.varde, 18.9);
  assert.equal(median.period, '2016 till 2024');
  assert.match(median.formel, /9 avslutade år/);
  assert.equal(median.vilar_pa.ursprung, 'rapporterat');
});

/* Ett nyckeltal utan ar, de fyra som kraver eget anrop, far inte bli en post
   som pastar sig galla ett visst ar. */
test('ett nyckeltal utan ar sager att det ar det senaste, inte vilket ar', () => {
  const roic = registrera([LIFCO]).find(p => p.matt === 'ROIC');
  assert.equal(roic.period, 'senast rapporterade');
  assert.equal(roic.ar, null);
  assert.equal(roic.varde, 16.2);
});

test('trasiga rader hoppas over utan att ta ner registret', () => {
  const poster = registrera([
    null,
    { bolag: 'X' },
    { bolag: 'Y', nyckeltal: [{ namn: 'P/E', enhet: 'gånger', varde: null }, { varde: 5 }] },
    LIFCO,
  ]);
  assert.ok(poster.some(p => p.bolag === 'Lifco'));
  assert.ok(!poster.some(p => p.bolag === 'Y'));
});

/* Kallan ar ett API-svar, inte en mening. Da maste posten bara sin harkomst i
   klartext i stallet, annars kan varken granskaren eller lasaren se varifran
   talet kom. */
test('posten bar sin harkomst i klartext', () => {
  const nu = registrera([LIFCO]).find(p => p.period === '2025');
  assert.equal(nu.kallor.length, 1);
  assert.equal(nu.kallor[0].typ, 'borsdata');
  assert.match(nu.kallor[0].citat, /Lifco, Rörelsemarginal 2025: 21,4 procent/);
  assert.match(nu.kallor[0].citat, /Hämtat från Börsdatas API/);
});

/* ---------- hela vagen genom /api/fraga ---------- */

import { onRequestPost } from '../../functions/api/fraga.js';
import { sys } from './_fraga-fixtur.mjs';

const ENV_BAS = { ANTHROPIC_API_KEY: 'k', SUPABASE_SECRET_KEY: 's', SUPABASE_URL: 'https://sb.test' };
const INNEHAV = { id: 'h-1', name: 'Lifco', ticker: 'LIFCO B', quantity: 10, gav: 300, relation: 'ager' };
const kv = (bucket) => ({
  async get(k, typ) {
    const v = bucket[k];
    if (v === undefined) return null;
    return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
  },
  async put() {},
});
const ARKIV = () => ({
  'arkiv:index': [{ id: 'lifco', namn: 'Lifco' }],
  'arkiv:lifco': {
    id: 'lifco', namn: 'Lifco',
    dokument: [{ url: 'https://mfn.se/a/lifco/bokslut-2025-aaaa11', rubrik: 'Bokslutskommunike 2025',
      datum: '2026-02-05', bitar: ['Rorelseresultatet forbattrades under aret.'] }],
  },
  'arkiv:nyckeltal': { uppdaterad: '2026-09-11T04:00:00Z', kalla: 'borsdata',
    bolag: [{ bolagId: 'lifco', ...LIFCO }, { bolagId: 'annat', bolag: 'Ett annat bolag',
      nyckeltal: [{ kpi: 2, namn: 'P/E', enhet: 'gånger', ar: 2025, varde: 99, historik: [], median: null }] }] },
});

function stubba(paPrompt) {
  const anropen = [];
  globalThis.fetch = async (url, init) => {
    const ok = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
    if (String(url).includes('/auth/v1/user')) return ok({ id: 'u-1' });
    if (String(url).includes('/rest/v1/holdings')) return ok([INNEHAV]);
    if (String(url).includes('/rest/v1/theses')) return ok([]);
    if (!String(url).includes('api.anthropic.com')) return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    const kropp = JSON.parse(init.body);
    anropen.push(kropp);
    if (sys(kropp).startsWith('Du granskar ett svar'))
      return ok({ content: [{ type: 'text', text: '{"godkand":true}' }], stop_reason: 'end_turn' });
    return ok(paPrompt(kropp));
  };
  return anropen;
}

const fraga = (q, env) => onRequestPost({
  request: new Request('https://x.test/api/fraga', {
    method: 'POST', body: JSON.stringify({ question: q, token: 't' }),
    headers: { 'Content-Type': 'application/json' },
  }),
  env,
});

/* Posterna ska na modellen, och BARA for det bolag fragan handlar om.
   Nyckeln ar delad for alla bolag, sa filtret ar det enda som star mellan
   Lifco-fragan och ett annat bolags siffror i samma prompt. */
test('nyckeltalen nar prompten, och bara for det routade bolaget', async () => {
  const original = globalThis.fetch;
  const anropen = stubba(() => ({
    content: [{ type: 'tool_use', id: 's', name: 'svara',
      input: { version: 1, block: [{ typ: 'metod', text: 'Marginalen sager nagot om prissattningen.' }] } }],
    stop_reason: 'tool_use',
  }));
  try {
    const d = await (await fraga('hur ser Lifcos rörelsemarginal ut', { ...ENV_BAS, DATA: kv(ARKIV()) })).json();
    const prompt = sys(anropen[0]);
    assert.match(prompt, /Rörelsemarginal/, 'nyckeltalen kom inte med i prompten');
    assert.match(prompt, /21,4|21\.4/, 'vardet kom inte med');
    assert.doesNotMatch(prompt, /Ett annat bolag/, 'ett orelaterat bolags siffror lackte in');
    assert.ok(d.tackning.nyckeltal, 'tackningen redovisar inte nyckeltalen');
  } finally { globalThis.fetch = original; }
});

/* Utan nyckeln ska Fraga svara precis som forut. Nyckeltalen ar ett tillskott
   till underlaget, aldrig ett villkor for att kunna svara. */
test('utan nyckeln i KV svarar Fraga som forut', async () => {
  const original = globalThis.fetch;
  stubba(() => ({
    content: [{ type: 'tool_use', id: 's', name: 'svara',
      input: { version: 1, block: [{ typ: 'metod', text: 'Marginalen sager nagot om prissattningen.' }] } }],
    stop_reason: 'tool_use',
  }));
  try {
    const utan = { ...ARKIV() };
    delete utan['arkiv:nyckeltal'];
    const d = await (await fraga('hur ser Lifcos rörelsemarginal ut', { ...ENV_BAS, DATA: kv(utan) })).json();
    assert.ok(!d.blockerat, 'blockerades: ' + (d.verifiering && d.verifiering.orsak));
    assert.equal(d.tackning.nyckeltal, undefined);
  } finally { globalThis.fetch = original; }
});
