/* functions/api/fraga.js  -  Fraga-assistenten, server-side.

   Nyckeln (ANTHROPIC_API_KEY) lever bara har pa edgen, aldrig i klienten.

   Flode, tva steg som i Saljcoachen:
   1. Routning, utan modellanrop: vilka av ANVANDARENS EGNA bolag namns i fragan.
      Innehaven ar hogst ett tiotal, sa en namnmatch racker och kostar noll. Namns
      inget bolag svarar vi pa innehavslistan och kursens metod, utan dokument.
   2. Svar ur utdrag: bolagens dokument ligger i KV (arkiv:<id>, skrivet av
      motor/bygg-arkiv.mjs), och modellen far bara de mest relevanta bitarna.

   Sist KALLGRINDEN, portad ur motor/fraga.mjs: varje tal i svaret maste finnas i
   utdragen modellen fick. Ett svar med ett tal modellen raknat fram sjalv visas
   inte. Det ar hela skillnaden mellan en assistent och en gissningsmaskin nar
   fragan galler nagons pengar.

   Faller stangt: utan ANTHROPIC_API_KEY 501, utan giltig session 401, utan
   matchande Origin 403. */

import { secureJson as json } from "./_lib.js";
import { ogrundadeTal, hamtaUtdrag, bolagIFragan, hittaTal, termer, periodIFragan } from "./_kallgrind.js";
import { nyckeltalsUnderlag } from "./_nyckeltal.js";
import { hamtaPeriod } from "./_mfn.js";
import { INDEX, REGISTER, LEKTIONER } from "./_kurskorpus.js";

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";
/* Tva modeller, vald efter fragans storlek.

   Haiku racker for en enradig fraga om ett bolag dar underlaget redan ar utvalt.
   Den racker INTE for en fraga som spanner over flera rapporter eller flera ar:
   da ska svaret halla ihop en kedja over dokument som motsager varandra, halla
   isar perioder, och saga vad som saknas. Det ar en annan sorts arbete.

   Kostnaden stiger alltsa bara pa de fragor som fortjanar det. Se valjModell. */
const MODEL_SNABB = "claude-haiku-4-5-20251001";
const MODEL_DJUP = "claude-sonnet-5";
const TIMEOUT = 30000;
const MAX_FRAGA = 1000;
/* Hur mycket text modellen far se.

   Sex bitar a 1200 tecken ar 7200 tecken. En delarsrapport ar ungefar 7000. En
   fraga om marginalen 2022 till 2025 fick alltsa UNGEFAR EN RAPPORT utspridd
   over fyra ar, och kunde omojligt svara pa det den fick. Det ar inte grinden
   som gjorde Fraga forsiktig, det ar den har siffran.

   Periodfragor far darfor ett storre tak. Bitarna ar fortfarande valda pa
   relevans, sa taket ar ett tak och inte en kvot: en tunn fraga hamtar inte upp
   mer text bara for att den namner ett artal. */
const MAX_UTDRAG = 6;
const MAX_UTDRAG_PERIOD = 16;
// Historik pa begaran: hogst sa har manga dokument hamtas hem per bolag och
// fraga. Fyra racker for ett ar (tre kvartalsrapporter plus bokslutet) och
// kostar runt 200 ms parallellt.
const MAX_HISTORIK = 4;
// Indexet ar ~1 MB per bolag och andras en gang om dagen. Utan cache skulle
// varje historisk fraga dra hem det pa nytt.
const INDEX_TTL = 86400;
// Taket for det pa-begaran-hamtade arkivet. Det ligger i en EGEN nyckel,
// arkiv:hist:<id>, av tva skal: nattjobbet ager arkiv:<id> och ska inte behova
// sla ihop med oss, och en historisk post skulle annars kastas ut direkt av
// nattjobbets "nyast forst, kapa pa 40".
const HIST_MAX_DOK = 60;
const HIST_MAX_BYTE = 600 * 1024;
// Hur stort glappet mellan fragans period och arkivets horisont maste vara for
// att en hamtning ska vara vard ett natverksanrop. Rapporter kommer kvartalsvis,
// sa ett glapp pa nagra dagar i borjan av perioden kan inte innehalla en rapport
// vi saknar. Utan marginalen hamtade "vad hande 2026" hela floedet bara for att
// arkivet rakade borja den 2 januari.
const HORISONT_MARGINAL_DAGAR = 30;

// Strypning per identitet, inte per IP. En IP byts pa en sekund och straffar
// dessutom alla bakom samma nat. Plus ett globalt dygnstak for dagen da nagot
// gatt fel och alla fragar samtidigt.
const TAK_MINUT = 8;
const TAK_DYGN = 60;
const TAK_GLOBALT = 400;

