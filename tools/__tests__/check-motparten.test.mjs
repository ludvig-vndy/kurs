import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMotpartenLektion, lasKallor } from '../check-motparten.mjs';

const opt = {
  kallor: new Set(['K1', 'K3', 'R1']),
  fardigheter: new Set(['grund.evidens', 'fortroende.grund']),
};

const QUIZ = {
  typ: 'quiz',
  fragor: [
    { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
    { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
  ],
};

/** En giltig lektion. `steg` eller `fardighet` kan skrivas över per test. */
function lektion(over = {}) {
  return JSON.stringify({
    kapitel: 1,
    lektion: '1.1',
    titel: 'T',
    niva: 'Nybörjare',
    tid_min: 8,
    mal: 'M',
    fardighet: 'fortroende.grund',
    steg: [
      { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
      { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F' },
      QUIZ,
    ],
    ...over,
  });
}

/** Lektion där mellansteget byts ut. */
function medSteg(steg) {
  return lektion({ steg: [{ typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' }, steg, QUIZ] });
}

function fel(raw) {
  const errs = [];
  checkMotpartenLektion('1.1.json', raw, errs, opt);
  return errs;
}

test('en giltig lektion ger inga fel', () => {
  assert.deepEqual(fel(lektion()), []);
});

test('okänd källa fälls', () => {
  const errs = fel(medSteg({ typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'A', kalla: 'K99' } }));
  assert.equal(errs.length, 1);
  assert.match(errs[0], /K99.*saknas i kallregistret/i);
});

test('niva A utan kalla fälls', () => {
  const errs = fel(medSteg({ typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'A' } }));
  assert.match(errs.join(' '), /niva A kraver kalla/i);
});

test('niva C med kalla fälls', () => {
  const errs = fel(medSteg({ typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'C', kalla: 'K1' } }));
  assert.match(errs.join(' '), /niva C ska sakna kalla/i);
});

test('niva C utan kalla går igenom', () => {
  assert.deepEqual(fel(medSteg({ typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'C' } })), []);
});

test('okänd fardighet fälls', () => {
  assert.match(fel(lektion({ fardighet: 'hittepa.tagg' })).join(' '), /okand fardighet/i);
});

test('saknad fardighet fälls', () => {
  assert.match(fel(lektion({ fardighet: undefined })).join(' '), /fardighet saknas/i);
});

test('roda listans fraser utanfor ett myt-steg falls', () => {
  const errs = fel(medSteg({
    typ: 'concept', kicker: 'K', titel: 'T',
    forklaring: 'Folk koper pa kansla och rattfardigar med logik.',
  }));
  assert.match(errs.join(' '), /roda listan/i);
});

test('samma fras inuti ett myt-steg gar igenom', () => {
  const errs = fel(medSteg({
    typ: 'myt',
    pastaende: 'Folk koper pa kansla och rattfardigar med logik',
    varifran: 'V', vad_som_galler: 'G', kalla: 'R1',
  }));
  assert.deepEqual(errs, []);
});

test('myt-steg med okand kalla falls', () => {
  const errs = fel(medSteg({
    typ: 'myt', pastaende: 'P', varifran: 'V', vad_som_galler: 'G', kalla: 'R99',
  }));
  assert.match(errs.join(' '), /R99.*saknas i kallregistret/i);
});

test('lasKallor plockar ut varje K- och R-id ur registret', () => {
  const kallor = lasKallor();
  assert.ok(kallor.has('K1'), 'K1 ska finnas');
  assert.ok(kallor.has('K16'), 'K16 ska finnas');
  assert.ok(kallor.has('R7'), 'R7 ska finnas');
  assert.ok(!kallor.has('K99'), 'K99 ska inte finnas');
});
