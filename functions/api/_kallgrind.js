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

/** Tal i svaret som inte finns i underlaget. Tom lista = svaret slapps igenom.
    Exakt likhet med flyttalsepsilon, ingen avrundningstolerans: slapper man
    "ungefar ratt" igenom slapper man ocksa igenom modellens egna berakningar. */
export function ogrundadeTal(svarstext, utdrag, fraga) {
  const tillatna = new Set();
  for (const u of utdrag) for (const t of hittaTal(u.text)) tillatna.add(t.varde);
  for (const t of hittaTal(fraga || '')) tillatna.add(t.varde); // tal ur fragan far ekas
  // Arttal och sma ordningstal (kvartal, halvar) ar inte pastaenden om pengar.
  const ofarligt = (v) => v <= 4 || (v >= 1900 && v <= 2100 && Number.isInteger(v));
  const lista = [...tillatna];
  return hittaTal(svarstext).filter(
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

/** Termer ur en fraga, plus deras narmaste synonymer i rapportsprak. */
export function termer(fraga) {
  const ord = String(fraga).toLowerCase().match(/[a-zåäö0-9]{3,}/g) || [];
  const ut = new Set(ord);
  for (const o of ord) for (const syn of SYNONYMER[o] || []) ut.add(syn);
  return [...ut];
}

/* Hamtning: poangsatt varje bit mot fragans termer och ta de basta. Ingen
   embedding, medvetet. Arkivet per bolag ar litet (tiotals dokument), och en
   vektorindex hade krävt ett byggsteg till utan att svara battre pa "hur ser
   kassan ut", dar ordet kassa faktiskt star i texten. */
export function hamtaUtdrag(fraga, bolagsarkiv, max = 6) {
  const t = termer(fraga);
  if (!t.length) return [];
  const kandidater = [];
  for (const ark of bolagsarkiv) {
    for (const dok of ark.dokument || []) {
      const rubrikLc = String(dok.rubrik || '').toLowerCase();
      for (const bit of dok.bitar || []) {
        const lc = bit.toLowerCase();
        let poang = 0;
        for (const term of t) {
          if (lc.includes(term)) poang += term.length;
          // Rubriken vager, men lite. Med tung rubrikvikt vann inbjudan till
          // kvartalssamtalet over sjalva kvartalsrapporten, som bar talet.
          if (rubrikLc.includes(term)) poang += Math.ceil(term.length / 2);
        }
        if (poang > 0) {
          kandidater.push({ poang, text: bit, rubrik: dok.rubrik, url: dok.url, datum: dok.datum, bolag: ark.namn });
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
