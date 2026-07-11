/* motor/vigilans/timeline-build.mjs
   Läsmodellen för tes-tidslinjen (plan avsnitt 2b, north star). Ren funktion,
   ingen datakälla: den slår ihop en prisserie (kurvan) + markörer (trådhändelser
   och beslut, via as_of) + tes-bandet (figures mot invarianter) till en färdig
   nyttolast som en vy bara ritar. Testbar offline på inmatad prisserie, precis
   som brief-build, långt innan en prisfeed finns.

   Hederlighetsprinciperna (avsnitt 2b) lever i datan: beskrivande, aldrig
   prediktivt. Bandet visar det farliga, att priset kan stiga medan tesen tyst
   brister, men uttalar sig aldrig om framtiden.

   Datum är ISO-strängar (YYYY-MM-DD) och jämförs lexikografiskt; ingen Date
   behövs här (renderaren skalar x-axeln). */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RANK = { intact: 0, drifting: 1, broken: 2 };
const NAME = ['intact', 'drifting', 'broken'];

/* Tes-tillstånd för EN invariant vid ETT värde. 'near' är hur nära tröskeln som
   räknas som glidning (bandets gula zon), en UI-tröskel, inte en marknadsdom. */
export function invariantState(inv, value, near = 0.1) {
  if (value == null) return 'intact'; // okänt värde: visa inte falsk risk
  const t = Number(inv.value), v = Number(value);
  if (Number.isNaN(t) || Number.isNaN(v)) return 'intact';
  if (inv.op === 'below') {          // värdet ska hålla sig ÖVER tröskeln
    if (v < t) return 'broken';
    if (v < t * (1 + near)) return 'drifting';
    return 'intact';
  }
  if (inv.op === 'above') {          // värdet ska hålla sig UNDER tröskeln
    if (v > t) return 'broken';
    if (v > t * (1 - near)) return 'drifting';
    return 'intact';
  }
  return 'intact';
}

function closeAt(prices, date) {
  let c = null;
  for (const p of prices) { if (p.d <= date) c = p.close; else break; }
  return c != null ? c : (prices[0] ? prices[0].close : null);
}

/* Slår ihop kurva + markörer + tes-band till en tidslinje-nyttolast. */
export function buildTimeline(input) {
  const prices = (input.prices || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  const near = input.near != null ? input.near : 0.1;

  // ── Markörer: trådhändelser + beslut, placerade på kurvan via as_of ──
  const markers = [];
  for (const ev of input.events || []) {
    markers.push({
      date: ev.as_of, kind: ev.kind || 'tripwire', metric: ev.metric || null,
      label: ev.note || ev.metric || 'händelse',
      observed: ev.observed != null ? ev.observed : null,
      threshold: ev.threshold != null ? ev.threshold : null,
      unit: ev.unit || null,
      source_ref: ev.source_ref || null,
      lesson_ids: ev.lesson_ids || [],
      close: closeAt(prices, ev.as_of),
    });
  }
  for (const d of input.decisions || []) {
    markers.push({
      date: d.as_of, kind: 'decision',
      label: d.action ? (d.action + (d.note ? ': ' + d.note : '')) : (d.note || 'beslut'),
      source_ref: d.source_ref || null, lesson_ids: [],
      close: closeAt(prices, d.as_of),
    });
  }
  markers.sort((a, b) => (a.date < b.date ? -1 : 1));

  // ── Tes-band: styckvis konstant, byter tillstånd när en ny siffra kommer ──
  const figs = (input.figures || []).slice().sort((a, b) => (a.as_of < b.as_of ? -1 : 1));
  const invariants = input.invariants || [];
  const start = prices.length ? prices[0].d : (figs[0] ? figs[0].as_of : null);
  const end = prices.length ? prices[prices.length - 1].d : (figs[figs.length - 1] ? figs[figs.length - 1].as_of : null);

  let band = [];
  if (invariants.length && start && end) {
    const changeDates = figs.map((f) => f.as_of).filter((d) => d > start && d <= end);
    const segStarts = [...new Set([start, ...changeDates])].sort();
    const latest = {};
    for (let i = 0; i < segStarts.length; i++) {
      const from = segStarts[i];
      const to = i + 1 < segStarts.length ? segStarts[i + 1] : end;
      for (const f of figs) if (f.as_of <= from) latest[f.metric] = f.value;
      let worst = 0;
      for (const inv of invariants) worst = Math.max(worst, RANK[invariantState(inv, latest[inv.metric], near)]);
      band.push({ from, to, state: NAME[worst] });
    }
    // slå ihop intilliggande segment med samma tillstånd
    const merged = [];
    for (const seg of band) {
      const last = merged[merged.length - 1];
      if (last && last.state === seg.state) last.to = seg.to;
      else merged.push({ ...seg });
    }
    band = merged;
  }

  let min = Infinity, max = -Infinity;
  for (const p of prices) { if (p.close < min) min = p.close; if (p.close > max) max = p.close; }
  if (!prices.length) { min = 0; max = 0; }

  return {
    holding: input.holding || null,
    range: { from: start, to: end },
    domain: { min, max },
    series: prices,
    markers,
    band,
  };
}

// ── CLI: node timeline-build.mjs [underlag.json]  (skriver payload till stdout)
function main(argv) {
  const path = argv.slice(2).find((a) => !a.startsWith('--')) ||
    fileURLToPath(new URL('./exempel-tidslinje.json', import.meta.url));
  const input = JSON.parse(readFileSync(path, 'utf8'));
  process.stdout.write(JSON.stringify(buildTimeline(input), null, 2) + '\n');
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv);
