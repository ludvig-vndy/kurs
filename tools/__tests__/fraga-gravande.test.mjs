// Att Fraga far grava utan att borja hitta pa.
//
// Piloten beskrev assistenten som toklast. Den var det, men inte pa grund av
// kallgrinden: grinden slanger bara svar med tal som saknas i underlaget.
// Forsiktigheten kom fran fyra andra hall, och alla fyra var sjalvpalagda:
//
//   1. ett tak pa fem meningar i prompten,
//   2. sex utdrag a 1200 tecken, alltsa UNGEFAR EN RAPPORT, aven pa en fraga
//      som spande over fyra ar,
//   3. elva forbud och noll rader om vad den SKA gora nar den vill grava,
//   4. tackningen raknades ut men modellen fick aldrig se den, sa den sa "det
//      framgar inte" medan servern satt pa det exakta skalet.
//
// Testerna nedan hallter fast bade halvorna: talen ar fortfarande lasta, och
// resten har slappts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, tackningText, valjModell } from '../../functions/api/fraga.js';

const UID = 'u-1';
const UNIBAP = { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' };
const SIVERS = { id: 'h-2', name: 'Sivers Semiconductors AB (publ)', ticker: 'SIVE', quantity: 50, gav: 8, relation: 'ager' };

function kv(bucket = {}) {
  return {
    async get(k, typ) {
      const v = bucket[k];
      if (v === undefined) return null;
      return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
    },
    async put(k, v) { bucket[k] = JSON.parse(v); },
  };
}

/* Samma stubb som tackningstesterna, men den FANGAR anropet till modellen. Det
   ar hela poangen har: vi provar vad modellen faktiskt far se. */
function stubbaFetch({ holdings = [UNIBAP], svar = 'Ett lugnt svar.', felForst = false } = {}) {
  const anrop = [];
  let raknare = 0;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/auth/v1/user')) return ok({ id: UID });
    if (u.includes('/rest/v1/holdings')) return ok(holdings);
    if (u.includes('/rest/v1/theses')) return ok([]);
    if (u.includes('api.anthropic.com')) {
      anrop.push(JSON.parse(init.body));
      raknare++;
      if (felForst && raknare === 1) return { ok: false, status: 404, text: async () => 'model not found' };
      return ok({ content: [{ type: 'text', text: svar }] });
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  return anrop;
}

function anrop(question, env) {
  const request = new Request('https://x.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question, token: 't' }),
    headers: { 'Content-Type': 'application/json' },
  });
  return onRequestPost({ request, env });
}

const ENV = { ANTHROPIC_API_KEY: 'k', SUPABASE_SECRET_KEY: 's', SUPABASE_URL: 'https://sb.test' };

// Ett arkiv med manga bitar, sa taket pa utdrag faktiskt biter.
function arkivMedBitar(n) {
  const dokument = [];
  for (let i = 0; i < n; i++) {
    dokument.push({
      url: 'https://mfn.se/beq/a/unibap/delarsrapport-q' + ((i % 4) + 1) + '-2026-aa' + i,
      rubrik: 'Delarsrapport Q' + ((i % 4) + 1) + ' 2026',
      datum: '2026-0' + ((i % 8) + 1) + '-15',
      bitar: ['Nettoomsattningen uppgick till ' + (10000 + i) + ' KSEK (9 100). Rorelseresultatet forbattrades.'],
    });
  }
  return {
    'arkiv:index': [{ id: 'unibap', namn: 'Unibap Space Solutions' }],
    'arkiv:unibap': { id: 'unibap', namn: 'Unibap Space Solutions', dokument },
  };
}

/* ---------- tackningText: att den sager vad den har ---------- */

test('ett bolag utan underlag namns med skal, inte som tystnad', () => {
  const t = tackningText({ bolag: [{ namn: 'Unibap Space Solutions', arkiv: false, av: 'inga dokument i arkivet' }] });
  assert.match(t, /Unibap Space Solutions/);
  assert.match(t, /inga dokument i arkivet/);
});

/* Det slice(0, 2) som tappar ett tredje bolag var tyst mot modellen ocksa. */
test('bolag som lamnades utanfor sags till modellen', () => {
  const t = tackningText({ utelamnade: ['Saniona AB (publ)'] });
  assert.match(t, /Saniona AB \(publ\)/);
  assert.match(t, /hogst tva bolag/);
});

test('perioden, hamtningarna och de lasta utdragen redovisas', () => {
  const t = tackningText({
    period: { fran: '2022-01-01', till: '2022-12-31' },
    hamtade: 4, lasta: 16, bolag: [], utelamnade: [],
  });
  assert.match(t, /2022-01-01 till 2022-12-31/);
  assert.match(t, /4 aldre dokument hamtades/);
  assert.match(t, /16 utdrag lastes/);
});

/* Instruktionen ar halva poangen: fakta utan uppmaning gav samma vaga svar. */
test('tackningen forbjuder uttryckligen att skylla pa att det inte framgar', () => {
  const t = tackningText({ orsak: 'inga innehav uppladdade' });
  assert.match(t, /Skyll aldrig/);
  assert.match(t, /inga innehav uppladdade/);
});

test('en fraga dar allt gick vagen far ingen tackningstext', () => {
  assert.equal(tackningText({ bolag: [{ namn: 'Unibap', arkiv: true }], utelamnade: [] }), '');
  assert.equal(tackningText(null), '');
});

/* ---------- valjModell: kostnaden stiger bara dar den fortjanar det ---------- */

test('en enradig fraga om ett bolag gar pa den snabba modellen', () => {
  assert.match(valjModell({ period: null, bolag: 1, utdrag: 3 }), /haiku/);
  assert.match(valjModell(), /haiku/);
});

test('en periodfraga gar pa den djupa modellen', () => {
  assert.match(valjModell({ period: { fran: '2022-01-01', till: '2022-12-31' }, bolag: 1, utdrag: 6 }), /sonnet/);
});

test('flera bolag i samma fraga gar pa den djupa modellen', () => {
  assert.match(valjModell({ period: null, bolag: 2, utdrag: 6 }), /sonnet/);
});

test('mycket underlag gar pa den djupa modellen aven utan period', () => {
  assert.match(valjModell({ period: null, bolag: 1, utdrag: 12 }), /sonnet/);
});

/* ---------- hela vagen igenom ---------- */

test('modellen far se hur sokningen gick', async () => {
  const anropen = stubbaFetch();
  const r = await anrop('vad hander med Unibap', { ...ENV, DATA: kv({ 'arkiv:index': [] }) });
  await r.json();
  assert.equal(anropen.length, 1);
  assert.match(anropen[0].system, /SA HAR GICK SOKNINGEN/);
  assert.match(anropen[0].system, /Unibap Space Solutions: inget underlag/);
});

/* Sex bitar a 1200 tecken ar ungefar EN rapport. En fraga over ett helt ar fick
   alltsa mindre underlag an den fragade om. */
test('en periodfraga far mer underlag an en vanlig fraga', async () => {
  const bucket = arkivMedBitar(30);

  const a1 = stubbaFetch();
  await (await anrop('hur gick det for Unibap', { ...ENV, DATA: kv(JSON.parse(JSON.stringify(bucket))) })).json();
  const vanlig = (a1[0].system.match(/\n---\n/g) || []).length;

  const a2 = stubbaFetch();
  await (await anrop('hur gick Unibap under 2026', { ...ENV, DATA: kv(JSON.parse(JSON.stringify(bucket))) })).json();
  const period = (a2[0].system.match(/\n---\n/g) || []).length;

  assert.ok(period > vanlig, 'periodfragan fick ' + period + ' utdrag, den vanliga ' + vanlig);
});

/* Ett routningsbeslut far aldrig ta ner Fraga. Svarar den djupa modellen inte
   ska svaret bli grundare, aldrig borta. */
test('faller den djupa modellen provas den snabba, och svaret kommer fram', async () => {
  const anropen = stubbaFetch({ holdings: [UNIBAP, SIVERS], felForst: true });
  const r = await anrop('jamfor Unibap och Sivers', { ...ENV, DATA: kv() });
  const d = await r.json();
  assert.equal(anropen.length, 2, 'ska ha provat igen');
  assert.match(anropen[0].model, /sonnet/);
  assert.match(anropen[1].model, /haiku/);
  assert.equal(d.tackning.modellfall, true);
  assert.match(d.answer, /lugnt svar/);
});

/* Grinden ror sig inte. Det ar villkoret for allt ovan. */
test('ett tal som inte finns i underlaget slapps fortfarande inte igenom', async () => {
  stubbaFetch({ svar: 'Rorelseresultatet forbattrades till 42,7 MSEK under kvartalet.' });
  const r = await anrop('hur ser rorelseresultatet ut for Unibap', { ...ENV, DATA: kv(arkivMedBitar(3)) });
  const d = await r.json();
  assert.ok(d.tackning.lasta > 0, 'testet provar ingenting om inga utdrag lastes');
  // Grinden namner sjalv talet den stoppade, sa det som ska vara borta ar
  // PASTAENDET, inte siffran.
  assert.ok(!/forbattrades till 42,7/.test(d.answer), 'ogrundat pastaende kom igenom: ' + d.answer);
  assert.match(d.answer, /inte star i dokumenten|inte står i dokumenten/);
});
