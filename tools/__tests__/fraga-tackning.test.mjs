// Tackningsredovisningen i Fraga: att svaret alltid sager vad som lastes och
// vad som saknas, oavsett vilken av de tysta grenarna som togs.
//
// Fore det har kunde Fraga svara med noll dokument pa fem satt utan att nagon
// kunde se det: inga innehav, inget bolag matchat, inget arkiv-id, tomt arkiv,
// ingen KV-bindning. Testerna nedan ar ett per gren.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/fraga.js';

const UID = 'u-1';
const HOLDING = { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' };

/* KV i minnet. `skrivet` fangar write-through sa vi kan prova att hamtad
   historik och det cachade indexet faktiskt sparas. */
function kv(bucket = {}) {
  const skrivet = {};
  return {
    skrivet,
    async get(k, typ) {
      const v = bucket[k];
      if (v === undefined) return null;
      return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
    },
    async put(k, v) { skrivet[k] = v; bucket[k] = JSON.parse(v); },
  };
}

/* Stubbar allt utat: Supabase, Anthropic och MFN. */
function stubbaFetch({ svar = 'Ett lugnt svar.', holdings = [HOLDING], mfn = null } = {}) {
  const sedda = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    sedda.push(u);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/auth/v1/user')) return ok({ id: UID });
    if (u.includes('/rest/v1/holdings')) return ok(holdings);
    if (u.includes('/rest/v1/theses')) return ok([]);
    if (u.includes('api.anthropic.com')) return ok({ content: [{ type: 'text', text: svar }] });
    if (u.includes('mfn.se')) {
      if (mfn == null) return { ok: false, status: 500, text: async () => '' };
      return { ok: true, status: 200, text: async () => (u.includes('limit=') ? mfn.flode : mfn.dokument) };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  return sedda;
}

function anrop(question, env) {
  const request = new Request('https://x.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question, token: 't' }),
    headers: { 'Content-Type': 'application/json' },
  });
  return onRequestPost({ request, env });
}

const ENV_BAS = { ANTHROPIC_API_KEY: 'k', SUPABASE_SECRET_KEY: 's', SUPABASE_URL: 'https://sb.test' };

const ARKIV = {
  'arkiv:index': [{ id: 'unibap', namn: 'Unibap Space Solutions' }],
  'arkiv:unibap': {
    id: 'unibap', namn: 'Unibap Space Solutions',
    dokument: [{
      url: 'https://mfn.se/beq/a/unibap/delarsrapport-q2-2026-aaaaaa11',
      rubrik: 'Delarsrapport Q2 2026', datum: '2026-08-28',
      bitar: ['Nettoomsattningen uppgick till 12 400 KSEK (9 100).'],
    }],
  },
};

test('utan innehav sags det rakt ut i tackningen', async () => {
  stubbaFetch({ holdings: [] });
  const r = await anrop('hur ser kassan ut', { ...ENV_BAS, DATA: kv() });
  const d = await r.json();
  assert.equal(d.tackning.orsak, 'inga innehav uppladdade');
  assert.deepEqual(d.tackning.bolag, []);
});

test('nar inget bolag namns i fragan sags det', async () => {
  stubbaFetch();
  const r = await anrop('vad ar en moat egentligen', { ...ENV_BAS, DATA: kv() });
  const d = await r.json();
  assert.equal(d.tackning.orsak, 'inget av dina bolag namndes i fragan');
});

test('bolag utan arkiv redovisas som utan arkiv, inte som tyst svar', async () => {
  stubbaFetch();
  const r = await anrop('vad hander med Unibap', { ...ENV_BAS, DATA: kv({ 'arkiv:index': [] }) });
  const d = await r.json();
  assert.equal(d.tackning.bolag.length, 1);
  assert.equal(d.tackning.bolag[0].arkiv, false);
  assert.match(d.tackning.bolag[0].av, /index/);
});

test('utan KV-bindning sags att arkivet inte ar tillgangligt', async () => {
  stubbaFetch();
  const r = await anrop('vad hander med Unibap', { ...ENV_BAS });
  const d = await r.json();
  assert.equal(d.tackning.orsak, 'dokumentarkivet ar inte tillgangligt');
});

test('med arkiv redovisas horisonten, och den nar svaret', async () => {
  stubbaFetch();
  const r = await anrop('vad sa Unibap om nettoomsattningen', { ...ENV_BAS, DATA: kv({ ...ARKIV }) });
  const d = await r.json();
  const b = d.tackning.bolag[0];
  assert.equal(b.arkiv, true);
  assert.equal(b.aldst, '2026-08-28');
  assert.equal(b.nyast, '2026-08-28');
  assert.ok(d.tackning.lasta >= 1, 'nagot ska ha lasts');
});

test('det som slice(0,2) tappar redovisas i stallet for att forsvinna', async () => {
  const tre = [
    HOLDING,
    { id: 'h-2', name: 'Lifco', ticker: 'LIFCO.B', quantity: 1, gav: 1, relation: 'ager' },
    { id: 'h-3', name: 'Sectra', ticker: 'SECT.B', quantity: 1, gav: 1, relation: 'ager' },
  ];
  stubbaFetch({ holdings: tre });
  const r = await anrop('jamfor Unibap, Lifco och Sectra', { ...ENV_BAS, DATA: kv({ ...ARKIV }) });
  const d = await r.json();
  assert.equal(d.tackning.utelamnade.length, 1);
  assert.equal(d.tackning.utelamnade[0], 'Sectra');
});

/* Kedjan hela vagen: fragan galler 2022, arkivet borjar 2026, alltsa ska
   historik hamtas hem, hamna i utdraget och sparas for nasta gang. */
const kort = (datum, slug, titel) =>
  '<div class="short-item compressible"><span class="item"><div class="title">' +
  '<span class="compressed-date">' + datum + '</span>' +
  '<span class="compressed-title">' +
  '<a class="title-link item-link" href="/beq/a/unibap/' + slug + '" title="' + titel + '">' + titel + '</a>' +
  '</span></div></span></div>';

const MFN = {
  flode: kort('2022-08-31', 'delarsrapport-juli-2021-juni-2022-bbbbbb22', 'Delarsrapport juli 2021 - juni 2022'),
  dokument: '<p>' + 'Nettoomsattningen uppgick till 6 969 KSEK (4 268). '.repeat(6) + '</p>',
};

test('en fraga om 2022 hamtar historik och redovisar den', async () => {
  stubbaFetch({ mfn: MFN });
  const store = kv({ ...ARKIV });
  const r = await anrop('vad var Unibaps nettoomsattning 2022', { ...ENV_BAS, DATA: store });
  const d = await r.json();

  assert.deepEqual(d.tackning.period, { fran: '2022-01-01', till: '2022-12-31' });
  assert.equal(d.tackning.hamtade, 1, 'ett dokument skulle hamtats hem');
  assert.equal(d.tackning.bolag[0].aldst, '2022-08-31', 'horisonten ska ha flyttats bakat');

  // Write-through: bade historiken och indexet ska ligga kvar till nasta fraga.
  assert.ok(store.skrivet['arkiv:hist:unibap'], 'historiken sparades inte');
  assert.ok(store.skrivet['mfn:idx:unibap'], 'indexet cachades inte');
  assert.equal(JSON.parse(store.skrivet['arkiv:hist:unibap']).dokument[0].datum, '2022-08-31');
});

/* Tacker arkivet redan perioden ska ingen hamtning ske. Glappet mellan
   periodens start och arkivets aldsta dokument ar nio dagar har, alltsa under
   marginalen: ingen rapport kan gomma sig dar. */
test('en fraga inom horisonten hamtar ingen historik', async () => {
  const tackt = {
    ...ARKIV,
    'arkiv:unibap': {
      ...ARKIV['arkiv:unibap'],
      dokument: [{ ...ARKIV['arkiv:unibap'].dokument[0], datum: '2026-01-10' }],
    },
  };
  const sedda = stubbaFetch({ mfn: MFN });
  const r = await anrop('vad sa Unibap om nettoomsattningen 2026', { ...ENV_BAS, DATA: kv(tackt) });
  const d = await r.json();
  assert.equal(d.tackning.hamtade, 0);
  assert.equal(sedda.filter((u) => u.includes('mfn.se')).length, 0, 'MFN skulle inte ha rorts');
});

/* Och tvartom: ett glapp pa atta manader ar precis vad hamtningen finns for. */
test('ett materiellt glapp i perioden utloser hamtning', async () => {
  const sedda = stubbaFetch({ mfn: MFN });
  await anrop('vad sa Unibap om nettoomsattningen 2026', { ...ENV_BAS, DATA: kv({ ...ARKIV }) });
  assert.ok(sedda.some((u) => u.includes('mfn.se')), 'MFN skulle ha fragats');
});

test('nar MFN inte svarar blir det ett svar anda, utan hamtade dokument', async () => {
  stubbaFetch({ mfn: null });
  const r = await anrop('vad var Unibaps nettoomsattning 2022', { ...ENV_BAS, DATA: kv({ ...ARKIV }) });
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.tackning.hamtade, 0);
  assert.ok(d.answer, 'ett svar ska anda ha getts');
});
