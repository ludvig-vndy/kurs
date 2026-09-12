/* MFN:s sidram ar inte bolagets kommunikation.

   Skrapningen styckar varje pressmeddelande i bitar, och tre av fem i ett
   typiskt dokument ar sajtens egen ram: brodsmula och meny, en kurswidget, och
   en inloggningsinstruktion. Matt over arkivet 2026-09-12: 921 av 2285 bitar,
   40 procent av bitarna och 55 procent av alla tecken.

   Det ar inte bara sloseri med ett register som redan slar i taket och med
   token i varje modellanrop. SAMTLIGA 921 bar siffror som ser ut som
   bolagsdata: widgeten skriver "Antal aktier 265 029" och "Rel. mcap 0,24%".
   En fraga om antalet aktier kunde alltsa traffa MFN:s widget och fa tillbaka
   ett tal som inte star i nagon rapport, med dokumentet som kalla. Det ar samma
   felklass som allt annat har ar byggt for att stoppa, och den lag i
   underlaget hela tiden.

   Piloten sag symptomet forst: "blir lite mycket text och for lite slutsatser". */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arSidram, stadaBit, hamtaUtdrag } from '../../functions/api/_kallgrind.js';
import { extraheraNyckeltal } from '../../functions/api/_nyckeltal.js';

/* Ordagrant ur arkivets Unibap-dokument, forkortat. */
const BRODSMULA = 'MFN.se > Unibap Space Solutions > Avropsorder \n\n Pressmeddelanden \n\n Om oss \n\n Kontakt \n\n Privacy Policy \n\n Login';
const WIDGET = 'Likviditet\n\n 1,56 MSEK\n\n Rel. mcap\n\n 0,24%\n\n | \n\n Antal aktier\n\n 265 029\n\n Likvida medel uppgick till 999 MSEK';
const INLOGG = 'För att logga in, klicka på "Login" i mailet för att verifiera ditt konto.';
const GENVAGAR = 'Short keys for navigating in split view \n ↑ Select newer press release';
const RIKTIG = 'Bolagets lösningar möjliggör realtidsövervakning. Vem äger bolaget? All ägardata du vill ha finns i Holdings ! '
  + 'Unibap Space Solutions: Avropsorder från Loft Orbital under ramavtalet. Ordervärdet är 1,2 MEUR avseende iX10-lösningar.';

test('sajtens ram kanns igen, bolagets text gor det inte', () => {
  for (const ram of [BRODSMULA, WIDGET, INLOGG, GENVAGAR]) assert.ok(arSidram(ram), 'slapptes igenom: ' + ram.slice(0, 40));
  for (const text of [RIKTIG, 'Nettoomsättningen uppgick till 12 MSEK.', 'VD har ordet: kvartalet var starkt.'])
    assert.ok(!arSidram(text), 'bolagets text klassades som ram: ' + text.slice(0, 40));
});

test('bolagsrutan fore pressmeddelandet stads bort, meningen som bar svaret star kvar', () => {
  const stadad = stadaBit(RIKTIG);
  assert.ok(!/Vem äger bolaget/.test(stadad), 'bolagsrutan foljde med');
  assert.ok(!/All ägardata/.test(stadad), 'bolagsrutan foljde med');
  assert.match(stadad, /Ordervärdet är 1,2 MEUR/, 'sjalva uppgiften klipptes bort');
  // Utan ram ror stadningen ingenting.
  const ren = 'Nettoomsättningen uppgick till 12 MSEK.';
  assert.equal(stadaBit(ren), ren);
});

const arkiv = bitar => [{ id: 'unibap', namn: 'Unibap', dokument: [{
  url: 'https://mfn.se/a/unibap/avropsorder', rubrik: 'Avropsorder Q1 2026', datum: '2026-03-16', bitar,
}] }];

test('en fraga om antalet aktier kan inte traffa kurswidgeten', () => {
  const utdrag = hamtaUtdrag('hur många aktier har Unibap', arkiv([WIDGET, RIKTIG]), 6, Date.parse('2026-04-01'));
  assert.ok(!utdrag.some(u => /265 029|Rel\. mcap/.test(u.text)), 'widgetens tal kom med som underlag');
});

