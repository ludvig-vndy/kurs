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
import { jamforbara as fullstandigtJamforbara } from './_berakning.js';
import { formateraTal } from './_talformat.js';
import { arSidram } from './_kallgrind.js';

// Tusentalsavgransare: vanligt mellanslag, hart mellanslag och smalt hart
// mellanslag. Det vanliga saknades i forsta versionen, och "27 489" lastes da
// som 27. Enhetsankaret nedan raddade oss fran att faktiskt SVARA 27, men det
// var tur, inte design.
const MELLANSLAG = '[ \\u00a0\\u202f]';
const TAL = `([-\u2212]?\\d{1,3}(?:${MELLANSLAG}\\d{3})+(?:,\\d+)?|[-\u2212]?\\d+(?:,\\d+)?)`;
// Jamforelsetalet star ofta mellan talet och enheten: "606,3 (521,7) MSEK".
const PARENTES = '(?:\\s*\\([^)]{0,40}\\))?';
/* TUSENTALSENHETERNA MASTE MED. Ankaret kande bara miljonenheter, och smabolag
   redovisar i tusental: Unibap skriver "Nettoomsattningen uppgick till 6 969
   KSEK (4 268)" och var darfor helt osynlig for den har filen. Uppmatt pa 24
   riktiga rapporter fran de sex bevakade bolagen gav hela lagret EN harledning,
   och fyra av sex bolag noll. Smabolagssvansen ar dessutom precis den har
   produktens malgrupp, sa det var de bolag som betyder mest som saknades.

   Skalan raknas om i normaliseraFakta nedan, som redan kunde det for
   PDF-fakta. Utan omrakningen skulle 6 969 KSEK och 12,4 MSEK se ut som
   jamforbara tal, vilket vore varre an att inte lasa dem alls. */
const ENHET = '(KSEK|TSEK|TKR|KEUR|GSEK|MDSEK|MDKR|MSEK|MKR|MNKR|MEUR|MUSD|miljoner euro|miljoner kronor|miljarder kronor)';

function matt(fore) {
  return new RegExp(`(?:${fore})[^0-9\\-\u2212]{0,24}${TAL}${PARENTES}\\s*${ENHET}`, 'i');
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
    re: matt('rörelseresultatet uppgick till|rörelseresultat uppgick till|ebit uppgick till') },
  // Bruttoresultatet ar forutsattningen for bruttomarginalen, som var det
  // piloten faktiskt fragade om. Utan metriken kunde fragan inte besvaras hur
  // manga dokument vi an hamtade hem.
  { id: 'bruttoresultat', typ: 'flode',
    re: matt('bruttoresultatet uppgick till|bruttoresultat uppgick till|bruttovinsten uppgick till') },
  { id: 'ebitda', typ: 'flode',
    re: matt('ebitda uppgick till|rörelseresultat före av- och nedskrivningar uppgick till') },
  { id: 'eget kapital', typ: 'balans',
    re: matt('eget kapital uppgick till|det egna kapitalet uppgick till') },
  { id: 'kassaflöde från löpande verksamhet', typ: 'flode',
    re: matt('kassaflödet från den löpande verksamheten uppgick till|kassaflöde från den löpande verksamheten uppgick till') },
  { id: 'orderingång', typ: 'flode',
    re: matt('orderingången uppgick till|orderingång uppgick till') },
  /* ORDERVARDET, en PUNKTHANDELSE och inte ett periodmatt.

     Ett avrop i ett pressmeddelande hor inte till ett kvartal, det intraffade
     en viss dag. Det ar darfor slaget 'handelse', med dokumentets datum som
     period. Utan posten kunde boten visa bada avropen pa skarmen och anda inte
     lagga ihop dem, vilket var det forsta en pilot bad om: "tva avropsorders
     1,39 plus 1,2 miljoner euro, borde han inte bara kunna plussa?"

     Formuleringarna ar hamtade ur Unibaps egna releaser. Engelskan ar med for
     att MFN bar bada spraken for samma bolag. */
  { id: 'ordervärde', typ: 'handelse',
    re: matt('ordervärdet är|ordervärdet uppgår till|ordervärdet uppgick till|ordern är värd'
      + '|order om|avrop om|ett första avrop om|call-off order value is|order value is') },
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

