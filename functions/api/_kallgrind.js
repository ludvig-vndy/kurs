/* functions/api/_kallgrind.js  -  hamtning och kallgrind for Fraga.

   Portad ur motor/fraga.mjs, som byggde och bevisade kedjan i juli: modellen
   forsokte rakna ut tranche-storlekar sjalv och grinden stoppade den. Reglerna ar
   desamma, koden ar bara flyttad till edgen.

   Inga beroenden och inga modellanrop har, sa allt gar att prova med node --test. */

/** Alla tal i en text, normaliserade. Harda och smala mellanslag i tusental
    stadas bort forst: utan det missar talmatchningen tyst, vilket var den
    viktigaste buggen i motorns forsta version. */
export function hittaTal(text) {
  if (typeof text !== 'string') return [];
  const stadad = text.replace(/[   ]/g, ' ');
  const ut = [];
  const re = /(?<![A-Za-zÅÄÖåäö\d])(-?\d{1,3}(?: \d{3})+|-?\d+)(?:,(\d+))?/g;
  let m;
  while ((m = re.exec(stadad)) !== null) {
    const heltal = m[1].replace(/\s/g, '');
    const dec = m[2] || '';
    ut.push({ rå: m[0], varde: Math.abs(parseFloat(heltal + (dec ? '.' + dec : ''))) });
  }
  return ut;
}

/* Datum ar inte pastaenden om pengar.

   Provkorningen mot riktiga API:t foll pa precis det. Fragan gallde helaret
   2022, modellen hamtade perioden och skrev ut vilken period den hamtat, och
   grinden stoppade hela svaret for att 12 och 31 ur "2022-12-31" lastes som
   ogrundade tal. Samma sak hade redan hant med horisontdatumen, som
   horisontregeln UTTRYCKLIGEN beordrar modellen att skriva ut.

   Det ar det varsta felet en grind kan gora: den blockerade ett sant svar for
   att det gjorde som det blivit tillsagt. Datum plockas darfor bort ur svaret
   innan talen letas fram.

   Bara ur SVARET, aldrig ur underlaget: underlagets tal ar en tillatelselista,
   och att stada den skulle bara gora grinden strangare av misstag. */
const MANADER =
  '(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december|' +
  'jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|nov|dec)';

const DATUMFORMER = [
  /\b\d{4}-\d{2}-\d{2}\b/gi,                                    // 2022-12-31
  /\b\d{1,2}\/\d{1,2}(?:[ -]\d{2,4})?\b/gi,                     // 31/12 och 31/12-2022
  new RegExp('\\b\\d{1,2}\\.? ' + MANADER + '(?: \\d{4})?\\b', 'gi'), // 31 december 2022
  new RegExp('\\b' + MANADER + ' \\d{4}\\b', 'gi'),             // december 2022
  /\bQ[1-4][ -]?\d{4}\b/gi,                                     // Q3 2022
];

export function utanDatum(text) {
  let ut = String(text || '');
  for (const re of DATUMFORMER) ut = ut.replace(re, ' ');
  return ut;
}

/** Tal i svaret som inte finns i underlaget. Tom lista = svaret slapps igenom.
    Exakt likhet med flyttalsepsilon, ingen avrundningstolerans: slapper man
    "ungefar ratt" igenom slapper man ocksa igenom modellens egna berakningar. */
// LEGACY: numerisk forekomstkontroll, INTE en faktaverifiering. Fraga anvander
// numera _faktaregister.js och _faktasvar.js for sina slutliga svar.
export function ogrundadeTal(svarstext, utdrag, fraga, egnaTal) {
  const tillatna = new Set();
  for (const u of utdrag) for (const t of hittaTal(u.text)) tillatna.add(t.varde);
  for (const t of hittaTal(fraga || '')) tillatna.add(t.varde); // tal ur fragan far ekas
  // Anvandarens egna tal (antal, GAV) ar lika mycket underlag som ett dokument.
  // Utan detta blockerades "hur mycket ager jag i Sivers" for att svaret sa 100,
  // ett tal som stod i innehavet men inte i nagot pressmeddelande.
  for (const v of egnaTal || []) if (typeof v === 'number' && isFinite(v)) tillatna.add(Math.abs(v));
  // Arttal och sma ordningstal (kvartal, halvar) ar inte pastaenden om pengar.
  const ofarligt = (v) => v <= 4 || (v >= 1900 && v <= 2100 && Number.isInteger(v));
  const lista = [...tillatna];
  return hittaTal(utanDatum(svarstext)).filter(
    (t) => !ofarligt(t.varde) && !lista.some((v) => Math.abs(v - t.varde) < 1e-9)
  );
}

