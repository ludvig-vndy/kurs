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

const SYSTEM = `Du skriver morgonens Ägarbrev till en småsparare: lugnt, konkret, i klarspråk.

Du får dagens fynd i bolagen som JSON (rubriker och fakta som redan är extraherade och verifierade). Skriv ett brev av dem.

Det viktigaste: skriv KVALITATIVT, i ord, inte i siffror. De exakta talen visas separat under varje bolag ("siffrorna bakom"), så din uppgift är att berätta vad som hänt och åt vilket håll, inte att återge tal.

Absoluta regler:
1. Sätt INGA sifferbelopp i prosan (inga kronor-, miljon- eller procenttal). Beskriv riktning och skeende i ord i stället: "omsättningen steg", "rörelseförlusten växte", "tog upp ett obligationslån", "sålde aktier i flera poster", "blankningen minskade". Ett datum eller ett bolagsnamn som står ordagrant i underlaget får nämnas.
2. Räkna ALDRIG. Summera aldrig, avrunda aldrig, jämför aldrig tal, skriv aldrig en total eller ett samlat belopp. Du är munnen, aldrig räknaren.
3. Använd bara skeenden som finns i underlaget. Hitta aldrig på en händelse.
4. Aldrig köp-, sälj- eller behåll-råd. Beskriv vad som hänt, aldrig vad läsaren bör göra.
5. Inga tankstreck (varken långt eller kort). Använd komma, kolon eller punkt.
6. Korta meningar, varierad rytm. Undvik frasen "det är inte X, det är Y".
7. Facktermen i parentes vid första förekomst om du använder en, till exempel "insynshandel (när personer i ledningen köper egna aktier)".
8. Tystnad är ett besked: om ett bolag ligger lugnt behöver det inte nämnas, men ingressen får konstatera att resten var lugnt.

Svara med ett JSON-objekt, inget annat:
{
  "lead": "en ingress på 2 till 4 meningar som sammanfattar morgonen: vilka bolag som rörde sig och ungefär vad, i löpande text",
  "bolag": { "<exakt bolagsnamn ur underlaget>": "ett stycke på 2 till 4 meningar som berättar vad som hänt i bolaget, grundat i dess fakta" }
}`;

export async function narreraBrev(brev, modellnamn = 'claude-haiku') {
  if (!brev.poster || !brev.poster.length) return brev;

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

  brev.lead = typeof narr.lead === 'string' ? narr.lead.trim() : '';
  brev.brodtext = {};
  if (narr.bolag && typeof narr.bolag === 'object') {
    for (const [namn, text] of Object.entries(narr.bolag)) {
      if (typeof text === 'string' && text.trim()) brev.brodtext[namn] = text.trim();
    }
  }
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
  console.log(`Narrerat: ingress + ${Object.keys(ut.brodtext || {}).length} bolagsstycken · kostnad $${(ut.narration_kostnad_usd || 0).toFixed(4)}`);
  console.log(`\nIngress: ${ut.lead}\n`);
  for (const [namn, text] of Object.entries(ut.brodtext || {})) console.log(`  ${namn}: ${text.slice(0, 120)}...`);
}
