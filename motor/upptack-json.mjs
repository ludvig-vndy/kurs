// Riktig insynsdata for Upptack-flodet ur FI:s insynsregister (gratis, publikt).
// Marknadsbred: senaste ~30 dagarnas insynskop (Forvarv av aktie), aggregerat
// per bolag och rankat pa kluster (flera personer) + belopp. Priser och
// fundamenta lamnas till datalicensen; det har ar den fria riktig-data-biten.
//
//   Kor:  node motor/upptack-json.mjs
//   Ut:   public/labs/data/upptack-insyn.json
import fs from 'node:fs';

const DAGAR = 30;
const tal = s => { const v = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
const d = x => x.toISOString().slice(0, 10);

const from = d(new Date(Date.now() - DAGAR * 864e5));
const to = d(new Date());
const url = `https://marknadssok.fi.se/publiceringsklient/sv-SE/Search/Search?SearchFunctionType=Insyn&Transaktionsdatum.From=${from}&Transaktionsdatum.To=${to}&button=export`;

const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (delagaren)' } });
if (!res.ok) throw new Error('FI insyn: HTTP ' + res.status);
const text = Buffer.from(await res.arrayBuffer()).toString('utf16le').replace(/^﻿/, '');
const rader = text.split(/\r?\n/).filter(r => r.trim());
const kol = rader[0].split(';').map(k => k.trim());
const ix = n => kol.findIndex(k => k.toLowerCase().startsWith(n));
const I = {
  emittent: ix('emittent'), person: ix('person i ledande'), befattning: ix('befattning'),
  karaktar: ix('karakt'), instrument: ix('instrumenttyp'), transdatum: ix('transaktionsdatum'),
  volym: ix('volym'), pris: ix('pris'), status: ix('status'), korr: ix('korrigering'),
};

const perBolag = new Map();
let kop = 0;
for (const rad of rader.slice(1)) {
  const c = rad.split(';');
  if (c.length < kol.length - 2) continue;
  if ((c[I.korr] || '').trim().toLowerCase() === 'ja') continue;
  const status = (c[I.status] || '').trim().toLowerCase();
  if (status && status !== 'aktuell') continue;
  if (!/förvärv/i.test((c[I.karaktar] || '').trim())) continue;   // bara kop
  if (!/aktie/i.test((c[I.instrument] || '').trim())) continue;   // aktier, inte optioner
  const co = (c[I.emittent] || '').trim();
  if (!co) continue;
  const volym = tal(c[I.volym]), pris = tal(c[I.pris]);
  const belopp = volym != null && pris != null ? Math.round(volym * pris) : 0;
  const td = (c[I.transdatum] || '').trim().slice(0, 10);
  kop++;
  if (!perBolag.has(co)) perBolag.set(co, { co, belopp: 0, kop: 0, personer: new Set(), sista: '', tx: [] });
  const b = perBolag.get(co);
  b.belopp += belopp; b.kop++;
  b.personer.add((c[I.person] || '').trim());
  if (td > b.sista) b.sista = td;
  b.tx.push({ person: (c[I.person] || '').trim(), befattning: (c[I.befattning] || '').trim(), datum: td, belopp });
}

const bolag = [...perBolag.values()]
  .map(b => ({
    co: b.co, belopp: b.belopp, kop: b.kop, personer: b.personer.size, sista: b.sista,
    tx: b.tx.sort((a, z) => z.datum.localeCompare(a.datum)).slice(0, 4),
  }))
  .sort((a, z) => (z.personer - a.personer) || (z.belopp - a.belopp))
  .slice(0, 12);

const out = {
  kalla: 'Finansinspektionens insynsregister',
  hamtad: d(new Date()),
  period: { from, to, dagar: DAGAR },
  bolag,
};
fs.mkdirSync('public/labs/data', { recursive: true });
fs.writeFileSync('public/labs/data/upptack-insyn.json', JSON.stringify(out, null, 2));
console.log(`Skrev ${bolag.length} bolag ur ${kop} insynskop (${rader.length - 1} transaktioner totalt).`);
