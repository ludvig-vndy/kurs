// LLM-narration bakom grinden: modellen får fakta och beräkningar som JSON och
// skriver klarspråkstexten, men varje tal i utfallet granskas av verify.mjs
// innan texten får användas. Modellen får skriva, aldrig räkna eller minnas.

import { anropa } from './llm.mjs';
import { verifiera } from './verify.mjs';

const SYSTEM = `Du skriver en kort svensk analys av ett bolags rapport, i klarspråk för en icke-expert.

Stilregler, absoluta:
1. Använd ENDAST tal som finns i JSON-underlaget (fakta och beräkningar). Hitta aldrig på ett tal, avrunda aldrig själv.
2. Svenska talformat i texten: decimalkomma (9,4), mellanslag som tusentalsavskiljare (2 410).
3. Vardagssvenska först, facktermen i parentes vid första förekomst, till exempel "pengar kvar när allt är betalt (fritt kassaflöde)".
4. Aldrig köp-, sälj- eller behåll-råd. Beskriv vad som hänt, aldrig vad läsaren bör göra.
5. Inga tankstreck (varken långt eller kort). Använd komma, kolon eller punkt.
6. Korta meningar, varierad rytm. Ingen frasen "det är inte X, det är Y".
7. Struktur: en verdikt-mening först, sedan 3 till 5 korta stycken.`;

export async function narreraLLM(ex, c, modellnamn) {
  const underlag = {
    bolag: ex.bolag, period: ex.period,
    fakta: ex.fakta, beraknat: c, guidning: ex.guidning || undefined
  };
  const prompt = `Skriv analysen. Underlag (enda tillåtna källan till tal):\n${JSON.stringify(underlag, null, 1)}`;
  const svar = await anropa(modellnamn, { system: SYSTEM, prompt, maxTokens: 1200 });

  // Grinden: LLM-text släpps aldrig vidare ogranskad.
  const v = verifiera(svar.text, ex, c);
  return { text: svar.text, verifiering: v, kostnad_usd: svar.kostnad_usd };
}
