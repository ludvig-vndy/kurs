// Manuellt prov mot produktion. Inga konton eller privata bolagsuppgifter.
// Kostar modellanrop. Kör uttryckligen: node tools/prova-fraga-avancerat.mjs
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const questions = [
  'Jag analyserar ett fiktivt bolag där omsättningen och rörelsemarginalen stiger samtidigt, men kassaflödet från den löpande verksamheten försvagas. Min tes är att bolaget har fått skalfördelar. Vad stöder tesen, vilka alternativa förklaringar bör jag pröva och vilken uppgift skulle du börja med? Utgå bara från beskrivningen och var konkret.',
  'Ett fiktivt bolag visar stigande omsättning och marginal under kvartalen i samma räkenskapsår. Kan vi då säga att förbättringen är strukturell snarare än säsongsdriven? Förklara vad underlaget faktiskt visar och vilken jämförelse som skulle kunna ändra din bedömning.',
  'Jag jämför två fiktiva bolag med lika hög ROIC. Det ena delar ut nästan hela vinsten, det andra återinvesterar mycket men får successivt sämre avkastning på nya investeringar. Hur bör jag resonera om vilket som skapar mest värde framåt? Skilj det vi vet från antaganden och prioritera vad jag behöver undersöka.',
];
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
const results = [];
const destination = join(tmpdir(), 'fraga-avancerade-utf8-2026-09-09.json');
for (const [i, question] of questions.entries()) {
  const start = Date.now();
  console.log('START', i + 1, question);
  try {
    const response = await fetch('https://aktiekurs.pages.dev/api/fraga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://aktiekurs.pages.dev' },
      body: JSON.stringify({ question, djup: i === 0 }),
      signal: AbortSignal.timeout(140000),
    });
    const data = await response.json();
    const result = { question, status: response.status, ms: Date.now() - start, ...data };
    results.push(result);
    console.log(JSON.stringify({ number: i + 1, status: result.status, ms: result.ms,
      answer: data.answer, error: data.error, blockerat: data.blockerat,
      tackning: data.tackning, verifiering: data.verifiering }));
    if (!response.ok || data.error || data.blockerat) process.exitCode = 1;
  } catch (error) {
    results.push({ question, error: error.message, ms: Date.now() - start });
    console.log('ERROR', i + 1, error.message);
    process.exitCode = 1;
  }
  writeFileSync(destination, JSON.stringify(results, null, 2));
}
console.log('Sparat:', destination);
}
