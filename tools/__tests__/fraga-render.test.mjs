import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function render(d) {
  const scope = {};
  vm.runInNewContext(readFileSync(new URL('../../public/fraga-svar.js', import.meta.url), 'utf8'), scope);
  return scope.FragaSvar.render(d);
}

test('faktablock visar kallcitat, sida och serverns ursprung', () => {
  const html = render({ block: [{ typ: 'rapporterat', etikett: 'Rapporterat',
    text: 'Alfa, resultat, Q2 2026: -85 MSEK.', kallor: [{
      url: 'https://example.test/q2.pdf', rubrik: 'Kvartalsrapport', sida: 10,
      citat: 'Rörelseresultatet uppgick till -85 MSEK.',
    }] }] });
  assert.match(html, /Rapporterat/);
  assert.match(html, /href="https:\/\/example.test\/q2.pdf"/);
  assert.match(html, /sida 10/);
  assert.match(html, /<details/);
  assert.match(html, /-85 MSEK/);
});

test('anvandartext och dokumenttext kan inte skapa HTML eller javascriptlankar', () => {
  const html = render({ block: [{ etikett: '<img src=x>', text: '<script>alert(1)</script>',
    kallor: [{ url: 'javascript:alert(1)', rubrik: 'Källa', citat: '<img onerror=alert(1)>' }] }] });
  assert.doesNotMatch(html, /<script|<img|href="javascript/);
  assert.match(html, /&lt;script&gt;/);
});

test('tackningen visar saknade bolag, period och modellfallback utan modellprosa', () => {
  const html = render({ answer: 'Svaret kunde inte verifieras.', blockerat: true, tackning: {
    period: { fran: '2022-01-01', till: '2022-12-31' }, lasta: 0,
    bolag: [{ namn: 'Alfa', arkiv: false, av: 'inga dokument' }],
    utelamnade: ['Beta'], modellfall: true,
  } });
  assert.match(html, /Alfa.*inga dokument/);
  assert.match(html, /Beta/);
  assert.match(html, /2022-01-01/);
  assert.match(html, /enklare modell/);
  assert.doesNotMatch(html, /Svarat ur ditt innehav/);
});
