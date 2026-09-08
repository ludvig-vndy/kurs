/* Genererar functions/api/_kurskorpus.js ur content/fundamental-aktieanalys/.

   VARFOR: Fraga sa till modellen "Peka garna pa en lektion i kursen" utan att ge
   den en enda lektion. Den hittade alltsa pa lektionsnummer, och just den raden
   ligger i grenen utan dokument, dar kallgrinden inte ens kors (den kraver
   utdrag.length). Pa den vag dar assistenten har minst att komma med var den
   alltsa helt ogrindad.

   Samma monster som Motpartens tools/bygg-korpus.mjs, med egen utvinning:
   aktieanalyskursen har `niva` dar Motparten har `fardighet`, och saknar
   evidens- och myt-stegen. Kurserna far drifta isar, det ar meningen.

   Tre exporter, och skillnaden mellan dem ar avsiktlig:
     INDEX      id och titel for alla lektioner. Litet, och ligger ALLTID i
                prompten. Det ensamt gor det omojligt att hitta pa ett id.
     REGISTER   id, titel, niva och mal. Anvands bara pa servern for att valja
                lektioner. Nar aldrig prompten.
     LEKTIONER  hela lektionstexten per id. Hogst ett par gar in i prompten,
                valda pa fragan.

   Kor: node tools/bygg-kurskorpus.mjs
   Grinden i tools/check-kurskorpus.mjs faller om filen ar ur synk. */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'fundamental-aktieanalys');
const UT = join(HERE, '..', 'functions', 'api', '_kurskorpus.js');

function lasLektioner(dir = DIR) {
  const kurs = JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8'));
  const kapitelTitel = new Map((kurs.kapitel || []).map((k) => [k.nummer, k.titel]));
  return readdirSync(dir)
    .filter((f) => /^\d+\.\d+-.*\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => String(a.lektion).localeCompare(String(b.lektion), 'sv', { numeric: true }))
    .map((d) => ({ d, kapitelTitel: kapitelTitel.get(d.kapitel) ?? '' }));
}

/* Ett steg som etiketterat block. Versala etiketter sa modellen kan skilja dem
   fran brodtext. Quizens `alternativ` utelamnas med flit: de innehaller
   distraktorer, alltsa pastaenden som ar FALSKA med avsikt. */
function stegBlock(s) {
  const rader = [];
  const rubrik = s.typ === 'quiz' ? 'QUIZ' : [s.kicker, s.titel].filter(Boolean).join(': ');
  rader.push('### ' + (rubrik || 'Steg') + '   [' + s.typ + ']');

  for (const t of [s.ingress, s.lead, s.highlight, s.forklaring, s.slutsats]) if (t) rader.push(t);
  for (const t of s.brodtext ?? []) rader.push(t);
  if (s.takeaway) rader.push('TAKEAWAY: ' + s.takeaway);

  const el = (s.visual && s.visual.element) || [];
  if (el.length) {
    rader.push('UPPRÄKNING:');
    for (const e of el) rader.push('- ' + [e.rubrik, e.text].filter(Boolean).join(': '));
  }
  if (s.visual && s.visual.figurtext) rader.push('FIGURTEXT: ' + s.visual.figurtext);

  for (const f of s.fragor ?? []) {
    rader.push('FRÅGA: ' + f.fraga);
    if (f.forklaring) rader.push('VARFÖR: ' + f.forklaring);
  }
  return rader.join('\n');
}

function lektionsMaterial(d, kapitelTitel) {
  const huvud = [
    '## ' + d.lektion + ' ' + d.titel,
    'Kapitel ' + d.kapitel + ', ' + kapitelTitel + (d.niva ? ' · Nivå: ' + d.niva : ''),
  ];
  if (d.mal) huvud.push('Mål: ' + d.mal);
  return [huvud.join('\n'), ...(d.steg || []).map(stegBlock)].join('\n\n');
}

const indexRad = (d) => d.lektion + ' | ' + d.titel;
const registerRad = (d) =>
  [d.lektion, d.titel, d.niva || '', (d.mal || '').replace(/\s+/g, ' ').trim()].join(' | ');

/** Korpusens innehall som strang, sa grinden kan jamfora utan att skriva fil. */
export function byggKurskorpus(dir = DIR) {
  const lektioner = lasLektioner(dir);
  const material = {};
  for (const { d, kapitelTitel } of lektioner) material[d.lektion] = lektionsMaterial(d, kapitelTitel);

  return [
    '/* GENERERAD FIL, redigera inte for hand.',
    '   Kor `node tools/bygg-kurskorpus.mjs` efter andring i content/fundamental-aktieanalys/.',
    '   Grinden i tools/check-kurskorpus.mjs faller om den ar ur synk.',
    '',
    '   INDEX ligger alltid i Fragas prompt och ar det som gor det omojligt att',
    '   hitta pa ett lektionsnummer. REGISTER anvands bara for att valja, och nar',
    '   aldrig prompten. LEKTIONER slas upp for de fa som valdes. */',
    '',
    'export const INDEX = ' + JSON.stringify(lektioner.map(({ d }) => indexRad(d)).join('\n')) + ';',
    '',
    'export const REGISTER = ' + JSON.stringify(lektioner.map(({ d }) => registerRad(d)).join('\n')) + ';',
    '',
    'export const LEKTIONER = ' + JSON.stringify(material, null, 2) + ';',
    '',
  ].join('\n');
}

function main() {
  const innehall = byggKurskorpus();
  writeFileSync(UT, innehall, 'utf8');
  const antal = (JSON.parse(readFileSync(join(DIR, 'course.json'), 'utf8')).kapitel || []).length;
  console.log('Skrev ' + UT);
  console.log(Math.round(innehall.length / 1024) + ' kB, ' + antal + ' kapitel.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
