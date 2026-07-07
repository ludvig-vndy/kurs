// Scope-vakten för Fråga AI: billig klassificering FÖRE det dyra steget.
// Avgör om en användarfråga hör hemma i tjänsten (portfölj, bolag, dokument,
// kursens innehåll) eller ska avböjas vänligt. Körs på minsta möjliga modell.

import { anropa, tolkaJson } from './llm.mjs';

const SYSTEM = `Du klassificerar frågor till en svensk aktietjänst. Tjänsten svarar på frågor om användarens bolag och portfölj, bolagens dokument (rapporter, pressmeddelanden, kallelser) och en kurs i aktieanalys.

Klasser:
- "portfolj": användarens innehav, händelser i dem, bevakning
- "bolag": ett bolags siffror, dokument, ägare, avtal
- "kurs": begrepp, metod, hur man analyserar (ordlista/lektionsfrågor)
- "utanfor": allt annat (kod, matlagning, allmän AI-hjälp, andra ämnen)

Regeln för gränsfall: handlar kärnan i frågan om användarens pengar och bolag är den innanför, även om den nämner verktyg. Handlar den om något annat med bolagsord ovanpå är den utanför.

Svara ENDAST med JSON: {"klass": "<en av fyra>", "motivering": "<en mening>"}`;

export async function klassaFraga(fraga, modellnamn) {
  const svar = await anropa(modellnamn, { system: SYSTEM, prompt: fraga, maxTokens: 150 });
  const rå = tolkaJson(svar.text);
  const ok = ['portfolj', 'bolag', 'kurs', 'utanfor'].includes(rå.klass);
  return { klass: ok ? rå.klass : 'utanfor', motivering: rå.motivering || '', kostnad_usd: svar.kostnad_usd };
}

export const AVBOJNING = 'Det ligger utanför det jag är byggd för. Jag kan dina bolag, deras dokument och kursens innehåll. För annat är en allmän AI ett bättre verktyg.';
