/* Registret ska folja fragan, inte ordningen i koden.

   Taket pa 40 kB slar i vid varje bolagsfraga: matt 2026-09-12 rymdes 29 av
   flera hundra erbjudna poster. Vilka 29 avgjordes av ordningen i koden.
   NYCKELTAL-tabellen borjar med P/E och slutar med ROIC, omsattningstillvaxt,
   vinsttillvaxt och nettoskuld/EBITDA, sa P/E kom ALLTID med och de fyra
   sista kom ALDRIG med, oavsett vad anvandaren fragade om.

   Foljden syntes i provkorningen: fragan "hur har ROIC och soliditeten
   utvecklats" blockerades gang pa gang, for talen fanns hos Borsdata men inte
   i registret. Modellen foll tillbaka pa dokumenttext och skrev siffror i
   prosan, och grinden fallde den, helt korrekt.

   Relevansen styr bara KOORDNINGEN. Ingenting utesluts: allt som far plats
   kommer med som forut, det ar bara det fragan handlar om som laggs forst. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';

/* Samma form som nattjobbet skriver till arkiv:nyckeltal, med tabellens egen
   ordning: P/E forst, ROIC och Nettoskuld/EBITDA sist. */
const NAMN = ['P/E', 'EV/EBIT', 'EV/EBITDA', 'P/S', 'P/B', 'Direktavkastning',
  'Avkastning på eget kapital', 'Rörelsemarginal', 'Bruttomarginal', 'FCF-marginal',
  'Soliditet', 'ROIC', 'Omsättningstillväxt', 'Vinsttillväxt', 'Nettoskuld/EBITDA'];

const bolag = {
  bolagId: 'unibap', bolag: 'Unibap', valuta: 'SEK', rakenskaper: [],
  nyckeltal: NAMN.map((namn, i) => ({
    kpi: i, namn, enhet: namn.includes('marginal') || namn === 'Soliditet' || namn === 'ROIC' ? 'procent' : 'gånger',
    ar: 2025, varde: 10 + i,
    historik: [{ ar: 2024, varde: 9 + i }, { ar: 2023, varde: 8 + i }],
    median: { median: 12 + i, fran: 2016, till: 2025, ar: 10 },
  })),
};

const matten = fraga => {
  const r = skapaFaktaregister();
  r.synka({ question: fraga, holdings: [{ name: 'Unibap', quantity: 1, gav: 1 }],
    arkiv: [], utdrag: [], nyckeltal: [bolag] });
  return { matt: [...new Set(r.poster().filter(p => (p.kallor || []).some(k => k.typ === 'borsdata')).map(p => p.matt))],
    status: r.status() };
};

test('taket slar fortfarande i, sa urvalet betyder nagot', () => {
  const { matt, status } = matten('Hur har Unibaps ROIC utvecklats?');
  assert.ok(status.begransat, 'taket slog inte i, provet nedan bevisar da ingenting');
  // Varje matt ger bade ett arsvarde och en median, alltsa upp till 2 x NAMN.
  assert.ok(matt.length < NAMN.length * 2, 'alla matt rymdes (' + matt.length + '), provet bevisar ingenting');
});

test('det fragan handlar om kommer med, aven nar det star sist i tabellen', () => {
  // ROIC och Soliditet ligger näst sist och kom aldrig med fore den har andringen.
  const roic = matten('Hur har Unibaps ROIC och soliditet utvecklats de senaste åren?').matt;
  assert.ok(roic.includes('ROIC'), 'ROIC kom inte med i en fraga om ROIC');
  assert.ok(roic.includes('Soliditet'), 'Soliditet kom inte med i en fraga om soliditet');

  const skuld = matten('Hur stor är nettoskulden i förhållande till EBITDA?').matt;
  assert.ok(skuld.includes('Nettoskuld/EBITDA'), 'Nettoskuld/EBITDA kom inte med i en fraga om nettoskuld');
});

test('svenskans bestamda form far inte tappa traffen', () => {
  // Fragan sager "rorelsemarginalen", mattet heter "Rorelsemarginal".
  const m = matten('Hur har rörelsemarginalen utvecklats?').matt;
  assert.equal(m[0], 'Rörelsemarginal', 'bestamd form matchade inte mattets namn, forsta matt var ' + m[0]);
});

test('tva olika fragor ger tva olika register', () => {
  const a = matten('Hur har Unibaps ROIC utvecklats?').matt;
  const b = matten('Hur stor är nettoskulden i förhållande till EBITDA?').matt;
  assert.notDeepEqual(a, b, 'urvalet ar fortfarande frageoberoende');
});

test('utan igenkand term faller urvalet tillbaka pa tabellens ordning', () => {
  const m = matten('Vad tycker du om bolaget?').matt;
  assert.equal(m[0], 'P/E', 'den oigenkannliga fragan andrade ordningen');
});