/* Fragan och rapporten talar sallan samma sprak. Nagon fragar om "kassan", och
   delarsrapporten sager "Likvida medel 486,3 MSEK". Utan den har bron svarar
   assistenten "det framgar inte" trots att talet star i arkivet, vilket ar det
   varsta av alla utfall: den ser arlig ut och har fel.

   Listan ar medvetet kort och bokstavlig. Den vidgar bara det ord anvandaren
   redan skrev, den gissar aldrig ett nytt amne. */
const SYNONYMER = {
  kassa: ['likvida', 'medel', 'kassaflode', 'kassaflöde', 'kassaposition'],
  kassan: ['likvida', 'medel', 'kassaflode', 'kassaflöde'],
  likviditet: ['likvida', 'medel', 'kassa'],
  vinst: ['resultat', 'rorelseresultat', 'rörelseresultat', 'nettoresultat'],
  vinsten: ['resultat', 'rorelseresultat', 'rörelseresultat'],
  forlust: ['resultat', 'rorelseresultat', 'rörelseresultat'],
  förlust: ['resultat', 'rorelseresultat', 'rörelseresultat'],
  omsattning: ['nettoomsattning', 'nettoomsättning', 'intakter', 'intäkter', 'forsaljning', 'försäljning'],
  omsättning: ['nettoomsattning', 'nettoomsättning', 'intakter', 'intäkter'],
  skuld: ['skulder', 'nettoskuld', 'rantebarande', 'räntebärande', 'obligation'],
  skulder: ['nettoskuld', 'rantebarande', 'räntebärande', 'obligation'],
  marginal: ['marginal', 'rorelsemarginal', 'rörelsemarginal', 'bruttomarginal'],
  utdelning: ['utdelning', 'utdelningen'],
  anstallda: ['medarbetare', 'anstallda', 'anställda'],
  anställda: ['medarbetare', 'anstallda'],
  tillvaxt: ['tillvaxt', 'tillväxt', 'okade', 'ökade', 'vaxte', 'växte'],
  tillväxt: ['tillvaxt', 'okade', 'ökade', 'vaxte', 'växte'],
  emission: ['emission', 'nyemission', 'teckningsoptioner', 'utspadning', 'utspädning'],
  forvarv: ['forvarv', 'förvärv', 'forvarvar', 'förvärvar'],
  förvärv: ['forvarv', 'forvarvar', 'förvärvar'],
  insyn: ['insynshandel', 'insynsperson', 'befattningshavare'],
  blankning: ['blankning', 'nettoposition', 'korta'],
};

/* Funktionsord bar ingen mening om bolaget, men de matchar overallt, och
   matchningen ar substrangbaserad sa skadan blir storre an den ser ut: "var"
   traffar inuti "overvakning" och "svarar". Pa fragan om bruttomarginalen 2022
   gav hur, var och och sex till nio poang at stycken som inte namnde ett enda
   tal, vilket ar samma storleksordning som ett stycke med sjalva siffran i.

   Listan tar bara ord som aldrig kan vara amnet. "sedan", "fore" och "efter"
   star med: periodIFragan laser dem ur den rada fragan, inte harifran. */