const SYSTEM_BAS =
  "Du ar Delagarens assistent, en lugn och saklig hjalp for en privatinvesterare i en kurs om fundamental aktieanalys.\n\n" +
  "Regler:\n" +
  "- Svara pa svenska och konkret. Lat langden folja fragan: en enkel fraga far ett kort svar, en fraga som spanner over flera rapporter eller flera ar far det utrymme den behover.\n" +
  "- Svara BARA pa fragor om anvandarens egna innehav och om kursens innehall (fundamental aktieanalys). Avboj vanligt annat.\n" +
  "- Ge ALDRIG finansiell radgivning eller kop/salj-rekommendationer. Forklara mekanik och vad anvandaren sjalv kan titta pa. Besluten ar anvandarens.\n" +
  "- Inga tankstreck. Anvand komma, kolon eller punkt.\n";

/* TVA REGISTER, och skillnaden mellan dem ar hela poangen.

   Fore det har var varje rad i den har prompten ett forbud, elva stycken, och
   ingen rad sa vad assistenten SKA gora nar den vill grava. Modellen
   generaliserade forsiktigheten fran talen till hela svaret: den vagade inte
   resonera, inte peka pa en lucka, inte foresla ett nasta steg. Taket pa fem
   meningar gjorde resten. Piloten beskrev den som toklast.

   Kallgrinden bryr sig BARA om tal. Allt annat var sjalvpalagt. */
const SYSTEM_DOKUMENT =
  "\nDu har fatt utdrag ur bolagens egna dokument, och ibland ett NYCKELTAL- och HARLETT-block.\n\n" +
  "TALEN AR LASTA:\n" +
  "- Anvand bara tal som ORDAGRANT star i underlaget. Utfor ALDRIG egna berakningar: ingen addition, subtraktion, procentandel eller summering. Du ar munnen, aldrig raknaren.\n" +
  "- HARLETT-blocket ar redan utraknat i kod. Behovs en forandring, en takt eller en burn rate: las den darifran, ordagrant. Star den inte dar finns den inte, och da sager du det.\n" +
  "- Var noga med perioder. Ett tal i parentes efter ett annat ar samma period FORRA aret, inte forra kvartalet. Jamfor dem aldrig som om de foljde pa varandra.\n" +
  "- Namn kallan i klartext efter pastaendet, med dokumentets rubrik.\n\n" +
  "RESONEMANGET AR FRITT. Forsiktigheten ovan galler tal, ingenting annat. Var den gravande laskamraten, inte en uppslagsbok:\n" +
  "- Bind ihop det du ser. Star samma sak i tva dokument, eller sager de emot varandra, sa sag det.\n" +
  "- Sag vad ett tal betyder for en agare, och vad det INTE sager. Det ar mekanik, inte radgivning.\n" +
  "- Peka pa vad du skulle vilja se harnast for att komma vidare, och var det brukar sta.\n" +
  "- Stall garna en foljdfraga tillbaka nar fragan gar att skarpa.\n\n" +
  "NAR UNDERLAGET INTE RACKER sager du det pa den har formen, aldrig bara att det inte framgar:\n" +
  "1. vad du faktiskt har, med bolag och period,\n" +
  "2. vad som saknas for att svara,\n" +
  "3. vad anvandaren kan gora at det.\n" +
  "- Namner anvandaren ett artal eller en period hamtar systemet automatiskt bolagets dokument fran den tiden, aven sadana som inte redan lasts in. Saknar du en period: sag att anvandaren kan fraga om just det aret, sa hamtas det da.\n" +
  "- Gissa aldrig, och rakna aldrig fram ett tal som saknas. Att sakna ett svar ar ett giltigt svar, sa lange du sager VAD du saknar.\n";

/* Utan dokument ska svaret INTE se ut som ett analyssvar. Fore den har regeln
   svarade Fraga flytande och sakligt aven nar den inte hade en enda rad om
   bolaget, och anvandaren kunde inte se skillnaden. Registret ska byta: fran
   "sa har ligger det till" till "sa har tar du reda pa det". */
const SYSTEM_UTAN_DOKUMENT =
  "\nDu har INGA dokument om bolagen i fragan. Om det galler:\n" +
  "- Borja svaret med att du inte har nagra dokument om bolaget, i en kort mening.\n" +
  "- Svara sedan pa METODEN: vad anvandaren sjalv ska titta pa och var, och vad det betyder. Peka garna pa en lektion i kursen.\n" +
  "- Anvand innehavet nedan nar fragan galler portfoljen. Hitta ALDRIG pa siffror som inte finns i datan.\n" +
  "- Pasta aldrig nagot om vad bolaget har rapporterat, sagt eller gjort. Det vet du inte.\n";

/* Tesen ar med i prompten men ar INTE en kalla. Skillnaden ar hela poangen: en
   rapport sager vad bolaget redovisat, tesen sager vad anvandaren tror. Later
   assistenten dem lata likadant har den gjort anvandarens antagande till ett
   faktum, och det ar precis sa en tes slutar bli provad. */
