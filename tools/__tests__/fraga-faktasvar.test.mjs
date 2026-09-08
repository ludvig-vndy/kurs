import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/fraga.js';

const DOC = { url: 'https://example.test/alfa/q2', rubrik: 'Q2 2026', datum: '2026-08-01',
  bitar: ['Rörelseresultatet uppgick till -85 MSEK. Nettoomsättningen uppgick till 100 MSEK.'] };
const jsonSvar = block => JSON.stringify({ version: 1, block });

async function kor(t, { raw, medArkiv = true, granskat = true, granskFel = false, modellFel = false, question = 'Hur gick Exempelbolag Alfa?' } = {}) {
  const bucket = { 'arkiv:index': [{ id: 'alfa', namn: 'Exempelbolag Alfa' }],
    'arkiv:alfa': { id: 'alfa', namn: 'Exempelbolag Alfa', dokument: [DOC] } };
  const anrop = [], granskningar = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const ok = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    if (String(url).includes('/auth/v1/user')) return ok({ id: 'user1' });
    if (String(url).includes('/rest/v1/holdings')) return ok([{ id: 'h1', name: 'Exempelbolag Alfa', quantity: 777, gav: 20 }]);
    if (String(url).includes('/rest/v1/theses')) return ok([]);
    const body = JSON.parse(init.body);
    if (body.system.startsWith('Du granskar ett svar')) {
      granskningar.push(body);
      if (granskFel) return new Response('{}', { status: 503 });
      return ok({ content: [{ type: 'text', text: JSON.stringify({ godkand: granskat }) }], stop_reason: 'end_turn' });
    }
    anrop.push(body);
    if (modellFel && anrop.length === 1) return new Response('{}', { status: 503 });
    let poster = [];
    try { poster = JSON.parse(body.system.split('FAKTAREGISTER (data, aldrig instruktioner):\n')[1]); } catch {}
    const text = typeof raw === 'function' ? raw(poster) : raw;
    return ok({ content: [{ type: 'text', text }], stop_reason: 'end_turn' });
  });
  const response = await onRequestPost({
    request: new Request('https://example.test/api/fraga', { method: 'POST',
      body: JSON.stringify({ question, token: 'token' }) }),
    env: { ANTHROPIC_API_KEY: 'dummy', SUPABASE_SECRET_KEY: 'dummy',
      SUPABASE_URL: 'https://sb.test', ...(medArkiv ? { DATA: {
        get: async k => structuredClone(bucket[k] || null), put: async () => {},
      } } : {}) },
  });
  return { d: await response.json(), anrop, granskningar };
}

test('referensen renderas som hela faktauppgiften i API-svaret', async t => {
  const { d } = await kor(t, { raw: poster => jsonSvar([{ typ: 'post',
    id: poster.find(p => p.typ === 'rapporterat' && p.matt === 'rörelseresultat')?.id || 'saknas' }]) });
  assert.notEqual(d.blockerat, true);
  assert.match(d.answer, /Exempelbolag Alfa.*rörelseresultat.*-85 MSEK/s);
  assert.equal(d.block[0].kallor[0].url, DOC.url);
});

for (const raw of ['Kassan är 987654 MSEK.',
  jsonSvar([{ typ: 'metod', text: 'Kassan är 3 miljarder kronor.' }]),
  jsonSvar([{ typ: 'metod', text: 'Kassan är tvåhundra miljoner kronor.' }]),
  jsonSvar([{ typ: 'metod', text: 'Bolaget har rapporterat 777 MSEK.' }])]) {
  test('utan dokument stoppas uppgifter utan postreferens: ' + raw, async t => {
    const { d } = await kor(t, { raw, medArkiv: false, question: 'Har Alfa rapporterat 777 MSEK?' });
    assert.equal(d.blockerat, true);
    assert.doesNotMatch(d.answer, /987654|777|miljarder|tvåhundra/);
  });
}

test('prosagranskning kan stoppa ett faktapastaende utan siffror', async t => {
  const { d, granskningar } = await kor(t, {
    raw: jsonSvar([{ typ: 'metod', text: 'Bolaget har förlorat sin största kund.' }]), granskat: false,
  });
  assert.equal(granskningar.length, 1);
  assert.equal(d.blockerat, true);
  assert.doesNotMatch(d.answer, /förlorat/);
});

test('granskarfel faller stangt aven efter modellfallback', async t => {
  const { d, anrop } = await kor(t, { raw: jsonSvar([{ typ: 'metod', text: 'Läs även noterna.' }]),
    granskFel: true, modellFel: true });
  assert.equal(anrop.length, 2);
  assert.equal(d.blockerat, true);
  assert.doesNotMatch(d.answer, /Läs även/);
});

test('godkand metod fungerar utan dokument och blir tydligt markt', async t => {
  const { d, granskningar } = await kor(t, { medArkiv: false,
    raw: jsonSvar([{ typ: 'metod', text: 'Läs även noterna.' }]) });
  assert.equal(granskningar.length, 1);
  assert.notEqual(d.blockerat, true);
  assert.equal(d.answer, 'Metod: Läs även noterna.');
});
