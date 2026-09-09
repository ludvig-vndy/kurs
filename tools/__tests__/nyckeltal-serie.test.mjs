// Djupet i nyckeltalslagret: tusentalsenheter, serier och kvoter.
//
// Modellen far inte rakna, vilket ar ratt regel. Foljden ar att kodens rackvidd
// ar taket for hur djupt ett svar kan bli. Det har provar det taket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extraheraNyckeltal, harled, nyckeltalsUnderlag, periodUrSpann, periodVidTraff }
  from '../../functions/api/_nyckeltal.js';

/* PERIODEN LASES DAR TALET STAR, inte i rubriken.

   En bokslutskommunike bar BADA: forst kvartalet, sedan helaret. Unibaps for
   2023 sager "Oktober - december 2023 ... 9 629 KSEK" och strax under "Januari
   - december 2023 ... 50 077 KSEK". Regexen tar forsta traffen, alltsa
   kvartalet, medan rubriken sager januari till december. Utan den har lasningen
   stampades kvartalets 9,6 MSEK som HELARETS, ett fel pa faktor fem, och
   marginalerna raknades sedan ovanpa det.

   Det ar det farligaste felet vi kan gora: ratt tal, ratt kalla, fel period.
   Kallgrinden ser ingenting, for talet star ju dar. */
test('periodUrSpann laser vilket kvartalsspann som helst, inte bara fran januari', () => {
  assert.deepEqual(periodUrSpann('Oktober - december 2023'), { ar: 2023, kvartal: 4, langd: 1 });
  assert.deepEqual(periodUrSpann('Juli - september 2023'), { ar: 2023, kvartal: 3, langd: 1 });
  assert.deepEqual(periodUrSpann('Januari - december 2023'), { ar: 2023, kvartal: 4, langd: 4 });
  assert.deepEqual(periodUrSpann('April - juni 2022'), { ar: 2022, kvartal: 2, langd: 1 });
});

test('periodUrSpann vagrar spann som inte ar hela kvartal', () => {
  assert.equal(periodUrSpann('februari - juni 2023'), null);
  assert.equal(periodUrSpann('januari - maj 2023'), null);
  assert.equal(periodUrSpann('december - januari 2023'), null);
  assert.equal(periodUrSpann('ingen period alls'), null);
});

test('periodVidTraff tar narmaste rubrik fore talet, inte dokumentets', () => {
  const text = 'Bokslutskommuniké januari - december 2023. Oktober - december 2023 ' +
    'Nettoomsättning uppgick till 9 629 KSEK. Januari - december 2023 ' +
    'Nettoomsättning uppgick till 50 077 KSEK.';
  const kvartal = text.indexOf('9 629');
  const helar = text.indexOf('50 077');
  assert.deepEqual(periodVidTraff(text, kvartal, 'Bokslutskommuniké januari - december 2023'),
    { ar: 2023, kvartal: 4, langd: 1 }, 'kvartalstalet ska bli ett kvartal');
  assert.deepEqual(periodVidTraff(text, helar, 'Bokslutskommuniké januari - december 2023'),
    { ar: 2023, kvartal: 4, langd: 4 }, 'helarstalet ska bli helaret');
});

test('utan rubrik i texten faller periodVidTraff tillbaka pa dokumentets', () => {
  const text = 'Nettoomsättning uppgick till 9 629 KSEK.';
  assert.deepEqual(periodVidTraff(text, 30, 'Delårsrapport januari - mars 2026'),
    { ar: 2026, kvartal: 1, langd: 1 });
});

/* Hela felet, som ett prov pa den riktiga formen. Fore rattningen blev det har
   "helaret 2023: 9,629 MSEK". Sanningen ar 50,077. */
test('bokslutskommunikens kvartalstal stamplas inte som helaret', () => {
  const t = extraheraNyckeltal([{ namn: 'X', dokument: [{
    url: 'u', rubrik: 'Bokslutskommuniké januari - december 2023', datum: '2024-02-08',
    bitar: ['Bokslutskommuniké januari - december 2023. Oktober - december 2023 ' +
      'Nettoomsättning uppgick till 9 629 KSEK (6 215). Januari - december 2023 ' +
      'Nettoomsättning uppgick till 50 077 KSEK (22 048).'],
  }] }]);
  const q4 = t.find((x) => x.langd === 1);
  assert.ok(q4, 'kvartalstalet saknas');
  assert.equal(q4.varde, 9.629);
  assert.equal(q4.kvartal, 4);
});

