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

   Forsta versionen traffade 1 bolag av 15. Matningen visade tre orsaker:
     1. Perioden star sallan som "andra kvartalet". Den star som "januari-juni",
        "January-September", eller inte alls i rubriken utan bara i brodtexten.
     2. Talen bar tusentalsavgransare med VANLIGT mellanslag ("27 489"), och
        jamforelsetalet star mellan talet och enheten ("606,3 (521,7) MSEK").
     3. Bolagen skriver samma sak pa flera satt: "nettoomsattningen uppgick
        till", "nettoomsattning uppgick till", "nettoomsattningen okade med
        9,0% till".

   En fjarde sak foll ut av matningen och ar viktigare an de tre: BALANSPOSTER
   och FLODESPOSTER far inte jamforas pa samma satt. Likvida medel ar ett varde
   vid en tidpunkt, sa "januari-juni" betyder saldot den 30 juni och gar att
   stalla mot saldot den 31 mars. Intakter ar ett flode over en period, och
   "januari-juni" mot "januari-mars" ar da tva olika langa perioder. Att dra dem
   fran varandra som om de vore jamforbara ger nonsens, sa det gors inte.

   Tacker vi inte ett bolag sager assistenten att siffrorna inte framgar. Det ar
   ett korrekt svar och inte ett fel: hellre tystnad an ett tal vi inte kan sta
   for. Den dagen fundamenta kommer fran en licensierad kalla ersatter den har
   filen sig sjalv, och tackningen blir fullstandig i stallet for uppmatt.

   Inga beroenden har, sa allt gar att prova med node --test. */

// Tusentalsavgransare: vanligt mellanslag, hart mellanslag och smalt hart
// mellanslag. Det vanliga saknades i forsta versionen, och "27 489" lastes da
// som 27. Enhetsankaret nedan raddade oss fran att faktiskt SVARA 27, men det
// var tur, inte design.
const MELLANSLAG = '[ \\u00a0\\u202f]';
const TAL = `(-?\\d{1,3}(?:${MELLANSLAG}\\d{3})+(?:,\\d+)?|-?\\d+(?:,\\d+)?)`;
// Jamforelsetalet star ofta mellan talet och enheten: "606,3 (521,7) MSEK".
const PARENTES = '(?:\\s*\\([^)]{0,40}\\))?';
const ENHET = '(MSEK|MKR|MNKR|MEUR|MUSD|miljoner euro|miljoner kronor)';

function matt(fore) {
  return new RegExp(`(?:${fore})[^0-9\\-]{0,24}${TAL}${PARENTES}\\s*${ENHET}`, 'i');
}

/* Metriker vi kan lasa ut.
   typ 'balans' = varde vid en tidpunkt, jamforbart over olika langa perioder.
   typ 'flode'  = varde over en period, bara jamforbart mot lika lang period. */
const METRIKER = [
  { id: 'likvida medel', typ: 'balans',
    re: matt('kassa och likvida medel|likvida medel|cash and cash equivalents') },
  { id: 'intäkter', typ: 'flode',
    re: matt('intäkterna uppgick till|nettoomsättningen uppgick till|nettoomsättning uppgick till|omsättningen uppgick till|nettoomsättningen ökade med[^0-9]{0,6}[\\d,]+\\s*%?\\s*till') },
  { id: 'rörelseresultat', typ: 'flode',
    re: matt('rörelseresultatet uppgick till|rörelseresultat uppgick till') },
];

// mkr och msek ar samma sak (miljoner kronor). Normaliseras sa att tva rapporter
// som skriver olika anda gar att jamfora.
function normEnhet(rå) {
  const e = String(rå).toUpperCase();
  if (e === 'MKR' || e === 'MNKR' || e === 'MILJONER KRONOR') return 'MSEK';
  if (e === 'MILJONER EURO') return 'MEUR';
  return e;
}

const KVARTALSORD = [
  [/(?:första kvartalet|first quarter|\bQ1\b)/i, 1],
  [/(?:andra kvartalet|second quarter|\bQ2\b)/i, 2],
  [/(?:tredje kvartalet|third quarter|\bQ3\b)/i, 3],
  [/(?:fjärde kvartalet|fourth quarter|\bQ4\b|bokslutskommuniké|year-end report)/i, 4],
];

