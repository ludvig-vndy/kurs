/* Fraga-assistenten, server-side.
   Dokumenthamtning och kodberakningar bygger ett requestlokalt faktaregister.
   Modellen valjer postreferenser; servern renderar hela faktauppgiften.
   Fri prosa granskas mekaniskt och separat semantiskt. Det senare ar ett
   extra skydd, inte en garanti for att varje tolkning ar riktig. */

import { secureJson as json, cachat, systemText } from "./_lib.js";
import { hamtaUtdrag, bolagIFragan, termer, periodIFragan } from "./_kallgrind.js";
import { skapaFaktaregister } from "./_faktaregister.js";
import { SVAR_KONTRAKT, GRANSKA_SYSTEM, SVARSVERKTYG, lasFaktasvar, godkandGranskning } from "./_faktasvar.js";
export { SVARSVERKTYG };
import { hamtaPeriod } from "./_mfn.js";
import { INDEX, REGISTER, LEKTIONER } from "./_kurskorpus.js";
import { budgetFor, skapaUndersokning, PLANVERKTYG, SYSTEM_DJUP, giltigPeriod } from './_utredning.js';
import { lasTrad, skrivTrad, skapaTur, samtalsText, routingUrTrad, periodUrPoster } from './_trad.js';
import { redigeraSvar } from './_redigering.js';
import {medStatus,registreraStatus,sattMoment,statusSignal} from './_fraga-status.js';

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
  "Du ar Delagarens analysbollplank, en lugn och saklig hjalp som undersoker fragor med anvandaren utifran tillgangliga data och kallor.\n\n" +
  "Regler:\n" +
  "- Svara pa svenska och konkret. Lat langden folja fragan: en enkel fraga far ett kort svar, en fraga som spanner over flera rapporter eller flera ar far det utrymme den behover.\n" +
  "- Svar först, belägg sedan. En enkel fråga behöver normalt bara den efterfrågade posten och högst en kort förklaring. En analysfråga behöver de viktigaste sambanden, inte en genomgång av allt du vet. Varje stycke ska tillföra ett svar, ett belägg eller en relevant osäkerhet.\n" +
  "- Visa bara relevanta poster. Välj typade faktaposter före långa dokumentcitat när de besvarar samma fråga. Upprepa inte tabellens eller posternas innehåll i prosa. Undvik inledningsfraser, avslutande sammanfattningar som upprepar svaret och rutinmässiga erbjudanden att fortsätta.\n" +
    "- Ange osäkerheten där den påverkar slutsatsen, en gång. Lista inte spekulativa orsaker utan nytta: välj högst de mest relevanta alternativa förklaringarna och säg vilket underlag som skulle skilja dem åt. En kort positiv tidsserie visar en förbättring under perioden, inte att förbättringen är varaktig. Upprepa inte samma lucka i både tolkning och saknas.\n" +
    "- Bevara frågans begrepp: operativt kassaflöde är inte fritt kassaflöde eller förändring i kassan. Normala anläggningsinvesteringar hör till investeringskassaflödet. Ökad rörelsekapitalbindning kan samexistera med skalfördelar. Sjunkande avkastning på nya investeringar kan fortfarande överstiga kapitalkostnaden; anta inte att gränsen har passerats. Att närma sig kapitalkostnaden ovanifrån är inte värdeförstöring: över gränsen positivt ekonomiskt mervärde, lika neutralt, under negativt.\n" +
    "- För en avgränsad resonemangsfråga: ge din bedömning först, pröva de viktigaste alternativen och prioritera nästa kontroll. Normalt räcker ett kort stycke per del. Använd inte breda inledningar eller en avslutning som upprepar delarna.\n" +
    "- Kontrollera dina premisser: utdelning betyder inte att lönsamma projekt eller nyinvesteringar saknas, hög historisk ROIC bevisar inte hög avkastning på nästa investering, och frånvaro i underlaget bevisar inte frånvaro i bolaget. Om en slutsats kräver en extra förutsättning, säg vilken och formulera sambandet villkorat.\n" +
    "- Kontrollera riktningen: nedskrivningar sänker resultatet, återföringar kan höja det. Uppskjutna leverantörsbetalningar höjer normalt operativt kassaflöde men höjer inte i sig marginalen. Efter utdelning disponerar aktieägarna kapitalet.\n" +
    "- Håll isär kapitalmåtten: ROIC gäller investerat kapital i rörelsen, ROE gäller eget kapital. Skuldsättning kan höja ROE utan bättre rörelse, men ett byte från eget kapital till skuld höjer inte i sig ROIC.\n" +
  "- Skilj stigande nivå från accelererande tillväxt. Lika stora absoluta ökningar innebär inte att tillväxten accelererar. När du beskriver begränsad historik räcker 'perioderna i underlaget'; undvik räknade tidslängder i fri text.\n" +
  "- Hjalp med fundamental aktieanalys, bolag i underlaget, anvandarens innehav och kursens metoder. Breda analysfragor och samband mellan rapporter ingar. Avboj amnen utanfor detta.\n" +
  "- Besvara det anvandaren faktiskt vill undersoka. Utveckla bade mojligheter och risker nar kallorna ger stod, utan att tvinga fram lika manga argument pa varje sida.\n" +
  "- Forklara sambandet mellan observation och tolkning: vad kan det betyda, vilka alternativa forklaringar finns, och vad skulle starka eller forsvaga tolkningen? Valj det som hjalper fragan, inte en checklista i varje svar.\n" +
  "- Gor det arbete du kan gora nu. Erbjud dig inte bara att rakna eller leta vidare nar anvandaren redan bett om det och verktyg finns. Vid en lucka: besvara resten och precisera vilken uppgift som saknas.\n" +
  "- Ge inga kop/salj-rekommendationer, personliga placeringsrad eller loften om avkastning. Du far forklara mekanik, analysera kallbelagda samband och diskutera villkorade tolkningar. Besluten ar anvandarens.\n" +
  "- Inga tankstreck. Anvand komma, kolon eller punkt.\n";

