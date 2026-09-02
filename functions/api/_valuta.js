/* functions/api/_valuta.js  —  valutaomräkning till kronor.

   FELET DETTA RÄTTAR. Portföljsumman i Dina bolag lade ihop alla innehav rakt
   av och skrev "kr". Nokia hämtas som NOKIA.HE och står i euro, så 8,54 euro
   räknades in i totalen som 8,54 kronor. Felet fanns redan innan någon bad om
   amerikanska bolag; med Tesla i listan hade det blivit omöjligt att missa.

   Regeln här: ett belopp utan känd kurs räknas INTE. Att falla tillbaka på
   1:1 vore samma fel, bara flyttat ett steg. Hellre säga att vi inte vet.

   All logik i den här filen går att pröva utan nätverk, samma uppdelning som
   _routning.js har mot coach.js.
*/

// Valutorna våra marknader faktiskt handlar i. SEK är basen och har inget par.
export const PAR = {
  EUR: 'EURSEK=X',
  USD: 'USDSEK=X',
  NOK: 'NOKSEK=X',
  DKK: 'DKKSEK=X',
  ISK: 'ISKSEK=X',
  GBP: 'GBPSEK=X',
  CHF: 'CHFSEK=X',
  CAD: 'CADSEK=X',
};

export function yahooSymbolFor(valuta) {
  const v = String(valuta || '').toUpperCase();
  return PAR[v] || null;
}

/** Kursen ur Yahoos chart-svar, eller null om svaret inte bär någon. */
export function kursUrChart(json) {
  const r = json && json.chart && json.chart.result && json.chart.result[0];
  const v = r && r.meta && r.meta.regularMarketPrice;
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
}

/* Ett belopp i kronor. `valuta` saknas på innehav som lades in innan vi började
   fråga efter den; de är i praktiken svensknoterade, så null betyder SEK. En
   valuta vi känner igen men saknar kurs för ger null, inte beloppet rakt av. */
export function tillSek(belopp, valuta, kurser) {
  if (typeof belopp !== 'number' || !isFinite(belopp)) return null;
  const v = String(valuta || 'SEK').toUpperCase();
  if (v === 'SEK') return belopp;
  const k = kurser && kurser[v];
  return typeof k === 'number' && isFinite(k) && k > 0 ? belopp * k : null;
}

/** Summan i kronor plus vilka valutor som inte gick att räkna om. */
export function summeraSek(poster, kurser) {
  let summa = 0, antal = 0;
  const saknas = [];
  for (const p of poster || []) {
    const v = tillSek(p.belopp, p.valuta, kurser);
    if (v == null) {
      const namn = String(p.valuta || 'SEK').toUpperCase();
      if (!saknas.includes(namn)) saknas.push(namn);
      continue;
    }
    summa += v; antal++;
  }
  return { summa, antal, saknas };
}
