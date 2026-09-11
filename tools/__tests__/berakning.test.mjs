import test from 'node:test';
import assert from 'node:assert/strict';
import { berakna, jamforbara } from '../../functions/api/_berakning.js';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';
import { extraheraNyckeltal, harled } from '../../functions/api/_nyckeltal.js';

const kalla = (namn) => ({ url: `https://example.test/${namn}`, citat: `${namn} 1 MSEK` });
const post = (andra = {}) => ({
  id: 'a', typ: 'rapporterat', bolagId: 'alfa', bolag: 'Alfa', matt: 'intäkter',
  slag: 'flode', ar: 2025, kvartal: 1, langd: 1, period: 'Q1 2025',
  varde: 1, enhet: 'MSEK', normaliserat: { varde: 1, enhet: 'MSEK' },
  kallor: [kalla('a')], ...andra,
});

test('jamforbara kräver bolag, mått, slag, enhet, flödeslängd och ändliga värden', () => {
  const a = post(), b = post({ id: 'b', ar: 2024 });
  assert.equal(jamforbara(a, b), true);
  for (const fel of [
    { bolagId: 'beta' }, { matt: 'rörelseresultat' }, { slag: 'balans' },
    { normaliserat: { varde: 1, enhet: 'MEUR' } }, { langd: 2 },
    { normaliserat: { varde: Infinity, enhet: 'MSEK' } },
  ]) assert.equal(jamforbara(a, { ...b, ...fel }), false);
  assert.throws(() => jamforbara(a, { ...b, slag: undefined }), /slag/i);
});

test('differens och tillväxt tar senare post före tidigare post', () => {
  const gammal = post({ id: 'g', normaliserat: { varde: 80, enhet: 'MSEK' }, varde: 80 });
  const ny = post({ id: 'n', kvartal: 2, normaliserat: { varde: 100, enhet: 'MSEK' }, varde: 100 });
  const d = berakna('differens', [ny, gammal]);
  const t = berakna('tillvaxt', [ny, gammal]);
  assert.equal(d.ok, true); assert.equal(d.post.normaliserat.varde, 20);
  assert.equal(t.ok, true); assert.equal(t.post.normaliserat.varde, 25);
  assert.equal(t.post.slag, 'kvot'); assert.equal(t.post.enhet, 'procent');
  assert.match(t.post.formel, /80.*100.*25/s);
});

test('summa kräver angränsande icke överlappande flödesperioder', () => {
  const q1 = post({ id: 'q1', normaliserat: { varde: 10, enhet: 'MSEK' } });
  const q2 = post({ id: 'q2', kvartal: 2, normaliserat: { varde: 20, enhet: 'MSEK' } });
  const q3 = post({ id: 'q3', kvartal: 3, normaliserat: { varde: 30, enhet: 'MSEK' } });
  const r = berakna('summa', [q3, q1, q2]);
  assert.equal(r.ok, true); assert.equal(r.post.normaliserat.varde, 60);
  assert.deepEqual([r.post.ar, r.post.kvartal, r.post.langd], [2025, 3, 3]);
  assert.match(r.post.period, /Q1.*Q3 2025/);
  assert.equal(berakna('summa', [q1, { ...q3, id: 'q4' }]).ok, false);
  assert.equal(berakna('summa', [q1, { ...q2, id: 'q2h', langd: 2 }]).ok, false);
});

test('summa använder periodens början även när operanderna är halvår', () => {
  const h1 = post({ id: 'h1', kvartal: 2, langd: 2, period: 'H1 2025', normaliserat: { varde: 40, enhet: 'MSEK' } });
  const h2 = post({ id: 'h2', kvartal: 4, langd: 2, period: 'H2 2025', normaliserat: { varde: 60, enhet: 'MSEK' } });
  const r = berakna('summa', [h1, h2]);
  assert.equal(r.ok, true);
  assert.equal(r.post.period, 'Q1 2025 till Q4 2025');
  assert.deepEqual([r.post.ar, r.post.kvartal, r.post.langd], [2025, 4, 4]);
});

test('andel kräver exakt samma bolag, period, enhet och slag', () => {
  const resultat = post({ id: 'r', matt: 'rörelseresultat', normaliserat: { varde: 15, enhet: 'MSEK' } });
  const intakter = post({ id: 'i', normaliserat: { varde: 100, enhet: 'MSEK' } });
  const ok = berakna('andel', [resultat, intakter]);
  assert.equal(ok.ok, true); assert.equal(ok.post.normaliserat.varde, 15);
  assert.equal(berakna('andel', [resultat, { ...intakter, kvartal: 2 }]).ok, false);
  assert.equal(berakna('andel', [resultat, { ...intakter, bolagId: 'beta' }]).ok, false);
});

