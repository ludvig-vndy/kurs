import { svarJson, godkann, postSvar } from './_fraga-fixtur.mjs';
// Fraga far hamta sjalv, och kallgrinden tacker det den hamtade.
//
// Fram till nu bestamde rorledningen vad modellen fick se INNAN modellen last en
// enda rad. En analytiker laser forst och bestammer sedan vad hon ska lasa
// harnast. Det ar skillnaden mellan en lasare och en utredare.
//
// Det ar ofarligt BARA sa lange varje dokument ett verktyg drar in hamnar i
// samma mangd som grinden sedan provar svarets tal mot. Testerna nedan haller
// fast precis den egenskapen: ett tal ur ett hamtat dokument slapps igenom, ett
// tal som inte finns nagonstans stoppas fortfarande, och tal ur en LEKTION blir
// aldrig bolagsdata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/fraga.js';

const UID = 'u-1';
const UNIBAP = { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' };

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

const ARKIV = () => ({
  'arkiv:index': [{ id: 'unibap', namn: 'Unibap Space Solutions' }],
  'arkiv:unibap': {
    id: 'unibap', namn: 'Unibap Space Solutions',
    dokument: [{
      url: 'https://mfn.se/beq/a/unibap/delarsrapport-q2-2026-aaaaaa11',
      rubrik: 'Delarsrapport Q2 2026', datum: '2026-08-28',
      bitar: ['Nettoomsattningen uppgick till 12 400 KSEK (9 100). Rorelseresultatet forbattrades under kvartalet.'],
    }],
  },
});

/* Skriptad modell: en lista med svar som lamnas ut i tur och ordning, sa ett
   verktygsanrop kan foljas av ett riktigt svar. */
function stubbaFetch(skript, { mfn = null } = {}) {
  const anropen = [];
  let i = 0;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/auth/v1/user')) return ok({ id: UID });
    if (u.includes('/rest/v1/holdings')) return ok([UNIBAP]);
    if (u.includes('/rest/v1/theses')) return ok([]);
    if (u.includes('api.anthropic.com')) {
      if (JSON.parse(init.body).system.startsWith('Du granskar ett svar')) return ok(godkann());
      const kropp = JSON.parse(init.body);
      anropen.push(kropp);
      const nasta = skript[Math.min(i++, skript.length - 1)];
      return ok(typeof nasta === 'function' ? nasta(kropp) : nasta);
    }
    if (u.includes('mfn.se')) {
      if (mfn == null) return { ok: false, status: 500, text: async () => '' };
      return { ok: true, status: 200, text: async () => (u.includes('limit=') ? mfn.flode : mfn.dokument) };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  return anropen;
}

const text = (t) => ({ content: [{ type: 'text', text: svarJson(t) }], stop_reason: 'end_turn' });
const verktyg = (name, input) => ({
  content: [{ type: 'tool_use', id: 'tu_1', name, input }],
  stop_reason: 'tool_use',
});

function anrop(question, env) {
  const request = new Request('https://x.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question, token: 't' }),
    headers: { 'Content-Type': 'application/json' },
  });
  return onRequestPost({ request, env });
}

const ENV = { ANTHROPIC_API_KEY: 'k', SUPABASE_SECRET_KEY: 's', SUPABASE_URL: 'https://sb.test' };

/* ---------- att den far grava ---------- */

test('modellen kan be om mer och far svara efterat', async () => {
  const anropen = stubbaFetch([
    verktyg('las_mer', { bolag: 'Unibap Space Solutions', sokord: 'rorelseresultat' }),
    text('Rorelseresultatet forbattrades under kvartalet.'),
  ]);
  const r = await anrop('hur gick rorelsen for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.equal(anropen.length, 2, 'ska ha gatt ett extra varv');
  assert.deepEqual(d.tackning.verktyg, ['las_mer']);
  assert.match(d.answer, /forbattrades/);
});

test('verktygen erbjuds bara nar det finns ett arkiv att grava i', async () => {
  const anropen = stubbaFetch([text('Jag har inga dokument om bolaget.')]);
  await (await anrop('vad hander med Unibap', { ...ENV, DATA: kv({ 'arkiv:index': [] }) })).json();
  assert.ok(!anropen[0].tools, 'verktyg skickades utan arkiv');
});

test('sista varvet gar utan verktyg, sa den tvingas svara', async () => {
  const anropen = stubbaFetch([
    verktyg('las_mer', { bolag: 'Unibap Space Solutions', sokord: 'kassa' }),
    verktyg('las_mer', { bolag: 'Unibap Space Solutions', sokord: 'omsattning' }),
    kropp => postSvar(kropp, p => p.typ === 'dokument' && p.text.includes('12 400')),
  ]);
  const r = await anrop('hur ser kassan ut for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.equal(anropen.length, 3);
  assert.ok(!anropen[2].tools, 'sista anropet hade fortfarande verktyg');
  assert.match(d.answer, /12 400/);
});

/* ---------- att grinden foljer med ---------- */

/* Karnan. Ett tal som BARA finns i ett dokument modellen sjalv bad om ska
   slappas igenom: verktyget la det i samma utdragsmangd som grinden prover mot.
   Gjorde det inte det skulle agensen vara vardelos, allt den hamtade blev
   blockerat. */
test('ett tal ur ett hamtat dokument slapps igenom', async () => {
  const mfn = {
    flode: '<div class="short-item compressible"><span class="compressed-date">2023-02-10</span><a class="title-link item-link" href="/beq/a/unibap/bokslutskommunike-2022-bb22">Bokslutskommunike 2022</a></div>',
    dokument: '<article><h1>Bokslutskommunike 2022</h1><p>Nettoomsattningen for helaret uppgick till 50 077 KSEK.</p>' +
      '<p>Rapporten beskriver verksamhetens utveckling under perioden. Bolaget redovisar också vilka investeringar som har genomförts och vilka osäkerheter som finns inför kommande rapportperiod.</p></article>',
  };
  const anropen = stubbaFetch([
    verktyg('hamta_historik', { bolag: 'Unibap Space Solutions', fran: '2022-01-01', till: '2022-12-31' }),
    kropp => postSvar(kropp, p => p.typ === 'dokument' && p.text.includes('50 077')),
  ], { mfn });
  const r = await anrop('hur stor var omsattningen for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.notEqual(d.blockerat, true);
  assert.deepEqual(d.tackning.verktyg, ['hamta_historik']);
  assert.equal(d.tackning.hamtade, 1);
  assert.match(d.answer, /50 077/, 'talet ur det hamtade dokumentet blockerades: ' + d.answer);
});

test('historik som modellen hamtar ger beraknade poster med kallkedja i samma svar', async () => {
  // Illustrativa testtal, inte uppgifter om det verkliga bolaget.
  const mfn = {
    flode: '<div class="short-item compressible"><span class="compressed-date">2023-02-10</span><a class="title-link item-link" href="/beq/a/unibap/bokslutskommunike-q4-2022-bb22" title="Q4 2022">Q4 2022</a></div>',
    dokument: '<article><h1>Q4 2022</h1><p>Nettoomsättningen uppgick till 100 MSEK. Rörelseresultatet uppgick till -20 MSEK.</p>' +
      '<p>Rapporten beskriver verksamhetens utveckling under perioden och redovisar investeringar. Företaget kommenterar också vilka osäkerheter som finns inför kommande rapportperiod.</p></article>',
  };
  stubbaFetch([
    verktyg('hamta_historik', { bolag: 'Unibap Space Solutions', fran: '2022-01-01', till: '2022-12-31' }),
    kropp => postSvar(kropp, p => p.typ === 'beraknat' && p.matt === 'rörelsemarginal'),
  ], { mfn });
  const d = await (await anrop('hur ser marginalen ut for Unibap', { ...ENV, DATA: kv(ARKIV()) })).json();
  assert.notEqual(d.blockerat, true);
  assert.match(d.answer, /-20 procent/);
  assert.match(d.answer, /Q4 2022/);
  assert.equal(d.block[0].indata.length, 2);
  assert.equal(d.block[0].kallor.length, 2);
  assert.equal(d.tackning.hamtade, 1);
  assert.equal(d.tackning.bolag[0].aldst, '2023-02-10');
});

/* Andra halvan av samma egenskap: rackvidden vaxte, garantin gjorde det inte. */
test('ett tal som inte finns nagonstans stoppas fortfarande', async () => {
  const anropen = stubbaFetch([
    verktyg('las_mer', { bolag: 'Unibap Space Solutions', sokord: 'omsattning' }),
    text('Nettoomsattningen uppgick till 99 999 KSEK.'),
  ]);
  const r = await anrop('hur stor var omsattningen for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.ok(!/uppgick till 99 999/.test(d.answer), 'ogrundat pastaende kom igenom: ' + d.answer);
});

/* Kursen innehaller tal ur forskning och ur illustrativa exempel. Laser modellen
   en lektion far de talen ALDRIG bli bolagsdata. Lektionstexten gar darfor inte
   in i utdragen. */
test('tal ur en lektion blir aldrig ett bolagstal', async () => {
  const anropen = stubbaFetch([
    verktyg('las_lektion', { id: '0.1' }),
    text('Unibaps rorelsemarginal var 14,3 procent under kvartalet.'),
  ]);
  const r = await anrop('hur ser marginalen ut for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.deepEqual(d.tackning.verktyg, ['las_lektion']);
  assert.ok(d.tackning.lektioner.includes('0.1'));
  assert.ok(!/rorelsemarginal var 14,3/.test(d.answer), 'lektionstal blev bolagstal: ' + d.answer);
});

/* ---------- att den inte gar sonder ---------- */

test('ett verktyg som inte finns stoppar inte svaret', async () => {
  stubbaFetch([
    verktyg('las_lektion', { id: '99.9' }),
    text('Den lektionen finns inte, men jag kan svara pa det jag har.'),
  ]);
  const r = await anrop('vad sager kursen om Unibap', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.match(d.answer, /jag kan svara/);
  assert.deepEqual(d.tackning.lektioner.includes('99.9'), false);
});

test('en hamtning som faller ger ett grundare svar, aldrig inget', async () => {
  stubbaFetch([
    verktyg('hamta_historik', { bolag: 'Unibap Space Solutions', fran: '2019-01-01', till: '2019-12-31' }),
    text('Hamtningen misslyckades. Jag saknar underlag for den efterfragade perioden.'),
  ]); // mfn saknas -> hamtningen faller
  const r = await anrop('hur gick Unibap 2019', { ...ENV, DATA: kv(ARKIV()) });
  const d = await r.json();
  assert.match(d.answer, /Hamtningen misslyckades/);
  assert.equal(d.tackning.period.fran, '2019-01-01');
});

test('ett okant bolagsnamn far ett svar som sager vilka som finns', async () => {
  const anropen = stubbaFetch([
    verktyg('las_mer', { bolag: 'Volvo', sokord: 'kassa' }),
    text('Jag har bara Unibap i ditt underlag.'),
  ]);
  const r = await anrop('hur ser kassan ut for Unibap', { ...ENV, DATA: kv(ARKIV()) });
  await r.json();
  const svarTillModellen = JSON.stringify(anropen[1].messages);
  assert.match(svarTillModellen, /Unibap Space Solutions/);
  assert.match(svarTillModellen, /inget arkiv for Volvo/);
});
