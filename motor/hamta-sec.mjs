// SEC:s insynsregister (Form 4), den amerikanska motsvarigheten till FI:s.
//
// Piloten bad om Tesla i portföljen, och nästa fråga blev genast om brevet kan
// ligga före Avanza på insynsköpen. Det kan det, av samma skäl som i Sverige:
// vi läser primärkällan. Form 4 ska lämnas in inom två arbetsdagar, och EDGAR
// publicerar den i samma stund.
//
// SAMMA FORM UT SOM FI. Raderna får exakt den form motor/hamta-insyn.mjs
// levererar (pub, person, befattning, karaktar, volym, pris, belopp), så
// resten av motorn, brevet och narrationen inte behöver veta vilket land
// handeln skedde i. Enda tillägget är `valuta`, som är USD i stället för SEK.
//
// TRANSAKTIONSKODEN ÄR HELA POÄNGEN. Form 4 redovisar allt som rör innehavet,
// inte bara köp. Elon Musks blankett den 17 juni 2026 tar upp 303 960 630
// aktier "förvärvade" till 23,34 dollar; det är ett optionslösen, kod M, inte
// ett köp på marknaden. Rapporteras M, A och F som insynshandel blir brevet
// både brusigt och missvisande, för en tilldelning är inget beslut att köpa.
// Därför räknas bara P (öppet marknadsköp) och S (öppen försäljning), precis
// som FI-modulen bara tar förvärv och avyttring.
//
// SEC kräver en User-Agent som går att kontakta, och taket är tio anrop per
// sekund. Vi går långsammare än så.

import { pathToFileURL } from 'url';

const UA = 'Marginalen agarkollen (ludvig@vndy.se)';
export const KOP = 'P';
export const SALJ = 'S';
export const SEC_DYGN = 6;

const MINSTA_PAUS = 200;
let sistaAnrop = 0;
const sov = ms => new Promise(r => setTimeout(r, ms));

async function hamta(url) {
  const drojt = Date.now() - sistaAnrop;
  if (drojt < MINSTA_PAUS) await sov(MINSTA_PAUS - drojt);
  sistaAnrop = Date.now();
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json,text/xml,*/*' } });
  if (!r.ok) throw new Error('SEC svarade ' + r.status + ' på ' + url.split('/').slice(-1)[0]);
  return r;
}

/* Ticker -> CIK. SEC:s egen lista, ~10 000 bolag, en fil. Hämtas en gång per
   körning och skickas in i cikFor, så uppslaget går att pröva utan nätverk. */
export async function hamtaCikKarta() {
  const j = await (await hamta('https://www.sec.gov/files/company_tickers.json')).json();
  const karta = {};
  for (const rad of Object.values(j || {})) {
    if (rad && rad.ticker) karta[String(rad.ticker).toUpperCase()] = String(rad.cik_str).padStart(10, '0');
  }
  return karta;
}

export function cikFor(ticker, karta) {
  const t = String(ticker || '').toUpperCase().trim();
  const v = karta && karta[t];
  return v ? String(v).padStart(10, '0') : null;
}

/* primaryDocument pekar på den XSL-rendrade HTML-vyn (xslF345X06/...). Den råa
   XML:en ligger på samma ställe utan det prefixet, och den är det vi vill läsa:
   ett stabilt schema i stället för en formaterad tabell. */
export function xmlUrl(cik, accession, dokument) {
  const nr = String(accession || '').replace(/-/g, '');
  const fil = String(dokument || '').split('/').pop();
  return 'https://www.sec.gov/Archives/edgar/data/' +
    String(cik).replace(/^0+/, '') + '/' + nr + '/' + fil;
}

/** Blankett 4 inlämnade från och med `franDatum`, nyast först. */
export function valjFilingar(submissions, franDatum) {
  const r = submissions && submissions.filings && submissions.filings.recent;
  if (!r || !Array.isArray(r.form)) return [];
  const ut = [];
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] !== '4') continue;
    const datum = String(r.filingDate[i] || '').slice(0, 10);
    if (datum < franDatum) continue;
    ut.push({ datum, accession: r.accessionNumber[i], dokument: r.primaryDocument[i] });
  }
  return ut;
}