test('division avslås för noll eller negativ tillväxtbas och per månad kräver känt flöde', () => {
  const noll = post({ id: 'z', normaliserat: { varde: 0, enhet: 'MSEK' } });
  const negativ = post({ id: 'm', normaliserat: { varde: -1, enhet: 'MSEK' } });
  assert.equal(berakna('andel', [post(), noll]).ok, false);
  assert.equal(berakna('tillvaxt', [post(), negativ]).ok, false);
  assert.equal(berakna('per_manad', [{ ...post(), langd: undefined }]).ok, false);
  const takt = berakna('per_manad', [post({ normaliserat: { varde: 12, enhet: 'MSEK' } })]);
  assert.equal(takt.ok, true); assert.equal(takt.post.normaliserat.varde, 4);
  assert.equal(takt.post.enhet, 'MSEK per månad');
});

/* PROCENTENHETER, inte procent. En marginal fran 20,1 till 21,4 har stigit 1,3
   procentenheter. Skriver man 6,5 procent sager man nagot annat, och den
   forvaxlingen ar ett av de fel granskaren har fallt i skarpa prov.

   Differensen var forbjuden for ALLA kvoter, sa det enda sattet att jamfora
   tva marginaler var den relativa tillvaxten, alltsa just det missvisande
   talet. En kvot i procent far darfor nu sin ratta differens, med en enhet som
   sager vad den ar. Kvoter i ganger, som P/E, saknar den tolkningen och ar
   fortsatt forbjudna, liksom takter. */
test('differens ger procentenheter for kvoter i procent', () => {
  const kvot = p => post({ slag: 'kvot', enhet: 'procent', varde: p,
    normaliserat: { varde: p, enhet: 'procent' } });
  const d = berakna('differens', [{ ...kvot(21.4), id: 'ny' }, { ...kvot(20.1), id: 'gammal', ar: 2024 }]);
  assert.equal(d.ok, true, d.skal);
  assert.equal(d.post.enhet, 'procentenheter');
  assert.equal(Math.round(d.post.varde * 10) / 10, 1.3);
  assert.equal(d.post.slag, 'kvot');
});

test('differens tillåter fortfarande inte multiplar eller takter', () => {
  for (const fel of [{ slag: 'kvot', enhet: 'gånger', normaliserat: { varde: 10, enhet: 'gånger' } },
    { slag: 'takt', enhet: 'MSEK per månad', normaliserat: { varde: 10, enhet: 'MSEK per månad' } }]) {
    const q = post(fel);
    assert.equal(berakna('differens', [{ ...q, id: 'ny' }, { ...q, id: 'gammal', ar: 2024 }]).ok, false,
      fel.enhet + ' gick att differensberakna');
  }
});

/* ARSPERIODEN ar sin egen sort. Frestelsen var att skriva ar 2025, kvartal 4,
   langd 4 och lata Borsdatas arstal se jamforbara ut med kvartalsposter. Det
   ar inte sant for ett bolag med brutet rakenskapsar. */
test('arsperioder jamfors bara med arsperioder och kan inte summeras', () => {
  const ar = (a, v) => post({ id: 'y' + a, slag: 'kvot', enhet: 'procent', arsperiod: true,
    ar: a, kvartal: null, langd: null, period: String(a), varde: v,
    normaliserat: { varde: v, enhet: 'procent' } });
  assert.equal(jamforbara(ar(2025, 21.4), ar(2024, 20.1)), true);
  // Samma bolag, matt, slag och enhet, men en kvartalsperiod: inte jamforbart.
  const kvartal = post({ id: 'q', slag: 'kvot', enhet: 'procent', matt: 'intäkter',
    normaliserat: { varde: 20, enhet: 'procent' } });
  assert.equal(jamforbara(ar(2025, 21.4), { ...kvartal, matt: ar(2025, 1).matt }), false);
  // Ett arsflode far inte summeras: summan raknar i kvartal.
  const flode = a => ({ ...ar(a, 100), slag: 'flode', enhet: 'MSEK',
    normaliserat: { varde: 100, enhet: 'MSEK' } });
  const d = berakna('summa', [flode(2025), flode(2024)]);
  assert.equal(d.ok, false);
  assert.match(d.skal, /Årsperioder/);
});

test('kedjor plattar lövproveniens, antaganden och formler men stoppar djup tre', () => {
  const egen = post({ id: 'e', typ: 'egen_uppgift', kallor: [], antagande: 'Din uppskattning.' });
  const rapport = post({ id: 'r', kvartal: 2 });
  const ett = berakna('summa', [egen, rapport]);
  assert.equal(ett.ok, true);
  assert.equal(ett.post.vilar_pa.ursprung, 'egen_uppgift');
  assert.deepEqual(ett.post.vilar_pa.poster, ['e', 'r']);
  assert.deepEqual(ett.post.vilar_pa.antaganden, ['Din uppskattning.']);
  const tva = berakna('per_manad', [{ ...ett.post, id: 'b1' }]);
  assert.equal(tva.ok, true); assert.equal(tva.post.djup, 2);
  assert.match(tva.post.formel, /\n/);
  assert.deepEqual(tva.post.vilar_pa.poster, ['e', 'r']);
  assert.equal(berakna('per_manad', [{ ...tva.post, id: 'b2', slag: 'flode' }]).ok, false);
  assert.equal(berakna('differens', [post({ typ: 'illustration' }), rapport]).ok, false);
  const illustration = { ...ett.post, id: 'ill', typ: 'illustration', djup: 0,
    vilar_pa: undefined, kallor: [], normaliserat: { ...ett.post.normaliserat } };
  assert.match(berakna('andel', [{ ...ett.post, id: 'b1' }, illustration]).skal, /Illustrativa/i);
});

