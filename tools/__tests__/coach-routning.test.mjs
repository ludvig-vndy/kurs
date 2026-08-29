import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extraheraReferenser, slaIhopKandidater, tolkaRoutning, validieraSvar,
} from '../../functions/api/_routning.js';

const GILTIGA = new Set(['4.3', '4.4', '6.2', '6.4', '3.2', '10.1', '10.2', '10.3']);

test('bart giltigt nummer blir en svag referens', () => {
  const r = extraheraReferenser('Jag undrar over 6.2 lite', GILTIGA);
  assert.deepEqual(r.stark, []);
  assert.deepEqual(r.svag, ['6.2']);
});

test('nummer efter ordet lektion blir starkt', () => {
  const r = extraheraReferenser('Vad menas i lektion 6.2?', GILTIGA);
  assert.deepEqual(r.stark, ['6.2']);
});

test('jamforelsefras gor bada numren starka', () => {
  const r = extraheraReferenser('Vad är skillnaden mellan 4.3 och 4.4?', GILTIGA);
  assert.deepEqual(r.stark, ['4.3', '4.4']);
});

test('belopp med enhetsord ar inte en lektionsreferens', () => {
  assert.deepEqual(extraheraReferenser('vi lag pa 3.2 miljoner', GILTIGA), { stark: [], svag: [] });
  assert.deepEqual(extraheraReferenser('en okning pa 6.2 procent', GILTIGA), { stark: [], svag: [] });
  assert.deepEqual(extraheraReferenser('det tog 4.3 timmar', GILTIGA), { stark: [], svag: [] });
});

test('nummer som inte ar en lektion faller bort', () => {
  assert.deepEqual(extraheraReferenser('se lektion 99.9', GILTIGA), { stark: [], svag: [] });
});

test('starka referenser kan aldrig kastas ut av modellens traffar', () => {
  const ut = slaIhopKandidater(
    { stark: ['4.3', '4.4'], svag: [], modell: ['6.2', '6.4', '10.1', '10.2'] },
    GILTIGA
  );
  assert.equal(ut.length, 5);
  assert.deepEqual(ut.slice(0, 2), ['4.3', '4.4']);
});

test('svaga referenser hamnar efter modellens traffar', () => {
  const ut = slaIhopKandidater({ stark: [], svag: ['3.2'], modell: ['6.2'] }, GILTIGA);
  assert.deepEqual(ut, ['6.2', '3.2']);
});

test('dubbletter och okanda id tas bort', () => {
  const ut = slaIhopKandidater({ stark: ['6.2'], svag: ['6.2'], modell: ['6.2', 'BANANA', '93.7'] }, GILTIGA);
  assert.deepEqual(ut, ['6.2']);
});

test('fler an fem starka kapas vid fem', () => {
  const stora = new Set(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2']);
  const ut = slaIhopKandidater(
    { stark: ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2'], svag: [], modell: [] }, stora
  );
  assert.deepEqual(ut, ['1.1', '1.2', '1.3', '1.4', '2.1']);
});

test('tolkaRoutning laser JSON aven med text runt', () => {
  const r = tolkaRoutning('Visst! {"lektioner": ["6.2"], "saknar_underlag": false} Hoppas det hjalper.');
  assert.deepEqual(r, { lektioner: ['6.2'], saknarUnderlag: false });
});

test('tolkaRoutning ger null pa skrap', () => {
  assert.equal(tolkaRoutning('jag vet inte'), null);
  assert.equal(tolkaRoutning('{trasig'), null);
});

test('tolkaRoutning tal fel typer i faltet', () => {
  const r = tolkaRoutning('{"lektioner": "6.2", "saknar_underlag": "nej"}');
  assert.deepEqual(r, { lektioner: [], saknarUnderlag: false });
});

/* Steg 2, svarsvalideringen. */

const TILLATNA = ['6.2', '6.4'];

test('giltig diagnos slapps igenom', () => {
  const r = validieraSvar(
    { form: 'diagnos', svar: 'Det som hände var att.', nasta_gang: 'Pröva detta.', lektioner: ['6.2'] },
    TILLATNA
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.svar.lektioner, ['6.2']);
  assert.equal(r.svar.folifraga, null);
});

test('lektioner utanfor kontexten skars bort', () => {
  const r = validieraSvar(
    { form: 'diagnos', svar: 'S.', nasta_gang: 'N.', lektioner: ['6.2', '7.4'] },
    TILLATNA
  );
  assert.deepEqual(r.svar.lektioner, ['6.2']);
});

test('lektionsnummer i loptext underkanner svaret', () => {
  const r = validieraSvar(
    { form: 'diagnos', svar: 'Det här behandlas i 7.4.', nasta_gang: 'N.', lektioner: [] },
    TILLATNA
  );
  assert.equal(r.ok, false);
  assert.match(r.fel, /loptext/i);
});

test('aven en giltig lektion i loptext underkanns, provenance ags av servern', () => {
  const r = validieraSvar(
    { form: 'diagnos', svar: 'Se 6.2 for mer.', nasta_gang: 'N.', lektioner: ['6.2'] },
    TILLATNA
  );
  assert.equal(r.ok, false);
});

test('okand form underkanns', () => {
  assert.equal(validieraSvar({ form: 'pitch', svar: 'S.' }, TILLATNA).ok, false);
});

test('diagnos utan nasta_gang underkanns', () => {
  assert.equal(validieraSvar({ form: 'diagnos', svar: 'S.', lektioner: [] }, TILLATNA).ok, false);
});

test('behover_mer kraver en foljdfraga och tappar ovriga falt', () => {
  const r = validieraSvar(
    { form: 'behover_mer', folifraga: 'Vad sa du exakt?', nasta_gang: 'ska bort', lektioner: ['6.2'] },
    TILLATNA
  );
  assert.equal(r.ok, true);
  assert.equal(r.svar.folifraga, 'Vad sa du exakt?');
  assert.equal(r.svar.nasta_gang, null);
});

test('inget_underlag kraver ett svar men inga lektioner', () => {
  const r = validieraSvar({ form: 'inget_underlag', svar: 'Kursen tar inte upp det.' }, []);
  assert.equal(r.ok, true);
  assert.deepEqual(r.svar.lektioner, []);
});

test('icke-objekt underkanns', () => {
  assert.equal(validieraSvar(null, TILLATNA).ok, false);
  assert.equal(validieraSvar('text', TILLATNA).ok, false);
});