const dok = (rubrik, ...rader) => ({ url: rubrik, rubrik, datum: '2026-01-01', bitar: [rubrik + '. ' + rader.join(' ')] });
const arkiv = (...dokument) => [{ namn: 'X', dokument }];

/* SMABOLAGEN VAR OSYNLIGA. Ankaret kande bara miljonenheter, men smabolag
   redovisar i tusental. Uppmatt pa 24 riktiga rapporter fran de sex bevakade
   bolagen gav hela lagret EN harledning innan det har. */
test('KSEK lases och raknas om till MSEK', () => {
  const t = extraheraNyckeltal(arkiv(
    dok('Delårsrapport januari - juni 2022', 'Nettoomsättningen uppgick till 6 969 KSEK (4 268).')));
  assert.equal(t.length, 1);
  assert.equal(t[0].varde, 6.969);
  assert.equal(t[0].enhet, 'MSEK');
});

test('TSEK och KEUR lases ocksa, och landar i ratt valuta', () => {
  const s = extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026', 'Intäkterna uppgick till 12 400 TSEK.')));
  assert.equal(s[0].varde, 12.4);
  assert.equal(s[0].enhet, 'MSEK');
  const e = extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026', 'Intäkterna uppgick till 3 500 KEUR.')));
  assert.equal(e[0].varde, 3.5);
  assert.equal(e[0].enhet, 'MEUR');
});

/* Skalan MASTE normaliseras, inte bara lasas. Ett bolag som byter fran KSEK
   till MSEK mellan tva rapporter skulle annars ge en tusenfaldig "forandring". */
test('ett bolag som byter skala mellan rapporter jamfors anda ratt', () => {
  const h = harled(extraheraNyckeltal(arkiv(
    dok('Delårsrapport för det första kvartalet 2026', 'Intäkterna uppgick till 12,4 MSEK.'),
    dok('Bokslutskommuniké för det fjärde kvartalet 2025', 'Intäkterna uppgick till 10 000 KSEK.'))));
  const steg = h.find((x) => x.sort === 'steg');
  assert.ok(steg, 'inget kvartalssteg hittades');
  assert.equal(steg.franVarde, 10, 'KSEK ska ha blivit MSEK, inte lasts som 10 000');
  assert.equal(steg.tillVarde, 12.4);
  assert.ok(Math.abs(steg.forandring - 2.4) < 1e-12);
});

test('bruttoresultat och de nya metrikerna lases', () => {
  const t = extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026',
    'Bruttoresultatet uppgick till 40,0 MSEK.',
    'Eget kapital uppgick till 250,0 MSEK.',
    'Orderingången uppgick till 88,0 MSEK.')));
  const m = t.map((x) => x.metrik).sort();
  assert.deepEqual(m, ['bruttoresultat', 'eget kapital', 'orderingång']);
});

/* SERIEN. Tidigare togs ETT steg per metrik och slingan bröts. Det var darfor en
   utvecklingsfraga inte gick att besvara aven nar alla rapporter lag i
   underlaget: dokumenten fanns, aritmetiken saknades. */
const SERIE = arkiv(
  dok('Delårsrapport januari - mars 2026', 'Intäkterna uppgick till 40,0 MSEK.'),
  dok('Delårsrapport januari - mars 2025', 'Intäkterna uppgick till 30,0 MSEK.'),
  dok('Delårsrapport januari - mars 2024', 'Intäkterna uppgick till 20,0 MSEK.'),
  dok('Delårsrapport januari - mars 2023', 'Intäkterna uppgick till 10,0 MSEK.'));

test('en flerarig serie ger bade arsjamforelse och helt spann', () => {
  const h = harled(extraheraNyckeltal(SERIE));
  const ar = h.find((x) => x.sort === 'aroverar');
  const spann = h.find((x) => x.sort === 'spann');
  assert.ok(ar, 'arsjamforelse saknas');
  assert.equal(ar.franVarde, 30);
  assert.equal(ar.tillVarde, 40);
  assert.ok(spann, 'spannet saknas, det ar det som svarar pa "sedan 2023"');
  assert.equal(spann.franVarde, 10);
  assert.equal(spann.tillVarde, 40);
  assert.equal(spann.forandring, 30);
  assert.equal(spann.punkter, 4);
});

