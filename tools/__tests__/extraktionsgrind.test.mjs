// Testar att ett extraherat tal verkligen star i sitt eget citat.
//
// Bakgrund: extraktionen ber modellen om ett citat per faktum, men kontrollerade
// aldrig att talet fanns i citatet. Matning 2026-08-31 pa Unibaps Q2-rapport gav
// sex av sju falt med citat som innehöll siffran, och ett (orderingang, 12,5 Mkr)
// med ett citat som bara var beskrivande text om EDF-projekt. Utan den har
// kontrollen ar spårbarheten en avsiktsförklaring, inte en garanti.
//
// Skalblindhet ar avsiktlig: modellen normaliserar KSEK till Mkr, sa 80,755 ska
// godkannas av citatet "80 755 KSEK". Det ar sifferföljden som provas, inte skalan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { talStodsAvCitat } from '../../motor/extract-llm.mjs';

test('KSEK i citatet stodjer Mkr i vardet', () => {
  assert.equal(
    talStodsAvCitat(80.755, 'Likvida medel uppgick på balansdagen till 80 755 KSEK (14 804)'),
    true
  );
});

test('negativt tal utan mellanslag fore enheten', () => {
  assert.equal(talStodsAvCitat(-11.318, 'Rörelseresultatet uppgick till -11 318KSEK (-18 460)'), true);
});

test('jamforelsetalet i parentesen duger ocksa', () => {
  assert.equal(talStodsAvCitat(14.804, 'Likvida medel uppgick till 80 755 KSEK (14 804)'), true);
});

test('faller talet som inte finns i citatet', () => {
  const citat = 'Orderingången under Q2 bestod huvudsakligen av order på nästa generations '
    + 'datorlösningar, från en långvarig europeisk kund. Bidragsprojekten var två EDF-projekt.';
  assert.equal(talStodsAvCitat(12.5, citat), false);
});

test('faller skalförvaxling: 15 stods inte av 1 500', () => {
  assert.equal(talStodsAvCitat(15, 'Posten uppgick till 1 500 KSEK'), false);
});

test('decimalkomma i citatet', () => {
  assert.equal(talStodsAvCitat(5.92, 'blankningen var 5,92 procent'), true);
});

test('hela tal med tusentalsavskiljare', () => {
  assert.equal(talStodsAvCitat(72292013, 'Antalet aktier uppgick till 72 292 013 stycken'), true);
});

test('tal under ett', () => {
  assert.equal(talStodsAvCitat(0.546, 'Kassaflödet uppgick till 546 KSEK'), true);
});

test('hart mellanslag som tusentalsavskiljare', () => {
  assert.equal(talStodsAvCitat(80.755, 'Likvida medel 80 755 KSEK'), true);
});

test('tomt citat stodjer ingenting', () => {
  assert.equal(talStodsAvCitat(12.5, ''), false);
  assert.equal(talStodsAvCitat(12.5, null), false);
});

test('ensiffrigt varde kraver eget tal, inte en delstrang', () => {
  assert.equal(talStodsAvCitat(5, 'Vi levererade 2025 enheter'), false);
  assert.equal(talStodsAvCitat(5, 'Vi levererade 5 enheter'), true);
});