test('sidramen blir aldrig ett belagt nyckeltal', () => {
  // Widgeten skriver "Likvida medel uppgick till 999 MSEK", alltsa exakt den
  // form extraktionen letar efter. Star den i ramen ar den anda inte ett faktum.
  const utan = extraheraNyckeltal(arkiv([WIDGET]));
  assert.equal(utan.filter(n => n.varde === 999).length, 0, 'ett widgetvarde blev ett belagt nyckeltal');
  // Samma mening i bolagets egen text ska daremot lasas som forut.
  const med = extraheraNyckeltal(arkiv(['Likvida medel uppgick till 999 MSEK vid periodens utgång.']));
  assert.ok(med.some(n => n.varde === 999), 'riktig rapporttext lases inte langre');
});

test('bolagets text overlever nar ramen tas bort', () => {
  const utdrag = hamtaUtdrag('avropsorder Loft Orbital', arkiv([BRODSMULA, WIDGET, RIKTIG, INLOGG]), 6, Date.parse('2026-04-01'));
  assert.equal(utdrag.length, 1, 'fel antal bitar overlevde: ' + utdrag.length);
  assert.match(utdrag[0].text, /Ordervärdet är 1,2 MEUR/);
});

/* ARKIVETS DATUM AR OFTA INLASNINGSDAGEN.

   Matt 2026-09-12: atta bolag hade varenda dokument stamplat samma dag, den
   dag bevakningen startade. En delarsrapport for januari till september 2024
   bar datumet 2026-07-08; den publicerades 2024-11-07, alltsa 608 dagar fel.

   Det ar inte kosmetiskt. Datumet styr farskhetspoangen i urvalet, avgor om
   ett dokument ligger inom en efterfragad period, och visas for anvandaren som
   pressmeddelandets datum. Ett svar kunde saga att en uppgift var farsk nar den
   var nastan tva ar gammal, med kalla och allt.

   Ratt datum star i texten. 292 av 308 dokument rattas, och samtliga 22
   rapporter med lasbar period far ett datum EFTER sin egen period. */
test('publiceringsdatumet lases ur texten, inte ur inlasningen', async () => {
  const { publiceringsdatum } = await import('../../functions/api/_kallgrind.js');
  const nu = Date.parse('2026-09-12');
  // MAR-raden gar forst, den ar den juridiska uppgiften.
  assert.equal(publiceringsdatum({ datum: '2026-08-30', bitar: [
    'Informationen lämnades, genom ovanstående kontaktperson(er)s försorg, för offentliggörande den 2026-03-16 08:30 CET.',
  ] }, nu), '2026-03-16');
  // Huvudets tidsstampel duger nar MAR-raden saknas.
  assert.equal(publiceringsdatum({ datum: '2026-08-30', bitar: [
    'Ferroamp AB (publ) Delårsrapport Q2 2026 \n\n 2026-08-19 07:30:14 \n\n Perioden i sammandrag',
  ] }, nu), '2026-08-19');
  // Sidramen far inte tranga undan huvudet: tidsstampeln ligger efter
  // tusentals tecken meny och kurswidget i ett verkligt dokument.
  assert.equal(publiceringsdatum({ datum: '2026-08-30', bitar: [
    BRODSMULA, WIDGET, 'Rubrik \n\n 2026-08-19 07:30:14 \n\n Perioden i sammandrag',
  ] }, nu), '2026-08-19');
  // Utan lasbart datum behalls arkivets, och ett datum i framtiden godtas aldrig.
  assert.equal(publiceringsdatum({ datum: '2026-08-30', bitar: ['Ingen tidsstämpel här.'] }, nu), '2026-08-30');
  assert.equal(publiceringsdatum({ datum: '2026-08-30', bitar: ['Rubrik \n\n 2099-01-01 07:30:14 \n\n text'] }, nu), '2026-08-30');
});

test('ett utdrag bar publiceringsdatumet, inte inlasningsdagen', () => {
  const dokument = [{ url: 'https://mfn.se/a/unibap/x', rubrik: 'Avropsorder', datum: '2026-08-30',
    bitar: ['Avropsorder från Loft Orbital \n\n 2026-03-16 08:30:00 \n\n Ordervärdet är 1,2 MEUR.'] }];
  const u = hamtaUtdrag('avropsorder Loft Orbital', [{ id: 'unibap', namn: 'Unibap', dokument }], 6, Date.parse('2026-09-12'));
  assert.equal(u.length, 1);
  assert.equal(u[0].datum, '2026-03-16', 'inlasningsdagen foljde med ut som kalldatum');
});
