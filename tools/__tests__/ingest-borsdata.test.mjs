import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findInstrument, mapQuarterReports, mapStockprices } from '../../motor/vigilans/ingest-borsdata.mjs';

const INSTRUMENTS = [
  { insId: 1, name: 'Lifco', ticker: 'LIFCO B', isin: 'SE0015949201' },
  { insId: 2, name: 'Exempelbolaget', ticker: 'EXB', isin: 'SE0000000001' },
];

test('findInstrument: ISIN vinner, ticker tal olika skrivsatt', () => {
  assert.equal(findInstrument(INSTRUMENTS, { isin: 'se0015949201' }).insId, 1);
  assert.equal(findInstrument(INSTRUMENTS, { ticker: 'LIFCO-B' }).insId, 1);
  assert.equal(findInstrument(INSTRUMENTS, { ticker: 'lifco b' }).insId, 1);
  assert.equal(findInstrument(INSTRUMENTS, { ticker: 'FINNS EJ' }), null);
});

// Tva kvartal + samma kvartal aret innan, sa harledda matt kan verifieras.
const REPORTS = [
  { year: 2024, period: 3, revenues: 1000, gross_Income: 420, net_Debt: 90, cash_And_Equivalents: 200, number_Of_Shares: 100, free_Cash_Flow: 50 },
  { year: 2025, period: 2, revenues: 1100, gross_Income: 450, net_Debt: 95, cash_And_Equivalents: 180, number_Of_Shares: 100, free_Cash_Flow: 20 },
  { year: 2025, period: 3, revenues: 1200, gross_Income: 456, net_Debt: 110, cash_And_Equivalents: 150, number_Of_Shares: 110, free_Cash_Flow: -30 },
];

test('mapQuarterReports: grundmatt + harledda (tillvaxt, utspadning, runway)', () => {
  const f = mapQuarterReports(REPORTS, 'Testbolaget');
  const q3 = Object.fromEntries(f.filter((x) => x.period === '2025Q3').map((x) => [x.metric, x]));
  assert.equal(q3.gross_margin.value, 38);          // 456/1200
  assert.equal(q3.net_debt.value, 110);
  assert.equal(q3.revenue_growth.value, 20);        // 1200 mot 1000
  assert.equal(q3.dilution.value, 10);              // 110 mot 100 aktier
  assert.equal(q3.cash_runway.value, 5);            // 150 kassa / 30 brann
  assert.equal(q3.cash_runway.unit, 'kvartal');
  assert.equal(q3.gross_margin.as_of, '2025-09-30');
  assert.match(q3.gross_margin.source_ref.title, /Q3 2025/);
});

test('mapQuarterReports: runway bara vid negativt kassaflode, tillvaxt kraver fjolarskvartal', () => {
  const f = mapQuarterReports(REPORTS, 'T');
  const q2 = f.filter((x) => x.period === '2025Q2').map((x) => x.metric);
  assert.ok(!q2.includes('cash_runway'));   // positivt FCF -> ingen runway
  assert.ok(!q2.includes('revenue_growth')); // 2024Q2 saknas -> ingen tillvaxt
  const q3_2024 = f.filter((x) => x.period === '2024Q3').map((x) => x.metric);
  assert.ok(!q3_2024.includes('revenue_growth')); // forsta aret saknar jamforelse
});

test('mapStockprices: sorterade {d, close}-rader', () => {
  const p = mapStockprices([
    { d: '2025-07-02', c: 141, h: 1, l: 1, o: 1, v: 1 },
    { d: '2025-07-01', c: 140.5, h: 1, l: 1, o: 1, v: 1 },
    { d: '2025-07-03', c: null },
  ]);
  assert.deepEqual(p, [{ d: '2025-07-01', close: 140.5 }, { d: '2025-07-02', close: 141 }]);
});