/* Faktauppgifter och tolkningar har skilda svarstyper. */
const SYSTEM_DOKUMENT =
  "\nDu har bolagens dokument och ett faktaregister. Anvand postreferenser for faktauppgifter.\n" +
  "Knyt ihop relevanta uppgifter och resonera om vad som stodjer en positiv utveckling, vad som talar emot och vad som saknas. Skilj en mojlig forklaring fran nagot som ar visat. " +
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
  // Uppgiften kan kräva analys även utan identifierade bolag eller rapporter.
  const fraga = String(a.fraga || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(resonera|jamfor|granska|tes|alternativa forklaringar)\b/.test(fraga) ||
      /strukturell[\s\S]*sasong|sasong[\s\S]*strukturell/.test(fraga)) return MODEL_DJUP;
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
  const explicita = [...String(fraga).matchAll(/\b(?:lektion(?:en)?|avsnitt(?:et)?)\s+(\d{1,2}\.\d{1,2})\b(?!\.\d)/gi)]
    .map(m=>m[1]).filter(id=>Object.hasOwn(LEKTIONER,id));
  if (!t.length && !explicita.length) return [];

  const funna = [];
  for (const rad of REGISTER.split(RADBRYT)) {
    const delar = rad.split(" | ");
    const id = delar[0];
    const titel = delar[1] || "";
    if (!id) continue;
    const ordITitel = ORD(titel);
    const ordIRaden = ORD(rad);
    let poang = explicita.includes(id) ? 1000 : 0;
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
    "\n- Listan är en sökkatalog, inte läst källmaterial. I svaret får du bara namnge lektionsnummer som finns som kursposter i FAKTAREGISTER. Hänvisningar inuti kursmaterialet ger inte heller tillstånd att namnge olästa lektioner. Läs lektionen med las_lektion om verktyget finns, annars besvara metodfrågan utan den hänvisningen. Hitta aldrig pa ett lektionsnummer och gissa aldrig en titel.\n";
  if (valda.length) {
    ut += "\nMATERIALET UR DE LEKTIONER SOM LIGGER NARMAST FRAGAN:\n\n" +
      valda.map(function (l) { return l.text; }).join("\n\n---\n\n") +
      "\n- Kursmaterialet ovan forklarar METOD. Tal om anvandarens bolag tas ALDRIG darifran, bara ur dokumentutdragen.\n";
  }
  return ut;
}

/* Verktyg kan utoka underlaget under samma svar. Nya faktaposter skickas
   som deltan; slutkontrollen anvander samma requestlokala register. */

const UTDRAG_PER_VERKTYG = 6;

export const SYSTEM_VERKTYG =
  "\nDU KAN HAMTA MER SJALV. Svara inte att underlaget saknas forran du forsokt:\n" +
  "- las_mer: fler stycken ur det du redan har, sokta pa andra ord. Anvand den nar fragan galler nagot som borde sta i en rapport men inte kom med i utdragen.\n" +
  "- hamta_historik: hamtar bolagets egna dokument fran en aldre period, direkt fran kallan. Anvand den nar fragan galler ett ar du inte har.\n" +
  "- las_lektion: hela texten till en lektion ur registret ovan. Anvand den nar fragan galler metod.\n" +
  "- berakna: bestall summa, differens, tillvaxt, andel, per_manad eller utveckling med post-id:n. Utveckling verifierar fördubbling, halvering och acceleration för en positiv serie angränsande perioder och skriver exakt omfattning. Visa posten, upprepa inte relationerna i prosa. Anvand befintlig beraknad post om den redan besvarar fragan. Efter hamtning kan du rakna med de nya posterna.\n" +
  "- Hamta hellre en gang for mycket an svara att du inte vet. Men hamta inte i blindo: sag for dig sjalv vad du letar efter forst.\n" +
  "- Nya postreferenser kommer i verktygsresultaten. Aterge aldrig egna faktatal. Kursmaterial far inte bli bolagsfakta.\n";

