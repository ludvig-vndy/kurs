import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Budget, bedom, byggAnrop } from '../prova-fraga-granskning.mjs';

test('reservationer delar budget och okänd kostnad återbetalas inte', () => {
  const b = new Budget(100);
  const a = b.reservera(60);
  assert.equal(b.reservera(50), null);
  b.avsluta(a, 20);
  const c = b.reservera(70);
  b.avsluta(c, null);
  assert.equal(b.reservera(11), null);
  assert.equal(b.forbrukat, 90);
});
test('ett ofullständigt positivt beslut blir täckningsfel, inte godkänt', () => {
  const svar = [{ meningar: ['En mening.', 'En annan.'] }];
  const raw = { prov: [{ block: 0, mening: 0, dom: 'korrekt', stod: [], villkor: '', skal: '' }], godkand: true };
  assert.equal(bedom(raw, 'struktur', svar, 'end_turn').status, 'tackningsfel');
  raw.prov.push({ ...raw.prov[0], mening: 1, dom: 'fel' });
  assert.equal(bedom(raw, 'struktur', svar, 'end_turn').status, 'motsagande_beslut');
  raw.godkand = false;
  assert.equal(bedom(raw, 'struktur', svar, 'end_turn').godkand, false);
  raw.prov[0].stod = ['TEXT_SOM_INTE_FAR_LOGGAS'];
  assert.ok(!JSON.stringify(bedom(raw, 'struktur', svar, 'end_turn')).includes('TEXT_SOM_INTE_FAR_LOGGAS'));
  assert.equal(bedom(raw, 'struktur', svar, 'max_tokens').status, 'avklippt');
});
test('facit lämnar aldrig provskriptet i ett modellanrop', () => {
  const c = { id: 'a', expected: false, reason: 'HEMLIGT_FACIT', fraga: 'Fråga', svar: [], prefix: [], belagg: [] };
  for (const variant of ['bas', 'struktur', 'belagg']) {
    const body = byggAnrop(c, variant);
    assert.ok(!JSON.stringify(body).includes('HEMLIGT_FACIT'));
    assert.equal(body.model, 'claude-sonnet-5');
  }
});
