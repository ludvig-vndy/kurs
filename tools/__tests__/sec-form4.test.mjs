import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cikFor, xmlUrl, tolkaForm4, valjFilingar, KOP, SALJ } from '../../motor/hamta-sec.mjs';

const KARTA = { TSLA: '0001318605', 'BRK-B': '0001067983' };

test('cikFor: tickern slas upp och nollstoppas till tio tecken', () => {
  assert.equal(cikFor('TSLA', KARTA), '0001318605');
  assert.equal(cikFor('tsla', KARTA), '0001318605');
  assert.equal(cikFor('SAAB', KARTA), null);
});

test('xmlUrl: rendrad sokvag byts mot den rana XML:en', () => {
  assert.equal(
    xmlUrl('0001318605', '0001104659-26-075213', 'xslF345X06/tm2618092-2_4seq1.xml'),
    'https://www.sec.gov/Archives/edgar/data/1318605/000110465926075213/tm2618092-2_4seq1.xml');
});

const SUB = {
  filings: {
    recent: {
      form: ['4', '8-K', '4', '4'],
      filingDate: ['2026-09-01', '2026-09-01', '2026-08-30', '2026-06-17'],
      accessionNumber: ['a-1', 'a-2', 'a-3', 'a-4'],
      primaryDocument: ['x/d1.xml', 'd2.htm', 'x/d3.xml', 'x/d4.xml'],
    },
  },
};

test('valjFilingar: bara blankett 4, och bara inom fonstret', () => {
  const r = valjFilingar(SUB, '2026-08-29');
  assert.deepEqual(r.map(f => f.accession), ['a-1', 'a-3']);
  assert.equal(r[0].dokument, 'x/d1.xml');
});

test('valjFilingar: ett tomt svar kraschar inte', () => {
  assert.deepEqual(valjFilingar(null, '2026-08-29'), []);
  assert.deepEqual(valjFilingar({ filings: {} }, '2026-08-29'), []);
});

const form4 = (kod, antal, pris, riktning, titel = 'CFO') => `<?xml version="1.0"?>
<ownershipDocument>
  <documentType>4</documentType>
  <periodOfReport>2026-09-01</periodOfReport>
  <issuer><issuerName>Tesla, Inc.</issuerName><issuerTradingSymbol>TSLA</issuerTradingSymbol></issuer>
  <reportingOwner>
    <reportingOwnerId><rptOwnerName>Doe Jane</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship><isDirector>0</isDirector><isOfficer>1</isOfficer>
      <isTenPercentOwner>0</isTenPercentOwner><officerTitle>${titel}</officerTitle></reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable><nonDerivativeTransaction>
    <securityTitle><value>Common Stock</value></securityTitle>
    <transactionDate><value>2026-09-01</value></transactionDate>
    <transactionCoding><transactionCode>${kod}</transactionCode></transactionCoding>
    <transactionAmounts>
      <transactionShares><value>${antal}</value></transactionShares>
      <transactionPricePerShare><value>${pris}</value></transactionPricePerShare>
      <transactionAcquiredDisposedCode><value>${riktning}</value></transactionAcquiredDisposedCode>
    </transactionAmounts>
  </nonDerivativeTransaction></nonDerivativeTable>
</ownershipDocument>`;

test('tolkaForm4: ett oppet marknadskop blir samma form som FI-raderna', () => {
  const t = tolkaForm4(form4('P', 29500, '12.5', 'A'), '2026-09-02');
  assert.equal(t.length, 1);
  assert.deepEqual(t[0], {
    pub: '2026-09-02', transdatum: '2026-09-01', emittent: 'Tesla, Inc.',
    person: 'Doe Jane', befattning: 'CFO', karaktar: 'Förvärv',
    instrument: 'Common Stock', volym: 29500, pris: 12.5, valuta: 'USD',
    belopp: 368750, kod: 'P',
  });
});

test('tolkaForm4: en oppen forsaljning blir Avyttring', () => {
  const t = tolkaForm4(form4('S', 1000, '10', 'D'), '2026-09-02');
  assert.equal(t[0].karaktar, 'Avyttring');
});

/* DEN VIKTIGASTE REGELN. Musks Form 4 den 17 juni 2026 redovisar 303 960 630
   aktier "forvarvade" till 23,34 dollar. Det ar ett optionslosen (kod M), inte
   ett kop pa marknaden. Rapporteras M och F som kop och salj blir brevet bade
   brusigt och missvisande: en tilldelning ar inget beslut att kopa. Bara P och
   S ar insynshandel i den mening lasaren tror. Samma linje som FI-modulen, som
   bara tar forvarv och avyttring. */
test('tolkaForm4: optionslosen, tilldelning och skatteavdrag ar inte insynshandel', () => {
  for (const kod of ['M', 'A', 'F', 'G', 'C', 'X'])
    assert.deepEqual(tolkaForm4(form4(kod, 303960630, '23.34', 'A'), '2026-09-02'), [],
      'kod ' + kod + ' slapptes igenom');
});

test('koderna vi raknar ar uttalade och bara tva', () => {
  assert.equal(KOP, 'P');
  assert.equal(SALJ, 'S');
});

test('tolkaForm4: styrelseledamot utan titel far en lasbar roll', () => {
  const xml = form4('P', 100, '10', 'A', '').replace('<isDirector>0<', '<isDirector>1<');
  assert.equal(tolkaForm4(xml, '2026-09-02')[0].befattning, 'Styrelseledamot');
});

test('tolkaForm4: utan pris blir beloppet null, aldrig noll', () => {
  const xml = form4('P', 100, '', 'A');
  const t = tolkaForm4(xml, '2026-09-02');
  assert.equal(t[0].pris, null);
  assert.equal(t[0].belopp, null);
});

test('tolkaForm4: skrap ger tom lista i stallet for att kasta', () => {
  assert.deepEqual(tolkaForm4('', '2026-09-02'), []);
  assert.deepEqual(tolkaForm4('<ownershipDocument></ownershipDocument>', '2026-09-02'), []);
});
