// FI:s insynsregister: öppen data, CSV-export per utgivare (UTF-16LE).
// Hämtar, parsar och summerar de senaste tolv månadernas insynstransaktioner.
// Ingen LLM behövs: registret är redan strukturerat. Källan citeras per rad
// genom publicerings- och transaktionsdatum plus person och befattning.

function tal(s) { const v = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; }

export async function hamtaInsyn(utgivare) {
  const url = `https://marknadssok.fi.se/publiceringsklient/sv-SE/Search/Search?SearchFunctionType=Insyn&Utgivare=${encodeURIComponent(utgivare)}&button=export`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } });
  if (!res.ok) throw new Error(`FI insyn ${utgivare}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf16le').replace(/^﻿/, '');

  const rader = text.split(/\r?\n/).filter(r => r.trim());
  if (rader.length < 2) return { utgivare, transaktioner: [], netto_12m: 0 };
  const kol = rader[0].split(';').map(k => k.trim());
  const ix = n => kol.findIndex(k => k.toLowerCase().startsWith(n));
  const I = {
    pub: ix('publicerings'), emittent: ix('emittent'), person: ix('person i ledande'),
    befattning: ix('befattning'), karaktar: ix('karakt'), instrument: ix('instrumenttyp'),
    transdatum: ix('transaktionsdatum'), volym: ix('volym'), pris: ix('pris'), valuta: ix('valuta'),
    korrigering: ix('korrigering'), narstaende: ix('närstående') >= 0 ? ix('närstående') : ix('närst')
  };

  const grans = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const transaktioner = [];
  for (const rad of rader.slice(1)) {
    const c = rad.split(';');
    if (c.length < kol.length - 2) continue;
    const pub = (c[I.pub] || '').trim().slice(0, 10);
    if (pub < grans) continue;
    if ((c[I.korrigering] || '').trim().toLowerCase() === 'ja') continue;
    const karaktar = (c[I.karaktar] || '').trim();
    if (!/förvärv|avyttring/i.test(karaktar)) continue; // huvudtyperna; lån/teckning m.m. utelämnas i v0
    const volym = tal(c[I.volym]), pris = tal(c[I.pris]);
    transaktioner.push({
      pub, transdatum: (c[I.transdatum] || '').trim().slice(0, 10),
      person: (c[I.person] || '').trim(), befattning: (c[I.befattning] || '').trim(),
      karaktar, instrument: (c[I.instrument] || '').trim(),
      volym, pris, valuta: (c[I.valuta] || '').trim(),
      belopp: volym != null && pris != null ? Math.round(volym * pris) : null
    });
  }
  transaktioner.sort((a, b) => b.pub.localeCompare(a.pub));

  const netto_12m = transaktioner.reduce((a, t) =>
    a + (t.belopp || 0) * (/förvärv/i.test(t.karaktar) ? 1 : -1), 0);

  return { utgivare, kalla: url, hamtad: new Date().toISOString().slice(0, 10), transaktioner, netto_12m };
}
