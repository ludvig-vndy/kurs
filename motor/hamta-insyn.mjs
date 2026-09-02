// FI:s insynsregister: öppen data, CSV-export per utgivare (UTF-16LE).
// Hämtar, parsar och summerar de senaste tolv månadernas insynstransaktioner.
// Ingen LLM behövs: registret är redan strukturerat. Källan citeras per rad
// genom publicerings- och transaktionsdatum plus person och befattning.
//
// UTGIVARNAMNET. Sökningen hos FI är en substrängmatch på utgivarfältet, och
// innehaven heter som i aktieboken. Saniona ligger hos FI som "Saniona AB"
// medan innehavet heter "Saniona AB (publ)", vilket gav noll träffar varje natt
// sedan bolaget lades in: tre insynsköp i augusti och september 2026 syntes
// aldrig i brevet. Därför provas det fulla namnet först och det avskalade som
// räddning, med kontroll av emittenten på varje rad så en bredare sökning inte
// kan dra in ett annat bolag.

// Fönstret gäller bara första gången ett bolag ses, sedan tar baslinjen över.
// Sex dygn täcker en helg plus marginal: Sanionas köp den 28 augusti låg
// utanför ett fyradagarsfönster och hade fallit bort i tystnad.
export const INSYN_DYGN = 6;
const BOLAGSFORM = /[\s,]+(ab|abp|oyj|oy|asa|a\/s|as|plc|inc|corp|holding|group|se)\b/gi;

/** Bolagsnamn utan bolagsform, för en bredare sökning hos FI. */
export function skalaUtgivare(namn) {
  return String(namn || '')
    .replace(/\(\s*publ\.?\s*\)/gi, ' ')
    .replace(BOLAGSFORM, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Är raden verkligen vårt bolag? Skyddet mot en för bred sökning. */
export function samaBolag(emittent, bolag) {
  const a = skalaUtgivare(emittent).toLowerCase();
  const b = skalaUtgivare(bolag).toLowerCase();
  return Boolean(a && b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ')));
}

/* Vad som ska flaggas i brevet.
   Med baslinje: allt som publicerats efter den. Utan baslinje rapporterade
   motorn förut ingenting alls och satte bara baslinjen, vilket hade tystat
   Sanionas tre köp och Ferroamps två för alltid, eftersom de var registrets
   första träffar för respektive bolag. Nu gäller ett fönster i stället, så ett
   nytt bolag inte kostar en tyst vecka. */
export function nyaInsyn(transaktioner, senastSedd, franDatum, { tak = 3 } = {}) {
  const traffar = (transaktioner || []).filter(t =>
    senastSedd ? t.pub > senastSedd : t.pub >= franDatum);
  return traffar.slice(0, tak);
}

/** Gränsdatumet för fönstret ovan, INSYN_DYGN dygn bakåt. */
export function insynFran(nu = new Date(), dygn = INSYN_DYGN) {
  return new Date(new Date(nu).getTime() - dygn * 864e5).toISOString().slice(0, 10);
}

function tal(s) { const v = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; }

async function sok(utgivare) {
  const url = `https://marknadssok.fi.se/publiceringsklient/sv-SE/Search/Search?SearchFunctionType=Insyn&Utgivare=${encodeURIComponent(utgivare)}&button=export`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } });
  if (!res.ok) throw new Error(`FI insyn ${utgivare}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf16le').replace(/^﻿/, '');

  const rader = text.split(/\r?\n/).filter(r => r.trim());
  if (rader.length < 2) return { utgivare, kalla: url, transaktioner: [] };
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
      pub, emittent: (c[I.emittent] || '').trim(),
      transdatum: (c[I.transdatum] || '').trim().slice(0, 10),
      person: (c[I.person] || '').trim(), befattning: (c[I.befattning] || '').trim(),
      karaktar, instrument: (c[I.instrument] || '').trim(),
      volym, pris, valuta: (c[I.valuta] || '').trim(),
      belopp: volym != null && pris != null ? Math.round(volym * pris) : null
    });
  }
  return { utgivare, kalla: url, transaktioner };
}

function summera(utgivare, kalla, transaktioner) {
  const t = [...transaktioner].sort((a, b) => b.pub.localeCompare(a.pub));
  const netto_12m = t.reduce((a, x) =>
    a + (x.belopp || 0) * (/förvärv/i.test(x.karaktar) ? 1 : -1), 0);
  return { utgivare, kalla, hamtad: new Date().toISOString().slice(0, 10), transaktioner: t, netto_12m };
}

/* Fullt namn först, avskalat namn som räddning. Ett tomt svar på det fulla
   namnet är inte ett besked om att bolaget saknar insynshandel, det kan lika
   gärna vara "(publ)" som står i vägen. Räddningssökningen är bredare, så varje
   rad kontrolleras mot emittenten innan den räknas. */
export async function hamtaInsyn(namn) {
  const full = await sok(namn);
  if (full.transaktioner.length) return summera(namn, full.kalla, full.transaktioner);

  const skalat = skalaUtgivare(namn);
  if (!skalat || skalat === String(namn || '').trim()) return summera(namn, full.kalla, []);

  // FI stänger anslutningen om två sökningar kommer tätt på varandra.
  await new Promise(r => setTimeout(r, 400));
  const bred = await sok(skalat);
  const vara = bred.transaktioner.filter(t => samaBolag(t.emittent, namn));
  return summera(namn, vara.length ? bred.kalla : full.kalla, vara);
}