// "januari-juni 2026" och "January-September 2025": perioden loper fran arets
// borjan, sa slutmanaden ger bade slutkvartalet och periodens langd.
const MANADSSLUT = [
  [/januari\s*[-–till ]{1,6}\s*mars|january\s*[-–to ]{1,6}\s*march/i, 1],
  [/januari\s*[-–till ]{1,6}\s*juni|january\s*[-–to ]{1,6}\s*june/i, 2],
  [/januari\s*[-–till ]{1,6}\s*september|january\s*[-–to ]{1,6}\s*september/i, 3],
  [/januari\s*[-–till ]{1,6}\s*december|january\s*[-–to ]{1,6}\s*december/i, 4],
];

/** Period ur en rapportrubrik, och som sista utvag ur brodtextens forsta rader.
    Returnerar { ar, kvartal, langd } dar kvartal ar periodens SLUTKVARTAL och
    langd ar antalet kvartal perioden omfattar. null om det inte gar att avgora,
    och da anvands dokumentet inte alls: en siffra utan period ar oanvandbar. */
export function periodFor(rubrik, text) {
  for (const kalla of [String(rubrik || ''), String(text || '').slice(0, 400)]) {
    const ar = (kalla.match(/\b(20\d{2})\b/) || [])[1];
    if (!ar) continue;
    for (const [re, slut] of MANADSSLUT) {
      if (re.test(kalla)) return { ar: Number(ar), kvartal: slut, langd: slut };
    }
    for (const [re, k] of KVARTALSORD) {
      if (re.test(kalla)) return { ar: Number(ar), kvartal: k, langd: 1 };
    }
  }
  return null;
}

function tolkaTal(rå) {
  const n = parseFloat(String(rå).replace(/[   ]/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

/* Faltnamn ur PDF-extraktionen (motor/faltlistor.mjs) till metrik har.
   Likvida medel star sallan i pressmeddelandet: Unibaps Q2 2026 anger omsattning
   och rorelseresultat men namner varken kassa eller kassaflode, de star pa sidan
   10 i rapport-PDF:en. Sedan 2026-08-31 lases den PDF:en, och resultatet ligger
   som fakta pa dokumentet med citat och en grind som kraver att talet star i sitt
   citat. Det ar ett starkare belagg an en textmatchning, sa fakta gar fore. */
const FRAN_FAKTA = {
  kassa: { id: 'likvida medel', typ: 'balans' },
  omsattning: { id: 'intäkter', typ: 'flode' },
  rorelseresultat: { id: 'rörelseresultat', typ: 'flode' },
};

/* Rapporterna skriver samma belopp i olika skala. Allt normaliseras till MSEK,
   for harled() jamfor bara poster med samma enhet och skulle annars tiga. */
function normaliseraFakta(nu, rå) {
  if (typeof nu !== 'number' || Number.isNaN(nu)) return null;
  const e = String(rå || '').toUpperCase().replace(/\s+/g, '');
  if (e === 'KSEK' || e === 'TSEK' || e === 'TKR') return { varde: Math.round(nu) / 1000, enhet: 'MSEK' };
  if (e === 'SEK' || e === 'KR') return { varde: Math.round(nu / 1000) / 1000, enhet: 'MSEK' };
  const norm = normEnhet(e);
  if (norm === 'MSEK' || norm === 'MEUR' || norm === 'MUSD') return { varde: nu, enhet: norm };
  return null;   // okand enhet: hellre tyst an fel skala
}

/** Alla nyckeltal vi kan lasa ur ett bolagsarkiv, ett per metrik och period. */
export function extraheraNyckeltal(bolagsarkiv) {
  const funna = new Map(); // "metrik|ar|kvartal|langd" -> post

  // Pass 1: belagda fakta ur rapport-PDF:erna. Egen slinga over hela arkivet, sa
  // att de vinner over regexen aven nar regexdokumentet ligger forst.
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      if (!dok.fakta) continue;
      const period = periodFor(dok.rubrik, (dok.bitar || []).join(' '));
      if (!period) continue;
      for (const [faltId, m] of Object.entries(FRAN_FAKTA)) {
        const f = dok.fakta[faltId];
        if (!f) continue;
        const norm = normaliseraFakta(f.nu, f.enhet);
        if (!norm) continue;
        const nyckel = `${m.id}|${period.ar}|${period.kvartal}|${period.langd}`;
        if (funna.has(nyckel)) continue;
        funna.set(nyckel, {
          metrik: m.id, typ: m.typ,
          ar: period.ar, kvartal: period.kvartal, langd: period.langd,
          varde: norm.varde, enhet: norm.enhet,
          rubrik: dok.rubrik, url: dok.url, bolag: ark.namn,
        });
      }
    }
  }

  // Pass 2: regexen over pressmeddelandets text, fyller det fakta inte tackte.
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      const text = (dok.bitar || []).join(' ');
      const period = periodFor(dok.rubrik, text);
      if (!period) continue;
      for (const m of METRIKER) {
        const träff = text.match(m.re);
        if (!träff) continue;
        const varde = tolkaTal(träff[1]);
        if (varde === null) continue;
        const nyckel = `${m.id}|${period.ar}|${period.kvartal}|${period.langd}`;
        if (funna.has(nyckel)) continue;
        funna.set(nyckel, {
          metrik: m.id, typ: m.typ,
          ar: period.ar, kvartal: period.kvartal, langd: period.langd,
          varde, enhet: normEnhet(träff[2]),
          rubrik: dok.rubrik, url: dok.url, bolag: ark.namn,
        });
      }
    }
  }
  return [...funna.values()].sort((a, b) => (b.ar - a.ar) || (b.kvartal - a.kvartal) || (a.langd - b.langd));
}