const STOPPORD = new Set([
  'och', 'att', 'det', 'den', 'dem', 'som', 'har', 'hade', 'hur', 'vad', 'vem',
  'var', 'vart', 'vara', 'varit', 'ett', 'en', 'om', 'till', 'fran', 'från',
  'med', 'for', 'för', 'pa', 'på', 'kan', 'ska', 'skall', 'vid', 'men', 'inte',
  'mer', 'mest', 'mycket', 'manga', 'många', 'deras', 'dess', 'sin', 'sitt',
  'sina', 'blir', 'blev', 'gor', 'gör', 'gjorde', 'ser', 'sag', 'såg', 'sedan',
  'efter', 'fore', 'före', 'innan', 'under', 'over', 'över', 'mot', 'samt',
  'eller', 'ocksa', 'också', 'bara', 'alla', 'ar', 'är', 'nar', 'när', 'sa',
  'så', 'nu', 'ju', 'de', 'du', 'jag', 'vi', 'min', 'mina', 'mitt', 'mig',
  'ni', 'er', 'hen', 'han', 'hon', 'this', 'that', 'the', 'and', 'for', 'with',
]);

/** Termer ur en fraga, plus deras narmaste synonymer i rapportsprak. */
export function termer(fraga) {
  const ord = (String(fraga).toLowerCase().match(/[a-zåäö0-9]{3,}/g) || [])
    .filter((o) => !STOPPORD.has(o));
  const ut = new Set(ord);
  for (const o of ord) for (const syn of SYNONYMER[o] || []) ut.add(syn);
  return [...ut];
}

/* Hamtning: poangsatt varje bit mot fragans termer och ta de basta. Ingen
   embedding, medvetet. Arkivet per bolag ar litet (tiotals dokument), och en
   vektorindex hade krävt ett byggsteg till utan att svara battre pa "hur ser
   kassan ut", dar ordet kassa faktiskt star i texten. */
/* Dokument som bara ar logistik: en kallelse till ett presentationssamtal sager
   ingenting om bolaget. De matchar anda ord som "kvartal" och "rapport" och tog
   darfor plats fran sjalva rapporten. De far vara kvar i arkivet, men vaga mindre. */
const TUNN = /^(inbjudan|invitation|kallelse till present|notice of present)/i;

/** Farskhet 0 till 1: dagens dokument 1, ett ar gammalt nara 0. Aldern ar inte
    hela sanningen, en gammal arsredovisning kan bara svaret, sa den vager in
    som en faktor och avgor inte ensam. */
function farskhet(datum, nu) {
  const t = Date.parse(datum || '');
  if (!isFinite(t)) return 0.5;
  const dagar = Math.max(0, (nu - t) / 86400000);
  return Math.exp(-dagar / 365);
}

/* ── Periodfragor ─────────────────────────────────────────────────────────────

   VARFOR DET HAR BEHOVS. Farskheten ovan ar ett kvalitetsmatt sa lange fragan
   inte namner nagon tid: nyare ar oftast mer relevant. Men pa "hur har
   marginalen utvecklats sedan 2022" blir den aktivt fel. Ett dokument fran i ar
   far upp till 1,4x och ett fran 2022 far 0,6x, alltsa en faktor 2,3 emot, och
   med bara sex platser i utdraget kommer historiken aldrig fram. Modellen far
   da farska dokument, svarar korrekt om i ar, och kallgrinden marker ingenting
   eftersom varje tal faktiskt star i underlaget.

   Det ar det farligaste utfallet vi har: sant, valciterat, och svar pa en annan
   fraga an den som stalldes. Grinden skyddar mot pahittade tal, inte mot fel
   period, sa den skillnaden maste goras har. */

const ORDTAL = {
  en: 1, ett: 1, tva: 2, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6,
  sju: 7, atta: 8, åtta: 8, nio: 9, tio: 10, elva: 11, tolv: 12,
};

/* En rapport publiceras EFTER perioden den handlar om: bokslutet for 2022 kommer
   i februari 2023. Utan den har nadatiden skulle en fraga om "2022" missa
   bolagets egen sammanfattning av aret. */
const NADADAGAR = 130;

const ARTAL = /(?<!\d)(19\d{2}|20\d{2})(?!\d)/g;

