/* functions/api/_mfn.js  -  historik pa begaran ur MFN:s entitetsflode.

   VARFOR DEN HAR FINNS. Arkivet i KV byggs av nattjobbet och ackumulerar det
   som varit NYTT sedan bevakningen borjade. Det ar precis ratt for brevet, vars
   loffte ar "detta har hant sedan i gar". Men Fraga arvde samma korpus, och en
   fraga som "hur har bruttomarginalen utvecklats sedan 2022" kan omojligt
   besvaras ur den: arkivet borjade i juli 2026.

   Fore den har modulen svarade Fraga anda, ur de farska dokument den hade, med
   korrekt citerade tal om fel ar. Det ar det farligaste utfallet i produkten:
   sant, valciterat och inte svar pa fragan.

   MEKANIKEN. MFN:s egen "Visa fler"-knapp tar en ?limit=, och med den ligger
   hela historiken ett anrop bort: Unibap ger 341 dokument tillbaka till mars
   2017. Vi hamtar aldrig alla. Indexet bar datum och rubrik, och rubrikerna ar
   sjalvforklarande ("delarsrapport-juli-2021-juni-2022"), sa urvalet gors gratis
   pa rubrikerna och bara vinnarna hamtas hem. Uppmatt: index 307 ms, fyra
   dokument parallellt 201 ms, alltsa runt en halv sekund for hela 2022.

   KALLGRINDEN ANDRAS INTE. Den kontrollerar att varje tal i svaret star i de
   utdrag modellen fick, och bryr sig inte om var utdraget kom ifran. Ett
   dokument hamtat har far exakt samma behandling som ett ur arkivet. Rackvidd
   och sakerhet ar oberoende av varandra, och det ar hela poangen med att
   hamta primarkallan i stallet for att lata modellen minnas. */

import { iPerioden } from './_kallgrind.js';

export const UA = 'Mozilla/5.0 (agarkollen-alpha; +https://marginalen.se)';
// MFN svarar med hela historiken pa en hog limit. Taket ar deras, inte vart.
export const FEED_LIMIT = 1000;
// Samma bitstorlek som motor/bygg-arkiv.mjs, sa hamtade dokument ser likadana
// ut som arkivets och hamtaUtdrag inte behover veta vilket som ar vilket.
const BITSTORLEK = 1200;
// Logistikdokument. En inbjudan till ett presentationssamtal sager ingenting om
// bolaget men matchar "rapport" och "kvartal", och tog darfor plats fran sjalva
// rapporten. Samma lista som TUNN i _kallgrind.js, har som urvalsfilter.
// Ankarlost med flit. Forsta versionen krav (^|\/) fore ordet, men slugarna
// bar bolagsnamnet forst ("unibap-inbjudan-till-presentation-av-q3"), sa
// filtret slog aldrig till och en inbjudan tog en plats i utdraget.
const TUNN = /(inbjudan|invitation|kallelse-till-present|notice-of-present|presentation-av-(delars|kvartals|bokslut))/i;
const RAPPORT = /(delarsrapport|delårsrapport|bokslutskommunike|bokslutskommuniké|kvartalsrapport|arsredovisning|årsredovisning|interim-report|year-end-report|quarterly-report|annual-report)/i;

/** Entitetsfloedet for ett bolag, harlett ur ett av dess dokument-URL:er.

    Arkivposten bar ingen feed-URL (och arkivets id, "unibap", ar inte samma sak
    som feed-sluggen, "unibap-space-solutions"), men varje dokument-URL har
    formen /<prefix>/a/<entitet>/<slug>. MFN resolvar bade det gamla och det nya
    namnet till samma entitet, sa vilken som helst av bolagets dokument duger. */