test('ren kärna avvisar okänd operation och fel antal operander', () => {
  assert.equal(berakna('produkt', [post(), post()]).ok, false);
  assert.equal(berakna('differens', [post()]).ok, false);
  assert.equal(berakna('summa', Array.from({ length: 17 }, (_, i) => post({ id: String(i), kvartal: i + 1 }))).ok, false);
});

test('registret accepterar bara exakt operation och id-lista från samma request', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{
    rubrik: 'Q1 2025', url: 'https://example.test/q1', datum: '2025-04-01',
    bitar: ['Nettoomsättningen uppgick till 12 MSEK.'],
  }, {
    rubrik: 'Q2 2025', url: 'https://example.test/q2', datum: '2025-07-01',
    bitar: ['Nettoomsättningen uppgick till 18 MSEK.'],
  }] }] });
  const ids = r.poster().filter(p => p.typ === 'rapporterat' && p.matt === 'intäkter').map(p => p.id);
  const svar = r.laggBeraknad({ operation: 'summa', indata: ids });
  assert.equal(svar.ok, true);
  const p = r.get(svar.id);
  assert.equal(p.normaliserat.varde, 30); assert.equal(p.djup, 1);
  for (const fel of [
    { operation: 'summa', indata: [ids[0], 12] },
    { operation: 'summa', indata: [ids[0], '__proto__'] },
    { operation: 'summa', indata: ids, extra: true },
    { operation: 'summa', indata: ids, literal: 30 },
  ]) assert.equal(r.laggBeraknad(fel).ok, false);
});

test('full precision bevaras genom två registerled', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{
    rubrik: 'Q1 2025', url: 'https://example.test/q1', datum: '2025-04-01',
    bitar: ['Nettoomsättningen uppgick till 10 MSEK. Rörelseresultatet uppgick till 1 MSEK.'],
  }] }] });
  const fakta = r.poster().filter(p => p.typ === 'rapporterat');
  const oms = fakta.find(p => p.matt === 'intäkter').id;
  const res = fakta.find(p => p.matt === 'rörelseresultat').id;
  const andel = r.laggBeraknad({ operation: 'andel', indata: [res, oms] });
  const per = r.laggBeraknad({ operation: 'per_manad', indata: [res] });
  assert.equal(r.get(andel.id).normaliserat.varde, 10);
  assert.equal(r.get(per.id).normaliserat.varde, 1 / 3);
});

test('legacyhärledningars antaganden följer med i vilar_pa', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [
    { rubrik: 'Q1 2025', url: 'https://example.test/k1', datum: '2025-04-01', bitar: ['Likvida medel uppgick till 12 MSEK.'] },
    { rubrik: 'Q2 2025', url: 'https://example.test/k2', datum: '2025-07-01', bitar: ['Likvida medel uppgick till 9 MSEK.'] },
  ] }] });
  const takt = r.poster().find(p => p.regel === 'kassaminskning_per_manad');
  const runway = r.poster().find(p => p.regel === 'kassa_delat_med_nettominskning');
  assert.ok(takt.vilar_pa.antaganden.some(a => /investeringar och finansiering/.test(a)));
  assert.ok(runway.vilar_pa.antaganden.some(a => /oförändrad nettominskning/.test(a)));
});

test('kanonisk skalomräkning bevarar decimalprecision', () => {
  const tal = extraheraNyckeltal([{ id: 'alfa', namn: 'Alfa', dokument: [{
    rubrik: 'Q1 2025', url: 'https://example.test/decimal', datum: '2025-04-01',
    bitar: ['Nettoomsättningen uppgick till 1,4 KSEK. Rörelseresultatet uppgick till 0,4 KSEK.'],
  }] }]);
  assert.equal(tal.find(p => p.metrik === 'intäkter').varde, 0.0014);
  assert.equal(tal.find(p => p.metrik === 'rörelseresultat').varde, 0.0004);
  assert.ok(Math.abs(harled(tal).find(p => p.sort === 'kvot').procent - 28.57142857142857) < 1e-12);
});

test('legacy runway räknar och visar samma fullprecisionskedja', () => {
  const tal = extraheraNyckeltal([{ id: 'alfa', namn: 'Alfa', dokument: [
    { rubrik: 'Q1 2025', url: 'https://example.test/r1', datum: '2025-04-01', bitar: ['Likvida medel uppgick till 12 MSEK.'] },
    { rubrik: 'Q2 2025', url: 'https://example.test/r2', datum: '2025-07-01', bitar: ['Likvida medel uppgick till 11,8 MSEK.'] },
  ] }]);
  const h = harled(tal).find(p => p.manaderKvar != null);
  assert.ok(Math.abs(h.perManad - 1 / 15) < 1e-12);
  assert.ok(Math.abs(h.manaderKvar - 177) < 1e-12);
  assert.match(h.formel, /0,066666666666/);
  assert.match(h.formel, /177 manader/);
});