const SYSTEM_TES =
  "\nDu har fatt anvandarens EGEN TES for ett eller flera bolag. Om den galler:\n" +
  "- Tesen ar anvandarens eget resonemang, inte ett dokument. Den sager vad anvandaren tror, aldrig vad som ar sant.\n" +
  "- Anvand den for att forsta vad anvandaren bryr sig om, och for att peka pa var underlaget stodjer eller motsager den.\n" +
  "- Presentera aldrig nagot ur tesen som ett faktum eller som nagot bolaget rapporterat.\n" +
  "- Namner du ett tal ur tesen: skriv ut att det kommer darifran, med orden \"din tes\" eller \"du skrev\".\n" +
  "- Ge inget omdome om tesen ar bra eller dalig, och sag aldrig kop eller salj.\n";

// Attribution, grovt men mekaniskt: sager svaret var talet kommer ifran?
const TES_ATTRIBUTION = /(din tes|i tesen|enligt tesen|ur tesen|du skrev|din egen tes)/i;

/* Vad systemet faktiskt gjorde, sagt till modellen.

   Tackningen raknades ut men modellen fick aldrig se den. Sa nar arkivet var
   tunt sa assistenten den vagaste mening som finns, "det framgar inte av de
   dokument jag har", medan servern satt pa det exakta svaret: vilka bolag som
   hade arkiv, hur langt bak, vilka som lamnades utanfor och varfor.

   Skillnaden i upplevelse mellan de tva ar hela avstandet mellan en last och en
   gravande assistent, och den kostar ingenting i korrekthet:

     "Det framgar inte av de dokument jag har."

     "Jag har Unibaps pressmaterial fran 2017 och framat och laste de fyra som
      namner kassaflode. Uppstallningen du fragar om star bara i rapportbilagorna.
      Fraga om 2022 sa hamtar jag rapporterna fran da."

   Samma grind, samma noll pahittade tal. */
export function tackningText(tackning) {
  const t = tackning || {};
  const rader = [];

  if (t.period && t.period.fran) {
    rader.push("- Fragan tolkades som att den galler perioden " + t.period.fran + " till " + t.period.till + ".");
  }
  for (const b of t.bolag || []) {
    if (b && b.arkiv === false) rader.push("- " + b.namn + ": inget underlag, " + (b.av || "okand orsak") + ".");
  }
  for (const namn of t.utelamnade || []) {
    if (namn) rader.push("- " + namn + " namndes i fragan men lamnades utanfor: hogst tva bolag at gangen.");
  }
  if (t.hamtade) rader.push("- " + t.hamtade + " aldre dokument hamtades hem for just den har fragan.");
  if (t.lasta) rader.push("- " + t.lasta + " utdrag lastes.");
  if (t.orsak) rader.push("- Inga dokument alls den har gangen: " + t.orsak + ".");

  if (!rader.length) return "";
  return "\n\nSA HAR GICK SOKNINGEN. Det ar vad systemet gjorde, inte vad som finns i varlden.\n" +
    rader.join("\n") +
    "\n- Kan du inte svara fullt ut: sag i klartext vilken av punkterna ovan som ar skalet. Skyll aldrig pa att det bara inte framgar.\n";
}

/* Modellval efter fragans storlek, inte efter fragans amne.

   Haiku racker for en enradig fraga om ett bolag dar utdragen redan ar utvalda.
   Den racker inte for en fraga som spanner over flera rapporter eller flera ar:
   da ska svaret halla ihop en kedja over dokument, halla isar perioder och saga
   vad som saknas. Kostnaden stiger alltsa bara dar den fortjanar det. */
export function valjModell(arg) {
  const a = arg || {};
  if (a.period) return MODEL_DJUP;
  if (Number(a.bolag) > 1) return MODEL_DJUP;
  if (Number(a.utdrag) > MAX_UTDRAG) return MODEL_DJUP;
  return MODEL_SNABB;
}

/* Kursen som kalla, och skillnaden mellan att peka och att citera.

   Prompten sa "Peka garna pa en lektion i kursen" medan modellen inte hade en
   enda lektion i kontexten. Den hittade alltsa pa lektionsnummer, och just den
   raden ligger i grenen UTAN dokument, dar kallgrinden inte kors alls (den
   kraver utdrag.length). Pa den vag dar assistenten hade minst att komma med
   var den alltsa helt ogrindad.

   Tva niva'er, och de gor olika saker:

   INDEX, alla 66 lektionernas id och titel, tva kB, ligger ALLTID i prompten.
   Det ensamt gor ett pahittat lektionsnummer omojligt.

   LEKTIONSTEXT slas upp for hogst tva lektioner, och bara nar fragan faktiskt
   handlar om metod. En fraga som "vad hande med Unibap i gar" ska inte betala
   femtusen tokens for en lektion den inte ska anvanda.

   TALEN I KURSMATERIALET AR INTE BOLAGSDATA. Kursen innehaller siffror ur
   forskning och ur illustrativa exempel. Slapptes de in i kallgrindens underlag
   skulle "14,3" ur Morningstar-fyndet i 0.1 bli ett godkant tal att skriva ut
   om Unibaps marginal. Lektionstexten gar darfor ALDRIG in i grindens underlag,
   och prompten sager rakt ut att tal om bolagen bara far komma ur dokumenten. */

