/* Ett tal som star i kallan ar ett citat, inte en uppfinning.

   Grinden forbjod varje tal i prosa. Skalet var riktigt for MATT: omsattning
   och marginal ska renderas av servern ur en typad post. Men ett dokument bar
   ocksa saklara tal som aldrig far en post, till exempel ett ordervarde eller
   ett ramavtals langd. For dem kunde modellen omojligt lyda: det fanns inget
   att peka pa, och enda lagliga draget var att inte namna saken.

   Matningen 2026-09-12 pa Unibap och Loft Orbital: fragan foll gang pa gang
   med "1,2 MEUR" och "tre ar" som brott, fast bada star ordagrant i bolagets
   egen MAR-pliktiga release.

   Nu far talet sta OM samma tal med samma enhet star i en kalla som blocket
   sjalvt aberopar. Proven nedan haller bada riktningarna, och sarskilt att
   enheten maste stamma: en siffra ur kallan far inte bli en fribiljett for ett
   annat pastaende med samma siffror. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { talIProsa, lasFaktasvar } from '../../functions/api/_faktasvar.js';

/* Ordagrant ur arkivets Unibap-dokument. */
const KALLA = [
  'Unibap Space Solutions AB (publ) has signed a three-year framework agreement with Loft Orbital',
  'The first call-off order value is 1.39 MEUR, with delivery in 2025.',
  'Ordervärdet är 1,2 MEUR avseende iX10-lösningar. Exportlicens är sedan tidigare beviljad.',
  'Ramavtalet löper över tre år.',
].join('\n');

test('en siffra ur en aberopad kalla far sta i prosan', () => {
  for (const text of [
    'Avropet i mars var på 1,2 MEUR.',
    'Det första avropet på 1,39 MEUR var villkorat av exporttillstånd.',
  ]) assert.equal(talIProsa(text, [], KALLA), '', 'falldes trots att talet star i kallan: ' + text);
});

test('samma siffra utan kalla faller som forut', () => {
  assert.match(talIProsa('Avropet i mars var på 1,2 MEUR.', [], ''), /siffran/);
});

/* Provet som avgjorde att dispensen INTE far galla utskrivna rakneord.
   Kallan sager "Ramavtalet loper over tre ar". Med dispens slapptes darfor
   ocksa pastaendet om kassans rackvidd igenom: samma tal, samma enhet, helt
   annat amne. Bada ska falla. */
test('utskrivna rakneord far ingen dispens ens nar de star i kallan', () => {
  assert.match(talIProsa('Ramavtalet med Loft Orbital löper över tre år.', [], KALLA), /tidslangden/);
  assert.match(talIProsa('Kassan räcker i tre år med nuvarande förbrukning.', [], KALLA), /tidslangden/);
});

test('ENHETEN maste stamma, en siffra ur kallan ar ingen fribiljett', () => {
  // 1,2 star i kallan, men som MEUR. Som procent ar det ett annat pastaende.
  assert.match(talIProsa('Rörelsemarginalen var 1,2 procent under kvartalet.', [], KALLA), /siffran/);
  assert.match(talIProsa('Bolaget har 1,39 miljoner aktier utestående.', [], KALLA), /siffran/);
});

/* TECKNET. Den allvarligaste luckan i forsta versionen av dispensen: kallan
   sade minus och prosan plus, med samma siffror. Ett forlustkvartal hade
   kunnat presenteras som ett vinstkvartal och varje tal i meningen hade varit
   "belagt". Grans behovs at bada hallen. */
test('ett minustal i kallan belagger inte ett plustal i prosan', () => {
  const minus = 'Rörelseresultatet uppgick till -85 MSEK för kvartalet.';
  assert.match(talIProsa('Resultatet är 85 MSEK.', [], minus), /siffran/);
  assert.equal(talIProsa('Resultatet är -85 MSEK.', [], minus), '', 'samma tecken som kallan stoppades');
});

test('ett kortare tal far inte traffa inuti ett langre', () => {
  assert.match(talIProsa('Kassan är 85 MSEK.', [], 'Kassan uppgick till 185 MSEK.'), /siffran/);
  assert.match(talIProsa('Avropet var på 1,3 MEUR.', [], 'Ordervärdet är 1,39 MEUR.'), /siffran/);
});

test('ett tal som inte star i kallan faller aven om det ligger nara ett som gor det', () => {
  assert.match(talIProsa('Avropet var på 1,3 MEUR.', [], KALLA), /siffran/);
  assert.match(talIProsa('Rörelsemarginalen låg på 12 procent under perioden.', [], KALLA), /siffran/);
});

test('pahittade matt faller oavsett kalla', () => {
  assert.match(talIProsa('ROIC ligger sannolikt kring 15 procent.', [], KALLA), /siffran/);
  assert.match(talIProsa('Bolaget delade ut en krona per aktie.', [], KALLA), /beloppet/);
});

/* Kopplingen mellan block och kalla ar det som gor regeln tat: bara stodet
   blocket SJALVT pekar pa raknas, inte allt som rakar ligga i registret. */
const register = poster => ({
  get: id => poster.find(p => p.id === id),
  poster: () => poster,
});

const POSTER = [
  { id: 'd1', typ: 'dokument', bolag: 'Unibap', rubrik: 'Avropsorder',
    text: 'Ordervärdet är 1,2 MEUR avseende iX10-lösningar.', kallor: [{ url: 'https://mfn.se/x', citat: '' }] },
  { id: 'd2', typ: 'dokument', bolag: 'Unibap', rubrik: 'Annat',
    text: 'Bolaget har sitt säte i Uppsala.', kallor: [{ url: 'https://mfn.se/y', citat: '' }] },
];

test('bara det stod blocket aberopar far belagga talet', () => {
  const ok = lasFaktasvar({ version: 1, block: [
    { typ: 'post', id: 'd1' },
    { typ: 'tolkning', text: 'Avropet var på 1,2 MEUR, alltså i samma storleksordning som det förra.', stod: ['d1'] },
  ] }, register(POSTER));
  assert.ok(ok.ok, 'ett belagt tal stoppades: ' + ok.klagan);

  // Samma tal, men blocket stoder sig pa ett dokument som inte namner det.
  const nej = lasFaktasvar({ version: 1, block: [
    { typ: 'post', id: 'd2' },
    { typ: 'tolkning', text: 'Avropet var på 1,2 MEUR, alltså i samma storleksordning som det förra.', stod: ['d2'] },
  ] }, register(POSTER));
  assert.ok(!nej.ok, 'talet belades av en kalla blocket inte aberopat');
  assert.equal(nej.orsak, 'fri_uppgift');
});

test('metod och saknas har inga kallor och ar lika strikta som forut', () => {
  for (const typ of ['metod', 'saknas']) {
    const d = lasFaktasvar({ version: 1, block: [
      { typ: 'post', id: 'd1' },
      { typ, text: 'Ett avrop på 1,2 MEUR är inte samma sak som en årsomsättning.' },
    ] }, register(POSTER));
    assert.ok(!d.ok, typ + '-block slapp igenom ett tal');
  }
});