const MANADER = {
  januari: 1, february: 2, februari: 2, mars: 3, march: 3, april: 4, maj: 5, may: 5,
  juni: 6, june: 6, juli: 7, july: 7, augusti: 8, august: 8, september: 9,
  oktober: 10, october: 10, november: 11, december: 12, january: 1,
};
const MANAD = '(?:' + Object.keys(MANADER).join('|') + ')';
const ARSTOKEN = '20\\d{2}(?:\\s*[/–—-]\\s*(?:20)?\\d{2})?';
const MANADSSPANN = new RegExp(
  `\\b(${MANAD})(?:\\s+(${ARSTOKEN}))?\\s*(?:[-–—]|till|to)\\s*(${MANAD})(?:\\s+(${ARSTOKEN}))?\\b`, 'i');
// Även ofullständiga/ogiltiga lokala perioder är avsnittsgränser. De får
// blockera rubrikens period, men får aldrig kompletteras med ett gissat år.
const KVARTALSTOKEN = '(?:Q\\d+|(?:första|andra|tredje|fjärde) kvartalet|(?:first|second|third|fourth) quarter|(?:bokslutskommuniké|year-end report)(?=\\s+20\\d{2}))';
const OKAND_PERIOD = `\\b(?:(?:första|andra) halvåret|H\\d+|helår(?:et)?|full year|(?:first|second) half(?: year)?|kvartal\\s+\\d+)(?![a-zåäö\\d])(?:\\s+${ARSTOKEN})?|\\b20\\d{2}-\\d{2}-\\d{2}\\s*[-–—]\\s*20\\d{2}-\\d{2}-\\d{2}\\b`;
const PERIODTOKEN = new RegExp(`${MANADSSPANN.source}|\\b${KVARTALSTOKEN}(?![a-zåäöé\\d])(?:\\s+(?:för\\s+)?${ARSTOKEN})?|${OKAND_PERIOD}`, 'gi');

// Behåll exakt samma index i källtexten, även med nästlade parenteser.
function utanParenteser(text) {
  let djup = 0;
  return String(text || '').replace(/[\s\S]/g, tecken => {
    if (tecken === '(') { djup++; return ' '; }
    if (tecken === ')') { djup = Math.max(0, djup - 1); return ' '; }
    return djup ? ' ' : tecken;
  });
}

function periodToken(token) {
  if (/\b20\d{2}\s*[/–—-]\s*(?:20)?\d{2}/.test(token)) return null;
  if (MANADSSPANN.test(token)) return periodUrSpann(token);
  const ar = token.match(/\b(20\d{2})$/)?.[1];
  if (!ar) return null;
  const kvartal = KVARTALSORD.find(([re]) => re.test(token))?.[1];
  return kvartal ? { ar: Number(ar), kvartal, langd: 1 } : null;
}

/** Ett manadsspann till { ar, kvartal, langd }, oavsett startmanad.
    "oktober - december 2023" ar ETT kvartal som slutar i Q4, inte helaret. */
export function periodUrSpann(str) {
  const m = String(str || '').match(MANADSSPANN);
  if (!m) return null;
  const fran = MANADER[m[1].toLowerCase()], till = MANADER[m[3].toLowerCase()];
  if (!/^20\d{2}$/.test(m[4] || '') || (m[2] && !/^20\d{2}$/.test(m[2]))) return null;
  const slutAr = Number(m[4]), startAr = Number(m[2] || m[4]);
  const manader = (slutAr - startAr) * 12 + till - fran + 1;
  if (manader <= 0) return null;
  if (fran % 3 !== 1 || till % 3 !== 0) return null;   // inte ett helt kvartalsspann
  return { ar: slutAr, kvartal: till / 3, langd: manader / 3 };
}

/* PERIODEN MASTE LASAS DAR TALET STAR, inte i rubriken.

   En bokslutskommunike innehaller BADA: forst kvartalet, sedan helaret. Unibaps
   for 2023 sager "Oktober - december 2023 ... Nettoomsattning 9 629 KSEK" och
   strax under "Januari - december 2023 ... Nettoomsattning 50 077 KSEK".
   Regexen tar forsta traffen, alltsa kvartalet, men rubriken sager "januari -
   december". Utan den har funktionen stampades kvartalets 9,6 MSEK som helarets,
   ett fel pa faktor fem, och marginalerna raknades sedan ovanpa det.

   Det ar det farligaste slaget av fel vi kan gora: ett tal ur ratt rapport, med
   ratt kalla, under fel period. Kallgrinden ser ingenting, for talet star ju
   dar. */
