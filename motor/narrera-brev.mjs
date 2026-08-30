// Narrations-pass för dagsbrevet: gör faktalistan (brev-latest.json) till ett
// skrivet brev. Modellen får dagens fynd som JSON och skriver en ingress plus ett
// kort stycke per bolag, men BARA grundat i de fakta som redan står där. Inga nya
// tal, inga råd, inga tankstreck. De exakta siffrorna står kvar under prosan
// ("siffrorna bakom"), så prosan är läsglädje och faktalistan är sanningen.
//
//   node motor/narrera-brev.mjs            (kräver ANTHROPIC_API_KEY)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { anropa, tolkaJson, nyckelFinns } from './llm.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// .env in i miljön för nycklar som saknas (motorn laddar ingen dotenv annars).
function laddaEnv() {
  try {
    for (const rad of readFileSync(p('../.env'), 'utf8').split(/\r?\n/)) {
      const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* kör på miljön */ }
}

const SYSTEM = `Du skriver morgonens Ägarbrev till en småsparare: ett sammanhållet, flödande brev, lugnt och personligt, i klarspråk.

Du får dagens fynd i bolagen som JSON (rubriker och fakta som redan är extraherade och verifierade). Väv ihop dem till ETT brev som läses som en helhet uppifrån och ner, inte en lista och inte ett stycke per bolag.

Så här ska brevet kännas:
- Skriv enbart på svenska. Inled INTE med en hälsning (ingen "God morgon", ingen "Hej"): sidan säger redan god morgon. Börja direkt i sak.
- Det rör sig genom det som hänt med naturliga övergångar mellan bolagen ("Mest att säga i dag är om...", "Bland insynshandeln...", "Och så en kortare not om..."). Bolag får nämnas i samma stycke när det binder ihop texten.
- Det avslutas med en kort, lugn rad (till exempel att resten låg still och att nästa brev kommer i morgon).
- 6 till 8 stycken, sammanhängande, som ett brev från någon som läst allt åt läsaren. Ge gärna varje bolag lite mer sammanhang: vad slags händelse det är, och varför den är värd att notera för en ägare (utan att ge råd och utan tal). Ett förvärv, en emission, en insynsförsäljning och en kallelse betyder olika saker, säg kort vad.

Det viktigaste om innehållet: skriv KVALITATIVT, i ord, inte i siffror. De exakta talen visas separat i "siffrorna bakom", så din uppgift är att berätta vad som hänt och åt vilket håll.

Absoluta regler:
1. Sätt INGA tal i texten, varken som siffror eller som ord. Inga kronor-, miljon- eller procenttal, och heller inga tal skrivna i ord eller ungefärligt ("närmare sex procent", "under fem procent", "ungefär hälften", "tre gånger", "tre poster"). Beskriv bara RIKTNING och skeende: "omsättningen steg", "rörelseförlusten växte", "tog upp ett obligationslån", "sålde aktier i flera poster", "blankningen minskade". Tillåtet utan antal: "i flera poster", "vid flera tillfällen".
1b. Datum: ange ett datum ENDAST om det står fullständigt (dag och månad, eller ISO-format) ordagrant i underlaget. Står bara en dag utan månad (till exempel "dag: 22"), skriv då ingen dag alls, säg "kallar till stämma" utan datum. Hitta aldrig på en månad.
2. Räkna ALDRIG. Summera aldrig, avrunda aldrig, jämför aldrig tal, skriv aldrig en total eller ett samlat belopp. Du är munnen, aldrig räknaren.
3. Använd bara skeenden som finns i underlaget. Hitta aldrig på en händelse.
4. Aldrig köp-, sälj- eller behåll-råd. Beskriv vad som hänt, aldrig vad läsaren bör göra.
5. Inga tankstreck (varken långt eller kort). Använd komma, kolon eller punkt.
6. Korta meningar, varierad rytm. Undvik frasen "det är inte X, det är Y".
7. Facktermen i parentes vid första förekomst om du använder en, till exempel "insynshandel (när personer i ledningen köper egna aktier)".
8. Tystnad är ett besked: brevet får konstatera att de bolag som inte nämns låg lugna.

Svara med ett JSON-objekt, inget annat:
{
  "brev": ["stycke 1", "stycke 2", "stycke 3", "..."]
}
där varje element är ett stycke i det sammanhållna brevet, i läsordning.`;

// Tyst dag: inga poster, men brevet ska ändå vara ett brev. Tystnaden är
// beskedet, och den är värd några rader: vad som lästes, och att ingenting i
// bolagen rörde sig. Samma talförbud gäller.
const SYSTEM_TYST = `Du skriver morgonens Ägarbrev till en småsparare. I dag hände ingenting i bolagen som läsaren äger eller bevakar: pressmeddelandeflödena, insynsregistret och blankningsregistret lästes, och inget av det rörde bolagen.

Skriv ett kort brev om just det, lugnt och personligt, i klarspråk.

- Skriv enbart på svenska. Inled INTE med en hälsning: sidan säger redan god morgon. Börja direkt i sak.
- 2 till 3 korta stycken.
- Säg vad som lästes och att det inte gav något som rörde läsarens bolag.
- Säg att tystnad också är ett besked: de flesta dagar i ett ägande ser ut så här, och att inget händer är oftast det normala läget, inte ett problem.
- Avsluta med en kort rad om att nästa brev kommer i morgon.

Absoluta regler:
1. Sätt INGA tal i texten, varken som siffror eller som ord. Inte heller antal bolag eller antal lästa dokument.
2. Nämn inga bolagsnamn: räkna inte upp vad läsaren äger.
3. Aldrig köp-, sälj- eller behåll-råd.
4. Inga tankstreck (varken långt eller kort). Använd komma, kolon eller punkt.
5. Korta meningar, varierad rytm. Undvik frasen "det är inte X, det är Y".
6. Lugna inte läsaren och värdera inte läget. Skriv aldrig sådant som "ingen anledning till oro", "det bästa läget" eller "allt är som det ska". Konstatera att dagen var lugn, inget mer. Säg heller ingenting om vad som kommer att hända framöver.

Svara med ett JSON-objekt, inget annat:
{
  "brev": ["stycke 1", "stycke 2"]
}`;

export async function narreraBrev(brev, modellnamn = 'claude-haiku') {
  if (!brev.poster || !brev.poster.length) return await narreraTyst(brev, modellnamn);

  // Gruppera fynden per bolag till ett kompakt underlag.
  const perBolag = {};
  for (const post of brev.poster) {
    (perBolag[post.bolag] = perBolag[post.bolag] || []).push({ typ: post.typnamn || post.typ, rubrik: post.rubrik, fakta: post.fakta || '' });
  }
  const underlag = { datum: brev.date, lugna: brev.lugna || [], bolag: perBolag };

  const svar = await anropa(modellnamn, {
    system: SYSTEM,
    prompt: `Skriv brevet. Underlag (enda tillåtna källan):\n${JSON.stringify(underlag, null, 1)}`,
    maxTokens: 1600, json: false,
  });
  const narr = tolkaJson(svar.text);

  // Sammanhållet brev som en lista stycken i läsordning.
  brev.brev = Array.isArray(narr.brev)
    ? narr.brev.map(s => String(s).trim()).filter(Boolean)
    : (typeof narr.brev === 'string' ? [narr.brev.trim()] : []);
  brev.narration_kostnad_usd = svar.kostnad_usd;
  return brev;
}

// Tyst dag: inget underlag att grunda sig i, bara konstaterandet.
async function narreraTyst(brev, modellnamn) {
  const svar = await anropa(modellnamn, {
    system: SYSTEM_TYST,
    prompt: `Skriv dagens korta brev. Datum: ${brev.date}.`,
    maxTokens: 600, json: false,
  });
  const narr = tolkaJson(svar.text);
  brev.brev = Array.isArray(narr.brev) ? narr.brev.map(s => String(s).trim()).filter(Boolean) : [];
  brev.narration_kostnad_usd = svar.kostnad_usd;
  return brev;
}

// Fristående: narrera den senaste brev-latest.json på plats.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  laddaEnv();
  if (!nyckelFinns('claude-haiku')) { console.error('ANTHROPIC_API_KEY saknas i miljön.'); process.exit(1); }
  const fil = p('./out/brev-latest.json');
  if (!existsSync(fil)) { console.error('Hittar inte brev-latest.json. Kör natt.mjs först.'); process.exit(1); }
  const brev = JSON.parse(readFileSync(fil, 'utf8'));
  const ut = await narreraBrev(brev);
  writeFileSync(fil, JSON.stringify(ut, null, 2), 'utf8');
  console.log(`Narrerat: ${ (ut.brev || []).length } stycken · kostnad $${(ut.narration_kostnad_usd || 0).toFixed(4)}\n`);
  (ut.brev || []).forEach(s => console.log(s + '\n'));
}