export function entitetsFeed(dokumentUrl) {
  const m = String(dokumentUrl || '').match(/^https?:\/\/[^/]*mfn\.se\/[^/]+\/a\/([a-z0-9-]+)\//i);
  return m ? 'https://mfn.se/all/a/' + m[1] : null;
}

/** Floedet som en lista: { datum, url, rubrik }, nyast forst.

    Lasningen gar per kort i stallet for att para ihop datum och lankar pa
    position i dokumentet. Ett kort ar ett <div class="short-item ...>, och bade
    datumet och lanken ligger inuti det, sa hopparningen kan inte glida om MFN
    lagger till ett element mellan dem. */
export function lasIndex(html) {
  const ut = [];
  const kort = String(html || '').split('class="short-item ').slice(1);
  for (const k of kort) {
    const d = k.match(/compressed-date">\s*(\d{4}-\d{2}-\d{2})/);
    const a = k.match(/class="title-link item-link" href="([^"]+)"/);
    if (!d || !a) continue;
    const t = k.match(/class="title-link item-link" href="[^"]+"\s+title="([^"]*)"/);
    ut.push({
      datum: d[1],
      url: a[1].startsWith('http') ? a[1] : 'https://mfn.se' + a[1],
      rubrik: (t ? t[1] : a[1].split('/').pop().replace(/-[a-f0-9]{6,}$/, '').replace(/-/g, ' ')).slice(0, 160),
    });
  }
  return ut;
}

/** Ren text ur en MFN-dokumentsida.

    Pressmeddelanden och delarsrapporter ligger som text i sidan, sa ingen
    PDF-lasning behovs: talen star i klartext med jamforelseperioden i parentes,
    vilket ar exakt det format prompten redan har en regel for. Riktiga
    arsredovisningar ar PDF-bilagor och far fortsatt vara ett nattjobb.

    BARA <article>. Hela sidan ar 12 000 tecken, sjalva pressmeddelandet 7 000,
    och mellanskillnaden ar meny, brodsmulor och MFN:s egen kurswidget. Det ar
    inte bara brus som konkurrerar om utdragets sex platser: widgeten bar TAL
    ("mcap 0,01%", "Antal aktier 2 526"), och de talen ar MFN:s, inte bolagets.
    Slapps de in i underlaget blir de godkanda av kallgrinden, som bara fragar
    om talet star i utdraget, inte vem som skrev det. Da kan assistenten citera
    en widget som om det vore bolagets redovisning. Darfor skalas sidan ned till
    artikeln forst, och hela sidan anvands bara om artikeln inte gar att hitta. */
export function tillText(html) {
  const h = String(html || '');
  const art = h.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  return (art ? art[1] : h)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Text till bitar, samma styckning som motor/bygg-arkiv.mjs. */
export function bitar(text) {
  const ut = [];
  let ack = '';
  for (const mening of String(text || '').split(/(?<=[.!?])\s+/)) {
    ack += mening + ' ';
    if (ack.length > BITSTORLEK) { ut.push(ack.trim()); ack = ''; }
  }
  if (ack.trim()) ut.push(ack.trim());
  return ut;
}

/** Vilka dokument som ar vardu att hamta hem, valt pa rubrik och datum enbart.

    Det ar det som gor det billigt: 341 rubriker kostar ett anrop, och vi hamtar
    bara de handfull som kan bara svaret. Rapporter gar fore losa
    pressmeddelanden, for det ar dar siffrorna star. */
export function valjDokument(index, period, termer, max = 4, kanda = new Set()) {
  const t = (termer || []).filter((x) => x.length >= 4);
  const kandidater = [];
  for (const post of index || []) {
    if (kanda.has(post.url)) continue;             // ligger redan i arkivet
    if (!iPerioden(post.datum, period)) continue;
    const slug = post.url.split('/').pop().toLowerCase();
    if (TUNN.test(slug)) continue;
    // Basvikt 1 at allt som inte ar logistik. Utan den foll bolag som
    // rubriksatter sina rapporter redaktionellt helt bort: Axfoods Q2 2026
    // heter "Starkt narvaro och positiv resultatutveckling" och innehaller
    // varken ordet delarsrapport eller nagon av fragans termer, trots att
    // siffrorna star i texten. Rapporter rankas anda langt over, sa basvikten
    // andrar bara vad som hamtas nar inget battre finns.
    let poang = 1 + (RAPPORT.test(slug) ? 10 : 0);
    const text = (slug + ' ' + String(post.rubrik || '')).toLowerCase();
    for (const term of t) if (text.includes(term)) poang += term.length;
    kandidater.push({ poang, post });
  }
  // Hogst poang forst, och vid lika poang det nyaste.
  kandidater.sort((a, b) => b.poang - a.poang || String(b.post.datum).localeCompare(String(a.post.datum)));
  return kandidater.slice(0, max).map((k) => k.post);
}

/* En hamtning som aldrig kastar: ett trasigt dokument ska inte ta hela svaret.
   Samma hallning som tolkaForm4 i motor/hamta-sec.mjs. */
async function text(url, hamta) {
  try {
    const r = await hamta(url, { headers: { 'user-agent': UA, accept: 'text/html' } });
    if (!r.ok) return null;
    return tillText(await r.text());
  } catch (e) { return null; }
}

/** Historik pa begaran: index, urval, hamtning.

    Returnerar { dokument, index, feed, av } dar `dokument` har arkivets form och
    `av` ar skalet nar det blev tomt. Kastar aldrig: Fraga ska svara pa det den
    har aven nar MFN inte svarar. */
export async function hamtaPeriod({ dokumentUrl, period, termer, max = 4, kanda, hamta = fetch, index: cachat }) {
  const feed = entitetsFeed(dokumentUrl);
  if (!feed) return { dokument: [], index: [], feed: null, av: 'ingen feed kunde harledas', fransCache: false };

  // Indexet ar 1 MB och andras en gang om dagen. Anroparen far darfor skicka in
  // ett cachat index; da kostar en historisk fraga bara dokumenthamtningarna.
  let index = Array.isArray(cachat) ? cachat : null;
  const fransCache = index !== null;
  if (!index) {
    try {
      const r = await hamta(feed + '?limit=' + FEED_LIMIT, { headers: { 'user-agent': UA, accept: 'text/html' } });
      if (!r.ok) return { dokument: [], index: [], feed, av: 'floedet svarade ' + r.status, fransCache };
      index = lasIndex(await r.text());
    } catch (e) {
      return { dokument: [], index: [], feed, av: 'floedet gick inte att na', fransCache };
    }
  }
  if (!index.length) return { dokument: [], index: [], feed, av: 'tomt floede', fransCache };

  const valda = valjDokument(index, period, termer, max, kanda || new Set());
  if (!valda.length) return { dokument: [], index, feed, av: 'inga dokument i perioden', fransCache };

  const hamtade = await Promise.all(valda.map(async (post) => {
    const txt = await text(post.url, hamta);
    if (!txt || txt.length < 200) return null;
    return { url: post.url, rubrik: post.rubrik, datum: post.datum, typ: 'mfn', bitar: bitar(txt) };
  }));
  const dokument = hamtade.filter(Boolean);
  return { dokument, index, feed, fransCache, av: dokument.length ? null : 'dokumenten gick inte att lasa' };
}
