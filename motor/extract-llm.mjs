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
    fakta[id] = { nu: v.nu, ...(typeof v.fjol === 'number' ? { fjol: v.fjol } : {}), enhet: String(v.enhet || '') };
    const k = (rå.kallor || {})[id];
    if (!k || typeof k.citat !== 'string' || !k.citat) fel.push(`${id}: citat saknas (kravet är absolut)`);
    else kallor[id] = { citat: k.citat, ...(typeof k.sida === 'number' ? { sida: k.sida } : {}) };
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

export async function klassificeraAvtalLLM(pmLista, modellnamn) {
  const prompt = pmLista.map(pm => `=== ${pm.id} ===\n${pm.text}`).join('\n\n');
  const svar = await anropa(modellnamn, { system: SYSTEM_KLASS, prompt, maxTokens: 1500 });
  const rå = tolkaJson(svar.text);
  return { klassningar: rå.klassningar || [], kostnad_usd: svar.kostnad_usd };
}
