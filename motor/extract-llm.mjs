// LLM-extraktion bakom samma schema som de deterministiska adaptrarna.
// Fältlistan (id + beskrivning) definierar vad som ska hämtas; modellen får
// aldrig välja egna fält. Svaret valideras och normaliseras innan det används,
// och nedströms är allt oförändrat: samma compute, samma narration, samma grind.

import { anropa, tolkaJson } from './llm.mjs';

const SYSTEM = `Du extraherar finansiella fakta ur svenska dokument, och ingenting annat.

Regler, absoluta:
1. Använd ENDAST information som står ordagrant i dokumentet. Gissa aldrig, härled aldrig, räkna aldrig.
2. Varje faktum ska ha ett "citat": den mening eller rad ur dokumentet där värdet står, ordagrant.
3. Finns sidmarkeringar som [Sida N] i dokumentet, ange "sida" för varje faktum.
4. Hittar du inte ett efterfrågat fält: utelämna det helt. "Vet ej" uttrycks genom frånvaro, aldrig genom påhitt.
5. Svenska talformat i dokumentet (mellanslag som tusentalsavskiljare, decimalkomma) ska tolkas korrekt, men värdena i svaret skrivs som JSON-tal med punkt.
6. Svara med ENDAST ett JSON-objekt, inget annat, på formen:
{"fakta": {"<falt_id>": {"nu": <tal>, "fjol": <tal eller utelämnat>, "enhet": "<enhet>"}}, "kallor": {"<falt_id>": {"citat": "<ordagrann rad>", "sida": <tal eller utelämnat>}}}`;

// Tal i svensk skrivning: grupperade tusental ("80 755", hårt eller vanligt
// mellanslag) eller ogrupperat ("72292013"), med decimalkomma eller punkt.
// (?!\d) efter grupperingen hindrar att "Q2 2026" läses som ett enda tal och att
// "72292013" kapas till "722".
const TAL = /-?\d{1,3}(?:[   ]\d{3}(?!\d))*(?:[.,]\d+)?(?!\d)|-?\d+(?:[.,]\d+)?/g;

// Skalfaktorer som räknas som samma tal. Modellen normaliserar KSEK till Mkr, så
// citatet "80 755 KSEK" ska stödja värdet 80,755. Skalan bärs av enhetsfältet,
// inte av siffrorna, men den får bara skilja en tusenpotens: 15 stöds INTE av
// "1 500", eftersom faktorn 100 inte är någon enhet vi använder.
const SKALOR = [1, 1e3, 1e6, 1e-3, 1e-6];

/* Står talet verkligen i sitt eget citat?
   Extraktionen har alltid krävt ett citat per faktum, men aldrig kontrollerat att
   citatet innehöll siffran. Mätt på Unibaps Q2-rapport 2026-08-31: sex fält av sju
   hade citat med talet i, medan orderingång (12,5 Mkr) fick ett citat som bara var
   beskrivande text om EDF-projekt. Ett spårbart tal som inte går att spåra är
   värre än inget tal, eftersom det ser kontrollerat ut. */
export function talStodsAvCitat(varde, citat) {
  if (typeof varde !== 'number' || Number.isNaN(varde)) return false;
  const c = String(citat || '');
  if (!c.trim()) return false;

  const mal = Math.abs(varde);
  TAL.lastIndex = 0;
  for (const m of c.matchAll(TAL)) {
    const n = Math.abs(Number(m[0].replace(/[   ]/g, '').replace(',', '.')));
    if (!Number.isFinite(n)) continue;
    for (const f of SKALOR) {
      const vantat = mal * f;
      if (Math.abs(n - vantat) <= 1e-6 * Math.max(1, vantat)) return true;
    }
  }
  return false;
}