// Ett tak sa prompten inte kan svalla av en lang lektion. Snittet ar 8674
// tecken; 6000 racker for resonemanget, och det ar resonemanget vi ar ute efter.
const MAX_LEKTIONSTEXT = 6000;
const RADBRYT = String.fromCharCode(10);

/* Ett traffat ord i TITELN racker, tre traffar i malet ocksa.

   Tva forsok innan det har satt. Det forsta viktade pa ordlangd, och da foll
   korta facktermer ut: "vad ar ROIC" traffade ingenting fast 5.1 heter
   "Marginaler och ROIC". Det andra matchade delstrangar, och da traffade
   "vad hande med Unibap i gar" tva lektioner om loften och affarsmodeller, for
   att "gar" star inne i andra ord. ANTALET traffade ORD ar rätt matt. */
const TITELVIKT = 3;
const MIN_POANG = 3;
// Under fyra tecken ar ett ord for trubbigt for att saga nagot om relevans.
const MIN_TERM = 4;

/* Diakriter bort pa bada sidor. Folk skriver "kassaflode" lika ofta som
   "kassaflöde", och en lektion far inte bli osynlig for det. Split och join i
   stallet for regex, lika tydligt och utan escape-fallor. */
function nyckla(s) {
  const v = String(s || "").toLowerCase();
  return v.split("å").join("a").split("ä").join("a").split("ö").join("o");
}

const ORD = (s) => nyckla(s).split(/[^a-z0-9]+/).filter((o) => o.length >= MIN_TERM);

/* Prefixmatchning at bada hall, sa "ledningen" traffar "ledning" och
   "kassaflode" traffar "kassaflodet". Boejningar ar regel i svenska, och exakt
   likhet skulle missa de flesta riktiga fragor. */
function traffar(ord, term) {
  for (const o of ord) if (o.startsWith(term) || term.startsWith(o)) return true;
  return false;
}

export function valjLektioner(fraga, max = 2) {
  const t = termer(fraga).map(nyckla).filter((o) => o.length >= MIN_TERM);
  if (!t.length) return [];

  const funna = [];
  for (const rad of REGISTER.split(RADBRYT)) {
    const delar = rad.split(" | ");
    const id = delar[0];
    const titel = delar[1] || "";
    if (!id) continue;
    const ordITitel = ORD(titel);
    const ordIRaden = ORD(rad);
    let poang = 0;
    for (const term of t) {
      // Titeln sager vad lektionen AR, malet vad den ger. Titeln vager tyngre.
      if (traffar(ordITitel, term)) poang += TITELVIKT;
      else if (traffar(ordIRaden, term)) poang += 1;
    }
    if (poang >= MIN_POANG) funna.push({ id: id, titel: titel, poang: poang });
  }

  return funna
    .sort((a, b) => b.poang - a.poang || a.id.localeCompare(b.id))
    .slice(0, max)
    .map((l) => ({ id: l.id, titel: l.titel, text: String(LEKTIONER[l.id] || "").slice(0, MAX_LEKTIONSTEXT) }));
}

/** Kursmaterialet som promptavsnitt. Alltid registret, ibland texten. */
export function kursText(lektioner) {
  const valda = lektioner || [];
  let ut = "\n\nKURSENS LEKTIONER, alla som finns:\n" + INDEX +
    "\n- Hanvisa garna till en lektion, men BARA till ett id som star i listan ovan. Hitta aldrig pa ett lektionsnummer och gissa aldrig en titel.\n";
  if (valda.length) {
    ut += "\nMATERIALET UR DE LEKTIONER SOM LIGGER NARMAST FRAGAN:\n\n" +
      valda.map(function (l) { return l.text; }).join("\n\n---\n\n") +
      "\n- Kursmaterialet ovan forklarar METOD. Tal om anvandarens bolag tas ALDRIG darifran, bara ur dokumentutdragen.\n";
  }
  return ut;
}