function etikett(n) {
  return n.langd === 1 ? `Q${n.kvartal} ${n.ar}` : `${n.langd} kvartal till och med Q${n.kvartal} ${n.ar}`;
}

function formel(post) {
  const n = (v) => String(v).replace('.', ',');
  if (post.perManad == null) {
    return `${n(post.tillVarde)} ${post.enhet} i ${post.till} minus ${n(post.franVarde)} i ${post.fran} ger ${n(post.forandring)}`;
  }
  let s = `${n(post.franVarde)} ${post.enhet} vid slutet av ${post.fran} minus ${n(post.tillVarde)} vid slutet av ${post.till} ger ${n(Math.abs(post.forandring))}, delat pa kvartalets 3 manader ger ${n(post.perManad)} ${post.enhet} per manad`;
  if (post.manaderKvar != null) {
    s += `. Kassan ${n(post.tillVarde)} delat pa ${n(post.perManad)} ger ${post.manaderKvar} manader, OM takten haller i sig, vilket den sallan gor`;
  }
  return s;
}

/** Harledningar ur tva narliggande perioder av samma metrik.
    Balansposter jamfors pa periodens slut, oavsett hur lang perioden var.
    Flodesposter jamfors bara mot en LIKA LANG period, annars ar talen inte
    jamforbara och vi sager hellre ingenting. */
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
      if (senare.typ === 'flode' && senare.langd !== tidigare.langd) continue;

      const forandring = Math.round((senare.varde - tidigare.varde) * 10) / 10;
      const post = {
        metrik, typ: senare.typ, enhet: senare.enhet,
        fran: etikett(tidigare), till: etikett(senare),
        franVarde: tidigare.varde, tillVarde: senare.varde, forandring,
        kallor: [tidigare.rubrik, senare.rubrik],
      };
      if (metrik === 'likvida medel' && forandring < 0) {
        post.perManad = Math.round((Math.abs(forandring) / 3) * 10) / 10;
        // Runway foljer sa naturligt pa en burn rate att modellen raknar ut den
        // sjalv om vi inte gor det. Forsta skarpa korningen blockerades pa
        // precis det: svaret bar ett "32" som inte fanns nagonstans.
        if (post.perManad > 0) post.manaderKvar = Math.round(post.tillVarde / post.perManad);
      }
      post.formel = formel(post);
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

  const rader = tal.slice(0, 14).map((n) =>
    `${n.bolag}, ${n.metrik}, ${etikett(n)}: ${String(n.varde).replace('.', ',')} ${n.enhet} (${n.rubrik})`
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
    (hRader.length ? '\n\nHARLETT, redan utraknat at dig i kod. Anvand dessa tal ordagrant, rakna aldrig om dem:\n' + hRader.join('\n') : '');

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