export function verktygsDefinitioner(djup = false) {
  const lista = [
    {
      name: "berakna",
      description: "Rakna med registrerade faktaposter. Inga egna tal. differens och tillvaxt tar [senare, tidigare], andel tar [taljare, namnare]. summa tar angransande flodesperioder; per_manad tar en flodespost. Resultatet ar en ny postreferens.",
      input_schema: {
        type: "object", additionalProperties: false,
        properties: {
          operation: {type: "string", enum: ["summa", "differens", "tillvaxt", "andel", "per_manad", "utveckling"]},
          indata: {type: "array", minItems: 1, maxItems: 16, items: {type: "string"}},
        },
        required: ["operation", "indata"],
      },
    },
    {
      name: "las_mer",
      description: "Fler stycken ur bolagets dokument som du redan har tillgang till, sokta pa dina egna ord i stallet for anvandarens fraga.",
      input_schema: {
        type: "object",
        properties: {
          bolag: { type: "string", description: "Bolagets namn, precis som det star i underlaget." },
          sokord: { type: "string", description: "Orden du vill soka pa, till exempel 'kassaflode rorelsekapital'." },
          fran: { type: "string", description: "Valfri periodstart YYYY-MM-DD, anges tillsammans med till." },
          till: { type: "string", description: "Valfritt periodslut YYYY-MM-DD." },
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
  if (djup) {
    for (const t of lista) t.input_schema.properties.del = {type:'string',enum:['d1','d2','d3','d4'],description:'Undersökningsfrågan som detta anrop gäller.'};
    lista.unshift(PLANVERKTYG);
  }
  return lista;
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

  return async function kor(namn, indata, signal) {
    try {
      signal?.throwIfAborted();
      if (namn === "berakna") {
        tackning.berakningar ||= [];
        if (tackning.berakningar.length >= budgetFor(tackning.djup).berakningar) return "Berakningsbudgeten ar slut. Svara med befintliga poster.";
        const dom = register ? register.laggBeraknad(indata) : {ok: false, skal: "Faktaregister saknas."};
        tackning.berakningar.push({operation: String(indata?.operation || '').slice(0, 30), ...dom});
        if (!dom.ok) return "Berakningen avslogs: " + dom.skal + " Upprepa inte samma bestallning. Prova igen bara om du har andra giltiga operander eller nytt underlag. Aterge det faktiska skalet i saknas; kalla inte ett underlagsavslag for ett tekniskt fel.";
        ctx.onUndersokt?.();
        tackning.faktaregister = register.status();
        return "Berakningen finns i post " + dom.id + ". Visa posten och forklaringen i svaret." + register.prompt(true);
      }
      if (namn === "las_lektion") {
        const id = String(indata.id || "").trim();
        const text = LEKTIONER[id];
        if (!text) return "Det finns ingen lektion " + id + ". Anvand ett id ur registret.";
        ctx.onUndersokt?.();
        if (tackning.lektioner.indexOf(id) < 0) tackning.lektioner.push(id);
        return medPoster(text.slice(0, MAX_LEKTIONSTEXT), [{ id, titel: id, text: text.slice(0, MAX_LEKTIONSTEXT) }]);
      }

      const b = hitta(indata.bolag);
      if (!b) return "Jag har inget arkiv for " + indata.bolag + ". Bolag jag har: " + arkiv.map((a) => a.namn).join(", ") + ".";

      if (namn === "las_mer") {
        const period = indata.fran || indata.till ? {fran:indata.fran,till:indata.till} : null;
        if (period && !giltigPeriod(period)) return 'Ange en giltig period med verkliga datum, från och till i rätt ordning.';
        const nya = hamtaUtdrag(String(indata.sokord || question), [b], UTDRAG_PER_VERKTYG, Date.now(), period);
        ctx.onUndersokt?.();
        if (!nya.length) return "Inget i " + b.namn + "s dokument matchar de orden.";
        lagg(nya);
        return medPoster(somText(nya));
      }

      if (namn === "hamta_historik") {
        const period = { fran: String(indata.fran || ""), till: String(indata.till || "") };
        if (!giltigPeriod(period)) return "Datumen ska vara giltiga YYYY-MM-DD med start före slut.";
        const nyckel = "mfn:idx:" + b.id;
        let cachat = null;
        try { cachat = await env.DATA.get(nyckel, "json"); } catch (e) { /* utan cache: hamta */ }
        signal?.throwIfAborted();
        ctx.onUndersokt?.();
        const r = await hamtaPeriod({
          dokumentUrl: b.dokument[0] && b.dokument[0].url,
          period, termer: termer(String(indata.sokord || question)), max: MAX_HISTORIK,
          kanda: new Set(b.dokument.map((d) => d.url)),
          index: cachat,
          hamta: (url, init) => fetch(url, {...init, signal: signal || AbortSignal.timeout(15000)}),
        });
        signal?.throwIfAborted();
        if (!r.fransCache && r.index.length) {
          try { await env.DATA.put(nyckel, JSON.stringify(r.index), { expirationTtl: INDEX_TTL }); } catch (e) { /* ok */ }
        }
        signal?.throwIfAborted();
        if (!r.dokument.length) return "Hittade inga dokument fran " + b.namn + " mellan " + period.fran + " och " + period.till + ".";
        b.dokument.push(...r.dokument);
        tackning.hamtade += r.dokument.length;
        const info = tackning.bolag.find(x => x.namn === b.namn);
        if (info) Object.assign(info, spann(b.dokument), {
          dokument: b.dokument.length, hamtade: (info.hamtade || 0) + r.dokument.length,
        });
        try {
          const hist = await env.DATA.get("arkiv:hist:" + b.id, "json");
          signal?.throwIfAborted();
          await sparaHistorik(env.DATA, b.id, hist?.dokument || [], r.dokument);
        } catch (e) { /* cache, inte kritiskt */ }
        signal?.throwIfAborted();
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
/* REPARATIONSRUNDAN. Fore den kastades hela svaret sa fort ett block foll, och
   anvandaren fick ingenting. Men ett formatfel ar inte samma sak som ett svar
   utan tackning: modellen visste vad den skulle saga, den skrev det bara pa fel
   satt. Nu far den veta exakt vad som brast och svara om en gang.

   Verifieringen ar oforandrad. Det omskrivna svaret gar genom samma
   lasFaktasvar som det forsta, sa det har kostar ett extra anrop vid fel och
   ingenting alls i sakerhet. Och bara MEKANISKA fel repareras. Ett nej fran den
   semantiska granskaren repareras ALDRIG: att lata modellen skriva om tills
   granskaren slapper igenom ar att optimera mot domaren, inte att bli riktigare. */
const MAX_REPARATION = 1;


export async function utred(apiKey, kropp, verktyg, kor, tackning, provaSvar) {
  const meddelanden = [{ role: "user", content: kropp.fraga }];
  tackning.modellanrop ||= 0;
  tackning.berakningsforsok ||= 0;
  tackning.gravvarv ||= 0;
  tackning.verktygsanrop ||= 0;
  const budget = budgetFor(tackning.djup);
  tackning.deadline ??= Date.now() + budget.ms;
  let reparationer = 0;
  let reparationsOrsak = null, reparationsBerakning = false;
  // En plats reserveras alltid for granskaren. Budgeten overlever fallback.
  while (tackning.modellanrop < budget.modellanrop - 1) {
    if (Date.now() >= tackning.deadline) return {fel:'budget',status:504,meddelande:'Utredningen hann inte bli klar inom tidsbudgeten.'};
    const masteSvara = tackning.modellanrop >= budget.modellanrop - 3 ||
      Date.now() >= tackning.deadline - 40000 || tackning.verktygsanrop >= budget.verktyg;
    const tillatna = masteSvara ? [] : verktyg.filter(t=>reparationer===0 ||
      (reparationsOrsak==='relation' && !reparationsBerakning && t.name==='berakna')).filter(t => t.name === 'berakna'
      ? tackning.berakningsforsok < budget.berakningar : t.name === 'planera'
        ? !tackning.verktyg.includes('planera') : tackning.gravvarv < budget.gravvarv);
    /* VERKTYGSLISTAN AR LAST, och det ar en kostnadsatgard, inte en smaksak.

       Leverantorens cache ar prefixbaserad: tools, sedan system, sedan
       messages. Nar tillatna filtrerades bort ur tools krympte listan for
       varje varv (4 161 -> 3 545 -> 1 197 tecken i det matta provet), och
       eftersom den ligger FORST invaliderades hela prefixet varje varv. Alla
       registrerade cachetraffar var noll trots att systemfaltet ar 99,2 till
       100 procent identiskt mellan varven.

       Vad ett verktyg FAR anvandas till avgors darfor nedan, dar anropet
       besvaras, inte av vad som star i listan. Den vagen fanns redan: se
       kontrollen mot tillatna i slingan. tool_choice tvingar fortfarande
       planera forst och svara sist, sa forloppet ar oforandrat. */
    const svar = await anropa(apiKey, {
      model: kropp.model, max_tokens: kropp.max_tokens,
      // Sonnet 5 räknar även tänkandet mot max_tokens. Medium begränsar
      // arbetet per varv; tids- och anropsbudgeterna gäller fortfarande.
      ...(kropp.model === MODEL_DJUP ? {output_config:{effort:'medium'}} : {}),
      /* Brytpunkten ligger sist i det stabila systemet. Rattningsvarvets
         tillagg hamnar EFTER den, sa reparationen laser samma cache i
         stallet for att skriva en ny. */
      system: cachat(kropp.system, reparationer ? '\nRÄTTNINGSVARV: Behåll relevanta postreferenser. Skriv om förklaringen kort, högst ett par meningar per prosablock. Kontrollera hela texten mot felmeddelandet, inte bara första förekomsten. Beskriv rapportperioderna utan att ange deras antal eller en tidslängd i prosa.\n' : ''),
      messages: meddelanden,
      tools: verktyg.concat([SVARSVERKTYG]),
      tool_choice: tillatna.some(t=>t.name==='planera') ? {type:'tool',name:'planera'} :
        tillatna.length ? {type:'any'} : {type:'tool',name:'svara'},
    }, tackning);
    if (svar.fel) return svar;
    if (svar.stopp !== 'tool_use' || !svar.block) return svar;
    const anrop = svar.block.filter(b => b?.type === 'tool_use');
    const svaret = anrop.find(b => b.name === 'svara');
    const dom = svaret && (provaSvar ? provaSvar(svaret.input) : {ok:true});
    if (svaret && (dom.ok || reparationer >= MAX_REPARATION)) return {...svar,data:svaret.input};
    if (!anrop.length) return svar;
    const resultat = [];
    let gravde = false;
    for (const a of anrop) {
      if (a.name === 'svara') {
        resultat.push({type:'tool_result',tool_use_id:a.id,is_error:true,
          content:dom.klagan + ' Svara igen med hela svaret, rattat.'});
        continue;
      }
      if (!tillatna.some(t => t.name === a.name) ||
          tackning.verktygsanrop >= budget.verktyg || Date.now() >= tackning.deadline - 40000 ||
          (a.name === 'berakna' && tackning.berakningsforsok >= budget.berakningar)) {
        resultat.push({type:'tool_result',tool_use_id:a.id,is_error:true,
          content:'Verktyget ar inte tillgangligt eller budgeten ar slut. Svara med befintligt underlag.'});
        continue;
      }
      if (a.name === 'berakna') {
        if(reparationer>0 && reparationsBerakning) {
          resultat.push({type:'tool_result',tool_use_id:a.id,is_error:true,content:'Rättningsvarvets beräkning är redan använd. Svara med befintliga poster.'});
          continue;
        }
        tackning.berakningsforsok++;
        if(reparationer>0) reparationsBerakning=true;
      }
      else if (a.name !== 'planera') gravde = true;
      tackning.verktygsanrop++;
      tackning.verktyg.push(a.name);
      const controller = new AbortController();
      const requestSignal=statusSignal(tackning);
      let avbrytVerktyg;
      const avbrutet=new Promise(resolve=>{
        avbrytVerktyg=()=>{controller.abort();resolve('Frågan avbröts.');};
        requestSignal?.addEventListener('abort',avbrytVerktyg,{once:true});
        if(requestSignal?.aborted)avbrytVerktyg();
      });
      let timer;
      const kvar = Math.max(1,tackning.deadline-Date.now()-40000);
      const timeout = new Promise(resolve=>{timer=setTimeout(()=>{
        controller.abort(); tackning.tidsbegransat=true;
        resolve('Tidsbudgeten för fortsatt undersökning är slut. Svara med det verifierade underlaget som redan finns.');
      },kvar);});
      let content;
      try { content = await Promise.race([kor(a.name,a.input || {},controller.signal),timeout,avbrutet]); }
      catch { content = 'Verktyget kunde inte slutföras. Svara med befintligt underlag.'; }
      finally { clearTimeout(timer);requestSignal?.removeEventListener('abort',avbrytVerktyg); }
      resultat.push({type:'tool_result',tool_use_id:a.id,content});
    }
    if (gravde) tackning.gravvarv++;
    if (svaret) { reparationer++; reparationsOrsak=dom.orsak; tackning.reparation = reparationer; }
    meddelanden.push({role:'assistant',content:svar.block});
    meddelanden.push({role:'user',content:resultat});
  }
  return {fel:'budget',status:502,meddelande:'Kom inte fram till ett svar inom anropsbudgeten.'};
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
async function anropa(apiKey, kropp, tackning, timeout = TIMEOUT) {
  const signal=statusSignal(tackning);
  if(signal?.aborted)return {fel:'avbruten',status:499,meddelande:'Frågan avbröts.'};
  const sys = systemText(kropp.system);
  sattMoment(tackning,sys.startsWith('Du granskar ett svar')?'kontrollerar':
    sys.startsWith('Du redigerar ett svar')?'kortar':
      kropp.tool_choice?.name==='planera'?'planerar':'skriver');
  if (tackning) {
    if ((tackning.modellanrop || 0) >= budgetFor(tackning.djup).modellanrop || Date.now() >= tackning.deadline) return {fel:'budget',status:502,meddelande:'Anrops- eller tidsbudgeten ar slut.'};
    tackning.modellanrop = (tackning.modellanrop || 0) + 1;
  }
  const ctrl = new AbortController();
  const anropsstart=Date.now();
  const anropsmatning={modell:kropp.model,moment:sys.startsWith('Du granskar ett svar')?'granskning':
    sys.startsWith('Du redigerar ett svar')?'kortning':'svar',ms:0,utfall:'nat'};
  const avbryt=()=>ctrl.abort();
  signal?.addEventListener('abort',avbryt,{once:true});
  const klocka = setTimeout(() => ctrl.abort(), Math.max(1,Math.min(TIMEOUT,timeout,(tackning?.deadline || Date.now()+TIMEOUT)-Date.now())));
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
      anropsmatning.utfall='http_'+r.status;
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
    anropsmatning.utfall=d.stop_reason || 'ok';
    /* HELA anvandningen, inte bara output.

       Tidigare sparades endast output_tokens. Da gick det inte att se vad en
       riktig fraga kostar, for input ar cirka 89 procent av notan, och det
       gick inte heller att se om cachen traffar. Alla fyra falten kommer fran
       leverantorens usage och lagras per moment i tackning.anropstider. */
    anropsmatning.outputTokens=d.usage?.output_tokens;
    anropsmatning.inputTokens=d.usage?.input_tokens;
    anropsmatning.cacheLast=d.usage?.cache_read_input_tokens;
    anropsmatning.cacheSkrivet=d.usage?.cache_creation_input_tokens;
    // Blocken och stop_reason behovs for verktygsloopen; text for allt annat.
    const innehall = d.content || [];
    const svaret = innehall.find((b) => b && b.type === "tool_use" && b.name === "svara");
    return {
      text: innehall.map((b) => b.text || "").join("").trim(),
      block: innehall,
      stopp: d.stop_reason || "",
      ...(svaret ? { data: svaret.input } : {}),
    };
  } catch (e) {
    anropsmatning.utfall=e?.name==='AbortError'?'avbrutet':'nat';
    const avbruten = e && e.name === "AbortError";
    return avbruten
      ? { fel: "timeout", status: 504, meddelande: "Det tog for lang tid. Skicka fragan igen." }
      : { fel: "nat", status: 502, meddelande: "Kunde inte na modellen." };
  } finally {
    anropsmatning.ms=Date.now()-anropsstart;
    if(tackning)(tackning.anropstider ||= []).push(anropsmatning);
    clearTimeout(klocka);
    signal?.removeEventListener('abort',avbryt);
  }
}

export function onRequestPost(context) {return medStatus(context,besvaraFraga);}
async function besvaraFraga(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;

  if (!apiKey) return json({ error: "AI ej konfigurerad (saknar ANTHROPIC_API_KEY)." }, 501);

  // Ursprung: cookien ar SameSite=Lax, men kontraktet ska sta har och inte antas.
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Fel ursprung." }, 403);

  let question = "", token = "", tradToken = '', djup = false;
  try {
    const body = await request.json();
    question = String(body.question || "").trim();
    token = String(body.token || "").trim();
    tradToken = typeof body.trad === 'string' ? body.trad : '';
    djup = body.djup === true;
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
  const tradSecret = env.FRAGA_TRAD_SECRET || secret;
  const turer = await lasTrad(tradToken,user?.id,tradSecret);
  const routing = routingUrTrad(question,holdings,turer);

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
  let utdrag = [], teser = [], arkivet = [], nyckeltal = [];
  const register = skapaFaktaregister();
  const burna = [...new Map(turer.flatMap(t=>t.poster).map(p=>[p.id,p])).values()];
  const gamlaIds = register.importeraTidigare(burna);
  const samtal = turer.map(t=>({...t,block:t.block.flatMap(b=>{
    if (b.typ === 'post') return gamlaIds.has(b.id) ? [{...b,id:gamlaIds.get(b.id)}] : [];
    if (b.stod) return b.stod.every(id=>gamlaIds.has(id)) ? [{...b,stod:b.stod.map(id=>gamlaIds.get(id))}] : [];
    return [b];
  })}));
  const period = routing.period;

  /* TACKNINGEN. Fore det har kunde Fraga svara med noll dokument pa fem olika
     satt, alla tysta: inga innehav, inget bolag matchat, inget arkiv-id, tomt
     arkiv, eller ingen KV-bindning. I samtliga fall fick anvandaren ett flytande
     svar byggt pa innehavslistan och kursens metod, utan att kunna se det.

     Det ar farligare har an i en sokmotor: brevets loffte ar att tystnad betyder
     att inget hant, och lar sig anvandaren lasa Fraga med samma semantik har
     gravverktyget atit upp forsakringen. Darfor redovisas alltid vad som lastes
     och vad som saknas. */
  const tackning = {
    djup,
    samtal: {turer:turer.length,poster:gamlaIds.size,begransat:turer.some(t=>t.begransat) || gamlaIds.size<burna.length},
    period: period ? { fran: period.fran, till: period.till } : null,
    bolag: [], utelamnade: [], lasta: 0, hamtade: 0, orsak: null,
    // Vad modellen sjalv bad om under utredningen, och vilka lektioner den fick.
    verktyg: [], lektioner: [],
  };
  registreraStatus(tackning,context.fragaStatus);
  sattMoment(tackning,'underlag');

  if (!holdings.length) {
    tackning.orsak = "inga innehav uppladdade";
  } else {
    const alla = routing.bolag || [];
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
          /* Strukturerade nyckeltal fran Borsdata, skrivna av nattjobbet.
             EN nyckel for alla bolag, alltsa en KV-lasning oavsett hur manga
             bolag fragan ror, och de filtreras till de bolag som faktiskt
             routats. Faller lasningen tyst svarar Fraga precis som forut:
             detta ar ett tillskott till underlaget, aldrig ett villkor.

             LICENS: retail-nyckel. Fragor om egna innehav ryms i avtalet;
             det som aterstar ar tier. Se huvudet i motor/borsdata.mjs och
             LAUNCH.md:s forsta P0. Slutar nattjobbet publicera nyckeln ar
             vagen stangd harifran utan nagon kodandring. */
          try {
            const bok = await env.DATA.get("arkiv:nyckeltal", "json");
            const namnen = new Set(arkiv.map((a) => a.namn));
            nyckeltal = ((bok && bok.bolag) || []).filter((b) => namnen.has(b.bolag));
            if (nyckeltal.length) tackning.nyckeltal = nyckeltal
              .map((b) => b.bolag + ": " + (b.nyckeltal || []).length);
          } catch (e) { /* utan nyckeltal svarar vi som forut */ }
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

  /* Rapportverktyg kräver arkiv. Kursfrågor kan läsa mer kursmaterial även
     utan bolagsarkiv, inom samma verktygs- och tidsbudget. */
  const kanGrava = arkivet.length > 0 && !!env.DATA;

  /* Kan den hamta sjalv har den dokument, aven om urvalet inte valde nagra.
     Med bara utdrag.length som villkor fick den registret "du har INGA dokument
     om bolagen" samtidigt som den satt med tre verktyg for att hamta dem. */
  const harUnderlag = utdrag.length > 0 || kanGrava || burna.some(p=>['rapporterat','dokument','beraknat'].includes(p.typ));

  register.synka({ arkiv: arkivet, utdrag, holdings, teser, question, lektioner, nyckeltal });
  tackning.faktaregister = register.status();

  const system = SYSTEM_BAS + SVAR_KONTRAKT +
    (djup ? SYSTEM_DJUP : '') + samtalsText(samtal) +
    (kanGrava ? SYSTEM_VERKTYG : "") +
    (!kanGrava && lektioner.length ? '\nDu kan läsa en relevant fördjupning med las_lektion när de valda kursutdragen inte räcker. Välj id ur kurskatalogen. Läs bara när det behövs för frågan.\n' : '') +
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

  const modell = djup ? MODEL_DJUP : valjModell({ fraga: question, period: period, bolag: tackning.bolag.length, utdrag: utdrag.length });
  tackning.modell = modell;
  /* Kontrollen som utredningen far anvanda mitt i loppet. Samma funktion som
     provar svaret nedan, sa reparationsrundan kan omojligt vara slappare. */
  const provaSvar = (data) => lasFaktasvar(data, register);
  const omfang = djup
    ? '\nSVARSOMFÅNG: Ge först den viktigaste bedömningen, sedan belägg och de alternativ som faktiskt ändrar bedömningen, sist nästa avgörande kontroll. Normalt högst fyra prosablock med högst två meningar i varje, totalt 160–220 ord. Faktaposter visas separat och räknas inte in. Lägg till utrymme bara när frågans delfrågor kräver det, inte för att återberätta din undersökning.\n'
    : '\nSVARSOMFÅNG: Besvara frågan i normalt högst tre prosablock med högst två meningar i varje, totalt 100–150 ord. Börja med slutsatsen. Ge därefter det avgörande sambandet eller alternativet, och avsluta med den viktigaste konkreta kontrollen. En enkel fråga får gärna ett enda kort block. Faktaposter visas separat och räknas inte in. Lägg till utrymme bara om användaren ber om utförlighet eller fler delfrågor behöver besvaras.\n';
  const brev = { model: modell, max_tokens: modell === MODEL_DJUP ? 4096 : 1600, system: omfang + system, fraga: question };
  const undersokning = skapaUndersokning();
  const kor = async (namn, input, signal) => {
    sattMoment(tackning,namn==='berakna'?'beraknar':namn==='planera'?'planerar':'laser');
    if (namn === 'planera') {
      const resultat = undersokning.planera(input);
      tackning.utredning = undersokning.status();
      return JSON.stringify(resultat);
    }
    const {del,...bestallning} = input;
    if (del && !undersokning.har(del)) return 'Okänt del-id. Använd en fråga i undersökningsplanen.';
    const fore = register.poster().length;
    let undersokt = false;
    const korGrund = byggKorVerktyg({arkiv:arkivet,env,utdrag,tackning,question,register,
      onUndersokt:()=>{undersokt=true;}});
    const resultat = await korGrund(namn,bestallning,signal);
    if (signal?.aborted) return 'Undersökningen avbröts av tidsbudgeten.';
    if (del && undersokt) undersokning.notera(del,namn,register.poster().length-fore);
    if (djup) tackning.utredning = undersokning.status();
    return resultat;
  };

  /* AVEN UTAN ARKIV gar svaret genom utred, med en tom verktygslista. Da
     tvingas svara fram direkt, och vagen dar assistenten har minst att komma
     med far samma kontrakt och samma reparationsrunda som utredningen. */
  let svar;
  if (kanGrava) {
    svar = await utred(
      apiKey, brev,
      verktygsDefinitioner(djup), kor,
      tackning, provaSvar);
  } else {
    const utanArkiv = verktygsDefinitioner(djup).filter(t=>
      (t.name === 'berakna' && register.poster().some(p=>p.normaliserat)) ||
      (t.name === 'las_lektion' && lektioner.length > 0) ||
      (djup && ['planera','las_lektion'].includes(t.name)));
    svar = await utred(apiKey, brev, utanArkiv, kor, tackning, provaSvar);
  }

  /* Varken ett routningsbeslut eller en utredning far ta ner Fraga. Faller
     nagot av dem provas det enkla anropet pa den snabba modellen en gang. Da
     provas samma svarskontrakt och verifiering igen. */
  if (svar.fel) {
    tackning.modellfel = {typ:svar.fel,status:svar.status};
    tackning.modell = MODEL_SNABB;
    tackning.modellfall = true;
    svar = await utred(apiKey, { ...brev, model: MODEL_SNABB }, [], async () => "", tackning, provaSvar);
  }
  if (svar.fel) return json({ error: svar.meddelande }, svar.status);
  /* data kommer fran verktyget, text ar reserven. Bada provas likadant. */
  let kontrollerat = lasFaktasvar(svar.data !== undefined ? svar.data : svar.text, register);
  /* TVA SORTERS NEJ, och de betyder helt olika saker for den som last fragan.

     Ett mekaniskt nej ar VART fel: modellen visste vad den ville saga men skrev
     det pa fel satt, och inte ens reparationsrundan raddade det. Da ska texten
     saga att felet ligger hos oss. Sager vi "jag kunde inte verifiera svaret"
     later det som ett besked om bolaget, och det ar det inte.

     Ett semantiskt nej ar ett riktigt nej: nagot i svaret gick inte att belagga.
     Da ar det arliga att saga just det, och vad man kan fraga i stallet.

     Modellens ratext visas aldrig, oavsett vilket. Ett svar som inte holl ar
     inte battre for att lasaren far se det. */
  const MEKANISKT = new Set(["format", "postformat", "blocktyp", "prosaformat",
    "fri_uppgift", "relation", "tolkningsstod", "referens", "avklippt"]);
  /* Granskaren maste se INNEHALLET, inte bara etiketterna.

     Nar sammanfattningen bara bar id, matt, period och varde gick en av dess
     egna regler inte att tillampa: "saknas far inte pasta en lucka som motsags
     av underlaget". En tes som sager tvartemot ett saknas-block sag granskaren
     aldrig, for teser bar sitt pastaende i text och texten skickades inte med.
     Detsamma galler beraknade poster, dar formeln och antagandet ar hela
     skalet att tro pa talet.

     Uppdelningen mellan svar och tillgangligt ar oforandrad, det var bara
     sammanfattningen som var for mager. Dokumentens text ar fortfarande ute:
     den var det som gjorde prompten dyr, och svarets egna citat foljer med i
     "svar". Texterna ar fortfarande data, aldrig instruktioner, och det star i
     granskarens system. */
  const GRANSKARTEXT = 240, GRANSKARBUDGET = 3000;
  const MED_TEXT = new Set(["egen_uppgift", "antagande", "kurs", "illustration"]);
  function granskarunderlag(poster) {
    let kvar = GRANSKARBUDGET;
    return poster.map((p) => {
      const ut = { id: p.id, typ: p.typ, bolag: p.bolag, matt: p.matt,
        period: p.period, varde: p.varde, enhet: p.enhet, rubrik: p.rubrik };
      if (MED_TEXT.has(p.typ) && p.text && kvar > 0) {
        ut.text = String(p.text).slice(0, Math.min(GRANSKARTEXT, kvar));
        kvar -= ut.text.length;
      }
      if (p.typ === "beraknat") {
        ut.formel = p.formel;
        ut.indata = p.indata;
        ut.antagande = p.antagande;
        ut.vilar_pa = p.vilar_pa;
      }
      return ut;
    });
  }

  const blockera = orsak => json({
    answer: MEKANISKT.has(orsak)
      ? "Jag fick inte ihop svaret i en form jag kan stå för, och då visar jag det inte. "
        + "Det är ett fel hos oss, inte ett besked om dina bolag. Ställ gärna frågan igen, "
        + "eller fråga om en enskild siffra i en enskild rapport, så svarar jag ur källan."
      : "Jag hade ett svar men kunde inte belägga allt i det mot underlaget, så jag visar det inte. "
        + "Det brukar betyda att frågan spänner över mer än rapporterna säger rakt ut. "
        + "Fråga gärna om en period eller en uppgift i taget.",
    blockerat: true, verifiering: { format: "dataposter-v1", orsak },
    block: [], kallor: [], tackning,
  });
  if (!kontrollerat.ok) return blockera(kontrollerat.orsak);
  if (svar.stopp === "max_tokens") return blockera("avklippt");
  let raw = svar.data !== undefined ? svar.data : JSON.parse(svar.text);
  const redigerat = await redigeraSvar(raw,register,tackning,question,
    (kropp,timeout)=>anropa(apiKey,kropp,tackning,timeout));
  raw=redigerat.raw;
  kontrollerat=redigerat.kontrollerat;

  // Prosans innebord bevisas inte av korrekta referenser. En separat kontroll
  // kan stoppa ogrundade fakta, fel kategorisering och motsagelser.
  // Ett granskarfel far ALDRIG falla tillbaka till ett ogranskat svar.
  const behoverGranskning = redigerat.andrat || kontrollerat.prosa.length > 0 || kontrollerat.block.some(b => b.typ === "beraknat");
  if (behoverGranskning) {
    // Samma analysförmåga behövs för att granska en tolkning som för att
    // skriva den. Den snabba modellen misstolkade upprepade gånger uttryckliga
    // reservationer och missade en felaktig acceleration i skarpa prov.
    const granskarModell = redigerat.andrat || kontrollerat.block.some(b=>['metod','tolkning','beraknat'].includes(b.typ))
      ? MODEL_DJUP : MODEL_SNABB;
    tackning.granskarmodell = granskarModell;
    const granskning = await anropa(apiKey, {
      /* 80 rackte for {"godkand":true} men inte for ett nej med skal, sa
         granskarens svar klipptes av och blev ett nej av fel anledning. */
      model: granskarModell, max_tokens: granskarModell === MODEL_DJUP ? 2048 : 320, system: cachat(GRANSKA_SYSTEM),
      // Sonnet 5 stöder inte assistant-prefill. JSON-format ersätter prefixet.
      // https://platform.claude.com/docs/en/models/sonnet-5/migration-guide
      ...(granskarModell === MODEL_DJUP ? {output_config:{effort:'medium',format:{type:'json_schema',schema:{
        anyOf:[
          {type:'object',additionalProperties:false,required:['godkand'],
            properties:{godkand:{type:'boolean',enum:[true]}}},
          {type:'object',additionalProperties:false,required:['godkand','skal'],
            properties:{godkand:{type:'boolean',enum:[false]},skal:{type:'string'}}},
        ],
      }}}} : {}),
      messages: [
        /* "svar" ar det som ska publiceras, "tillgangligt" ar vad som fanns att
           valja pa. Fore den uppdelningen fick granskaren hela registret under
           namnet poster och lasta det som en del av svaret: den fallde tre
           valskrivna metodblock om ROIC for att registret rakade innehalla
           anvandarens fraga och ett innehav. */
        { role: "user", content: JSON.stringify({
          fraga: question, svar: kontrollerat.block, tackning,
          ...(redigerat.andrat ? {original:redigerat.original} : {}),
          samtal: samtal.slice(-6).map(t=>({fraga:t.fraga,block:t.block.filter(b=>['tolkning','saknas'].includes(b.typ))})),
          tillgangligt: granskarunderlag(register.poster()),
        }) },
        /* Prefill. Granskaren kan inte erbjudas ett verktyg utan att bli en
           andra svarsmodell, sa i stallet borjar vi objektet at den. Utan det
           foll aven granskaren pa en kodruta, och da blockerades varje svar
           som innehol prosa. */
        ...(granskarModell === MODEL_SNABB ? [{ role: "assistant", content: "{" }] : []),
      ],
    }, tackning);
    if (granskning.fel || granskning.stopp === "max_tokens" || !godkandGranskning(granskning.text)) {
      return blockera(granskning.fel ? "granskarfel" : "semantik");
    }
  }
  const anvanda = kontrollerat.referenser.map(id => register.get(id));
  const kallor = [...new Map(kontrollerat.block.flatMap(b => b.kallor)
    .map(k => [JSON.stringify([k.url, k.citat]), k])).values()];
  const aktuellRouting = {bolag:(routing.bolag || []).map(h=>({id:h.id,name:h.name,ticker:h.ticker})),period:period || periodUrPoster(anvanda)};
  const trad = await skrivTrad([...turer,skapaTur(question,raw.block,register,aktuellRouting)],user?.id,tradSecret);
  return json({ answer: kontrollerat.answer, block: kontrollerat.block,
    ...(trad ? {trad} : {}),
    kallor, tackning, verifiering: { format: "dataposter-v1",
      prosa: kontrollerat.prosa.length ? "modellgranskad" : "ingen",
      berakningar: kontrollerat.block.some(b => b.typ === "beraknat") ? "modellgranskade" : "inga" },
    harlett: anvanda.filter(p => p.typ === "beraknat").map(p => ({
      metrik: p.matt, formel: p.formel, kallor: p.kallor.map(k => k.rubrik),
    })),
  });
}
