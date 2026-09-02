import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaTraffar } from '../../functions/api/bolagssok.js';

const q = (symbol, exchange, longname) => ({ quoteType: 'EQUITY', symbol, exchange, longname });

test('tolkaTraffar: nordiska noteringar delas i ticker och landskod', () => {
  const r = tolkaTraffar([q('FERRO.ST', 'STO', 'Ferroamp AB'), q('LIFCO-B.ST', 'STO', 'Lifco AB')]);
  assert.deepEqual(r.map(x => [x.ticker, x.land, x.bors]),
    [['FERRO', 'SE', 'Stockholm'], ['LIFCO-B', 'SE', 'Stockholm']]);
});

/* Piloten bad om Tesla. Amerikanska symboler bär inget suffix hos Yahoo, och
   just den regeln, "har den ingen punkt sa hoppa over den", var det enda som
   holl dem ute. */
test('tolkaTraffar: amerikanska bolag kommer med', () => {
  const r = tolkaTraffar([q('TSLA', 'NMS', 'Tesla, Inc.'), q('BRK-B', 'NYQ', 'Berkshire Hathaway Inc.')]);
  assert.deepEqual(r.map(x => [x.ticker, x.land, x.bors]),
    [['TSLA', 'US', 'USA'], ['BRK-B', 'US', 'USA']]);
});

/* Utan borskontroll drar en sokning pa "Tesla" in ett halvdussin tyska
   smalistor med samma bolag. Det var skalet till att nordenfiltret satt dar. */
test('tolkaTraffar: bara borser vi kan prissatta slapps igenom', () => {
  const r = tolkaTraffar([
    q('TL0.DE', 'GER', 'Tesla, Inc.'),
    q('TSLA34.SA', 'SAO', 'Tesla, Inc.'),
    q('TSLA', 'NMS', 'Tesla, Inc.'),
  ]);
  assert.deepEqual(r.map(x => x.ticker), ['TSLA']);
});

test('tolkaTraffar: dubbletter och icke-aktier faller bort', () => {
  const r = tolkaTraffar([
    q('TSLA', 'NMS', 'Tesla, Inc.'),
    q('TSLA', 'NMS', 'Tesla, Inc.'),
    { quoteType: 'ETF', symbol: 'XACT.ST', exchange: 'STO' },
    { quoteType: 'EQUITY' },
  ]);
  assert.equal(r.length, 1);
});

test('tolkaTraffar: symbolen foljer med for sparbarhet', () => {
  assert.equal(tolkaTraffar([q('TSLA', 'NMS', 'Tesla, Inc.')])[0].symbol, 'TSLA');
  assert.equal(tolkaTraffar([q('FERRO.ST', 'STO', 'Ferroamp')])[0].symbol, 'FERRO.ST');
});