export function periodVidTraff(text, index, rubrik) {
  const fore = utanParenteser(String(text || '').slice(0, index));
  // Närmaste rubrik FÖRE talet vinner, även i långa avsnitt.
  let bast = null, m;
  const re = new RegExp(PERIODTOKEN.source, 'gi');
  while ((m = re.exec(fore)) !== null) bast = m;
  if (bast === null) return periodFor(rubrik);
  const innan = fore.slice(0, bast.index);
  const kopieradRubrik = String(rubrik || '').toLowerCase().startsWith(
    fore.slice(0, bast.index + bast[0].length).trim().toLowerCase());
  // MFN:s lagrade text kan ha tappat HTML-raderna: dokumentrubrik, datum
  // med klockslag, ibland en upprepad rapportrubrik, sedan kvartalsrubriken.
  // Godta bara denna exakta prefixstruktur, inte godtycklig prosa efter datum.
  const titel = String(rubrik || '').trim().toLowerCase();
  const kortTitel = titel.match(/(?:delårsrapport|bokslutskommuniké|interim report|year-end report).*/)?.[0];
  const huvud = innan.trim().match(/^(.*?)\s+(20\d{2}-\d{2}-\d{2} [0-2]\d:[0-5]\d:[0-5]\d)\s*(.*?)$/);
  const efterRapporthuvud = huvud && huvud[1].toLowerCase() === titel &&
    (!huvud[3] || huvud[3].toLowerCase() === titel || huvud[3].toLowerCase() === kortTitel);
  // Ett periodomnämnande mitt i en mening är ingen avsnittsrubrik. När
  // radbrytningar saknas tillåts även gränsen efter datum eller måttets enhet.
  // Vid tvetydighet utelämnas måttet; vi återgår inte till en äldre rubrik.
  const rubrikgrans = !innan.trim() || /[.!?;:\n]\s*$/.test(innan) ||
    /\b20\d{2}-\d{2}-\d{2}\s*$/.test(innan) ||
    new RegExp(`\\b(?:${ENHET}|SEK|EUR|USD)\\s*$`, 'i').test(innan) || kopieradRubrik || efterRapporthuvud;
  const efter = fore.slice(bast.index + bast[0].length);
  // "Q1 2026 väntas ..." är en mening även när den börjar på ny rad.
  // Ett efterföljande mått får däremot börja med liten bokstav.
  const fortsattMening = /^[ \t]*[a-zåäö]/.test(efter) &&
    !METRIKER.some(matt => matt.re.exec(efter)?.index === efter.search(/\S/));
  return rubrikgrans && !fortsattMening ? periodToken(bast[0]) : null;
}

/** Period ur en rapportrubrik, och som sista utvag ur brodtextens forsta rader.
    Returnerar { ar, kvartal, langd } dar kvartal ar periodens SLUTKVARTAL och
    langd ar antalet kvartal perioden omfattar. null om det inte gar att avgora,
    och da anvands dokumentet inte alls: en siffra utan period ar oanvandbar. */
export function periodFor(rubrik, text) {
  for (const kalla of [String(rubrik || ''), String(text || '').slice(0, 400)]) {
    const match = new RegExp(PERIODTOKEN.source, 'gi').exec(utanParenteser(kalla));
    if (match) return periodToken(match[0]);
  }
  return null;
}