async function getUser(base, secret, token) {
  if (!token) return null;
  try {
    const r = await fetch(base + "/auth/v1/user", {
      headers: { apikey: secret, Authorization: "Bearer " + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

async function getHoldings(base, secret, uid) {
  try {
    const r = await fetch(
      base + "/rest/v1/holdings?user_id=eq." + encodeURIComponent(uid) +
      "&select=id,name,ticker,quantity,gav,relation",
      { headers: { apikey: secret, Authorization: "Bearer " + secret } }
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) { return []; }
}

/* Teserna for de bolag fragan galler. Filtrerar pa uid OCH pa holding_id, sa en
   tes ar lika omojlig att lasa at fel person som ett innehav.

   Saknas tabellen (migrationen inte kord) svarar PostgREST 404, och det far inte
   gora Fraga trasig: da finns ingen tes, och allt annat fungerar som forut. */
async function getTheses(base, secret, uid, traffar) {
  const ids = traffar.map(function (h) { return h.id; }).filter(Boolean);
  if (!ids.length) return [];
  try {
    const r = await fetch(
      base + "/rest/v1/theses?user_id=eq." + encodeURIComponent(uid) +
      "&holding_id=in.(" + ids.map(encodeURIComponent).join(",") + ")&select=holding_id,why",
      { headers: { apikey: secret, Authorization: "Bearer " + secret } }
    );
    if (!r.ok) return [];
    const rader = await r.json();
    if (!Array.isArray(rader)) return [];
    return rader
      .filter(function (rad) { return rad && String(rad.why || "").trim(); })
      .map(function (rad) {
        const h = traffar.find(function (x) { return x.id === rad.holding_id; });
        return { namn: (h && h.name) || "Innehavet", why: String(rad.why).trim() };
      });
  } catch (e) { return []; }
}

/* Innehavets namn -> arkivets bolagsid. Arkivet indexeras pa motorns slug och
   innehavet bar anvandarens stavning, sa matchningen ar los at bada hall:
   "Saniona AB (publ)" ska hitta arkivets "Saniona AB (publ)" men ocksa
   "Unibap Space Solutions" arkivets "unibap". */
function arkivIdFor(holding, index) {
  const rensa = (s) => String(s || "").toLowerCase()
    .replace(/\s+ab\b.*$/, "").replace(/\s*\(publ\.?\)\s*$/, "").trim();
  const namn = rensa(holding.name);
  if (!namn) return null;
  let bast = null;
  for (const rad of index) {
    const kandidat = rensa(rad.namn);
    if (!kandidat) continue;
    if (kandidat === namn) return rad.id;
    if (namn.startsWith(kandidat) || kandidat.startsWith(namn)) {
      if (!bast || kandidat.length > bast.langd) bast = { id: rad.id, langd: kandidat.length };
    }
  }
  return bast ? bast.id : null;
}

/* Aldsta och nyaste dokumentdatum i en samling. Det ar arkivets HORISONT, och
   den maste vara utskriven bade i prompten och i svaret: utan den kan modellen
   inte veta att den saknar en period, och anvandaren kan inte veta att svaret
   bara tackte en del av fragan. */
function spann(dokument) {
  const datum = (dokument || []).map((d) => String(d.datum || "").slice(0, 10)).filter(Boolean).sort();
  return datum.length ? { aldst: datum[0], nyast: datum[datum.length - 1] } : { aldst: null, nyast: null };
}

/* Skriver hem det som hamtats pa begaran, sa nasta fraga om samma period ar
   gratis. Arkivet ar per bolag och inte per anvandare, sa den forsta som fragar
   varmer at alla andra.

   Nyast forst och kapa: samma hallning som motor/bygg-arkiv.mjs, men i en egen
   nyckel och med ett eget tak, sa nattjobbets arkiv aldrig ror sig harifran. */
async function sparaHistorik(kv, id, befintliga, nya) {
  if (!kv || !nya.length) return;
  const kanda = new Map((befintliga || []).map((d) => [d.url, d]));
  for (const d of nya) if (!kanda.has(d.url)) kanda.set(d.url, d);
  const dokument = [...kanda.values()]
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .slice(0, HIST_MAX_DOK);
  while (dokument.length > 1 && JSON.stringify(dokument).length > HIST_MAX_BYTE) dokument.pop();
  try {
    await kv.put("arkiv:hist:" + id, JSON.stringify({ uppdaterad: new Date().toISOString(), dokument }));
  } catch (e) { /* cachen ar en bonus, inte ett krav */ }
}

async function stryp(kv, id) {
  if (!kv) return null; // utan bindning: slapp igenom, limitern far inte falla svaret
  const nu = Date.now();
  const fonster = [
    { nyckel: `fraga:m:${id}:${Math.floor(nu / 60e3)}`, tak: TAK_MINUT, ttl: 120,
      fel: "Manga fragor pa kort tid. Vanta en minut, sa oppnar det igen." },
    { nyckel: `fraga:d:${id}:${Math.floor(nu / 864e5)}`, tak: TAK_DYGN, ttl: 90000,
      fel: "Du har natt dagens grans for fragor. Den aterstalls i morgon." },
    { nyckel: `fraga:global:${Math.floor(nu / 864e5)}`, tak: TAK_GLOBALT, ttl: 90000,
      fel: "Fraga ar overbelastad just nu. Forsok igen i morgon." },
  ];
  for (const f of fonster) {
    let n = 0;
    try { n = parseInt((await kv.get(f.nyckel)) || "0", 10) || 0; } catch (e) { return null; }
    if (n >= f.tak) return f.fel;
    try { await kv.put(f.nyckel, String(n + 1), { expirationTtl: f.ttl }); } catch (e) { /* ok */ }
  }
  return null;
}

/* Returnerar { text } eller { fel, status, meddelande }.
   Skilj pa felen. Forsta versionen svalde allt till null och rapporterade
   "svarade inte i tid", vilket ledde fel i ett halvtimmes felsokande: modellen
   svarade pa 276 ms, med att kontot var slut pa krediter. Ett fel som pekar at
   fel hall ar samre an inget fel alls. */
async function anropa(apiKey, kropp) {
  const ctrl = new AbortController();
  const klocka = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kropp),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      const m = (d && d.error && d.error.message) || "";
      // Slut pa krediter ar ett driftfel hos oss, inte ett fel anvandaren gjort.
      // Sag det rakt ut i stallet for att lata det se ut som strul hos modellen.
      if (/credit balance|billing|quota/i.test(m)) {
        return { fel: "kredit", status: 503, meddelande: "Fraga ar tillfalligt av: kontot hos modelleverantoren behover fyllas pa." };
      }
      if (r.status === 429) {
        return { fel: "modell-429", status: 429, meddelande: "Modellen ar overbelastad just nu. Forsok igen om en stund." };
      }
      return { fel: "http", status: 502, meddelande: "Modellen svarade med ett fel (" + r.status + ")." };
    }
    const d = await r.json();
    return { text: (d.content || []).map((b) => b.text || "").join("").trim() };
  } catch (e) {
    const avbruten = e && e.name === "AbortError";
    return avbruten
      ? { fel: "timeout", status: 504, meddelande: "Det tog for lang tid. Skicka fragan igen." }
      : { fel: "nat", status: 502, meddelande: "Kunde inte na modellen." };
  } finally {
    clearTimeout(klocka);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;

  if (!apiKey) return json({ error: "AI ej konfigurerad (saknar ANTHROPIC_API_KEY)." }, 501);

  // Ursprung: cookien ar SameSite=Lax, men kontraktet ska sta har och inte antas.
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Fel ursprung." }, 403);

  let question = "", token = "";
  try {
    const body = await request.json();
    question = String(body.question || "").trim();
    token = String(body.token || "").trim();
  } catch (e) { /* tom */ }
  if (!question) return json({ error: "Tom fraga." }, 400);
  if (question.length > MAX_FRAGA) return json({ error: "For lang fraga." }, 400);

  // Anvandaren + innehav. RLS-oberoende: vi filtrerar sjalva pa uid, sa ingen
  // kan fraga om nagon annans portfolj ens med en giltig token.
  let holdings = [], user = null;
  if (secret && token) {
    user = await getUser(base, secret, token);
    if (user) holdings = await getHoldings(base, secret, user.id);
  }

  const stopp = await stryp(env.RL, user ? user.id : (request.headers.get("CF-Connecting-IP") || "okand"));
  if (stopp) return json({ error: stopp }, 429);

  const holdingsText = holdings.length
    ? holdings.map(function (h) {
        return "- " + (h.name || "?") + (h.ticker ? " (" + h.ticker + ")" : "") +
          ", antal " + (h.quantity != null ? h.quantity : "?") +
          ", GAV " + (h.gav != null ? h.gav : "?") +
          ", relation " + (h.relation || "ager");
      }).join("\n")
    : "Inga innehav uppladdade an.";

  // Steg 1: vilka av anvandarens bolag handlar fragan om. Ingen modell behovs.
  // Routningen kors aven utan KV-bindning: tesen bor i Supabase och ska med aven
  // for ett bolag vi inte har ett enda dokument om.
  let utdrag = [], teser = [];
  let nyckeltal = { text: "", tillatnaTal: [], harledda: [] };

  const period = periodIFragan(question);

  /* TACKNINGEN. Fore det har kunde Fraga svara med noll dokument pa fem olika
     satt, alla tysta: inga innehav, inget bolag matchat, inget arkiv-id, tomt
     arkiv, eller ingen KV-bindning. I samtliga fall fick anvandaren ett flytande
     svar byggt pa innehavslistan och kursens metod, utan att kunna se det.

     Det ar farligare har an i en sokmotor: brevets loffte ar att tystnad betyder
     att inget hant, och lar sig anvandaren lasa Fraga med samma semantik har
     gravverktyget atit upp forsakringen. Darfor redovisas alltid vad som lastes
     och vad som saknas. */
  const tackning = {
    period: period ? { fran: period.fran, till: period.till } : null,
    bolag: [], utelamnade: [], lasta: 0, hamtade: 0, orsak: null,
  };

  if (!holdings.length) {
    tackning.orsak = "inga innehav uppladdade";
  } else {
    const alla = bolagIFragan(question, holdings) || [];
    const traffar = alla.slice(0, 2); // hogst tva bolag
    // Det slice(0, 2) tappade sades tidigare inte till nagon.
    tackning.utelamnade = alla.slice(2).map((h) => h.name || "");
    if (!traffar.length) {
      tackning.orsak = "inget av dina bolag namndes i fragan";
    } else {
      if (secret && user) teser = await getTheses(base, secret, user.id, traffar);
      if (!env.DATA) {
        tackning.orsak = "dokumentarkivet ar inte tillgangligt";
      } else {
        const index = (await env.DATA.get("arkiv:index", "json")) || [];
        const arkiv = [];
        for (const h of traffar) {
          const namn = h.name || "";
          const id = arkivIdFor(h, index);
          if (!id) { tackning.bolag.push({ namn, arkiv: false, av: "finns inte i arkivets index" }); continue; }

          const a = (await env.DATA.get("arkiv:" + id, "json")) || null;
          const hist = (await env.DATA.get("arkiv:hist:" + id, "json")) || null;
          const dokument = [...((a && a.dokument) || []), ...((hist && hist.dokument) || [])];
          if (!dokument.length) { tackning.bolag.push({ namn, arkiv: false, av: "inga dokument i arkivet" }); continue; }

          /* HISTORIK PA BEGARAN. Nattjobbet ackumulerar bara det som varit nytt
             sedan bevakningen borjade, sa arkivets horisont ar ung. Racker den
             inte for fragans period hamtar vi primarkallan nu, valjer pa rubrik
             och hamtar bara vinnarna. Kallgrinden nedan bryr sig inte om varifran
             utdraget kom, sa rackvidden vaxer utan att garantin forsvagas. */
          let hamtade = [];
          const har = spann(dokument);
          const glapp = period && period.fran && har.aldst
            ? (Date.parse(har.aldst) - Date.parse(period.fran)) / 86400000
            : Infinity;
          if (period && period.fran && glapp > HORISONT_MARGINAL_DAGAR) {
            const nyckel = "mfn:idx:" + id;
            let cachat = null;
            try { cachat = await env.DATA.get(nyckel, "json"); } catch (e) { /* utan cache: hamta */ }
            const r = await hamtaPeriod({
              dokumentUrl: dokument[0] && dokument[0].url,
              period, termer: termer(question), max: MAX_HISTORIK,
              kanda: new Set(dokument.map((d) => d.url)),
              index: cachat,
            });
            if (!r.fransCache && r.index.length) {
              try { await env.DATA.put(nyckel, JSON.stringify(r.index), { expirationTtl: INDEX_TTL }); } catch (e) { /* ok */ }
            }
            hamtade = r.dokument;
            if (hamtade.length) {
              dokument.push(...hamtade);
              tackning.hamtade += hamtade.length;
              await sparaHistorik(env.DATA, id, (hist && hist.dokument) || [], hamtade);
            }
          }

          const s = spann(dokument);
          tackning.bolag.push({
            namn, arkiv: true, dokument: dokument.length,
            aldst: s.aldst, nyast: s.nyast, hamtade: hamtade.length,
          });
          arkiv.push({ id, namn: (a && a.namn) || namn, dokument });
        }
        // Steg 2: de mest relevanta bitarna ur de bolagens dokument, plus
        // nyckeltalen per period och det som gar att harleda ur dem i kod.
        // Perioden skickas in sa urvalet anvander samma tolkning som avgjorde
        // om dokument skulle hamtas hem.
        if (arkiv.length) {
          utdrag = hamtaUtdrag(question, arkiv, period ? MAX_UTDRAG_PERIOD : MAX_UTDRAG, Date.now(), period);
          nyckeltal = nyckeltalsUnderlag(arkiv);
          tackning.lasta = utdrag.length;
        } else if (!tackning.orsak) {
          tackning.orsak = "inga dokument for bolaget i fragan";
        }
      }
    }
  }

  // Tesen far egen rubrik och star efter siffrorna, sa den aldrig kan lasas som
  // en fortsattning pa nagot bolaget sjalvt skrivit.
  const tesText = teser.length
    ? "\n\nANVANDARENS EGEN TES (skriven av anvandaren, inte ett dokument):\n\n" +
      teser.map(function (t) { return "[" + t.namn + "]\n" + t.why; }).join("\n\n")
    : "";

  /* HORISONTEN. Utan den kan modellen inte avsta pa ratt grund: den ser sex
     traffande utdrag, svarar sakligt om dem, och varje tal star i underlaget sa
     kallgrinden slapper igenom. Resultatet ar sant, valciterat och om fel
     period. Grinden skyddar mot pahittade tal, inte mot fel ar, sa granserna
     maste sagas ut i klartext har. */
  const medArkiv = tackning.bolag.filter(function (b) { return b.arkiv && b.aldst; });
  const horisontText = medArkiv.length
    ? "\n\nDITT UNDERLAG, granser du MASTE respektera:\n" +
      medArkiv.map(function (b) {
        return "- " + b.namn + ": " + b.dokument + " dokument, " + b.aldst + " till " + b.nyast + ".";
      }).join("\n") +
      "\n- Galler fragan helt eller delvis en period FORE det aldsta datumet ovan: sag rakt ut att du saknar underlag for den perioden och fran vilket datum du har. Svara sedan bara om det du faktiskt har, och skriv ut vilken period svaret galler.\n" +
      "- Pasta aldrig att en period saknas nar den finns, och tig aldrig om att den saknas nar den gor det.\n"
    : "";

  /* Kursen som kalla. Registret ligger alltid med, sa ett pahittat
     lektionsnummer ar omojligt; sjalva lektionstexten bara nar fragan handlar om
     metod. Se valjLektioner. */
  const lektioner = valjLektioner(question);
  tackning.lektioner = lektioner.map(function (l) { return l.id; });

  const system = SYSTEM_BAS +
    (utdrag.length ? SYSTEM_DOKUMENT + horisontText : SYSTEM_UTAN_DOKUMENT) +
    tackningText(tackning) +
    kursText(lektioner) +
    (teser.length ? SYSTEM_TES : "") +
    "\nAnvandarens innehav:\n" + holdingsText +
    (nyckeltal.text ? "\n\n" + nyckeltal.text : "") +
    tesText +
    (utdrag.length
      ? "\n\nUtdrag ur bolagens egna dokument:\n\n" + utdrag.map(function (u) {
          return "[" + u.bolag + " · " + u.rubrik + " · " + u.datum + "]\n" + u.text;
        }).join("\n\n---\n\n")
      : "");

  const modell = valjModell({ period: period, bolag: tackning.bolag.length, utdrag: utdrag.length });
  tackning.modell = modell;
  const brev = { max_tokens: 1600, system: system, messages: [{ role: "user", content: question }] };
  let svar = await anropa(apiKey, Object.assign({ model: modell }, brev));
  /* Ett routningsbeslut far aldrig ta ner Fraga. Faller den djupa modellen, av
     vilket skal som helst, provas den snabba en gang innan vi ger upp. Da blir
     svaret grundare, aldrig borta. */
  if (svar.fel && modell !== MODEL_SNABB) {
    tackning.modell = MODEL_SNABB;
    tackning.modellfall = true;
    svar = await anropa(apiKey, Object.assign({ model: MODEL_SNABB }, brev));
  }
  if (svar.fel) return json({ error: svar.meddelande }, svar.status);
  const answer = svar.text;
  if (!answer) return json({ answer: "Jag har inget bra svar pa det just nu.", tackning: tackning });

  // Kallgrinden. Bara nar svaret bygger pa dokument: utan utdrag finns inget
  // underlag att grinda mot, och da ar innehavets egna tal (antal, GAV) sanningen.
  if (utdrag.length) {
    // Anvandarens egna tal ar ocksa underlag: antal och GAV star i innehavet,
    // inte i nagot pressmeddelande, och ett svar om dem far inte blockeras.
    const egnaTal = [];
    for (const h of holdings) {
      if (h.quantity != null) egnaTal.push(Number(h.quantity));
      if (h.gav != null) egnaTal.push(Number(h.gav));
      if (h.quantity != null && h.gav != null) egnaTal.push(Number(h.quantity) * Number(h.gav));
    }
    // Harledda tal ar raknade i kod och ar darfor lika giltigt underlag som ett
    // tal ur ett dokument. Det ar hela poangen med att rakna dem har i stallet.
    const ogrundade = ogrundadeTal(answer, utdrag, question, egnaTal.concat(nyckeltal.tillatnaTal));

    // Tal ur tesen ar en tredje sort. De ar inte hittepa: anvandaren skrev dem
    // sjalv. Men de ar heller inte rapporterade, sa de far bara sagas om svaret
    // sager var de kommer ifran. Utan den regeln blir ett antagande till ett
    // faktum bara for att en assistent lasit tillbaka det.
    const tesTal = new Set();
    for (const t of teser) for (const x of hittaTal(t.why)) tesTal.add(x.varde);
    const franTes = [], hittepa = [];
    for (const t of ogrundade) {
      ([...tesTal].some(function (v) { return Math.abs(v - t.varde) < 1e-9; }) ? franTes : hittepa).push(t);
    }

    if (hittepa.length) {
      return json({
        answer: "Jag hittade ett svar, men det innehöll tal som inte står i dokumenten jag har (" +
          hittepa.map(function (t) { return t.rå; }).join(", ") +
          "). Då visar jag det inte. Fråga gärna om en enskild siffra i stället, så svarar jag ur källan.",
        blockerat: true,
        kallor: utdrag.map(function (u) { return { rubrik: u.rubrik, url: u.url }; }),
        tackning: tackning,
      });
    }
    if (franTes.length && !TES_ATTRIBUTION.test(answer)) {
      return json({
        answer: "Jag hittade ett svar, men det upprepade tal ur din egen tes (" +
          franTes.map(function (t) { return t.rå; }).join(", ") +
          ") utan att säga varifrån de kom. Din tes är vad du tror, inte vad bolaget har rapporterat, " +
          "och de två får inte se likadana ut. Fråga gärna om siffran i rapporterna i stället.",
        blockerat: true,
        kallor: utdrag.map(function (u) { return { rubrik: u.rubrik, url: u.url }; }),
        tackning: tackning,
      });
    }
  }

  return json({
    answer: answer,
    kallor: utdrag.map(function (u) { return { rubrik: u.rubrik, url: u.url, datum: u.datum }; }),
    // Underlaget, alltid med: vad som lastes och vad som saknas. Sidan ska kunna
    // visa granserna bredvid svaret, inte som en fotnot efterat.
    tackning: tackning,
    // Uträkningarna med, sa sidan kan visa HUR ett harlett tal uppstod. Ett tal
    // som inte star i nagon rapport ska aldrig presenteras utan sin rakning.
    harlett: nyckeltal.harledda,
  });
}
