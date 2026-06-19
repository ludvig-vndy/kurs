/* Grind för Fokus-spelarens steg-JSON i content/fundamental-aktieanalys/.
   Validerar varje lektionsfil mot kontraktet (RENDERER-BRIEF.md).
   Kör: node tools/check-fokus.mjs
   Fältnamn är ASCII (niva, mal, brodtext, forklaring, fragor, ratt), inte diakritiska. */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'fundamental-aktieanalys');

const STEG_TYPER = ['intro', 'reading', 'concept', 'dataviz', 'quiz'];
const VISUAL_TYPER = ['rutnat', 'linjediagram', 'jamforelse', 'stapeldiagram', 'flode', 'andel'];
const DASH = /[—–]/; // em-dash, en-dash

function isStr(v) { return typeof v === 'string' && v.length > 0; }
function isNum(v) { return typeof v === 'number' && !Number.isNaN(v); }
function isArr(v) { return Array.isArray(v); }

function checkVisual(v, where, errs) {
  if (!v || typeof v !== 'object') { errs.push(`${where}: visual saknas`); return; }
  if (!isStr(v.typ)) errs.push(`${where}: visual.typ saknas`);
  else if (!VISUAL_TYPER.includes(v.typ)) errs.push(`${where}: okänd visual.typ "${v.typ}"`);
  if (!isStr(v.figurtext)) errs.push(`${where}: visual.figurtext saknas`);
}

function checkLesson(name, raw, errs) {
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { errs.push(`${name}: ogiltig JSON (${e.message})`); return; }

  if (DASH.test(raw)) errs.push(`${name}: innehåller em-dash eller en-dash`);

  for (const [k, ok] of [['kapitel', isNum(data.kapitel)], ['lektion', isStr(data.lektion)],
    ['titel', isStr(data.titel)], ['niva', isStr(data.niva)], ['tid_min', isNum(data.tid_min)],
    ['mal', isStr(data.mal)], ['steg', isArr(data.steg)]]) {
    if (!ok) errs.push(`${name}: fält "${k}" saknas eller fel typ`);
  }
  if (!isArr(data.steg)) return;

  if (data.steg.length < 4 || data.steg.length > 6) errs.push(`${name}: ${data.steg.length} steg (ska vara 4 till 6)`);

  let quizCount = 0;
  data.steg.forEach((s, i) => {
    const w = `${name} steg[${i}]`;
    if (!STEG_TYPER.includes(s.typ)) { errs.push(`${w}: okänd typ "${s.typ}"`); return; }
    if (s.typ === 'intro') {
      if (!isStr(s.kicker)) errs.push(`${w}: kicker saknas`);
      if (!isStr(s.titel)) errs.push(`${w}: titel saknas`);
      if (!isStr(s.ingress)) errs.push(`${w}: ingress saknas`);
    } else if (s.typ === 'reading') {
      if (!isStr(s.kicker)) errs.push(`${w}: kicker saknas`);
      if (!isStr(s.lead)) errs.push(`${w}: lead saknas`);
      if (!isStr(s.highlight)) errs.push(`${w}: highlight saknas`);
      else if (isStr(s.lead) && !s.lead.includes(s.highlight)) errs.push(`${w}: highlight är inte en ordagrann delsträng av lead`);
      if (!isArr(s.brodtext) || s.brodtext.length < 1) errs.push(`${w}: brodtext saknas`);
      if (!isStr(s.takeaway)) errs.push(`${w}: takeaway saknas`);
    } else if (s.typ === 'concept') {
      if (!isStr(s.kicker)) errs.push(`${w}: kicker saknas`);
      if (!isStr(s.titel)) errs.push(`${w}: titel saknas`);
      checkVisual(s.visual, w, errs);
      if (!isStr(s.forklaring)) errs.push(`${w}: forklaring saknas`);
    } else if (s.typ === 'dataviz') {
      if (!isStr(s.titel)) errs.push(`${w}: titel saknas`);
      if (!isStr(s.underrubrik)) errs.push(`${w}: underrubrik saknas`);
      checkVisual(s.visual, w, errs);
      if (!isStr(s.slutsats)) errs.push(`${w}: slutsats saknas`);
    } else if (s.typ === 'quiz') {
      quizCount++;
      if (!isArr(s.fragor) || s.fragor.length !== 3) errs.push(`${w}: quiz ska ha exakt 3 frågor`);
      (s.fragor || []).forEach((q, qi) => {
        const qw = `${w} fraga[${qi}]`;
        if (q.typ !== 'single' && q.typ !== 'multi') errs.push(`${qw}: typ ska vara single eller multi`);
        if (!isStr(q.fraga)) errs.push(`${qw}: fraga saknas`);
        if (!isArr(q.alternativ) || q.alternativ.length < 2 || q.alternativ.length > 4) errs.push(`${qw}: alternativ ska vara 2 till 4`);
        if (!isArr(q.ratt) || q.ratt.length < 1) errs.push(`${qw}: ratt ska vara en icke-tom lista`);
        else {
          const n = isArr(q.alternativ) ? q.alternativ.length : 0;
          if (q.ratt.some((r) => !Number.isInteger(r) || r < 0 || r >= n)) errs.push(`${qw}: ratt har index utanför alternativ`);
          if (q.typ === 'single' && q.ratt.length !== 1) errs.push(`${qw}: single ska ha exakt ett rätt`);
        }
        if (!isStr(q.forklaring)) errs.push(`${qw}: forklaring saknas`);
      });
    }
  });
  if (quizCount !== 1) errs.push(`${name}: ska ha exakt ett quiz-steg (har ${quizCount})`);
}

export function checkFokus(dir = DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'course.json').sort();
  const errs = [];
  for (const f of files) checkLesson(f, readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n'), errs);
  return errs;
}

function main() {
  const count = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'course.json').length;
  const errs = checkFokus();
  if (errs.length) {
    console.error(`FEL (${errs.length}):`);
    for (const e of errs) console.error('  - ' + e);
    process.exit(1);
  }
  console.log(`OK: ${count} lektioner validerade`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