function tolkaTal(rå) {
  const n = parseFloat(String(rå).replace(/[   ]/g, '').replace(/\u2212/g, '-').replace(',', '.'));
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
  if (e === 'KSEK' || e === 'TSEK' || e === 'TKR') return { varde: nu / 1000, enhet: 'MSEK' };
  if (e === 'KEUR' || e === 'TEUR') return { varde: nu / 1000, enhet: 'MEUR' };
  // Storbolagen gar at andra hallet: Telia redovisar i GSEK (miljarder), och
  // 20,7 GSEK lasta som MSEK vore fel med faktor tusen.
  if (e === 'GSEK' || e === 'MDSEK' || e === 'MDKR' || e === 'MILJARDERKRONOR')
    return { varde: nu * 1000, enhet: 'MSEK' };
  if (e === 'SEK' || e === 'KR') return { varde: nu / 1000000, enhet: 'MSEK' };
  const norm = normEnhet(e);
  if (norm === 'MSEK' || norm === 'MEUR' || norm === 'MUSD') return { varde: nu, enhet: norm };
  return null;   // okand enhet: hellre tyst an fel skala
}

/** Alla nyckeltal vi kan lasa ur ett bolagsarkiv, ett per metrik och period. */
/* MFN:s sidram bar siffror som ser ut som bolagsdata: kurswidgeten skriver
   "Antal aktier 265 029" och "Rel. mcap 0,24%". Lases de som rapporttext blir
   ett widgetvarde ett belagt faktum. 921 av arkivets 2285 bitar ar sadan ram. */
const brodtext = dok => (dok.bitar || []).filter(b => !arSidram(b)).join(' ');

export function extraheraNyckeltal(bolagsarkiv) {
  /* BOLAGET AR EN DEL AV NYCKELN. Utan det slog tva bolags varde for samma
     metrik och period ut varandra: `if (funna.has(nyckel)) continue` gjorde att
     forst till kvarn vann, och det andra bolagets siffra forsvann tyst. En
     fraga far tva bolag i taget, sa laget var inte hypotetiskt. */
  const funna = new Map(); // "bolag|metrik|ar|kvartal|langd" -> post
  const konflikter = new Set();

  // Pass 1: belagda fakta ur rapport-PDF:erna. Egen slinga over hela arkivet, sa
  // att de vinner over regexen aven nar regexdokumentet ligger forst.
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      if (!dok.fakta) continue;
      const period = periodFor(dok.rubrik, brodtext(dok));
      if (!period) continue;
      for (const [faltId, m] of Object.entries(FRAN_FAKTA)) {
        const f = dok.fakta[faltId];
        if (!f) continue;
        const belagg = dok.kallor?.[faltId] || {};
        const norm = normaliseraFakta(f.nu, f.enhet);
        if (!norm) continue;
        const nyckel = JSON.stringify([ark.id || ark.namn, m.id, period.ar, period.kvartal, period.langd]);
        if (konflikter.has(nyckel)) continue;
        const tidigare = funna.get(nyckel);
        if (tidigare) {
          if (tidigare.varde !== norm.varde || tidigare.enhet !== norm.enhet) {
            funna.delete(nyckel);
            konflikter.add(nyckel);
          }
          continue;
        }
        funna.set(nyckel, {
          metrik: m.id, typ: m.typ,
          ar: period.ar, kvartal: period.kvartal, langd: period.langd,
          varde: norm.varde, enhet: norm.enhet,
          rubrik: dok.rubrik, url: dok.url, bolag: ark.namn,
          bolagId: ark.id || ark.namn,
          original: { varde: f.nu, enhet: f.enhet },
          kalla: { url: dok.url, rubrik: dok.rubrik, datum: dok.datum,
            citat: belagg.citat || '', sida: belagg.sida || null, falt: faltId, typ: 'pdf' },
        });
      }
    }
  }

  // Pass 2: regexen over pressmeddelandets text, fyller det fakta inte tackte.
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      const text = brodtext(dok);
      const utanJamforelser = utanParenteser(text);
      for (const m of METRIKER) {
        for (const träff of text.matchAll(new RegExp(m.re.source, 'gi'))) {
          if (utanJamforelser[träff.index] === ' ') continue;
          // Perioden lases dar talet star, inte i rubriken. Se periodVidTraff.
          /* En handelse KRAVER ingen period: den annonserades i ett dokument
             och det ar hela dess forankring. Kravet pa en lasbar kvartalsperiod
             var det som fick alla ordervarden att falla tyst. */
          const period = periodVidTraff(text, träff.index, dok.rubrik);
          if (!period && m.typ !== 'handelse') continue;
          const varde = tolkaTal(träff[1]);
          if (varde === null) continue;
          // Samma skalomrakning som pass 1. Utan den hade KSEK lasts som om det
          // vore MSEK, och ett bolag som byter skala mellan tva rapporter hade
          // gett en tusenfaldig "forandring".
          const norm = normaliseraFakta(varde, träff[2]);
          if (!norm) continue;
          /* HANDELSER KONKURRERAR INTE OM EN PERIOD.
             Flera avrop kan annonseras i samma rapport, och med den vanliga
             nyckeln blev de motstridiga varden for samma kvartal: bada foll
             tyst som konflikt. En handelse nycklas darfor pa dokumentet och
             beloppet, alltsa pa sig sjalv. */
          const nyckel = m.typ === 'handelse'
            ? JSON.stringify([ark.id || ark.namn, m.id, dok.url, varde, träff[2]])
            : JSON.stringify([ark.id || ark.namn, m.id, period.ar, period.kvartal, period.langd]);
          if (konflikter.has(nyckel)) continue;
          const tidigare = funna.get(nyckel);
          if (tidigare) {
            if (tidigare.kalla.typ === 'text' &&
                (tidigare.varde !== norm.varde || tidigare.enhet !== norm.enhet)) {
              funna.delete(nyckel);
              konflikter.add(nyckel);
            }
            continue;
          }
          funna.set(nyckel, {
            metrik: m.id, typ: m.typ,
            ar: period?.ar ?? null, kvartal: period?.kvartal ?? null, langd: period?.langd ?? null,
            varde: norm.varde, enhet: norm.enhet,
            rubrik: dok.rubrik, url: dok.url, bolag: ark.namn,
            bolagId: ark.id || ark.namn,
            original: { varde, enhet: träff[2] },
            kalla: { url: dok.url, rubrik: dok.rubrik, datum: dok.datum,
              citat: text, start: träff.index, slut: träff.index + träff[0].length, typ: 'text' },
          });
        }
      }
    }
  }
  return [...funna.values()].sort((a, b) => (b.ar - a.ar) || (b.kvartal - a.kvartal) || (a.langd - b.langd));
}

