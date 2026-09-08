/* Fraga-assistenten, server-side.
   Dokumenthamtning och kodberakningar bygger ett requestlokalt faktaregister.
   Modellen valjer postreferenser; servern renderar hela faktauppgiften.
   Fri prosa granskas mekaniskt och separat semantiskt. Det senare ar ett
   extra skydd, inte en garanti for att varje tolkning ar riktig. */

import { secureJson as json } from "./_lib.js";
import { hamtaUtdrag, bolagIFragan, termer, periodIFragan } from "./_kallgrind.js";
import { skapaFaktaregister } from "./_faktaregister.js";
import { SVAR_KONTRAKT, GRANSKA_SYSTEM, lasFaktasvar, godkandGranskning } from "./_faktasvar.js";
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

/* Faktauppgifter och tolkningar har skilda svarstyper. */
const SYSTEM_DOKUMENT =
  "\nDu har bolagens dokument och ett faktaregister. Anvand postreferenser for faktauppgifter.\n" +
  "Resonera om vad underlaget stodjer, vad som talar emot och vad som saknas. " +
  "Markera tolkningar och ange stodreferenser. Faktapastaenden, aven utan siffror, kraver belagg.\n" +
  "Skilj perioder, bolag, rapporterat och antaganden. En jamforelse i parentes ar normalt samma period forra aret.\n";

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
  "\nAnvandarens tes ar ett antagande. Aterge den bara via dess postreferens. " +
  "En tolkning av tesen ska markeras och referera bade till tesen och relevanta dokument.\n";

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

/* Kursregistret ger routningshjalp. Valda lektioner blir egna kallposter,
   tydligt skilda fran rapporterade bolagsfakta. Prompten ensam verifierar
   varken lektionsnummer eller fakta; slutkontraktet kontrollerar referenser. */

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

/* Verktyg kan utoka underlaget under samma svar. Nya faktaposter skickas
   som deltan; slutkontrollen anvander samma requestlokala register. */

const MAX_VARV = 2;              // alltsa hogst tre modellanrop
const UTDRAG_PER_VERKTYG = 6;

export const SYSTEM_VERKTYG =
  "\nDU KAN HAMTA MER SJALV. Svara inte att underlaget saknas forran du forsokt:\n" +
  "- las_mer: fler stycken ur det du redan har, sokta pa andra ord. Anvand den nar fragan galler nagot som borde sta i en rapport men inte kom med i utdragen.\n" +
  "- hamta_historik: hamtar bolagets egna dokument fran en aldre period, direkt fran kallan. Anvand den nar fragan galler ett ar du inte har.\n" +
  "- las_lektion: hela texten till en lektion ur registret ovan. Anvand den nar fragan galler metod.\n" +
  "- Hamta hellre en gang for mycket an svara att du inte vet. Men hamta inte i blindo: sag for dig sjalv vad du letar efter forst.\n" +
  "- Nya postreferenser kommer i verktygsresultaten. Aterge aldrig egna faktatal. Kursmaterial far inte bli bolagsfakta.\n";

export function verktygsDefinitioner() {
  return [
    {
      name: "las_mer",
      description: "Fler stycken ur bolagets dokument som du redan har tillgang till, sokta pa dina egna ord i stallet for anvandarens fraga.",
      input_schema: {
        type: "object",
        properties: {
          bolag: { type: "string", description: "Bolagets namn, precis som det star i underlaget." },
          sokord: { type: "string", description: "Orden du vill soka pa, till exempel 'kassaflode rorelsekapital'." },
        },
        required: ["bolag", "sokord"],
      },
    },
    {
      name: "hamta_historik",
      description: "Hamtar bolagets egna pressmeddelanden och rapporter fran en aldre period direkt fran kallan, for perioder som inte redan finns i arkivet.",
      input_schema: {
        type: "object",
        properties: {
          bolag: { type: "string", description: "Bolagets namn, precis som det star i underlaget." },
          fran: { type: "string", description: "Startdatum, YYYY-MM-DD." },
          till: { type: "string", description: "Slutdatum, YYYY-MM-DD." },
        },
        required: ["bolag", "fran", "till"],
      },
    },
    {
      name: "las_lektion",
      description: "Hela texten till en lektion i kursen. Id maste sta i lektionsregistret.",
      input_schema: {
        type: "object",
        properties: { id: { type: "string", description: "Lektionens id, till exempel 5.1." } },
        required: ["id"],
      },
    },
  ];
}

