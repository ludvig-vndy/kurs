/* motor/vigilans/tripwire-eval.mjs
   Deterministisk trådmotor. Ingen datakälla, ingen LLM: ren jämförelse av en
   observerad periodsiffra mot en användarsatt tröskel. Detta är kärnan i
   "vi larmar bara när något du sa var viktigt ändrats". Källänken (source_ref)
   följer med varje händelse, aldrig en siffra utan spårbar källa.

   Metriken är avsiktligt öppen (text): motorn jämför vilken siffra som helst mot
   sin tröskel. Härledda mått (t.ex. runway = kassa / burn) beräknas uppströms
   och matas in som en vanlig siffra, så motorn förblir ren och testbar. */

export const OPS = ['below', 'above', 'crosses'];

/* Jämför EN tråd mot senaste (och vid 'crosses' även föregående) siffra för
   samma metrik. Returnerar en händelse om tröskeln korsats, annars null. */
export function evaluateTripwire(tripwire, current, previous) {
  if (!tripwire || !current || current.value == null) return null;
  if (tripwire.status && tripwire.status !== 'armed') return null;
  const threshold = Number(tripwire.value);
  const now = Number(current.value);
  if (Number.isNaN(threshold) || Number.isNaN(now)) return null;

  let tripped = false;
  if (tripwire.op === 'below') {
    tripped = now < threshold;
  } else if (tripwire.op === 'above') {
    tripped = now > threshold;
  } else if (tripwire.op === 'crosses') {
    if (!previous || previous.value == null) return null; // korsning kräver två punkter
    const before = Number(previous.value);
    if (Number.isNaN(before)) return null;
    // Föregående och nuvarande på var sin sida om tröskeln (åt endera hållet).
    tripped = (before < threshold && now >= threshold) || (before > threshold && now <= threshold);
  } else {
    return null; // okänd operator
  }
  if (!tripped) return null;

  return {
    tripwire_id: tripwire.id || null,
    metric: tripwire.metric,
    op: tripwire.op,
    threshold: threshold,
    observed: now,
    unit: tripwire.unit || current.unit || null,
    period: current.period || null,
    source_ref: current.source_ref || null,
    note: tripwire.note || null,
  };
}

/* Utvärdera alla trådar för ett innehav.
   figures/prev: { <metric>: { value, unit?, period?, source_ref? } }
   Returnerar korsningarna, hårdaste avvikelsen först (risk-först i brevet). */
export function evaluateHolding(tripwires, figures, prev) {
  const events = [];
  for (const tw of tripwires || []) {
    const cur = figures ? figures[tw.metric] : null;
    const pre = prev ? prev[tw.metric] : null;
    const ev = evaluateTripwire(tw, cur, pre);
    if (ev) events.push(ev);
  }
  events.sort((a, b) => severity(b) - severity(a));
  return events;
}

/* Relativ allvarlighet: hur långt förbi tröskeln, normaliserat mot tröskeln.
   Enkelt men deterministiskt, styr bara sorteringen (risk-först). */
export function severity(ev) {
  if (!ev) return 0;
  if (!ev.threshold) return Math.abs(ev.observed || 0);
  return Math.abs((ev.observed - ev.threshold) / ev.threshold);
}

/* Bygg dagens brev-nyttolast för en användare från alla innehavs händelser.
   Inga händelser -> tyst morgon (status 'silent'). Kvittologgen ('checked')
   speglar vad som skannats även lugna dagar. Rendering/copy sker någon
   annanstans; här är bara den deterministiska strukturen. */
export function buildBriefPayload(eventsByHolding, checked) {
  const alerts = [];
  for (const holdingId of Object.keys(eventsByHolding || {})) {
    for (const ev of eventsByHolding[holdingId]) {
      alerts.push({ holding_id: holdingId, ...ev });
    }
  }
  alerts.sort((a, b) => severity(b) - severity(a));
  return {
    status: alerts.length ? 'alerts' : 'silent',
    alerts,
    checked: checked || { reports: 0, filings: 0, insiders: 0 },
  };
}
