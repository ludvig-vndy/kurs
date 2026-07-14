/* motor/vigilans/ingest-borsdata.mjs
   Borsdata-adaptern: hamtar kvartalsrapporter och dagskurser och mappar dem
   till vara egna former (holding_figures / prices), redo for tripwire-eval
   och timeline-build. Ren mappning ar exporterad och testad offline; natverket
   kravs bara i CLI-laget.

   Nyckel: satt BORSDATA_API_KEY i .env (eller --key=...). Rok-test nar
   trial-nyckeln landar:

     node motor/vigilans/ingest-borsdata.mjs --ticker "LIFCO B" --check

   API-not: apiservice.borsdata.se/v1, authKey som query-param. Rate limit ar
   snal (ca 100 anrop per 10 s), sa CLI:n sover mellan anrop. Licens: retail-
   nyckel ar privat bruk, betalande kunder kraver Enterprise (se LAUNCH.md). */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE = 'https://apiservice.borsdata.se/v1';

// ── Ren mappning (testbar utan natverk) ────────────────────────────────────

/* Hitta instrumentet for ett innehav: ISIN vinner, annars ticker (Borsdata
   skriver "LIFCO B", vi tal aven "LIFCO-B"/"lifco b"). */
export function findInstrument(instruments, { ticker, isin }) {
  const list = instruments || [];
  if (isin) {
    const hit = list.find((i) => (i.isin || '').toUpperCase() === String(isin).toUpperCase());
    if (hit) return hit;
  }
  if (!ticker) return null;
  const norm = (s) => String(s || '').toUpperCase().replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = norm(ticker);
  return list.find((i) => norm(i.ticker) === t) || null;
}

/* Kvartalsrader (Borsdatas reports/quarter, nyast forst eller osorterat) ->
   vara holding_figures-rader. Harledda matt raknas HAR, deterministiskt:
   motorn (tripwire-eval) forblir en ren jamforare.
     gross_margin   = bruttoresultat / omsattning (%)
     net_debt       = nettoskuld (MSEK, Borsdatas enhet)
     revenue_growth = omsattning mot samma kvartal i fjol (%)
     dilution       = antal aktier mot samma kvartal i fjol (%)
     cash_runway    = kassa / kvartalsbrann (kvartal; bara vid negativt FCF) */
export function mapQuarterReports(rows, srcName) {
  const qs = (rows || [])
    .filter((r) => r && r.year != null && r.period != null)
    .sort((a, b) => (a.year - b.year) || (a.period - b.period));
  const out = [];
  const src = (r) => ({ title: (srcName || 'Borsdata') + ' Q' + r.period + ' ' + r.year });
  const byKey = new Map(qs.map((r) => [r.year + 'Q' + r.period, r]));
  const asOf = (r) => {
    // Kvartalets slutdatum: rackligt som as_of for tes-band/markorer.
    const mm = ['03-31', '06-30', '09-30', '12-31'][r.period - 1] || '12-31';
    return r.year + '-' + mm;
  };
  for (const r of qs) {
    const period = r.year + 'Q' + r.period;
    const push = (metric, value, unit) => {
      if (value == null || Number.isNaN(Number(value))) return;
      out.push({ period, as_of: asOf(r), metric, value: Number(value), unit, source_ref: src(r) });
    };
    if (r.revenues != null && r.revenues !== 0 && r.gross_Income != null) {
      push('gross_margin', round1((r.gross_Income / r.revenues) * 100), '%');
    }
    push('net_debt', r.net_Debt, 'MSEK');
    push('cash', r.cash_And_Equivalents, 'MSEK');
    const prev = byKey.get((r.year - 1) + 'Q' + r.period);
    if (prev && prev.revenues) {
      push('revenue_growth', round1(((r.revenues - prev.revenues) / Math.abs(prev.revenues)) * 100), '%');
    }
    if (prev && prev.number_Of_Shares) {
      push('dilution', round1(((r.number_Of_Shares - prev.number_Of_Shares) / prev.number_Of_Shares) * 100), '%');
    }
    if (r.free_Cash_Flow != null && r.free_Cash_Flow < 0 && r.cash_And_Equivalents > 0) {
      push('cash_runway', round1(r.cash_And_Equivalents / Math.abs(r.free_Cash_Flow)), 'kvartal');
    }
  }
  return out;
}

/* Borsdatas stockprices -> vara prices-rader ({d, close}). */
export function mapStockprices(rows) {
  return (rows || [])
    .filter((p) => p && p.d && p.c != null)
    .map((p) => ({ d: String(p.d).slice(0, 10), close: Number(p.c) }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}

function round1(x) { return Math.round(x * 10) / 10; }

// ── CLI (natverk; kravs forst nar nyckeln finns) ──────────────────────────

function envKey() {
  if (process.env.BORSDATA_API_KEY) return process.env.BORSDATA_API_KEY;
  try {
    if (existsSync('.env')) {
      const m = readFileSync('.env', 'utf8').match(/^BORSDATA_API_KEY=(.+)$/m);
      if (m) return m[1].trim();
    }
  } catch (e) {}
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, key) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(BASE + path + sep + 'authKey=' + encodeURIComponent(key));
  if (!r.ok) throw new Error('Borsdata ' + r.status + ' pa ' + path.split('?')[0]);
  return r.json();
}

async function main(argv) {
  const args = Object.fromEntries(argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
  const key = args.key || envKey();
  if (!key) {
    console.log('Ingen nyckel. Satt BORSDATA_API_KEY i .env (eller --key=...).');
    console.log('Nar trial-nyckeln landar:  node motor/vigilans/ingest-borsdata.mjs --ticker "LIFCO B" --check');
    process.exit(1);
  }
  const inst = await api('/instruments', key);
  const list = inst.instruments || [];
  console.log('Nyckeln fungerar. Instrument i listan: ' + list.length);
  if (!args.ticker && !args.isin) return;

  const hit = findInstrument(list, { ticker: args.ticker, isin: args.isin });
  if (!hit) { console.log('Hittade inte instrumentet.'); process.exit(1); }
  console.log('Traff: ' + hit.name + ' (' + hit.ticker + ', insId ' + hit.insId + ')');

  await sleep(300);
  const rep = await api('/instruments/' + hit.insId + '/reports/quarter?maxCount=12', key);
  const figures = mapQuarterReports(rep.reports, hit.name);
  console.log('\nSenaste figures (' + figures.length + ' rader), sista 8:');
  for (const f of figures.slice(-8)) console.log('  ' + f.period + '  ' + f.metric + ' = ' + f.value + (f.unit ? ' ' + f.unit : ''));

  await sleep(300);
  const to = new Date().toISOString().slice(0, 10);
  const pr = await api('/instruments/' + hit.insId + '/stockprices?from=2025-01-01&to=' + to, key);
  const prices = mapStockprices(pr.stockPricesList || pr.stockPrices);
  console.log('\nPriser: ' + prices.length + ' dagar, senaste: ' + JSON.stringify(prices[prices.length - 1] || null));
  console.log('\nAllt mappat till holding_figures/prices-formerna. Redo for tripwire-eval och timeline-build.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main(process.argv).catch((e) => { console.error('Fel:', e.message); process.exit(1); });
}