/** Vilken period fragan handlar om, eller null om den inte namner nagon.

    Fyrsiffriga tal mellan 1900 och 2100 lases som artal. I en fraga ar det
    nastan alltid vad de ar, och ogrundadeTal gor redan samma antagande. Artal
    langre fram an nasta ar ignoreras: "vad blir det 2035" ar en prognosfraga,
    inte en historisk. */
export function periodIFragan(fraga, nu = Date.now()) {
  const s = String(fraga || '').toLowerCase();
  const iAr = new Date(nu).getUTCFullYear();
  const idag = new Date(nu).toISOString().slice(0, 10);

  // "de senaste fem aren", "senaste 3 aren"
  const rel = s.match(/senaste\s+(\d{1,2}|[a-zåäö]+)\s+(?:a|å)ren/);
  if (rel) {
    const n = /^\d+$/.test(rel[1]) ? Number(rel[1]) : ORDTAL[rel[1]];
    if (n >= 1 && n <= 30) return { fran: (iAr - n) + '-01-01', till: idag, kalla: 'relativ' };
  }

  ARTAL.lastIndex = 0;
  const artal = [...s.matchAll(ARTAL)].map((m) => Number(m[1])).filter((v) => v <= iAr + 1);
  if (!artal.length) return null;

  const min = Math.min(...artal), max = Math.max(...artal);

  // "fore 2023" pekar bakat, inte pa aret sjalvt.
  if (/(före|fore|innan)\s+(?:år\s+|ar\s+)?(19|20)\d{2}/.test(s)) {
    return { fran: '1900-01-01', till: (min - 1) + '-12-31', kalla: 'artal' };
  }
  // "sedan 2022", "fran 2022" ar oppet at hoger, ett ensamt artal ar det inte.
  const oppet = /(sedan|från|fran|efter)\s+(?:år\s+|ar\s+)?(19|20)\d{2}/.test(s);
  return {
    fran: min + '-01-01',
    till: oppet ? idag : max + '-12-31',
    kalla: 'artal',
  };
}

/** Ligger dokumentet i perioden, med nadatid for att rapporten kommer efteråt. */
export function iPerioden(datum, period) {
  if (!period) return true;
  const d = String(datum || '').slice(0, 10);
  if (!d) return false;
  let till = period.till;
  if (till) {
    const t = Date.parse(till + 'T00:00:00Z');
    if (isFinite(t)) till = new Date(t + NADADAGAR * 86400000).toISOString().slice(0, 10);
  }
  return (!period.fran || d >= period.fran) && (!till || d <= till);
}

/* MFN:S SIDNAVIGERING AR INTE BOLAGETS KOMMUNIKATION.

   Skrapningen tar med hela sidans ram: menyrader, "Logga in med X", listan
   over tangentbordsgenvagar, och sist bolagsrutan som slutar med "Vem ager
   bolaget? All agardata du vill ha finns i Holdings !". Allt det ligger FORE
   pressmeddelandets text i varje bit.

   Det kostar tre ganger: lasaren far en vagg av skrap innan den mening som
   svarar pa fragan, registret som redan slar i taket fylls med det, och vi
   betalar for det i varje modellanrop eftersom registret ar input.

   Piloten sa det rakt ut efter forsta provet: "blir lite mycket text och for
   lite slutsatser". Det har ar en del av den texten.

   Stadningen sker vid LASNING, inte vid inlasning, sa den galler arkivet som
   redan ligger i KV utan att nagot behover skrapas om. Hittas ingen brytpunkt
   lamnas biten orord: hellre lite skrap an en bortklippt rapport. */
const MFN_RAM = /^[\s\S]{0,1200}?Vem äger bolaget\?\s*All ägardata du vill ha finns i Holdings\s*!?\s*/;
const MFN_TOPP = /^\s*MFN\.se\s*>[^\n]*\n+/;
export function stadaBit(bit) {
  const t = String(bit || '');
  const utan = t.replace(MFN_RAM, '');
  return (utan === t ? t.replace(MFN_TOPP, '') : utan).trim();
}

