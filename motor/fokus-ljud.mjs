// Fokus-lektioner som ljud: bygger uppläsningsmanus ur en lektions steg-JSON,
// normaliserar uttalet och syntetiserar med Windows-rösten (demo; produktion:
// Sebastians inspelade eller klonade röst, samma manus). Kursinnehållet är
// redan kvalitetsgrindat; ljudet är uppläsning av det, ingen ny faktayta.
//
// Kör: node motor/fokus-ljud.mjs 17.1-casetrappan

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { normaliseraTal } from './tts-normalize.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const namn = process.argv[2] || '17.1-casetrappan';
const lesson = JSON.parse(readFileSync(p(`../content/fundamental-aktieanalys/${namn}.json`), 'utf8'));

const delar = [];
delar.push(`Lektion ${lesson.lektion.replace('.', ' punkt ')}: ${lesson.titel}.`);

for (const s of lesson.steg) {
  if (s.typ === 'intro') {
    delar.push(s.ingress);
  } else if (s.typ === 'reading') {
    delar.push(s.lead);
    for (const b of s.brodtext || []) delar.push(b);
    if (s.takeaway) delar.push(`Det viktigaste att ta med sig: ${s.takeaway}`);
  } else if (s.typ === 'concept') {
    delar.push(`${s.titel}.`);
    if (s.forklaring) delar.push(s.forklaring);
    for (const b of s.brodtext || []) delar.push(b);
    if (s.visual && s.visual.figurtext) delar.push(`I spelaren ser du en bild här: ${s.visual.figurtext}`);
  } else if (s.typ === 'dataviz') {
    delar.push(`${s.titel}. ${s.underrubrik}.`);
    if (s.slutsats) delar.push(s.slutsats);
    for (const b of s.brodtext || []) delar.push(b);
  } else if (s.typ === 'quiz') {
    delar.push('Så långt lektionen. Pausa här och gör quizet i spelaren innan du går vidare.');
  }
}

const manus = normaliseraTal(delar.join('\n\n'));
mkdirSync(p('./out'), { recursive: true });
const manusFil = p(`./out/fokus-${namn}-manus.txt`);
writeFileSync(manusFil, manus, 'utf8');
const ord = manus.split(/\s+/).length;
console.log(`Manus: ${manusFil} (${ord} ord, cirka ${Math.round(ord / 130)} min i lästakt)`);

const wavFil = p(`./out/fokus-${namn}.wav`);
try {
  const ut = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', p('./tts-win.ps1'), '-TextFile', manusFil, '-OutFile', wavFil], { encoding: 'utf8' });
  console.log(ut.trim());
} catch (e) {
  console.error('TTS-steget misslyckades (manus finns ändå):', e.message);
  process.exitCode = 1;
}
