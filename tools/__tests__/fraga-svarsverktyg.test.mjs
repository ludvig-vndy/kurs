/* Svaret ska komma ur API:t, inte ur textflodet.
   HITTAT SKARPT, inte av stubbarna. Provkorningen mot riktiga Anthropic
   blockerade ALLA TRE svaren med orsak "format". Innehallet var ratt hela
   vagen: giltiga post-id:n, ratt kategorier, och pa en fraga upptackte
   modellen att bolaget hade forlangt rakenskapsar och vagrade darfor summera
   ihop ett helar at anvandaren. Men tva av svaren lag i en ```json-fence och
   ett hade prosa fore JSON:en, sa JSON.parse foll och ingenting visades.

   Att be en modell skriva ren JSON i sitt textsvar ar en onskan. Att lata den
   ANROPA ett verktyg ar ett kontrakt: strukturen kommer da fran API:t och kan
   inte kapslas in i nagot. Samma provkorning visade att verktygsloopen
   fungerar, sa vagen finns redan.

   Textvagen ar kvar som reserv och verifieras EXAKT likadant: bada gar genom
   lasFaktasvar, sa det har ar en inkapslingsfix, inte en uppmjukning. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, SVARSVERKTYG } from '../../functions/api/fraga.js';
import { godkann } from './_fraga-fixtur.mjs';

const UID = 'u-1';
const UNIBAP = { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' };
const ENV = { ANTHROPIC_API_KEY: 'k', SUPABASE_SECRET_KEY: 's', SUPABASE_URL: 'https://sb.test' };

const kv = (bucket = {}) => ({
  async get(k, typ) {
    const v = bucket[k];
    if (v === undefined) return null;
    return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
  },
  async put(k, v) { bucket[k] = JSON.parse(v); },
});

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

function stubbaFetch(skript) {
  const anropen = [];
  let i = 0;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/auth/v1/user')) return ok({ id: UID });
    if (u.includes('/rest/v1/holdings')) return ok([UNIBAP]);
    if (u.includes('/rest/v1/theses')) return ok([]);
    if (u.includes('api.anthropic.com')) {
      const kropp = JSON.parse(init.body);
      if (String(kropp.system).startsWith('Du granskar ett svar')) { anropen.push(kropp); return ok(godkann()); }
      anropen.push(kropp);
      const nasta = skript[Math.min(i++, skript.length - 1)];
      return ok(typeof nasta === 'function' ? nasta(kropp) : nasta);
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  return anropen;
}

const anrop = (question, env) => onRequestPost({
  request: new Request('https://x.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question, token: 't' }),
    headers: { 'Content-Type': 'application/json' },
  }),
  env,
});

/* Modellen svarar genom att anropa verktyget. Ingen text att kapsla in. */
const svarar = (block) => ({
  content: [{ type: 'tool_use', id: 'tu_svar', name: 'svara', input: { version: 1, block } }],
  stop_reason: 'tool_use',
});
const laser = (sokord) => ({
  content: [{ type: 'tool_use', id: 'tu_las', name: 'las_mer', input: { bolag: 'Unibap Space Solutions', sokord } }],
  stop_reason: 'tool_use',
});

test('ett svar via verktyget renderas som vanligt', async () => {
  stubbaFetch([svarar([{ typ: 'metod', text: 'Kassaflodet sager nagot annat an resultatet.' }])]);
  const d = await (await anrop('vad ar kassaflode', { ...ENV, DATA: kv(ARKIV()) })).json();
  assert.ok(!d.blockerat, 'blockerades: ' + (d.verifiering && d.verifiering.orsak));
  assert.match(d.answer, /Kassaflodet sager nagot annat/);
});

test('verktyget svara erbjuds sa fort modellen far svara', async () => {
  const anropen = stubbaFetch([svarar([{ typ: 'metod', text: 'Ett metodsvar utan tal.' }])]);
  await (await anrop('vad ar en moat', { ...ENV, DATA: kv(ARKIV()) })).json();
  const namn = (anropen[0].tools || []).map((t) => t.name);
  assert.ok(namn.includes('svara'), 'svara erbjods inte: ' + namn.join(', '));
});

/* Kan modellen inte langre grava MASTE den svara, annars far vi ett tomt varv
   som faller ut som ett fel for anvandaren. */