/* HELA BITAR SOM AR SIDRAM, inte bolagets text alls.

   Dokumenten styckas i bitar, och tre av fem bitar i ett typiskt
   MFN-pressmeddelande ar sajtens ram: brodsmula och meny, en kurswidget, och
   en inloggningsinstruktion. Matt over arkivet 2026-09-12: 921 av 2285 bitar,
   alltsa 40 procent av bitarna och 55 procent av alla tecken.

   Det ar inte bara sloseri. SAMTLIGA 921 innehaller siffror, och de ser ut som
   bolagsdata: kurswidgeten skriver "Antal aktier 265 029" och "Rel. mcap
   0,24%". En fraga om antalet aktier kan alltsa traffa MFN:s widget och fa ett
   tal som inte kommer ur nagon rapport. Det ar samma felklass som allt annat
   har ar byggt for att stoppa, och den hade legat i underlaget hela tiden.

   Markorerna ar medvetet fa och bokstavliga. Tolv traffar innehaller ocksa
   rapportsprak, men bara for att dokumentets rubrik star i brodsmulan; deras
   brodtext ar likafullt ram. */
const SIDRAM = [/^\s*MFN\.se\s*>/, /Rel\. mcap/, /För att logga in, klicka på/, /Short keys for navigating/,
  // Tidszonsvaljaren och mejlkvittot i sidfoten. Den biten matchade en fraga om
  // Loft Orbital pa ett PDF-FILNAMN och kom med som "underlag".
  /New York \/ Eastern/, /Ett mail har skickats till den givna adressen/];
export const arSidram = bit => SIDRAM.some(r => r.test(String(bit || '')));

/* ARKIVETS DATUM AR OFTA INLASNINGSDAGEN, INTE PUBLICERINGSDAGEN.

   Matt 2026-09-12: 113 av 308 dokument bar ett datum som delas av hela
   bolagets arkiv, alltsa dagen bevakningen startade. Atta bolag hade varenda
   dokument stamplat 2026-08-30. Ett dokument stamplat 2026-07-08 var i
   sjalva verket publicerat 2025-09-18, nastan ett ar fel.

   Det ar inte kosmetiskt. Datumet styr farskhetspoangen i urvalet, avgor om
   ett dokument ligger inom en efterfragad period, och visas for anvandaren som
   pressmeddelandets datum. Ett svar kan alltsa saga att en uppgift ar farsk
   nar den ar ett ar gammal, med kalla och allt.

   Ratt datum star i texten: MFN skriver bade en tidsstampel i huvudet och
   MAR-raden "for offentliggorande den ...". 307 av 308 dokument har minst en
   av dem. MAR-raden gar forst, den ar den juridiska uppgiften. Tidsstampeln
   godtas bara tidigt i texten, dar huvudet star, och ett datum i framtiden
   godtas aldrig.

   Rattningen sker vid LASNING, sa den galler arkivet som redan ligger i KV.
   Ingesten bor rattas ocksa, men det kraver en omskrapning. */
const MAR_DATUM = /offentliggörande den (\d{4}-\d{2}-\d{2})/i;
const HUVUD_DATUM = /(?:^|\n)\s*(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}/;
export function publiceringsdatum(dok, idag = Date.now()) {
  const arkivdatum = String(dok?.datum || '').slice(0, 10);
  /* Sidramen raknas bort FORST. Tidsstampeln star i huvudet pa sjalva
     pressmeddelandet, och med menyn och kurswidgeten kvar lag den bortom
     fonstret nedan, sa bara 19 av 308 dokument rattades i stallet for 113. */
  const text = (dok?.bitar || []).filter(b => !arSidram(b)).join('\n');
  const mar = text.match(MAR_DATUM);
  const huvud = text.slice(0, 1500).match(HUVUD_DATUM);
  const kandidat = (mar && mar[1]) || (huvud && huvud[1]) || null;
  if (!kandidat) return arkivdatum;
  const t = Date.parse(kandidat + 'T00:00:00Z');
  // Ett datum i framtiden ar ett lasfel, inte en publicering.
  if (!Number.isFinite(t) || t > idag + 86400000) return arkivdatum;
  return kandidat;
}

