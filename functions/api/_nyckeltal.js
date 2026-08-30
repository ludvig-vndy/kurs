/* functions/api/_nyckeltal.js  -  nyckeltal per period, och det som gar att
   harleda ur dem. Allt i kod, inget modellanrop.

   Bakgrunden: en pilot fragade "vad har Saniona i kassan och hur ser burn raten
   ut". Kassan kunde assistenten svara pa, burn raten inte, for den kraver en
   subtraktion och en division, och modellen far inte rakna. Det ar ratt regel.
   Men slutsatsen "da kan vi inte svara" ar fel: rakningen ska goras i KOD, dar
   den ar deterministisk och gar att prova, och modellen ska bara lasa upp
   resultatet. Samma delning som i motorns compute-steg.

   Att det inte gar att lata modellen rakna sjalv syns i just det har fallet.
   Saniona skriver "Likvida medel 486,3 MSEK (308,2)", dar parentesen ar samma
   kvartal FORRA aret, inte forra kvartalet. En modell som ser ett par tal och
   ombeds rakna burn rate ur dem far 59 MSEK i manaden. Ratt svar, med Q1:s 532,0
   MSEK ur en annan rapport, ar ungefar 15. Fyra ganger fel, sagt med samma lugna
   sjalvsakerhet.

   Inga beroenden har, sa allt gar att prova med node --test. */

/* Metriker vi kan lasa ut. Nyckeln ar det vi kallar det, monstret ar hur bolagen
   skriver det. Listan ar avsiktligt kort: hellre fa tal som stammer an manga som
   nastan stammer. */
const METRIKER = [
  { id: 'likvida medel', re: /(?:kassa och likvida medel|likvida medel|cash and cash equivalents)[^0-9\-]{0,24}(-?\d[\d  ]*(?:,\d+)?)\s*(MSEK|MKR|MEUR|MUSD|SEK ?m)/i },
  { id: 'intäkter', re: /(?:intäkterna uppgick till|nettoomsättningen uppgick till)[^0-9\-]{0,12}(-?\d[\d  ]*(?:,\d+)?)\s*(MSEK|MKR|MEUR|MUSD)/i },
  { id: 'rörelseresultat', re: /rörelseresultat(?:et)? uppgick till[^0-9\-]{0,12}(-?\d[\d  ]*(?:,\d+)?)\s*(MSEK|MKR|MEUR|MUSD)/i },
];

const KVARTALSORD = [
  [/(?:första kvartalet|first quarter|\bQ1\b)/i, 1],
  [/(?:andra kvartalet|second quarter|\bQ2\b)/i, 2],
  [/(?:tredje kvartalet|third quarter|\bQ3\b)/i, 3],
  [/(?:fjärde kvartalet|fourth quarter|\bQ4\b|bokslutskommuniké|year-end report)/i, 4],
];

/** Period ur en rapportrubrik: {ar, kvartal} eller null. Rubriken ar sakrare an
    brodtexten, som ar full av jamforelsetal fran andra perioder. */
export function periodFor(rubrik) {
  const t = String(rubrik || '');
  const ar = (t.match(/\b(20\d{2})\b/) || [])[1];
  if (!ar) return null;
  for (const [re, k] of KVARTALSORD) if (re.test(t)) return { ar: Number(ar), kvartal: k };
  return null;
}

