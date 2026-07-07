// Fokus-lektioner som ljud: bygger uppläsningsmanus ur en lektions steg-JSON,
// normaliserar uttalet och syntetiserar med Windows-rösten (demo; produktion:
// Sebastians inspelade eller klonade röst, samma manus). Kursinnehållet är
// redan kvalitetsgrindat; ljudet är uppläsning av det, ingen ny faktayta.
//
// Kör: node motor/fokus-ljud.mjs 17.1-casetrappan     en lektion, manus + wav
//      node motor/fokus-ljud.mjs --alla               alla lektioner, bara manus
//                                                     (inspelningsunderlag för Sebastian)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { normaliseraTal } from './tts-normalize.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIR = p('../content/fundamental-aktieanalys');

function byggManus(lesson) {
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
  return normaliseraTal(delar.join('\n\n'));
}

mkdirSync(p('./out'), { recursive: true });

if (process.argv.includes('--alla')) {
  // Batch: manus för hela kursen, inspelningsunderlag och klonträningskorpus.
  mkdirSync(p('./out/manus'), { recursive: true });
  const filer = readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'course.json').sort();
  let totOrd = 0;
  for (const f of filer) {
    const lesson = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
    const manus = byggManus(lesson);
    writeFileSync(p(`./out/manus/${f.replace('.json', '.txt')}`), manus, 'utf8');
    totOrd += manus.split(/\s+/).length;
  }
  const min = Math.round(totOrd / 130);
  console.log(`${filer.length} manus skrivna till motor/out/manus/`);
  console.log(`Totalt ${totOrd} ord, cirka ${min} minuter rent tal (${(min / 60).toFixed(1)} timmar).`);
  console.log(`Studiotid med omtag, räkna 2 till 3 gånger talet: ${Math.round(min * 2 / 60)} till ${Math.round(min * 3 / 60)} timmar.`);
} else {
  const namn = process.argv[2] || '17.1-casetrappan';
  const lesson = JSON.parse(readFileSync(`${DIR}/${namn}.json`, 'utf8'));
  const manus = byggManus(lesson);
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
}