/* FONSTRET RUNT DET SOM FAKTISKT MATCHADE.

   En bit ar ofta en hel avdelning ur en rapport. "Vasentliga handelser" i
   Unibaps Q3 rader upp Loft Orbital, Argotec, Scanway och Leonardo i samma
   stycke. Fragade nagon om Loft Orbital kom alla fyra med, och piloten sa det
   rakt ut: "den spottar ur citat fran olika pressmeddelanden som ibland inte
   heller handlar om specifikt det jag fragat".

   Fonstret laggs runt forsta och sista traffen och klipps vid meningsgrans, sa
   citatet borjar och slutar dar en mening gor. Hittas ingen trafF lamnas biten
   orord: hellre for mycket text an ett godtyckligt klipp.

   Vinsten ar tredubbel, samma som for sidramen: kortare svar, fler poster
   under registrets tak, och lagre tokenkostnad i varje anrop. */
const FONSTER_MARGINAL = 260;
const MAX_FONSTER = 900;
export function fonster(text, termer) {
  const hel = String(text || '');
  if (hel.length <= MAX_FONSTER) return hel;
  const lc = hel.toLowerCase();
  let forst = Infinity, sist = -1;
  for (const term of termer) {
    const i = lc.indexOf(term);
    if (i < 0) continue;
    forst = Math.min(forst, i);
    sist = Math.max(sist, lc.lastIndexOf(term) + term.length);
  }
  if (sist < 0) return hel;
  let fran = Math.max(0, forst - FONSTER_MARGINAL);
  let till = Math.min(hel.length, Math.max(sist + FONSTER_MARGINAL, fran + MAX_FONSTER));
  if (till - fran > MAX_FONSTER) till = fran + MAX_FONSTER;
  // Snappa till meningsgrans sa citatet inte borjar eller slutar mitt i ett ord.
  const start = hel.slice(fran, Math.min(hel.length, fran + 160)).search(/[.!?]\s/);
  if (fran > 0 && start >= 0) fran += start + 2;
  const slut = hel.slice(Math.max(fran, till - 160), till).lastIndexOf('. ');
  if (till < hel.length && slut >= 0) till = Math.max(fran, till - 160) + slut + 1;
  return hel.slice(fran, till).trim() || hel.slice(0, MAX_FONSTER);
}

