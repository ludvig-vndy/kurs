import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lektionsMaterial, registerRad } from '../lib/motparten-text.mjs';

const LEKTION = {
  kapitel: 6,
  lektion: '6.4',
  titel: 'När problemet inte är värt att lösa',
  fardighet: 'problem.avgransning',
  mal: 'Efter lektionen kan eleven avgöra om ett problem bär.',
  steg: [
    { typ: 'intro', kicker: 'PROBLEM', titel: 'T', ingress: 'Ingressen.' },
    {
      typ: 'reading', kicker: 'VARFÖR', lead: 'Ledet.', highlight: 'Ledet',
      brodtext: ['Första stycket.', 'Andra stycket.'], takeaway: 'Slutklämmen.',
    },
    {
      typ: 'concept', kicker: 'TRE TECKEN', titel: 'Att det inte bär',
      forklaring: 'Förklaringen.',
      visual: {
        typ: 'jamforelse',
        element: [{ rubrik: 'Ingen har försökt', text: 'Ingen har gjort ett försök.' }],
        figurtext: 'Två är ett besked.',
      },
      evidens: { niva: 'B', kalla: 'K9', notering: 'Omtvistad effekt.' },
    },
    {
      typ: 'myt', kicker: 'MYT ETT', titel: 'Siffran',
      pastaende: 'Bara 7 procent av kommunikationen är ord.',
      varifran: 'Mehrabian 1967.',
      vad_som_galler: 'Gäller bara motstridiga signaler.',
      kalla: 'R1',
    },
    {
      typ: 'quiz',
      fragor: [{
        typ: 'single', fraga: 'Vad är kravet?',
        alternativ: ['Fel svar som aldrig får med', 'Rätt svar'],
        ratt: [1], forklaring: 'Därför.',
      }],
    },
  ],
};

const ut = lektionsMaterial(LEKTION, 'Problem och konsekvens');

test('huvudet bar id, titel, kapitel, fardighet och mal', () => {
  assert.match(ut, /^## 6\.4 När problemet inte är värt att lösa\n/);
  assert.match(ut, /Kapitel 6, Problem och konsekvens · Färdighet: problem\.avgransning/);
  assert.match(ut, /Mål: Efter lektionen kan eleven avgöra om ett problem bär\./);
});

test('prosan foljer med', () => {
  for (const t of ['Ingressen.', 'Ledet.', 'Första stycket.', 'Andra stycket.', 'Förklaringen.']) {
    assert.ok(ut.includes(t), `saknar: ${t}`);
  }
  assert.match(ut, /TAKEAWAY: Slutklämmen\./);
});

test('visualtexten foljer med, bade rubrik och text', () => {
  assert.match(ut, /UPPRÄKNING:/);
  assert.match(ut, /- Ingen har försökt: Ingen har gjort ett försök\./);
  assert.match(ut, /FIGURTEXT: Två är ett besked\./);
});

test('evidensen kommer med niva och kalla pa egen etiketterad rad', () => {
  assert.match(ut, /EVIDENS nivå B, källa K9: Omtvistad effekt\./);
});

test('myt-pastaendet kommer med men aldrig naket', () => {
  const rad = ut.split('\n').find((r) => r.includes('Bara 7 procent'));
  assert.ok(rad, 'påståendet saknas helt');
  assert.ok(rad.startsWith('MYT-PÅSTÅENDE'), `påståendet omärkt: ${rad}`);
  assert.match(ut, /VAD SOM GÄLLER: Gäller bara motstridiga signaler\./);
});

test('quizfragan kommer med men aldrig distraktorerna', () => {
  assert.match(ut, /FRÅGA: Vad är kravet\?/);
  assert.match(ut, /VARFÖR: Därför\./);
  assert.ok(!ut.includes('Fel svar som aldrig får med'), 'distraktor lackte in i korpusen');
  assert.ok(!ut.includes('Rätt svar'), 'alternativ ska aldrig med, inte ens det ratta');
});

test('highlight tas inte med separat, den ar en delstrang av lead', () => {
  assert.equal(ut.split('Ledet').length - 1, 1);
});

test('registerRad ar en rad med id, titel, fardighet och mal', () => {
  const r = registerRad(LEKTION);
  assert.ok(!r.includes('\n'));
  assert.match(r, /^6\.4 \| När problemet inte är värt att lösa \| problem\.avgransning \| /);
});
