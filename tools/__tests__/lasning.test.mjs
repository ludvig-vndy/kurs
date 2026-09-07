// checked-talen i brevet: kontrollen, inte utfallet.
//
// Forut raknades posterna som tog sig in i brevet. En lugn dag har noll sadana,
// sa Agarbrevet skrev "Vi laste 0 rapporter, 0 pressmeddelanden och 0
// insynsanmalningar i natt" samtidigt som brevtexten intill sa att floden och
// register hade lasts. Motorn sag ut att inte ha startat pa precis de dagar den
// ska kanna lugnast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rakna } from '../../motor/lasning.mjs';

const LASNINGAR = {
  'Unibap Space Solutions': { flode: 48, insyn: 0, rapporter: 0 },
  'Truecaller AB (publ)': { flode: 48, insyn: 38, rapporter: 0 },
  'Nyab AB (publ)': { flode: 48, insyn: 88, rapporter: 1 },
  'Bolag nagon annan ager': { flode: 48, insyn: 500, rapporter: 9 },
};

/* Karnan i felet: en dag utan en enda post i brevet ska anda visa att vi lasat. */
test('en tyst dag racknar anda det vi gick igenom', () => {
  const c = rakna(LASNINGAR, ['Unibap Space Solutions', 'Truecaller AB (publ)']);
  assert.equal(c.filings, 96);
  assert.equal(c.insiders, 38);
  assert.equal(c.reports, 0);
});

/* Brevet ar personligt. Ett bolag lasaren inte ager far inte ens synas i ett tal. */
test('bara agarens egna bolag racknas', () => {
  const c = rakna(LASNINGAR, ['Nyab AB (publ)']);
  assert.deepEqual(c, { reports: 1, filings: 48, insiders: 88 });
});

test('inga bolag ger nollor, inte NaN', () => {
  assert.deepEqual(rakna(LASNINGAR, []), { reports: 0, filings: 0, insiders: 0 });
  assert.deepEqual(rakna({}, ['Unibap Space Solutions']), { reports: 0, filings: 0, insiders: 0 });
});

/* Insynsregistret svarar inte alltid (Nokia foll pa FI den 7 september). Da ar
   talet okant, och ett okant tal ar noll har, aldrig NaN i brevtexten. */
test('ett register som inte svarade drar inte ner resten', () => {
  const c = rakna({
    'Nokia Oyj': { flode: 48, insyn: null, rapporter: 0 },
    'Saniona AB (publ)': { flode: 48, insyn: 10, rapporter: 0 },
  }, ['Nokia Oyj', 'Saniona AB (publ)']);
  assert.deepEqual(c, { reports: 0, filings: 96, insiders: 10 });
});

test('en Set gar lika bra som en lista', () => {
  assert.deepEqual(
    rakna(LASNINGAR, new Set(['Truecaller AB (publ)'])),
    rakna(LASNINGAR, ['Truecaller AB (publ)']));
});