export function hamtaUtdrag(fraga, bolagsarkiv, max = 6, nu = Date.now(), period) {
  const t = termer(fraga);
  if (!t.length) return [];
  // Namner fragan en period styr den urvalet i stallet for aldern. Skickas
  // `period` in explicit anvands den som den ar, sa anroparen kan ateranvanda
  // samma tolkning som avgjorde om dokument skulle hamtas hem.
  const p = period === undefined ? periodIFragan(fraga, nu) : period;
  const kandidater = [];
  for (const ark of bolagsarkiv) {
    /* BOLAGETS EGET NAMN SKILJER INGENTING.
       Routningen har redan valt bolaget, sa "unibap" star i varje dokument och
       ger poang overallt utan att saga nagot om amnet. Med namnet raknat som
       en vanlig term rackte det for att en bit skulle valjas, och i pilotens
       fraga om Loft Orbital kom ett utdrag med som inte namnde Loft alls.
       Namnet far fortfarande ge poang, men det far inte ensamt kvalificera. */
    const bolagsord = new Set((String(ark.namn || '').toLowerCase().match(/[a-zåäö0-9]{3,}/g) || []));
    const sarskiljande = t.filter(term => !bolagsord.has(term));
    for (const dok of ark.dokument || []) {
      const rubrikLc = String(dok.rubrik || '').toLowerCase();
      const tunn = TUNN.test(String(dok.rubrik || '').trim());
      // Publiceringsdagen, inte inlasningsdagen. Se publiceringsdatum ovan.
      const datum = publiceringsdatum(dok, nu);
      const fars = farskhet(datum, nu);
      const inne = p ? iPerioden(datum, p) : true;
      for (const bit of dok.bitar || []) {
        if (arSidram(bit)) continue;   // sajtens ram, aldrig bolagets text
        const hel = stadaBit(bit);
        const lc = hel.toLowerCase();
        let poang = 0, kropp = 0;
        for (const term of t) {
          if (lc.includes(term) && !bolagsord.has(term)) { poang += term.length; kropp++; }
          else if (lc.includes(term)) poang += Math.ceil(term.length / 3);
          // Rubriken vager, men lite. Med tung rubrikvikt vann inbjudan till
          // kvartalssamtalet over sjalva kvartalsrapporten, som bar talet.
          if (rubrikLc.includes(term)) poang += Math.ceil(term.length / 2);
        }
        /* RUBRIKEN ENSAM RACKER INTE.
           Poangen kunde komma enbart fran rubriken, sa en bit vars brodtext
           inte namnde fragans amne med ett ord valdes anda, bara for att
           dokumentet hette ratt. Piloten sag det direkt: "den spottar ur citat
           fran olika pressmeddelanden som ibland inte heller handlar om
           specifikt det jag fragat". Ett av sex utdrag i hans fraga om Loft
           Orbital namnde inte Loft Orbital. */
        if (kropp === 0 && sarskiljande.length) continue;
        if (poang > 0) {
          // Med en period i fragan ar aldern inte langre ett kvalitetsmatt utan
          // ett krav: pa "sedan 2022" ar ett dokument fran 2026 inte battre an
          // ett fran 2022, det ar fel svar. Utanfor perioden dampas hart men
          // nollas inte, sa de finns kvar om ingenting annat traffar.
          if (p) poang *= inne ? 1.4 : 0.15;
          else poang *= (0.6 + 0.8 * fars); // farskt vager tyngre, gammalt racker anda
          if (tunn) poang *= 0.4;
          // Poangen raknas pa hela biten, texten som visas ar stadad: en term
          // som bara traffar i menyraden ska inte heller ge poang, men den
          // traffen ar redan sa svag att stadningen inte andrar ordningen.
          // Fonstret centreras pa de SARSKILJANDE termerna. Med bolagsnamnet
          // med blev fonstret lagt runt forsta "unibap", alltsa runt den
          // juridiska foten, medan meningen om Loft Orbital hamnade utanfor.
          kandidater.push({ poang, text: fonster(hel, sarskiljande.length ? sarskiljande : t),
            rubrik: dok.rubrik, url: dok.url, datum, bolag: ark.namn });
        }
      }
    }
  }
  kandidater.sort((a, b) => b.poang - a.poang);

  // Sprid over dokument: sex bitar ur samma rapport sager mindre an sex bitar ur
  // sex dokument. Hogst tva bitar per dokument i forsta svepet.
  const ut = [];
  const perDok = new Map();
  for (const k of kandidater) {
    const n = perDok.get(k.url) || 0;
    if (n >= 2) continue;
    perDok.set(k.url, n + 1);
    ut.push(k);
    if (ut.length >= max) break;
  }
  return ut;
}

/** Vilka bolag fragan handlar om, ur anvandarens egna innehav. Deterministiskt:
    namnet eller tickern ska sta i fragan. Traffar inget: null, och anroparen
    far avgora om den ska ta alla eller inga. */
export function bolagIFragan(fraga, innehav) {
  const lc = ' ' + String(fraga).toLowerCase() + ' ';
  const traffar = [];
  for (const h of innehav) {
    const namn = String(h.name || '').toLowerCase()
      .replace(/\s+ab\b.*$/, '').replace(/\s*\(publ\.?\)\s*$/, '').trim();
    const ticker = String(h.ticker || '').toLowerCase();
    const kort = namn.split(/\s+/)[0];
    const hit = (namn && namn.length >= 3 && lc.includes(namn))
      || (kort && kort.length >= 4 && new RegExp('[^a-zåäö0-9]' + kort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^a-zåäö0-9]').test(lc))
      || (ticker && ticker.length >= 3 && lc.includes(ticker));
    if (hit && !traffar.some((x) => x.name === h.name)) traffar.push(h);
  }
  return traffar.length ? traffar : null;
}
