// Berakningarna far aldrig blanda ihop tva bolag.
//
// FELET, hittat i granskning: varken kartans nyckel, jamforbarheten eller
// kvotmatchningen bar bolaget. En fraga far tva bolag i taget, sa laget var inte
// hypotetiskt. Tre foljder, i stigande allvar:
//
//   1. Tva bolags varde for samma metrik och period slog ut varandra. Forst
//      till kvarn vann, det andra bolagets siffra forsvann tyst.
//   2. Steg, arsjamforelse och spann kunde raknas tvars over bolagsgransen.
//   3. Ett bolags rorelseresultat kunde delas med ETT ANNAT bolags omsattning
//      och presenteras som en rorelsemarginal.
//
// Det tredje ar det varsta som kan handa i den har koden. Talet gick vidare in i
// tillatnaTal, sa kallgrinden GODKANDE det: fel siffra, ratta kallor, och
// ingenting langre fram i kedjan som kunde upptacka det. Felet uppstod i kod,
// fore modellens svar, sa ingen prompt och ingen grind hade hjalpt.
//
// Bolagen och talen nedan ar hittepa och markta som illustrativa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extraheraNyckeltal, harled, nyckeltalsUnderlag } from '../../functions/api/_nyckeltal.js';

const ALFA = 'Alfa Industri AB (illustrativt)';
const BETA = 'Beta Teknik AB (illustrativt)';

const dok = (rubrik, text) => ({
  url: 'https://mfn.se/beq/a/x/' + encodeURIComponent(rubrik),
  rubrik, datum: '2026-08-28', bitar: [text],
});
const ark = (namn, ...dokument) => ({ id: namn.slice(0, 4).toLowerCase(), namn, dokument });

test('tva bolags samma metrik och period overlever bada', () => {
  const tal = extraheraNyckeltal([
    ark(ALFA, dok('Delårsrapport Q2 2026', 'Rörelseresultatet uppgick till 900 MSEK.')),
    ark(BETA, dok('Delårsrapport Q2 2026', 'Rörelseresultatet uppgick till 120 MSEK.')),
  ]);
  assert.equal(tal.length, 2, 'ett av bolagen slogs ut');
  assert.deepEqual(tal.map((t) => t.bolag).sort(), [ALFA, BETA]);
});

/* Karnan i felet. Reproducerat exakt sa har innan rattningen: 900 delat pa
   3000 gav "30 procent" utan att nagot bolag namndes. */
test('en marginal raknas aldrig med ett annat bolags namnare', () => {
  const tal = extraheraNyckeltal([
    ark(ALFA, dok('Delårsrapport Q2 2026', 'Rörelseresultatet uppgick till 900 MSEK.')),
    ark(BETA, dok('Delårsrapport Q2 2026', 'Nettoomsättningen uppgick till 3 000 MSEK.')),
  ]);
  const kvoter = harled(tal).filter((h) => h.sort === 'kvot');
  assert.deepEqual(kvoter, [], 'korsvis marginal raknades: ' + JSON.stringify(kvoter.map((k) => k.formel)));
});

test('samma bolags marginal raknas fortfarande', () => {
  const tal = extraheraNyckeltal([
    ark(ALFA, dok('Delårsrapport Q2 2026',
      'Rörelseresultatet uppgick till 900 MSEK. Nettoomsättningen uppgick till 3 000 MSEK.')),
  ]);
  const kvoter = harled(tal).filter((h) => h.sort === 'kvot');
  assert.equal(kvoter.length, 1);
  assert.equal(kvoter[0].procent, 30);
  assert.equal(kvoter[0].bolag, ALFA);
});

/* Med tva bolag i underlaget ska var och en fa sin egen marginal, och de far
   inte byta plats med varandra. */
test('tva bolag ger tva egna marginaler', () => {
  const tal = extraheraNyckeltal([
    ark(ALFA, dok('Delårsrapport Q2 2026',
      'Rörelseresultatet uppgick till 900 MSEK. Nettoomsättningen uppgick till 3 000 MSEK.')),
    ark(BETA, dok('Delårsrapport Q2 2026',
      'Rörelseresultatet uppgick till 40 MSEK. Nettoomsättningen uppgick till 800 MSEK.')),
  ]);
  const kvoter = harled(tal).filter((h) => h.sort === 'kvot');
  const per = Object.fromEntries(kvoter.map((k) => [k.bolag, k.procent]));
  assert.deepEqual(per, { [ALFA]: 30, [BETA]: 5 });
});

/* En utveckling mellan kvartal far heller aldrig korsa bolagsgransen. */
test('en forandring raknas aldrig mellan tva bolag', () => {
  const tal = extraheraNyckeltal([
    ark(ALFA, dok('Delårsrapport Q2 2026', 'Likvida medel uppgick till 500 MSEK.')),
    ark(BETA, dok('Delårsrapport Q1 2026', 'Likvida medel uppgick till 100 MSEK.')),
  ]);
  const steg = harled(tal).filter((h) => h.sort === 'steg');
  assert.deepEqual(steg, [], 'forandring raknad mellan bolag: ' + JSON.stringify(steg.map((s) => s.formel)));
});

/* Utan bolagsnamn i formeln gick harledningen inte att granska: laste man
   underlaget syntes inte vilket bolag talen kom ifran, och det var precis sa
   hopblandningen kunde leva obemarkt. */
test('varje harledning namnger sitt bolag', () => {
  const u = nyckeltalsUnderlag([
    ark(ALFA, dok('Delårsrapport Q2 2026',
      'Rörelseresultatet uppgick till 900 MSEK. Nettoomsättningen uppgick till 3 000 MSEK.')),
  ]);
  assert.ok(u.harledda.length > 0);
  for (const h of u.harledda) assert.match(h.formel, new RegExp('^' + ALFA.replace(/[()]/g, '\\$&')));
});
