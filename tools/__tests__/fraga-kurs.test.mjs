// Kursen som kalla i Fraga.
//
// FELET: prompten sa "Peka garna pa en lektion i kursen" medan modellen inte
// hade en enda lektion i kontexten. Den hittade alltsa pa lektionsnummer. Varre:
// den raden ligger i grenen UTAN dokument, och kallgrinden kors bara nar det
// finns utdrag. Pa den vag dar assistenten hade minst att komma med var den
// alltsa helt ogrindad.
//
// Tva niva'er nu, och de gor olika saker. Registret over alla 66 lektioner
// ligger ALLTID i prompten och gor ett pahittat id omojligt. Sjalva
// lektionstexten slas upp bara nar fragan handlar om metod, for en fraga som
// "vad hande med Unibap i gar" ska inte betala femtusen tokens for en lektion
// den inte ska anvanda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, valjLektioner, kursText } from '../../functions/api/fraga.js';
import { INDEX, LEKTIONER } from '../../functions/api/_kurskorpus.js';

const UID = 'u-1';
const UNIBAP = { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' };

function kv(bucket = {}) {
  return {
    async get(k, typ) {
      const v = bucket[k];
      if (v === undefined) return null;
      return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
    },
    async put() {},
  };
}

function stubbaFetch({ holdings = [UNIBAP], svar = 'Ett lugnt svar.' } = {}) {
  const anropen = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/auth/v1/user')) return ok({ id: UID });
    if (u.includes('/rest/v1/holdings')) return ok(holdings);
    if (u.includes('/rest/v1/theses')) return ok([]);
    if (u.includes('api.anthropic.com')) {
      anropen.push(JSON.parse(init.body));
      return ok({ content: [{ type: 'text', text: svar }] });
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  return anropen;
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

/* ---------- valet ---------- */

test('en metodfraga hittar sin lektion', () => {
  const ids = (f) => valjLektioner(f).map((l) => l.id);
  assert.ok(ids('vad är ROIC och varför spelar det roll').includes('5.1'));
  assert.ok(ids('vad är en moat').includes('6.1'));
  assert.ok(ids('varför slår så få fonder index').includes('0.1'));
  assert.ok(ids('hur vet jag om ledningen är bra').includes('7.1'));
});

/* Facktermerna i kursen ar korta: ROIC, moat. Ett forsta forsok viktade pa
   ordlangd och missade dem darfor helt. */
test('korta facktermer racker, langden avgor inte', () => {
  assert.ok(valjLektioner('roic').length > 0);
  assert.ok(valjLektioner('moat').length > 0);
});

/* Bojningar ar regel i svenska, och folk skriver lika ofta utan prickar. */
test('bojning och saknade diakriter far inte gomma en lektion', () => {
  assert.deepEqual(
    valjLektioner('hur raknar man kassaflodet').map((l) => l.id),
    valjLektioner('hur räknar man kassaflödet').map((l) => l.id));
  assert.ok(valjLektioner('ledningen').some((l) => l.id === '7.1'));
});

/* Delstrangsmatchning gav "vad hande med Unibap i gar" tva lektioner, for att
   "gar" star inne i andra ord. En ren nyhetsfraga ska inte dra in kursen. */
test('en ren bolagsfraga drar inte in kursmaterial', () => {
  assert.deepEqual(valjLektioner('vad hände med Unibap i går'), []);
  assert.deepEqual(valjLektioner('hur gick Truecaller under 2026'), []);
});

test('hogst tva lektioner, och alltid med text', () => {
  const v = valjLektioner('vad är ROIC och marginaler och kassaflöde och moat');
  assert.ok(v.length <= 2);
  for (const l of v) {
    assert.ok(l.text.length > 100, l.id + ' saknar text');
    assert.equal(l.text, LEKTIONER[l.id].slice(0, l.text.length));
  }
});

/* ---------- promptavsnittet ---------- */

test('registret ligger alltid med, aven utan vald lektion', () => {
  const t = kursText([]);
  assert.match(t, /KURSENS LEKTIONER/);
  assert.match(t, /5\.1 \| Marginaler och ROIC/);
  assert.match(t, /Hitta aldrig pa ett lektionsnummer/);
  // Registret ar litet nog att alltid bara med.
  assert.ok(t.length < 4000, 'registret ar ' + t.length + ' tecken');
});

test('alla 66 lektioner star i registret', () => {
  assert.equal(INDEX.split(String.fromCharCode(10)).length, Object.keys(LEKTIONER).length);
});

/* Kursen innehaller tal ur forskning och ur illustrativa exempel. Slapptes de in
   som bolagsdata skulle 14,3 ur Morningstar-fyndet i 0.1 bli ett godkant tal att
   skriva ut om Unibaps marginal. */
test('lektionstexten far uttryckligen inte bli bolagstal', () => {
  const t = kursText(valjLektioner('vad är ROIC'));
  assert.match(t, /Tal om anvandarens bolag tas ALDRIG darifran/);
});

/* ---------- hela vagen igenom ---------- */

test('modellen far registret aven pa en ren bolagsfraga', async () => {
  const anropen = stubbaFetch();
  await (await anrop('vad hände med Unibap i går', { ...ENV, DATA: kv() })).json();
  assert.match(anropen[0].system, /KURSENS LEKTIONER/);
  assert.match(anropen[0].system, /0\.1 \| Oddsen/);
});

test('en metodfraga far lektionstexten med sig', async () => {
  const anropen = stubbaFetch();
  const r = await anrop('vad är ROIC och varför spelar det roll', { ...ENV, DATA: kv() });
  const d = await r.json();
  assert.deepEqual(d.tackning.lektioner.slice(0, 1), ['5.1']);
  assert.match(anropen[0].system, /## 5\.1 Marginaler och ROIC/);
});

test('en bolagsfraga betalar inte for lektionstext den inte ska anvanda', async () => {
  const anropen = stubbaFetch();
  const r = await anrop('vad hände med Unibap i går', { ...ENV, DATA: kv() });
  const d = await r.json();
  assert.deepEqual(d.tackning.lektioner, []);
  assert.ok(!/MATERIALET UR DE LEKTIONER/.test(anropen[0].system));
});
