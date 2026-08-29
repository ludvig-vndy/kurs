/* Utvinning av lektionsmaterial for Saljcoachens korpus.

   Detta ar INTE samma sak som stegProsa i tools/motparten-rosttext.mjs, och de tva far
   inte slas ihop. stegProsa ar gjord for rostgranskning och tappar 12 procent av
   materialet: visualtexten (15 594 tecken i 25 steg), evidensnoteringarna (5 299 tecken i
   36 steg) och myt-stegens pastaende (4 steg). For rostgranskning ar det ratt. For en
   coach ar det systematisk bias mot just det som gor kursen battre an en generell modell:
   operationaliseringarna forsvinner och reservationerna forsvinner, teserna blir kvar.
   Se docs/superpowers/specs/2026-08-29-saljcoachen-design.md, avsnitt 0 och 3.

   Sanningsprincipen: korpusen innehaller bara material som i sig ar sant, eller som ar
   uttryckligen markt som myt, invandning eller felaktigt exempel. Quizens `alternativ`
   ar formulerade felaktigheter utan facit i texten och tas darfor aldrig med. */

/** Ett steg som etiketterat block. Ordningen ar: rubrik, prosa, myt, takeaway,
    upprakning, figurtext, evidens, quiz. Etiketterna ar versaler sa en modell kan
    skilja dem fran brodtext. */
function stegBlock(s) {
  const rader = [];
  const rubrik = s.typ === 'quiz' ? 'QUIZ' : [s.kicker, s.titel].filter(Boolean).join(': ');
  rader.push(`### ${rubrik || 'Steg'}   [${s.typ}]`);

  for (const t of [s.ingress, s.lead, s.forklaring, s.slutsats]) if (t) rader.push(t);
  for (const t of s.brodtext ?? []) rader.push(t);

  if (s.pastaende) {
    rader.push(`MYT-PÅSTÅENDE (falskt, får aldrig upprepas som sant): ${s.pastaende}`);
  }
  if (s.varifran) rader.push(`VARIFRÅN: ${s.varifran}`);
  if (s.vad_som_galler) rader.push(`VAD SOM GÄLLER: ${s.vad_som_galler}`);
  if (s.typ === 'myt' && s.kalla) rader.push(`KÄLLA: ${s.kalla}`);

  if (s.takeaway) rader.push(`TAKEAWAY: ${s.takeaway}`);

  const el = s.visual?.element ?? [];
  if (el.length) {
    rader.push('UPPRÄKNING:');
    for (const e of el) rader.push(`- ${e.rubrik}: ${e.text}`);
  }
  if (s.visual?.figurtext) rader.push(`FIGURTEXT: ${s.visual.figurtext}`);

  if (s.evidens) {
    const { niva, kalla, notering } = s.evidens;
    const huvud = `EVIDENS nivå ${niva}${kalla ? `, källa ${kalla}` : ''}`;
    rader.push(notering ? `${huvud}: ${notering}` : huvud);
  }

  // Endast fraga och forklaring. `alternativ` innehaller distraktorer, se ovan.
  for (const f of s.fragor ?? []) {
    rader.push(`FRÅGA: ${f.fraga}`);
    if (f.forklaring) rader.push(`VARFÖR: ${f.forklaring}`);
  }

  return rader.join('\n');
}

/** Hela lektionen som text for steg 2 i coachen. */
export function lektionsMaterial(d, kapitelTitel) {
  const huvud = [
    `## ${d.lektion} ${d.titel}`,
    `Kapitel ${d.kapitel}, ${kapitelTitel} · Färdighet: ${d.fardighet}`,
  ];
  if (d.mal) huvud.push(`Mål: ${d.mal}`);
  return [huvud.join('\n'), ...d.steg.map(stegBlock)].join('\n\n');
}

/** En rad i registret som steg 1 routar ur. Far aldrig innehalla radbrytning. */
export function registerRad(d) {
  const mal = (d.mal ?? '').replace(/\s+/g, ' ').trim();
  return `${d.lektion} | ${d.titel} | ${d.fardighet} | ${mal}`;
}