/* Kor ett verktyg och lamnar text tillbaka till modellen. Allt som kommer ur
   bolagens dokument laggs samtidigt till i `utdrag`, sa grinden tacker det.

   Faller ett verktyg ar det inte ett fel som ska avbryta: modellen far veta att
   det inte gick och kan svara anda. Ett trasigt natverksanrop mitt i en
   utredning ska ge ett grundare svar, aldrig inget svar. */
export function byggKorVerktyg(ctx) {
  const { arkiv, env, utdrag, tackning, question, register } = ctx;
  const medPoster = (text, lektioner = []) => {
    if (!register) return text;
    register.synka({ arkiv, utdrag, lektioner });
    tackning.faktaregister = register.status();
    return text + "\nUppdaterad dokumenthorisont efter verktyget (ersatter den tidigare):\n" +
      JSON.stringify(tackning.bolag) + register.prompt(true);
  };
  const hitta = (namn) => {
    const n = String(namn || "").toLowerCase();
    return arkiv.find((a) => String(a.namn).toLowerCase().includes(n) || n.includes(String(a.namn).toLowerCase()));
  };
  const lagg = (nya) => {
    const sedda = new Set(utdrag.map((u) => u.rubrik + "|" + u.text.slice(0, 60)));
    let n = 0;
    for (const u of nya) {
      const nyckel = u.rubrik + "|" + u.text.slice(0, 60);
      if (sedda.has(nyckel)) continue;
      sedda.add(nyckel);
      utdrag.push(u);
      n++;
    }
    tackning.lasta = utdrag.length;
    return n;
  };
  const somText = (nya) =>
    nya.map((u) => "[" + u.bolag + " · " + u.rubrik + " · " + u.datum + "]\n" + u.text).join("\n\n---\n\n");

  return async function kor(namn, indata) {
    try {
      if (namn === "las_lektion") {
        const id = String(indata.id || "").trim();
        const text = LEKTIONER[id];
        if (!text) return "Det finns ingen lektion " + id + ". Anvand ett id ur registret.";
        if (tackning.lektioner.indexOf(id) < 0) tackning.lektioner.push(id);
        return medPoster(text.slice(0, MAX_LEKTIONSTEXT), [{ id, titel: id, text: text.slice(0, MAX_LEKTIONSTEXT) }]);
      }

      const b = hitta(indata.bolag);
      if (!b) return "Jag har inget arkiv for " + indata.bolag + ". Bolag jag har: " + arkiv.map((a) => a.namn).join(", ") + ".";

      if (namn === "las_mer") {
        const nya = hamtaUtdrag(String(indata.sokord || question), [b], UTDRAG_PER_VERKTYG, Date.now(), null);
        if (!nya.length) return "Inget i " + b.namn + "s dokument matchar de orden.";
        lagg(nya);
        return medPoster(somText(nya));
      }

      if (namn === "hamta_historik") {
        const period = { fran: String(indata.fran || ""), till: String(indata.till || "") };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(period.fran)) return "Datumen ska skrivas YYYY-MM-DD.";
        const nyckel = "mfn:idx:" + b.id;
        let cachat = null;
        try { cachat = await env.DATA.get(nyckel, "json"); } catch (e) { /* utan cache: hamta */ }
        const r = await hamtaPeriod({
          dokumentUrl: b.dokument[0] && b.dokument[0].url,
          period, termer: termer(String(indata.sokord || question)), max: MAX_HISTORIK,
          kanda: new Set(b.dokument.map((d) => d.url)),
          index: cachat,
        });
        if (!r.fransCache && r.index.length) {
          try { await env.DATA.put(nyckel, JSON.stringify(r.index), { expirationTtl: INDEX_TTL }); } catch (e) { /* ok */ }
        }
        if (!r.dokument.length) return "Hittade inga dokument fran " + b.namn + " mellan " + period.fran + " och " + period.till + ".";
        b.dokument.push(...r.dokument);
        tackning.hamtade += r.dokument.length;
        const info = tackning.bolag.find(x => x.namn === b.namn);
        if (info) Object.assign(info, spann(b.dokument), {
          dokument: b.dokument.length, hamtade: (info.hamtade || 0) + r.dokument.length,
        });
        try {
          const hist = await env.DATA.get("arkiv:hist:" + b.id, "json");
          await sparaHistorik(env.DATA, b.id, hist?.dokument || [], r.dokument);
        } catch (e) { /* cache, inte kritiskt */ }
        const nya = hamtaUtdrag(question, [b], UTDRAG_PER_VERKTYG, Date.now(), period);
        lagg(nya);
        return medPoster("Hamtade " + r.dokument.length + " dokument.\n\n" + somText(nya));
      }

      return "Okant verktyg: " + namn;
    } catch (e) {
      return "Verktyget gick inte att kora just nu. Svara pa det du redan har, och sag att hamtningen inte gick.";
    }
  };
}