test('sista varvet erbjuder bara svara, och tvingar fram det', async () => {
  const anropen = stubbaFetch([
    laser('kassa'), laser('omsattning'),
    svarar([{ typ: 'metod', text: 'Nu svarar jag pa det jag last.' }]),
  ]);
  const d = await (await anrop('hur ser kassan ut for Unibap', { ...ENV, DATA: kv(ARKIV()) })).json();
  const sista = anropen[2];
  assert.deepEqual((sista.tools || []).map((t) => t.name), ['svara'], 'graververktygen lag kvar pa sista varvet');
  assert.deepEqual(sista.tool_choice, { type: 'tool', name: 'svara' }, 'svaret tvingades inte fram');
  assert.ok(!d.blockerat);
});

/* Utan arkiv finns ingen verktygsloop alls, och just den vagen var helt
   ogrindad en gang i tiden. Kontraktet ska galla aven dar. */
test('aven utan arkiv tvingas svaret genom verktyget', async () => {
  const anropen = stubbaFetch([svarar([{ typ: 'saknas', text: 'Jag har inga dokument om bolaget.' }])]);
  const d = await (await anrop('vad hander med Unibap', { ...ENV, DATA: kv({ 'arkiv:index': [] }) })).json();
  assert.deepEqual((anropen[0].tools || []).map((t) => t.name), ['svara']);
  assert.deepEqual(anropen[0].tool_choice, { type: 'tool', name: 'svara' });
  assert.ok(!d.blockerat);
});

/* Verifieringen far inte bli slappare av att vagen in ar en annan. */
test('ett okant post-id stoppas lika hart via verktyget som via text', async () => {
  stubbaFetch([svarar([{ typ: 'post', id: 'p_finns_inte_1' }])]);
  const d = await (await anrop('hur gick det for Unibap', { ...ENV, DATA: kv(ARKIV()) })).json();
  assert.ok(d.blockerat);
  assert.equal(d.verifiering.orsak, 'referens');
});

test('ett tal i fri prosa stoppas lika hart via verktyget', async () => {
  stubbaFetch([svarar([{ typ: 'metod', text: 'Kassan var 41 900 KSEK vid periodens slut.' }])]);
  const d = await (await anrop('hur gick det for Unibap', { ...ENV, DATA: kv(ARKIV()) })).json();
  assert.ok(d.blockerat);
  assert.equal(d.verifiering.orsak, 'fri_uppgift');
});

/* Granskaren har inga verktyg, sa den prefillas i stallet. Utan det foll aven
   den pa en fence och blockerade varje svar som innehold prosa. */
test('granskaren prefillas sa dess svar inte kan kapslas in', async () => {
  const anropen = stubbaFetch([svarar([{ typ: 'metod', text: 'Ett resonemang utan tal.' }])]);
  await (await anrop('vad ar en moat', { ...ENV, DATA: kv(ARKIV()) })).json();
  const granskning = anropen.find((k) => String(k.system).startsWith('Du granskar ett svar'));
  assert.ok(granskning, 'ingen granskning kordes');
  const sista = granskning.messages[granskning.messages.length - 1];
  assert.equal(sista.role, 'assistant');
  assert.equal(sista.content, '{');
});

test('granskaren godkanner ett svar som fortsatter pa prefillen', async () => {
  stubbaFetch((kropp) => (String(kropp.system).startsWith('Du granskar ett svar')
    ? { content: [{ type: 'text', text: '"godkand":true}' }], stop_reason: 'end_turn' }
    : svarar([{ typ: 'metod', text: 'Ett resonemang utan tal.' }])));
  const d = await (await anrop('vad ar en moat', { ...ENV, DATA: kv(ARKIV()) })).json();
  assert.ok(!d.blockerat, 'blockerades: ' + (d.verifiering && d.verifiering.orsak));
});

test('svarsverktyget beskriver samma block som kontraktet', () => {
  assert.equal(SVARSVERKTYG.name, 'svara');
  const typer = SVARSVERKTYG.input_schema.properties.block.items.properties.typ.enum;
  assert.deepEqual([...typer].sort(), ['metod', 'post', 'saknas', 'tolkning']);
});