export async function extraheraLLM(text, faltlista, modellnamn, { pdfBase64 = null } = {}) {
  const falt = faltlista.map(f => `- ${f.id}: ${f.beskrivning}${f.enhet ? ` (enhet: ${f.enhet})` : ''}`).join('\n');
  const prompt = pdfBase64
    ? `Fält att extrahera ur den bifogade PDF:en:\n${falt}`
    : `Fält att extrahera:\n${falt}\n\nDokument:\n"""\n${text}\n"""`;

  const svar = await anropa(modellnamn, { system: SYSTEM, prompt, maxTokens: 4000, pdfBase64 });
  const rå = tolkaJson(svar.text);

  // Validera och normalisera mot fältlistan: okända fält kastas, fel typ ger fel.
  const fakta = {}, kallor = {}, fel = [];
  const tillatna = new Set(faltlista.map(f => f.id));
  for (const [id, v] of Object.entries(rå.fakta || {})) {
    if (!tillatna.has(id)) { fel.push(`okänt fält "${id}" (kastat)`); continue; }
    if (typeof v?.nu !== 'number' || Number.isNaN(v.nu)) { fel.push(`${id}: "nu" saknas eller ej tal`); continue; }
    // Citatgrinden. Kravet är absolut, alltså kastas faktumet, inte bara citatet:
    // ett tal utan spårbar källa är värre än inget tal, för det ser kontrollerat ut.
    const k = (rå.kallor || {})[id];
    if (!k || typeof k.citat !== 'string' || !k.citat) {
      fel.push(`${id}: citat saknas (kravet är absolut, faktumet kastat)`);
      continue;
    }
    if (!talStodsAvCitat(v.nu, k.citat)) {
      fel.push(`${id}: värdet ${v.nu} står inte i sitt citat (faktumet kastat)`);
      continue;
    }
    // Jämförelsetalet gallras för sig: saknas det i citatet faller bara det bort.
    const fjolOk = typeof v.fjol === 'number' && talStodsAvCitat(v.fjol, k.citat);
    if (typeof v.fjol === 'number' && !fjolOk) fel.push(`${id}: fjolårstalet ${v.fjol} står inte i citatet (kastat)`);

    fakta[id] = { nu: v.nu, ...(fjolOk ? { fjol: v.fjol } : {}), enhet: String(v.enhet || '') };
    kallor[id] = { citat: k.citat, ...(typeof k.sida === 'number' ? { sida: k.sida } : {}) };
  }
  return { fakta, kallor, fel, kostnad_usd: svar.kostnad_usd, tokens: svar.tokens_in + svar.tokens_ut };
}

const SYSTEM_KLASS = `Du klassificerar avtalsbesked i pressmeddelanden (svenska eller engelska). Tre klasser finns, inga andra:
- "bindande order": ett köpeåtagande med angivet ordervärde ELLER tydlig beställning med leverans (order, purchase, call-off order/avrop under ramavtal räknas hit)
- "ramavtal": villkor för framtida beställningar utan garanterade volymer (framework agreement)
- "avsiktsförklaring": icke-bindande viljeyttring (LOI, MoU, avsikt att förhandla, samarbete utan köpeåtagande)

Hårda regler:
1. Klassa på AVTALSTEXTEN, aldrig på rubriken eller tonläget.
2. "Bindande order" kräver att någon förbinder sig att KÖPA något: ordervärde, beställning eller avrop. Ett undertecknat avtal om att samarbeta, utveckla tillsammans eller demonstrera teknik ("signed an agreement to collaborate", "partnership", "strategiskt samarbete") är INTE en order, det är en avsiktsförklaring om inget köpeåtagande anges.
3. Saknas både belopp och köpeåtagande: välj den svagare klassen.
4. Ange som "bevis" den ordagranna mening som avgör klassningen.
Svara med ENDAST JSON: {"klassningar": [{"id": "<pm_id>", "klass": "<en av de tre>", "bevis": "<ordagrann mening>"}]}`;

// Typbestämning med LLM för dokument där slug-reglerna inte räcker (fallback-
// fallen). Billigaste modellen, ett ord tillbaka.
const SYSTEM_TYP = `Klassificera dokumentet i EXAKT en typ: rapport (delårs/helårsrapport med siffror), kallelse (till stämma), emission (kapitalanskaffning), forvarv (bolagsköp), avtal (order/ramavtal/samarbete med extern part), ovrigt (personnytt, inbjudningar, återköp, hållbarhet, övrig information).
Svara ENDAST med JSON: {"typ": "<en av sex>"}`;

export async function bestamTypLLM(text, modellnamn) {
  const svar = await anropa(modellnamn, { system: SYSTEM_TYP, prompt: text.slice(0, 4000), maxTokens: 50 });
  const rå = tolkaJson(svar.text);
  const ok = ['rapport', 'kallelse', 'emission', 'forvarv', 'avtal', 'ovrigt'].includes(rå.typ);
  return { typ: ok ? rå.typ : 'avtal', kostnad_usd: svar.kostnad_usd };
}

export async function klassificeraAvtalLLM(pmLista, modellnamn) {
  const prompt = pmLista.map(pm => `=== ${pm.id} ===\n${pm.text}`).join('\n\n');
  const svar = await anropa(modellnamn, { system: SYSTEM_KLASS, prompt, maxTokens: 1500 });
  const rå = tolkaJson(svar.text);
  return { klassningar: rå.klassningar || [], kostnad_usd: svar.kostnad_usd };
}