function tolkaTal(rå) {
  const n = parseFloat(String(rå).replace(/[  ]/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

/** Alla nyckeltal vi kan lasa ur ett bolagsarkiv, ett per metrik och period.
    Nyaste rapporten vinner nar samma period finns i flera dokument (svensk och
    engelsk version av samma rapport). */
export function extraheraNyckeltal(bolagsarkiv) {
  const funna = new Map(); // "metrik|ar|kvartal" -> post
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      const period = periodFor(dok.rubrik);
      if (!period) continue;
      const text = (dok.bitar || []).join(' ');
      for (const m of METRIKER) {
        const träff = text.match(m.re);
        if (!träff) continue;
        const varde = tolkaTal(träff[1]);
        if (varde === null) continue;
        const nyckel = `${m.id}|${period.ar}|${period.kvartal}`;
        if (funna.has(nyckel)) continue;
        funna.set(nyckel, {
          metrik: m.id, ar: period.ar, kvartal: period.kvartal,
          varde, enhet: träff[2].toUpperCase(),
          rubrik: dok.rubrik, url: dok.url, bolag: ark.namn,
        });
      }
    }
  }
  return [...funna.values()].sort((a, b) => (b.ar - a.ar) || (b.kvartal - a.kvartal));
}

/** Harledningar ur tva narliggande perioder av samma metrik. Bara mellan
    kvartal som faktiskt foljer pa varandra: ett hopp over ett kvartal gor
    "per manad" missvisande, och da sager vi hellre ingenting. */
export function harled(nyckeltal) {
  const ut = [];
  const perMetrik = new Map();
  for (const n of nyckeltal) {
    if (!perMetrik.has(n.metrik)) perMetrik.set(n.metrik, []);
    perMetrik.get(n.metrik).push(n);
  }
  for (const [metrik, lista] of perMetrik) {
    for (let i = 0; i + 1 < lista.length; i++) {
      const senare = lista[i], tidigare = lista[i + 1];
      if (senare.enhet !== tidigare.enhet) continue;
      const stegKvartal = (senare.ar - tidigare.ar) * 4 + (senare.kvartal - tidigare.kvartal);
      if (stegKvartal !== 1) continue;
      const forandring = Math.round((senare.varde - tidigare.varde) * 10) / 10;
      const post = {
        metrik, enhet: senare.enhet,
        fran: `Q${tidigare.kvartal} ${tidigare.ar}`, till: `Q${senare.kvartal} ${senare.ar}`,
        franVarde: tidigare.varde, tillVarde: senare.varde, forandring,
        kallor: [tidigare.rubrik, senare.rubrik],
      };
      if (metrik === 'likvida medel' && forandring < 0) {
        post.perManad = Math.round((Math.abs(forandring) / 3) * 10) / 10;
        // Runway foljer sa naturligt pa en burn rate att modellen raknar ut den
        // sjalv om vi inte gor det. Forsta skarpa korningen blockerades pa
        // precis det: svaret bar ett "32" som inte fanns nagonstans. Alltsa
        // raknar vi den har i stallet, med antagandet utskrivet.
        if (post.perManad > 0) post.manaderKvar = Math.round(post.tillVarde / post.perManad);
      }
      // Radet som visas for lasaren: exakt hur talet uppstod, med bada
      // ingangstalen och deras perioder. Ett harlett tal utan sin uträkning ar
      // bara ett pastaende, och det ar precis det vi inte vill leverera.
      const n = (v) => String(v).replace('.', ',');
      post.formel = post.perManad != null
        ? `${n(post.franVarde)} ${post.enhet} i ${post.fran} minus ${n(post.tillVarde)} i ${post.till} ger ${n(Math.abs(post.forandring))}, delat pa kvartalets 3 manader ger ${n(post.perManad)} ${post.enhet} per manad` +
          (post.manaderKvar != null
            ? `. Kassan ${n(post.tillVarde)} delat pa ${n(post.perManad)} ger ${post.manaderKvar} manader, OM takten haller i sig, vilket den sallan gor`
            : '')
        : `${n(post.tillVarde)} ${post.enhet} i ${post.till} minus ${n(post.franVarde)} i ${post.fran} ger ${n(post.forandring)}`;
      ut.push(post);
      break; // bara det senaste steget per metrik, det ar det som fragas om
    }
  }
  return ut;
}

/** Nyckeltalen och harledningarna som text till modellen, plus alla tal som
    kallgrinden ska slappa igenom. Tom text = ingenting att saga. */
export function nyckeltalsUnderlag(bolagsarkiv) {
  const tal = extraheraNyckeltal(bolagsarkiv);
  if (!tal.length) return { text: '', tillatnaTal: [], harledda: [] };
  const harledda = harled(tal);

  const rader = tal.slice(0, 12).map((n) =>
    `${n.bolag}, ${n.metrik}, Q${n.kvartal} ${n.ar}: ${String(n.varde).replace('.', ',')} ${n.enhet} (${n.rubrik})`
  );
  const hRader = harledda.map((h) => {
    const riktning = h.forandring < 0 ? 'minskade' : 'okade';
    const bas = `${h.metrik} ${riktning} fran ${String(h.franVarde).replace('.', ',')} till ${String(h.tillVarde).replace('.', ',')} ${h.enhet} mellan ${h.fran} och ${h.till}, en forandring pa ${String(h.forandring).replace('.', ',')} ${h.enhet}`;
    if (h.perManad == null) return `${bas}.`;
    let rad = `${bas}. Det motsvarar ${String(h.perManad).replace('.', ',')} ${h.enhet} per manad over kvartalets tre manader (burn rate).`;
    if (h.manaderKvar != null) {
      rad += ` Med samma takt racker kassan ${h.manaderKvar} manader. Skriv alltid ut att det forutsatter oforandrad takt.`;
    }
    return rad;
  });

  const text =
    'NYCKELTAL, utlasta ur rapporterna:\n' + rader.join('\n') +
    (hRader.length ? '\n\nHARLETT, redan uträknat åt dig i kod. Använd dessa tal ordagrant, räkna aldrig om dem:\n' + hRader.join('\n') : '');

  const tillatnaTal = [];
  for (const n of tal) { tillatnaTal.push(n.varde, n.ar, n.kvartal); }
  for (const h of harledda) {
    tillatnaTal.push(h.franVarde, h.tillVarde, h.forandring);
    if (h.perManad != null) tillatnaTal.push(h.perManad);
    if (h.manaderKvar != null) tillatnaTal.push(h.manaderKvar);
  }
  return {
    text,
    tillatnaTal: tillatnaTal.map((v) => Math.abs(v)),
    // Skickas vidare till klienten sa uträkningen kan visas under svaret.
    harledda: harledda.map((h) => ({ metrik: h.metrik, formel: h.formel, kallor: h.kallor })),
  };
}