function etikett(n) {
  return n.langd === 1 ? `Q${n.kvartal} ${n.ar}` : `${n.langd} kvartal till och med Q${n.kvartal} ${n.ar}`;
}

/* Bolaget star forst i varje formel. En harledning utan bolagsnamn gick inte
   att granska: laste man den i underlaget syntes inte vilket bolag talen kom
   ifran, och det var sa hopblandningen kunde leva obemarkt. */
function formel(post) {
  // Kanoniska värden behåller full precision. Formeltexten tar bort binära
  // flyttalsartefakter som 0,1999999999999993 utan att bli beräkningsunderlag.
  const n = formateraTal;
  const b = post.bolag ? post.bolag + ': ' : '';
  if (post.sort === 'kvot') {
    return `${b}${n(post.talVarde)} delat pa ${n(post.namnarVarde)} ${post.enhet} for ${post.period} ger ${n(post.procent)} procent`;
  }
  if (post.perManad == null) {
    return `${b}${n(post.tillVarde)} ${post.enhet} i ${post.till} minus ${n(post.franVarde)} i ${post.fran} ger ${n(post.forandring)}`;
  }
  let s = `${b}${n(post.franVarde)} ${post.enhet} vid slutet av ${post.fran} minus ${n(post.tillVarde)} vid slutet av ${post.till} ger ${n(Math.abs(post.forandring))}, delat pa kvartalets 3 manader ger ${n(post.perManad)} ${post.enhet} per manad`;
  if (post.manaderKvar != null) {
    s += `. Kassan ${n(post.tillVarde)} delat pa ${n(post.perManad)} ger ${n(post.manaderKvar)} manader, OM takten haller i sig, vilket den sallan gor`;
  }
  return s;
}

const kvartalSteg = (senare, tidigare) =>
  (senare.ar - tidigare.ar) * 4 + (senare.kvartal - tidigare.kvartal);

/* Balansposter jamfors pa periodens slut, oavsett hur lang perioden var.
   Flodesposter jamfors bara mot en LIKA LANG period, annars ar talen inte
   jamforbara och vi sager hellre ingenting. */
