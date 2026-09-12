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
