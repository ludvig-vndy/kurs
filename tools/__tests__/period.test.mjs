// Periodlasningen i Fraga: vilken tid en fraga handlar om, och att utdraget
// foljer den i stallet for att foredra det farskaste.
//
// Varfor det har testas hart: kallgrinden skyddar mot pahittade tal, inte mot
// fel period. Ett svar som citerar 2026 korrekt pa en fraga om 2022 gar rakt
// igenom grinden och ser trovardigt ut. Det ar precis darfor urvalet maste vara
// rätt innan modellen far se nagot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { periodIFragan, iPerioden, hamtaUtdrag } from '../../functions/api/_kallgrind.js';

const NU = Date.parse('2026-09-07T12:00:00Z');

test('periodIFragan: utan tidsord blir det null', () => {
  assert.equal(periodIFragan('hur ser kassan ut', NU), null);
  assert.equal(periodIFragan('vad sa senaste rapporten', NU), null);
});

test('periodIFragan: ett ensamt artal blir just det aret', () => {
  const p = periodIFragan('vad hande 2022', NU);
  assert.equal(p.fran, '2022-01-01');
  assert.equal(p.till, '2022-12-31');
});

test('periodIFragan: "sedan 2022" ar oppet fram till i dag', () => {
  const p = periodIFragan('hur har bruttomarginalen utvecklats sedan 2022', NU);
  assert.equal(p.fran, '2022-01-01');
  assert.equal(p.till, '2026-09-07');
});

test('periodIFragan: tva artal blir spannet mellan dem', () => {
  const p = periodIFragan('jamfor 2021 och 2023', NU);
  assert.equal(p.fran, '2021-01-01');
  assert.equal(p.till, '2023-12-31');
});

test('periodIFragan: "fore 2023" pekar bakat', () => {
  const p = periodIFragan('vad gjorde de fore 2023', NU);
  assert.equal(p.till, '2022-12-31');
  assert.equal(p.fran, '1900-01-01');
});

test('periodIFragan: relativa ar bade som siffra och ord', () => {
  assert.equal(periodIFragan('de senaste fem aren', NU).fran, '2021-01-01');
  assert.equal(periodIFragan('de senaste 3 aren', NU).fran, '2023-01-01');
  assert.equal(periodIFragan('senaste tre åren', NU).fran, '2023-01-01');
});

/* En prognosfraga ar inte en historisk period. Utan filtret hade "vad blir
   omsattningen 2035" satt fran-gransen i framtiden och dampat allt vi har. */
test('periodIFragan: artal langre fram an nasta ar ar ingen period', () => {
  assert.equal(periodIFragan('vad blir omsattningen 2035', NU), null);
  assert.ok(periodIFragan('vad blir omsattningen 2027', NU), 'nasta ar far passera');
});

test('periodIFragan: tal som inte ar artal lamnas i fred', () => {
  assert.equal(periodIFragan('vad kostar det 250 kronor eller 1500', NU), null);
});

/* Bokslutet for 2022 kommer i februari 2023. Utan nadatiden skulle en fraga om
   2022 missa bolagets egen sammanfattning av just 2022. */
test('iPerioden: rapporten som kom efter periodens slut raknas in', () => {
  const p = { fran: '2022-01-01', till: '2022-12-31' };
  assert.equal(iPerioden('2023-02-10', p), true, 'bokslutet i februari');
  assert.equal(iPerioden('2023-08-01', p), false, 'ett halvar senare hor inte hit');
  assert.equal(iPerioden('2021-12-31', p), false);
});

test('iPerioden: utan period ar allt inne', () => {
  assert.equal(iPerioden('2019-01-01', null), true);
});

/* Sjalva buggen, som ett test. Fore andringen vann 2026-dokumentet pa
   farskhetsvikten trots att fragan uttryckligen gallde 2022. */
test('hamtaUtdrag: en fraga om 2022 valjer 2022-dokumentet, inte det farskaste', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'ny', rubrik: 'Delarsrapport', datum: '2026-08-01',
      bitar: ['bruttomarginalen uppgick till 41 procent'] },
    { url: 'gammal', rubrik: 'Delarsrapport', datum: '2022-08-31',
      bitar: ['bruttomarginalen uppgick till 27 procent'] },
  ] }];
  const ut = hamtaUtdrag('hur var bruttomarginalen 2022', arkiv, 1, NU);
  assert.equal(ut[0].url, 'gammal');
});

test('hamtaUtdrag: utan period gäller farskheten som forut', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'gammal', rubrik: 'A', datum: '2022-08-31', bitar: ['bruttomarginalen steg'] },
    { url: 'ny', rubrik: 'A', datum: '2026-08-01', bitar: ['bruttomarginalen steg'] },
  ] }];
  assert.equal(hamtaUtdrag('bruttomarginalen', arkiv, 1, NU)[0].url, 'ny');
});

/* Dampning, inte nollning: har finns inget dokument i perioden, och da ar ett
   traffande dokument utanfor den battre an inget utdrag alls. */
test('hamtaUtdrag: utanfor perioden dampas men forsvinner inte', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'ny', rubrik: 'A', datum: '2026-08-01', bitar: ['bruttomarginalen steg'] },
  ] }];
  assert.equal(hamtaUtdrag('bruttomarginalen 2022', arkiv, 3, NU).length, 1);
});

test('hamtaUtdrag: en inskickad period vinner over den tolkade', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'a', rubrik: 'A', datum: '2019-05-05', bitar: ['omsattningen steg'] },
    { url: 'b', rubrik: 'A', datum: '2026-05-05', bitar: ['omsattningen steg'] },
  ] }];
  const p = { fran: '2019-01-01', till: '2019-12-31' };
  assert.equal(hamtaUtdrag('omsattningen', arkiv, 1, NU, p)[0].url, 'a');
});
