/* motor/vigilans/lektionskarta.mjs
   Den dubbelriktade kurskopplingen (plan 2026-07-11, avsnitt 9.1) som ren
   statisk data. Ingen API, ingen datakälla. Grundad i de faktiska 18 kapitlen
   (content/fundamental-aktieanalys/course.json). Testet
   tools/__tests__/lektionskarta.test.mjs verifierar att varje lektions-id här
   faktiskt finns i kursen, så mappningen inte kan driva ifrån innehållet.

   Riktning 1  metrik/händelse -> lektion: när en tråd larmar pekar vi på exakt
               den lektion som förklarar mekaniken (larmet blir ett lärtillfälle
               i det ögonblick det känns i den egna plånboken).
   Riktning 2  lektion -> handling: efter ett kapitel föreslår vi en konkret
               handling på ett riktigt innehav (checklista eller tråd-mall), så
               kursen blir arbetsverktyg, inte passiv video. */

// ── Riktning 1: metrik/händelsetyp -> lektions-id (primär först) ──────────
export const METRIC_TILL_LEKTION = {
  gross_margin:         ['4.4', '5.1'], // vinstkvalitet/varningslampor, marginaler och ROIC
  revenue_growth:       ['5.2', '12.3'], // tillväxt & rätt användning, tillväxtkvalitet
  net_debt:             ['4.2'],         // balansräkningen
  cash_runway:          ['12.5'],        // kassa, burn och finansieringsrisk
  dilution:             ['17.3'],        // kallelsen och utspädningen
  contract:             ['17.2', '17.4'], // avtalsspråket, löftesliggaren
  valuation:            ['9.1', '10.2'], // multiplar och deras fällor, säkerhetsmarginal
  roic:                 ['5.3'],         // ROIC i djupet
  moat_erosion:         ['6.2'],         // bedöma och se moaten i siffrorna
  insider_sell:         ['7.1'],         // att bedöma en ledning
  goodwill:             ['4.5'],         // goodwill och eget kapital
  cash_quality:         ['4.3', '4.4'],  // kassaflödet, vinstkvalitet
  guidance:             ['3.2'],         // läsa mellan raderna
  parabolic:            ['18.3'],        // den paraboliska uppgången
  behavior_sell_winner: ['18.1', '11.1'], // girigheten kostar, flock/rädsla/girighet
  concentration:        ['11.4'],        // system: position sizing och ödmjukhet
};

// ── Riktning 2: lektions-id -> föreslagen handling på ett riktigt innehav ──
// typ 'trad'      = föreslå en tråd-mall (metric ger vad som ska bevakas)
// typ 'checklista' = föreslå en genomgång/checklista på ett innehav
export const LEKTION_TILL_HANDLING = {
  '2.1':  { typ: 'checklista', text: 'Beskriv affärsmodellen för ett av dina innehav i en mening.' },
  '3.2':  { typ: 'checklista', text: 'Läs mellan raderna i den senaste rapporten för ett innehav.' },
  '4.1':  { typ: 'checklista', text: 'Gå igenom resultaträkningen i ett av dina innehav.' },
  '4.2':  { typ: 'trad', metric: 'net_debt', text: 'Sätt ett nettoskuldstak på ett innehav.' },
  '4.3':  { typ: 'checklista', text: 'Stäm av vinsten mot kassaflödet i ett innehav.' },
  '4.4':  { typ: 'trad', metric: 'gross_margin', text: 'Sätt ett marginalgolv på ett innehav.' },
  '5.1':  { typ: 'trad', metric: 'roic', text: 'Sätt ett ROIC-golv på ett innehav.' },
  '5.3':  { typ: 'trad', metric: 'roic', text: 'Jämför ROIC mot kapitalkostnaden i ett innehav.' },
  '6.2':  { typ: 'checklista', text: 'Kör moat-checklistan på ett av dina innehav.' },
  '7.1':  { typ: 'trad', metric: 'insider_sell', text: 'Bevaka insiderförsäljning i ett innehav.' },
  '7.2':  { typ: 'checklista', text: 'Bedöm ledningens kapitalallokering i ett innehav.' },
  '9.5':  { typ: 'trad', metric: 'valuation', text: 'Sätt ett riktpris och ett värderingstak på ett innehav.' },
  '10.2': { typ: 'trad', metric: 'valuation', text: 'Sätt din säkerhetsmarginal mot riktpriset.' },
  '12.5': { typ: 'trad', metric: 'cash_runway', text: 'Bevaka kassa och runway i ett olönsamt innehav.' },
  '12.7': { typ: 'checklista', text: 'Värdera ett tillväxtinnehav i tre scenarier.' },
  '17.2': { typ: 'trad', metric: 'contract', text: 'Skilj ramavtal från bindande order i ett innehav.' },
  '17.3': { typ: 'trad', metric: 'dilution', text: 'Sätt ett utspädningstak på ett förhoppningsinnehav.' },
  '17.4': { typ: 'checklista', text: 'För in ledningens löften i löftesliggaren för ett innehav.' },
  '18.5': { typ: 'checklista', text: 'Sätt en trim-regel (säkra eller stretcha) för ett innehav.' },
};

// ── Hjälpare ──────────────────────────────────────────────────────────────
export function lektionerForMetric(metric) {
  return METRIC_TILL_LEKTION[metric] || [];
}
export function handlingForLektion(lektionId) {
  return LEKTION_TILL_HANDLING[lektionId] || null;
}
// Alla lektions-id som förekommer någonstans i mappningen (för test/validering).
export function allaLektionsIder() {
  const set = new Set();
  for (const ids of Object.values(METRIC_TILL_LEKTION)) ids.forEach((id) => set.add(id));
  for (const id of Object.keys(LEKTION_TILL_HANDLING)) set.add(id);
  return [...set];
}
