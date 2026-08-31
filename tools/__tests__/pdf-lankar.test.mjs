// Testar att rapport-PDF:en hittas oavsett vilken distributör bolaget använder.
//
// Bakgrund: hamta.mjs letade bara efter storage.mfn.se-länkar. Unibap distribueras
// via beQuoted (URL med /beq/), som lägger bilagorna på cdn.bequoted.com, så tio
// rapporter låg oläsbara i arkivet och kassan (som bara står i PDF:en) saknades
// helt. Mätt 2026-08-31.
//
// Ordningen spelar roll: natt.mjs tar pdfLankar[0], så den fulla rapporten ska
// ligga före pressmeddelandeversionen och svenska före engelska.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfLankarUr } from '../../motor/hamta.mjs';

const bequoted = 'https://cdn.bequoted.com/media/1/f088ac31/Unibap-delarsrapport-Q2-2026.pdf';
const bequotedEn = 'https://cdn.bequoted.com/media/1/ed34bcc6/Unibap-interim-report-Q2-2026.pdf';
const bequotedPm = 'https://cdn.bequoted.com/media/1/cabeb74d/Unibap-PM-delarsrapport-Q2-2026.pdf';

test('hittar storage.mfn.se som forut', () => {
  const html = '<a href="https://storage.mfn.se/a/b/rapport.pdf">Rapport</a>';
  assert.deepEqual(pdfLankarUr(html), ['https://storage.mfn.se/a/b/rapport.pdf']);
});

test('hittar cdn.bequoted.com, som tidigare var osynlig', () => {
  assert.deepEqual(pdfLankarUr(`<a href="${bequoted}">Rapport</a>`), [bequoted]);
});

test('full rapport rankas fore pressmeddelandeversionen', () => {
  const html = `<a href="${bequotedPm}">PM</a><a href="${bequoted}">Rapport</a>`;
  assert.equal(pdfLankarUr(html)[0], bequoted);
});

test('svenska rankas fore engelska', () => {
  const html = `<a href="${bequotedEn}">EN</a><a href="${bequoted}">SV</a>`;
  assert.equal(pdfLankarUr(html)[0], bequoted);
});

test('alla tre i ratt ordning', () => {
  const html = `<a href="${bequotedPm}">a</a><a href="${bequotedEn}">b</a><a href="${bequoted}">c</a>`;
  assert.deepEqual(pdfLankarUr(html), [bequoted, bequotedEn, bequotedPm]);
});

test('dubbletter slas ihop', () => {
  assert.equal(pdfLankarUr(`<a href="${bequoted}">a</a><a href="${bequoted}">b</a>`).length, 1);
});

test('inga pdf-lankar ger tom lista', () => {
  assert.deepEqual(pdfLankarUr('<p>Ingen bilaga i detta pressmeddelande.</p>'), []);
});

test('citattecken och parentes avslutar lanken', () => {
  const html = "<a href='https://cdn.bequoted.com/x/rapport.pdf'>a</a> (https://storage.mfn.se/y/z.pdf)";
  const ut = pdfLankarUr(html);
  assert.equal(ut.length, 2);
  assert.ok(ut.every(u => u.endsWith('.pdf')));
});