// Minimal XML-plockning. Form 4 har ett fast schema och taggnamnen är unika i
// sitt sammanhang, så en full parser skulle bara vara ett beroende till.
const taggar = (xml, namn) => {
  const re = new RegExp('<' + namn + '\\b[^>]*>([\\s\\S]*?)</' + namn + '>', 'g');
  const ut = [];
  let m;
  while ((m = re.exec(xml)) !== null) ut.push(m[1]);
  return ut;
};
const tagg = (xml, namn) => taggar(xml, namn)[0] || '';
// Fälten ligger som <falt><value>x</value></falt>; enstaka fält saknar value.
const varde = (xml, namn) => {
  const inre = tagg(xml, namn);
  if (!inre) return '';
  const v = tagg(inre, 'value');
  return (v || (inre.includes('<') ? '' : inre)).trim();
};
const tal = s => {
  const v = parseFloat(String(s || '').replace(/,/g, ''));
  return isFinite(v) ? v : null;
};

function roll(agare) {
  const rel = tagg(agare, 'reportingOwnerRelationship');
  const titel = (tagg(rel, 'officerTitle') || '').trim();
  if (titel) return titel;
  if (tagg(rel, 'isDirector').trim() === '1') return 'Styrelseledamot';
  if (tagg(rel, 'isTenPercentOwner').trim() === '1') return 'Större ägare';
  return 'Insynsperson';
}

/** En Form 4 -> rader i samma form som FI:s insynsregister ger. */
export function tolkaForm4(xml, pub) {
  const x = String(xml || '');
  if (!x.includes('ownershipDocument')) return [];
  const emittent = (tagg(tagg(x, 'issuer'), 'issuerName') || '').trim();
  const agare = tagg(x, 'reportingOwner');
  const person = (tagg(tagg(agare, 'reportingOwnerId'), 'rptOwnerName') || '').trim();
  const befattning = roll(agare);

  const ut = [];
  for (const t of taggar(x, 'nonDerivativeTransaction')) {
    const kod = (tagg(tagg(t, 'transactionCoding'), 'transactionCode') || '').trim().toUpperCase();
    if (kod !== KOP && kod !== SALJ) continue; // se filens huvud: bara öppen marknad
    const belopp = tagg(t, 'transactionAmounts');
    const volym = tal(varde(belopp, 'transactionShares'));
    const pris = tal(varde(belopp, 'transactionPricePerShare'));
    ut.push({
      pub,
      transdatum: varde(t, 'transactionDate').slice(0, 10),
      emittent,
      person,
      befattning,
      karaktar: kod === KOP ? 'Förvärv' : 'Avyttring',
      instrument: varde(t, 'securityTitle') || 'Common Stock',
      volym,
      pris,
      valuta: 'USD',
      belopp: volym != null && pris != null ? Math.round(volym * pris) : null,
      kod,
    });
  }
  return ut;
}

/* Ett bolags insynshandel de senaste dygnen, i FI-modulens form.
   Kastar aldrig tyst: utan CIK returneras en tom lista med skälet i `av`. */
export async function hamtaSecInsyn(ticker, { idag = new Date(), dygn = SEC_DYGN, karta = null } = {}) {
  const k = karta || await hamtaCikKarta();
  const cik = cikFor(ticker, k);
  if (!cik) return { ticker, av: 'ingen CIK för ' + ticker, transaktioner: [] };

  const fran = new Date(new Date(idag).getTime() - dygn * 864e5).toISOString().slice(0, 10);
  const sub = await (await hamta('https://data.sec.gov/submissions/CIK' + cik + '.json')).json();
  const filingar = valjFilingar(sub, fran);

  const transaktioner = [];
  for (const f of filingar) {
    try {
      const xml = await (await hamta(xmlUrl(cik, f.accession, f.dokument))).text();
      for (const t of tolkaForm4(xml, f.datum)) transaktioner.push(t);
    } catch { /* en trasig blankett ska inte ta hela bolaget */ }
  }
  transaktioner.sort((a, b) => b.pub.localeCompare(a.pub));
  return {
    ticker,
    av: null,
    kalla: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + cik + '&type=4',
    transaktioner,
  };
}

async function main() {
  const tickers = process.argv.slice(2);
  if (!tickers.length) { console.log('Ange ticker: node motor/hamta-sec.mjs TSLA AAPL'); return; }
  const karta = await hamtaCikKarta();
  for (const t of tickers) {
    const r = await hamtaSecInsyn(t, { karta });
    console.log('=== ' + t + (r.av ? ' (' + r.av + ')' : '') + ' === ' + r.transaktioner.length + ' poster');
    for (const x of r.transaktioner)
      console.log(['  ', x.pub, x.person.padEnd(24), x.befattning.slice(0, 20).padEnd(20),
        x.karaktar.padEnd(10), String(x.volym).padStart(10), String(x.pris).padStart(9), x.valuta].join(' '));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