function somJamforbarPost(n) {
  // Äldre testfixturer saknar bolagId. Namnfallbacken stannar i denna adapter;
  // registerposter måste alltid bära den stabila identiteten själva.
  return { bolagId: n.bolagId || n.bolag, matt: n.metrik, slag: n.typ,
    ar: n.ar, kvartal: n.kvartal, langd: n.langd,
    normaliserat: { varde: n.varde, enhet: n.enhet } };
}

function jamforbar(senare, tidigare) {
  return fullstandigtJamforbara(somJamforbarPost(senare), somJamforbarPost(tidigare));
}

function bygg(sort, metrik, tidigare, senare) {
  return {
    bolagId: senare.bolagId, indata: [tidigare, senare],
    sort, metrik, bolag: senare.bolag, typ: senare.typ, enhet: senare.enhet,
    fran: etikett(tidigare), till: etikett(senare),
    franVarde: tidigare.varde, tillVarde: senare.varde,
    forandring: senare.varde - tidigare.varde,
    kallor: [tidigare.rubrik, senare.rubrik],
  };
}

/* Kvoter vi raknar i kod. En marginal ar en division, och modellen far inte
   dividera, sa utan de har raderna kan fragan "hur ser marginalen ut" inte
   besvaras alls hur manga rapporter vi an hamtar hem. */
const KVOTER = [
  { id: 'rörelsemarginal', tal: 'rörelseresultat', namnare: 'intäkter' },
  { id: 'bruttomarginal', tal: 'bruttoresultat', namnare: 'intäkter' },
];
const MAX_KVOT = 4;
const bolagsnyckel = (n) => n.bolagId || n.bolag;
const serienyckel = (bolag, metrik) => JSON.stringify([bolag, metrik]);

/** Harledningar ur nyckeltalsserien.

    Fyra sorter, som svarar pa olika fragor:

      steg      narmast foregaende kvartal. Bara har hor burn rate hemma: en
                takt betyder nagot bara over en kand och kort period.
      aroverar  samma period ett ar tidigare, alltsa den jamforelse rapporten
                sjalv gor i parentesen. Den tar bort sasongseffekter, vilket
                steget inte kan.
      spann     aldsta mot nyaste av samma slag. Det ar den harledning som
                svarar pa "hur har det utvecklats sedan 2022".
      kvot      marginaler, se KVOTER ovan.

    Tidigare gjordes bara det forsta, och slingan bröts efter en traff per
    metrik. Det var darfor en utvecklingsfraga inte gick att besvara aven nar
    alla rapporter lag i underlaget: dokumenten fanns, aritmetiken saknades. */