/* Utredningen: modellen far svara, be om mer, och svara igen. Sista varvet gar
   UTAN verktyg, sa den tvingas formulera ett svar i stallet for att fortsatta
   hamta i all evighet. */
export async function utred(apiKey, kropp, verktyg, kor, tackning) {
  const meddelanden = [{ role: "user", content: kropp.fraga }];
  for (let varv = 0; varv <= MAX_VARV; varv++) {
    const sista = varv === MAX_VARV;
    const svar = await anropa(apiKey, {
      model: kropp.model,
      max_tokens: kropp.max_tokens,
      system: kropp.system,
      messages: meddelanden,
      ...(sista ? {} : { tools: verktyg }),
    });
    if (svar.fel) return svar;
    if (svar.stopp !== "tool_use" || !svar.block) return svar;

    const anvandning = svar.block.filter((b) => b && b.type === "tool_use");
    if (!anvandning.length) return svar;

    meddelanden.push({ role: "assistant", content: svar.block });
    const resultat = [];
    for (const a of anvandning) {
      tackning.verktyg.push(a.name);
      resultat.push({ type: "tool_result", tool_use_id: a.id, content: await kor(a.name, a.input || {}) });
    }
    meddelanden.push({ role: "user", content: resultat });
  }
  return { fel: "varv", status: 502, meddelande: "Kom inte fram till ett svar." };
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
    // Blocken och stop_reason behovs for verktygsloopen; text for allt annat.
    return {
      text: (d.content || []).map((b) => b.text || "").join("").trim(),
      block: d.content || [],
      stopp: d.stop_reason || "",
    };
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
  // Arkivet lyfts ut ur blocket: verktygsloopen nedan behover det for att kunna
  // lasa mer och hamta historik pa modellens egen begaran.
  let utdrag = [], teser = [], arkivet = [];
  const register = skapaFaktaregister();

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
    // Vad modellen sjalv bad om under utredningen, och vilka lektioner den fick.
    verktyg: [], lektioner: [],
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
        const arkiv = arkivet;
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
             och hamtar bara vinnarna. De hamtade dokumenten registreras sedan
             med samma kallkedja som det befintliga arkivet. */
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
      "\n- Saknas fragans period: beskriv luckan i ett saknas-block utan egna datum. Servern visar horisonten. Verktygsresultat kan uppdatera den har initiala horisonten.\n" +
      "- Pasta aldrig att en period saknas nar den finns, och tig aldrig om att den saknas nar den gor det.\n"
    : "";

  /* Kursen som kalla. Registret ligger alltid med, sa ett pahittat
     lektionsnummer kan slas upp; sjalva lektionstexten bara nar fragan handlar om
     metod. Se valjLektioner. */
  const lektioner = valjLektioner(question);
  tackning.lektioner = lektioner.map(function (l) { return l.id; });

  /* Verktygen bara nar det finns nagot att grava i. En ren kursfraga ska inte
     betala for tre verktygsdefinitioner den aldrig anvander. */
  const kanGrava = arkivet.length > 0 && !!env.DATA;

  /* Kan den hamta sjalv har den dokument, aven om urvalet inte valde nagra.
     Med bara utdrag.length som villkor fick den registret "du har INGA dokument
     om bolagen" samtidigt som den satt med tre verktyg for att hamta dem. */
  const harUnderlag = utdrag.length > 0 || kanGrava;

  register.synka({ arkiv: arkivet, utdrag, holdings, teser, question, lektioner });
  tackning.faktaregister = register.status();

  const system = SYSTEM_BAS + SVAR_KONTRAKT +
    (kanGrava ? SYSTEM_VERKTYG : "") +
    (harUnderlag ? SYSTEM_DOKUMENT + horisontText : SYSTEM_UTAN_DOKUMENT) +
    tackningText(tackning) +
    kursText(lektioner) +
    (teser.length ? SYSTEM_TES : "") +
    "\nAnvandarens innehav:\n" + holdingsText +
    tesText +
    (utdrag.length
      ? "\n\nUtdrag ur bolagens egna dokument:\n\n" + utdrag.map(function (u) {
          return "[" + u.bolag + " · " + u.rubrik + " · " + u.datum + "]\n" + u.text;
        }).join("\n\n---\n\n")
      : "") + register.prompt();

  const modell = valjModell({ period: period, bolag: tackning.bolag.length, utdrag: utdrag.length });
  tackning.modell = modell;
  const brev = { max_tokens: 1600, system: system, messages: [{ role: "user", content: question }] };

  let svar;
  if (kanGrava) {
    svar = await utred(
      apiKey,
      { model: modell, max_tokens: 1600, system: system, fraga: question },
      verktygsDefinitioner(),
      byggKorVerktyg({ arkiv: arkivet, env: env, utdrag: utdrag, tackning: tackning, question: question, register: register }),
      tackning);
  } else {
    svar = await anropa(apiKey, Object.assign({ model: modell }, brev));
  }

  /* Varken ett routningsbeslut eller en utredning far ta ner Fraga. Faller
     nagot av dem provas det enkla anropet pa den snabba modellen en gang. Da
     provas samma svarskontrakt och verifiering igen. */
  if (svar.fel) {
    tackning.modell = MODEL_SNABB;
    tackning.modellfall = true;
    svar = await anropa(apiKey, Object.assign({ model: MODEL_SNABB }, brev));
  }
  if (svar.fel) return json({ error: svar.meddelande }, svar.status);
  const kontrollerat = lasFaktasvar(svar.text, register);
  const blockera = orsak => json({
    answer: "Jag kunde inte verifiera svaret mot underlaget och visar det inte. Prova att avgränsa frågan till en uppgift eller en rapport.",
    blockerat: true, verifiering: { format: "dataposter-v1", orsak },
    block: [], kallor: [], tackning,
  });
  if (!kontrollerat.ok) return blockera(kontrollerat.orsak);
  if (svar.stopp === "max_tokens") return blockera("avklippt");

  // Prosans innebord bevisas inte av korrekta referenser. En separat kontroll
  // kan stoppa ogrundade fakta, fel kategorisering och motsagelser.
  // Ett granskarfel far ALDRIG falla tillbaka till ett ogranskat svar.
  if (kontrollerat.prosa.length) {
    const granskning = await anropa(apiKey, {
      model: MODEL_SNABB, max_tokens: 80, system: GRANSKA_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({
        fraga: question, svar: kontrollerat.block, tackning,
        poster: register.poster(),
      }) }],
    });
    if (granskning.fel || granskning.stopp === "max_tokens" || !godkandGranskning(granskning.text)) {
      return blockera(granskning.fel ? "granskarfel" : "semantik");
    }
  }
  const anvanda = kontrollerat.referenser.map(id => register.get(id));
  const kallor = [...new Map(kontrollerat.block.flatMap(b => b.kallor)
    .map(k => [JSON.stringify([k.url, k.citat]), k])).values()];
  return json({ answer: kontrollerat.answer, block: kontrollerat.block,
    kallor, tackning, verifiering: { format: "dataposter-v1",
      prosa: kontrollerat.prosa.length ? "modellgranskad" : "ingen" },
    harlett: anvanda.filter(p => p.typ === "beraknat").map(p => ({
      metrik: p.matt, formel: p.formel, kallor: p.kallor.map(k => k.rubrik),
    })),
  });
}