test('spannet kraver minst tre punkter, tva ar ingen utveckling', () => {
  const h = harled(extraheraNyckeltal(arkiv(
    dok('Delårsrapport januari - mars 2026', 'Intäkterna uppgick till 40,0 MSEK.'),
    dok('Delårsrapport januari - mars 2025', 'Intäkterna uppgick till 30,0 MSEK.'))));
  assert.equal(h.filter((x) => x.sort === 'spann').length, 0);
});

/* KVOTEN. En marginal ar en division, och modellen far inte dividera. Utan de
   har raderna kan "hur ser marginalen ut" inte besvaras alls. */
test('rorelsemarginal raknas i kod ur tva metriker for samma period', () => {
  const h = harled(extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026',
    'Intäkterna uppgick till 200,0 MSEK.', 'Rörelseresultatet uppgick till 30,0 MSEK.'))));
  const k = h.find((x) => x.metrik === 'rörelsemarginal');
  assert.equal(k.sort, 'kvot');
  assert.equal(k.procent, 15);
  assert.match(k.formel, /30 delat pa 200 MSEK for Q1 2026 ger 15 procent/);
});

test('bruttomarginal ocksa, och bara nar bada talen finns for samma period', () => {
  const bada = harled(extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026',
    'Intäkterna uppgick till 100,0 MSEK.', 'Bruttoresultatet uppgick till 41,0 MSEK.'))));
  assert.equal(bada.find((x) => x.metrik === 'bruttomarginal').procent, 41);

  const bara = harled(extraheraNyckeltal(arkiv(dok('Delårsrapport januari - mars 2026',
    'Bruttoresultatet uppgick till 41,0 MSEK.'))));
  assert.equal(bara.filter((x) => x.metrik === 'bruttomarginal').length, 0);
});

test('marginalen raknas aldrig over olika perioder', () => {
  const h = harled(extraheraNyckeltal(arkiv(
    dok('Delårsrapport januari - juni 2026', 'Intäkterna uppgick till 200,0 MSEK.'),
    dok('Delårsrapport januari - mars 2026', 'Rörelseresultatet uppgick till 30,0 MSEK.'))));
  assert.equal(h.filter((x) => x.sort === 'kvot').length, 0);
});

/* Kallgrinden slapper bara igenom tal som star i underlaget. Raknar vi fram ett
   tal i kod utan att lagga det i tillatnaTal blockeras vart eget svar. */
test('alla harledda tal ar tillatna for kallgrinden', () => {
  const u = nyckeltalsUnderlag(arkiv(
    dok('Delårsrapport januari - mars 2026', 'Intäkterna uppgick till 200,0 MSEK.', 'Rörelseresultatet uppgick till 30,0 MSEK.'),
    dok('Delårsrapport januari - mars 2025', 'Intäkterna uppgick till 100,0 MSEK.'),
    dok('Delårsrapport januari - mars 2024', 'Intäkterna uppgick till 50,0 MSEK.')));
  for (const v of [15, 200, 30, 150, 50]) {
    assert.ok(u.tillatnaTal.includes(v), 'talet ' + v + ' saknas i tillatnaTal');
  }
  assert.ok(u.tillatnaTal.every((v) => typeof v === 'number' && isFinite(v)));
});

test('underlagstexten sager vilken sorts jamforelse varje rad ar', () => {
  const u = nyckeltalsUnderlag(SERIE);
  assert.match(u.text, /jamfort med samma period ett ar tidigare/);
  assert.match(u.text, /over hela den period vi har underlag for/);
});

test('utan nyckeltal blir underlaget tomt, inte trasigt', () => {
  const u = nyckeltalsUnderlag(arkiv(dok('Ett pressmeddelande', 'Bolaget meddelar att VD slutar.')));
  assert.equal(u.text, '');
  assert.deepEqual(u.tillatnaTal, []);
  assert.deepEqual(u.harledda, []);
});
