/* motor/vigilans/brief-build.mjs
   Kör vigilans-motorn mot ett MANUELLT inmatat underlag (lokal JSON) och bygger
   ett äkta Ägarbrev. Inga externa API:er, ingen datakälla: siffrorna kommer ur
   underlaget (i skarp drift ur Rapportkollen/datakällan, samma form). Detta
   bevisar hela Fas 2-loopen offline:

     underlag (siffror + trådar) -> motorn matchar -> händelser (+ kurskoppling)
       -> brev (risk-först, tyst morgon, källänkat)

   Kör:  node motor/vigilans/brief-build.mjs [underlag.json] [--json]
   Utan argument används motor/vigilans/exempel-underlag.json.

   Positioneringsvakter (plan avsnitt 3) hålls i renderingen: inga larm utan
   källa, siffror presenteras som det som rapporterats (mekanism, inte prognos),
   och tystnaden är en egen leverans. */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateHolding, buildBriefPayload } from './tripwire-eval.mjs';
import { lektionerForMetric } from './lektionskarta.mjs';

// ── Ren logik ──────────────────────────────────────────────────────────────

/* Bygger brev-nyttolasten ur underlaget. Berikar varje händelse med bolagsnamn
   och de lektioner som förklarar mekaniken (händelse -> lektion). */
export function buildBrief(input) {
  const eventsByHolding = {};
  const names = {};
  for (const h of input.holdings || []) {
    names[h.id] = h.name || h.id;
    const events = evaluateHolding(h.tripwires, h.figures, h.prev).map((ev) => ({
      ...ev,
      lesson_ids: lektionerForMetric(ev.metric),
    }));
    if (events.length) eventsByHolding[h.id] = events;
  }
  const payload = buildBriefPayload(eventsByHolding, input.checked);
  payload.alerts = payload.alerts.map((a) => ({ ...a, holding_name: names[a.holding_id] || a.holding_id }));
  return { date: input.date || null, ...payload };
}

const METRIC_LABEL = {
  gross_margin: 'Bruttomarginalen',
  revenue_growth: 'Tillväxten',
  net_debt: 'Nettoskulden',
  cash_runway: 'Runway',
  dilution: 'Utspädningen',
  contract: 'Avtalen',
  valuation: 'Värderingen',
  roic: 'ROIC',
  moat_erosion: 'Moaten',
  insider_sell: 'Insiderförsäljningen',
  goodwill: 'Goodwillen',
  cash_quality: 'Vinstkvaliteten',
  guidance: 'Guidningen',
  parabolic: 'Kursen',
  behavior_sell_winner: 'Ditt beteende',
  concentration: 'Koncentrationen',
};
const OP_WORD = { below: 'under', above: 'över', crosses: 'korsade' };

function fmtVal(value, unit) {
  if (value == null) return '?';
  if (unit === '%') return value + ' %';
  return unit ? value + ' ' + unit : String(value);
}
function fmtSource(ref) {
  if (!ref) return null;
  if (ref.url) return 'Källa: ' + (ref.title ? ref.title + ', ' : '') + ref.url;
  const parts = [];
  if (ref.title) parts.push(ref.title);
  if (ref.page != null) parts.push('sid ' + ref.page);
  return parts.length ? 'Källa: ' + parts.join(', ') : null;
}

/* Renderar brevet som text. lessonTitle(id) är en valfri uppslagning id->titel
   (CLI:n läser den ur course.json); utan den visas bara lektions-id:t. */
export function renderBrief(brief, lessonTitle) {
  const title = (id) => (lessonTitle ? lessonTitle(id) || id : id);
  const lines = [];
  lines.push('Ägarbrevet' + (brief.date ? ' · ' + brief.date : ''));
  lines.push('');

  const c = brief.checked || {};
  const receipt =
    'Vi läste ' + (c.reports || 0) + ' rapporter, ' + (c.filings || 0) +
    ' pressmeddelanden och ' + (c.insiders || 0) + ' insynsanmälningar i natt.';

  if (brief.status === 'silent' || !brief.alerts.length) {
    lines.push('Inga trådar korsade. Inget har ändrats i det du bad oss vakta.');
    lines.push(receipt);
    return lines.join('\n');
  }

  lines.push(brief.alerts.length + ' av dina trådar korsades. Hårdaste avvikelsen först.');
  lines.push('');
  for (const a of brief.alerts) {
    const label = METRIC_LABEL[a.metric] || a.metric;
    const head = a.holding_name + (a.note ? ' · ' + a.note : '');
    lines.push(head);
    lines.push(
      '  ' + label + ' ' + fmtVal(a.observed, a.unit) + ' ' + (OP_WORD[a.op] || a.op) +
      ' din gräns ' + fmtVal(a.threshold, a.unit) + (a.period ? ' (' + a.period + ')' : '') + '.'
    );
    const src = fmtSource(a.source_ref);
    if (src) lines.push('  ' + src + '.');
    if (a.lesson_ids && a.lesson_ids.length) {
      const l = a.lesson_ids[0];
      lines.push('  Läs: ' + l + ' ' + title(l));
    }
    lines.push('');
  }
  lines.push(receipt);
  return lines.join('\n');
}

// ── CLI ──────────────────────────────────────────────────────────────────

function loadLessonTitles() {
  try {
    const url = new URL('../../content/fundamental-aktieanalys/course.json', import.meta.url);
    const j = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
    const map = {};
    for (const k of j.kapitel || []) for (const l of k.lektioner || []) map[String(l.lektion)] = l.titel;
    return (id) => map[id];
  } catch (e) {
    return () => undefined;
  }
}

function main(argv) {
  const args = argv.slice(2);
  const wantJson = args.includes('--json');
  const path = args.find((a) => !a.startsWith('--')) ||
    fileURLToPath(new URL('./exempel-underlag.json', import.meta.url));
  const input = JSON.parse(readFileSync(path, 'utf8'));
  const brief = buildBrief(input);
  if (wantJson) {
    process.stdout.write(JSON.stringify(brief, null, 2) + '\n');
  } else {
    process.stdout.write(renderBrief(brief, loadLessonTitles()) + '\n');
  }
}

// Windows-säker huvudmodulkoll (samma mönster som repots övriga CLI:er).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main(process.argv);
}
