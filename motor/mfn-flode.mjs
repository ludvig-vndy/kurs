// MFN:s entitetsflöde, läst så att varje artikel bär sin egen tidpunkt.
//
// FELET DETTA RÄTTAR. Motorn plockade bara ut länkarna och stämplade varje
// dokument med körningsdagen. Ett bolag som just lagts till hade trettio
// artiklar i flödet, motorn tog sex per natt, och presenterade dem som "i
// natt". Sebastian fick Sanionas delårsrapport för tredje kvartalet 2025 i
// morgonbrevet den 2 september 2026, och fyra nätter till av samma sort låg på
// kö. Arkivet i KV visade mönstret exakt: sex nya poster per bolag och
// körning, varje körning, oavsett om något hänt.
//
// Två spärrar, avsiktligt oberoende av varandra:
//
//   1. BASLINJEN. Första gången ett bolag ses arkiveras hela flödet utan att
//      något rapporteras. Det tar bort backloggen även om datumen skulle
//      sluta gå att läsa.
//   2. FÄRSKHETEN. Bara det som publicerats efter förra körningen hamnar i
//      brevet. Resten arkiveras tyst. Det fångar när MFN efterhandslistar en
//      gammal artikel i ett flöde vi redan följer.
//
// Tiderna i flödet är svensk lokaltid. Gränsen räknas därför om till samma
// zon, annars uppstår ett par timmars blint fönster där färska
// pressmeddelanden tappas.

const LANK = '((?:https://mfn\\.se)?/(?:[a-z]+/)?a/[a-z0-9-]+/[^"/]+)';
const DATUM = '<span class="compressed-date">\\s*(\\d{4}-\\d{2}-\\d{2})\\s*</span>\\s*' +
  '<span class="compressed-time">\\s*(\\d{2}:\\d{2}(?::\\d{2})?)\\s*</span>';

export const TAK = 8;
export const STANDARD_DYGN = 2;
export const MAX_DYGN = 7;

/* Flödet i dokumentordning: datumspannen och länkarna läses i ett svep, och
   varje länk ärver det datum som senast passerade. Att para ihop dem på
   position i stället för på markupstruktur gör läsningen tålig mot att MFN
   flyttar om taggarna runt omkring. */
export function lasFlode(html) {
  const re = new RegExp(DATUM + '|href="' + LANK + '"', 'g');
  const poster = [];
  const sedda = new Set();
  let datum = null, tid = null, m;
  while ((m = re.exec(String(html || ''))) !== null) {
    if (m[1]) { datum = m[1]; tid = m[2].length === 5 ? m[2] + ':00' : m[2]; continue; }
    const url = m[3].startsWith('http') ? m[3] : 'https://mfn.se' + m[3];
    if (sedda.has(url)) continue;
    sedda.add(url);
    poster.push({ url, datum, tid: datum ? tid : null, publicerad: datum ? datum + 'T' + tid : null });
  }
  return poster;
}

/** Samma ögonblick uttryckt i svensk lokaltid, "YYYY-MM-DDTHH:MM:SS". */
function svensk(d) {
  return d.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', hour12: false })
    .replace(' ', 'T');
}

/* Gränsen för vad som räknas som nytt. Förra körningen är det ärliga svaret på
   "sedan sist", men den golvas: ligger jobbet nere en månad ska brevet inte
   tömma en månads flöde på en gång. */
export function farskGrans(nu, forra, { standardDygn = STANDARD_DYGN, maxDygn = MAX_DYGN } = {}) {
  const t = new Date(nu).getTime();
  const golv = t - maxDygn * 864e5;
  const f = forra ? new Date(forra).getTime() : NaN;
  if (!isFinite(f)) return svensk(new Date(t - standardDygn * 864e5));
  return svensk(new Date(Math.max(f, golv)));
}

/* Delar flödet i det som ska bli brev och det som bara ska bli minne.
   `sedda` är bolagets arkivpost, alltså url -> datum för det redan lästa. */
export function delaUppFlodet(poster, sedda, grans, { tak = TAK } = {}) {
  const kant = sedda || {};
  const forstaGangen = !Object.keys(kant).some(k => k.startsWith('http'));
  const nya = poster.filter(p => !kant[p.url]);
  if (forstaGangen) return { forstaGangen, rapportera: [], baraArkivera: nya };

  // Ett okänt datum är ett "vet inte", och ett vet-inte ska synas hellre än
  // tystas: baslinjen ovan är det som skyddar mot backloggen, inte datumet.
  const farsk = p => !p.publicerad || p.publicerad > grans;
  const rapportera = nya.filter(farsk).slice(0, tak);
  const kvar = new Set(rapportera.map(p => p.url));
  return { forstaGangen, rapportera, baraArkivera: nya.filter(p => !kvar.has(p.url)) };
}