export function harled(nyckeltal) {
  const ut = [];
  /* Grupperat pa BOLAG OCH metrik. Med bara metriken hamnade tva bolags
     serier i samma lista, och steg, arsjamforelse och spann kunde raknas
     tvars over bolagsgransen. */
  const perMetrik = new Map();
  for (const n of nyckeltal) {
    const nyckel = serienyckel(bolagsnyckel(n), n.metrik);
    if (!perMetrik.has(nyckel)) perMetrik.set(nyckel, []);
    perMetrik.get(nyckel).push(n);
  }

  for (const [nyckel, lista] of perMetrik) {
    const metrik = lista[0].metrik;
    for (let i = 0; i + 1 < lista.length; i++) {
      const senare = lista[i], tidigare = lista[i + 1];
      if (!jamforbar(senare, tidigare) || kvartalSteg(senare, tidigare) !== 1) continue;
      const post = bygg('steg', metrik, tidigare, senare);
      if (metrik === 'likvida medel' && post.forandring < 0) {
        post.perManad = Math.abs(post.forandring) / 3;
        // Runway foljer sa naturligt pa en burn rate att modellen raknar ut den
        // sjalv om vi inte gor det. Forsta skarpa korningen blockerades pa
        // precis det: svaret bar ett "32" som inte fanns nagonstans.
        if (post.perManad > 0) post.manaderKvar = post.tillVarde / post.perManad;
      }
      post.formel = formel(post);
      ut.push(post);
      break;
    }

    for (const senare of lista) {
      const tidigare = lista.find((x) => jamforbar(senare, x) && kvartalSteg(senare, x) === 4);
      if (!tidigare) continue;
      const post = bygg('aroverar', metrik, tidigare, senare);
      post.formel = formel(post);
      ut.push(post);
      break;
    }

    const nyast = lista[0];
    const samma = lista.filter((x) => jamforbar(nyast, x));
    if (samma.length >= 3) {
      const aldst = samma[samma.length - 1];
      if (kvartalSteg(nyast, aldst) >= 4) {
        const post = bygg('spann', metrik, aldst, nyast);
        post.punkter = samma.length;
        post.formel = formel(post);
        ut.push(post);
      }
    }
  }

  /* DET ALLVARLIGASTE STALLET. Taljare och namnare slogs ihop pa period och
     enhet men inte pa bolag, sa ett bolags rorelseresultat kunde delas med ett
     ANNAT bolags omsattning och presenteras som en rorelsemarginal. Talet gick
     sedan in i tillatnaTal, sa kallgrinden godkande det: fel siffra, rätt
     kallor, och ingenting som kunde upptacka det langre fram. */
  const bolagen = [...new Set(nyckeltal.map(bolagsnyckel))];
  for (const bolag of bolagen) {
    for (const k of KVOTER) {
      const taljare = perMetrik.get(serienyckel(bolag, k.tal)) || [];
      const namnare = perMetrik.get(serienyckel(bolag, k.namnare)) || [];
      let n = 0;
      for (const t of taljare) {
        if (n >= MAX_KVOT) break;
        const nam = namnare.find((x) =>
          bolagsnyckel(x) === bolagsnyckel(t) &&
          x.ar === t.ar && x.kvartal === t.kvartal && x.langd === t.langd && x.enhet === t.enhet);
        if (!nam || !nam.varde) continue;
        const post = {
          bolagId: t.bolagId, indata: [t, nam],
          sort: 'kvot', metrik: k.id, bolag: t.bolag, period: etikett(t), enhet: t.enhet,
          procent: t.varde / nam.varde * 100,
          talVarde: t.varde, namnarVarde: nam.varde,
          kallor: [t.rubrik, nam.rubrik],
        };
        post.formel = formel(post);
        ut.push(post);
        n++;
      }
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
  /* Vilken sorts jamforelse raden ar. Utan den kan modellen inte skilja ett
     kvartalssteg fran en arsjamforelse, och skulle beskriva bada som "senaste
     forandringen". Sasongsstarka bolag blir da direkt missvisande. */
  const SORTTEXT = {
    steg: 'jamfort med narmast foregaende kvartal',
    aroverar: 'jamfort med samma period ett ar tidigare',
    spann: 'over hela den period vi har underlag for',
  };
  const hRader = harledda.map((h) => {
    if (h.sort === 'kvot') {
      return `${h.metrik} for ${h.period}: ${String(h.procent).replace('.', ',')} procent, raknat som ${String(h.talVarde).replace('.', ',')} delat pa ${String(h.namnarVarde).replace('.', ',')} ${h.enhet}.`;
    }
    const riktning = h.forandring < 0 ? 'minskade' : 'okade';
    const bas = `${h.metrik} ${riktning} fran ${String(h.franVarde).replace('.', ',')} till ${String(h.tillVarde).replace('.', ',')} ${h.enhet} mellan ${h.fran} och ${h.till}, en forandring pa ${String(h.forandring).replace('.', ',')} ${h.enhet} (${SORTTEXT[h.sort] || ''})`;
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
    if (h.sort === 'kvot') {
      tillatnaTal.push(h.procent, h.talVarde, h.namnarVarde);
      continue;
    }
    tillatnaTal.push(h.franVarde, h.tillVarde, h.forandring);
    if (h.perManad != null) tillatnaTal.push(h.perManad);
    if (h.manaderKvar != null) tillatnaTal.push(h.manaderKvar);
  }
  return {
    text,
    tillatnaTal: tillatnaTal.filter((v) => typeof v === 'number' && isFinite(v)).map((v) => Math.abs(v)),
    // Skickas vidare till klienten sa uträkningen kan visas under svaret.
    // `sort` med, sa ytan kan gruppera kvartalssteg, arsjamforelser och
    // marginaler i stallet for att radda upp dem i en enda hog.
    harledda: harledda.map((h) => ({ sort: h.sort, metrik: h.metrik, formel: h.formel, kallor: h.kallor })),
  };
}
