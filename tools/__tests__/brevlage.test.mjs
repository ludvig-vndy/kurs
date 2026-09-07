// Vad Ägarbrevet visar nar /api/brev inte gav ett brev.
//
// FELET: sidan foll tyst tillbaka pa /labs/data/brev-exempel.json sa fort
// svaret inte var 200. Den filen ar en demo fran 2026-07-11 med paditgjorda
// bolag ("Exempelbolag AB (illustrativt)") och raden "Vi laste 51 rapporter, 3
// pressmeddelanden och 2 insynsanmalningar i natt". Ingenting pa sidan sa att
// det var ett exempel. En pilot vars session gatt ut fick alltsa ett tva
// manader gammalt brev om bolag som inte finns, presenterat som sitt eget.
//
// Det ar precis tvartemot vad produkten lovar: star det inget hos oss sa ar det
// lugnt. Ett tyst exempel gor bade tystnaden och beskedet vardelosa. Kan vi inte
// hamta brevet ska det STA att vi inte kan hamta brevet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { brevLage, klockslag } from '../../public/labs/brevlage.js';

const IDAG = '2026-09-07';
const BREV = { date: IDAG, nr: 63, poster: [], lugna: ['Unibap Space Solutions'], brev: ['God morgon.'] };

test('ett riktigt brev renderas som brev', () => {
  const l = brevLage({ status: 200, kropp: BREV, idag: IDAG });
  assert.equal(l.sort, 'brev');
  assert.equal(l.brev, BREV);
  assert.equal(l.alderDagar, 0);
});

/* En tyst dag ar ett giltigt brev, inte ett saknat. Tomma poster[] far aldrig
   rakna som "inget brev" och skicka oss till exempeldatan: den lugna dagen ar
   hela produkten. */
test('en tyst dag ar ett brev, inte ett tomt svar', () => {
  const l = brevLage({ status: 200, kropp: { ...BREV, poster: [], lugna: [] }, idag: IDAG });
  assert.equal(l.sort, 'brev');
});

test('utan session sags det rent ut, inget exempel', () => {
  const l = brevLage({ status: 401, kropp: { fel: 'Kräver inloggning.' }, idag: IDAG });
  assert.equal(l.sort, 'meddelande');
  assert.ok(l.lank && l.lank.href === '/logga-in');
  assert.ok(!/illustrativ/i.test(JSON.stringify(l)));
});

test('inget brev annu forklaras med serverns egen text', () => {
  const l = brevLage({
    status: 404,
    kropp: { fel: 'Inget brev ännu.', forklaring: 'Lägg till dina bolag, så skriver motorn ditt första brev i natt.' },
    idag: IDAG,
  });
  assert.equal(l.sort, 'meddelande');
  assert.match(l.text, /Lägg till dina bolag/);
});

test('KV ur funktion och natverksfel ger ett arligt fel, aldrig ett brev', () => {
  for (const status of [0, 500, 501, 502]) {
    const l = brevLage({ status, kropp: null, idag: IDAG });
    assert.equal(l.sort, 'meddelande', 'status ' + status);
    assert.match(l.rubrik + ' ' + l.text, /just nu|kunde inte/i);
  }
});

/* Ingen kodvag far na exempeldatan av sig sjalv. Den finns kvar for landningen
   och demon, och da bads den om uttryckligen. */
test('exempeldatan visas bara nar nagon bett om den', () => {
  assert.equal(brevLage({ status: 401, kropp: null, idag: IDAG }).sort, 'meddelande');
  assert.equal(brevLage({ status: 200, kropp: BREV, idag: IDAG, exempel: true }).sort, 'exempel');
});

/* Stannar nattjobbet fortsatter KV att svara 200 med garden brev. Det ar samma
   sorts fel som exempeldatan, bara langsammare: gammalt innehall presenterat
   som dagens. Aldern racknas ut har sa sidan kan skriva ut den. */
test('ett gammalt brev racknas som gammalt', () => {
  assert.equal(brevLage({ status: 200, kropp: { ...BREV, date: '2026-09-06' }, idag: IDAG }).alderDagar, 1);
  assert.equal(brevLage({ status: 200, kropp: { ...BREV, date: '2026-08-30' }, idag: IDAG }).alderDagar, 8);
});

test('ett brev utan datum pastas inte vara dagens', () => {
  const l = brevLage({ status: 200, kropp: { poster: [], lugna: [] }, idag: IDAG });
  assert.equal(l.sort, 'brev');
  assert.equal(l.alderDagar, null);
});

/* 200 med nagot annat an ett brev (en felsida, en omdirigering som blev HTML)
   ar inte ett brev. */
test('ett svar utan poster ar inget brev', () => {
  assert.equal(brevLage({ status: 200, kropp: { fel: 'nagot' }, idag: IDAG }).sort, 'meddelande');
  assert.equal(brevLage({ status: 200, kropp: null, idag: IDAG }).sort, 'meddelande');
});

/* Sidhuvudet stod "Ägarbrevet · <datum> · 07:30" med klockslaget hardkodat.
   Det var inte sant: de schemalagda korningarna 1 till 7 september startade
   241 till 306 minuter efter sin tid, sa brevet skrevs 10:30 till 11:36 svensk
   tid. Ett pahittat klockslag pa en produkt vars hela loft ar "det du ser ar
   sant" ar samma sorts fel som demobrevet, bara mindre. Nu skrivs den tid
   brevet faktiskt skrevs, ur faltet skriven. */
test('klockslaget kommer ur brevet, i svensk tid', () => {
  assert.equal(klockslag('2026-09-07T21:19:45.000Z'), '23:19'); // sommartid, UTC+2
  assert.equal(klockslag('2026-12-07T21:19:45.000Z'), '22:19'); // vintertid, UTC+1
  assert.equal(klockslag('2026-09-08T04:07:00.000Z'), '06:07'); // nya schemat
});

test('utan tidsstampel pastas inget klockslag', () => {
  assert.equal(klockslag(null), '');
  assert.equal(klockslag(undefined), '');
  assert.equal(klockslag('inte ett datum'), '');
  assert.equal(klockslag(''), '');
});
