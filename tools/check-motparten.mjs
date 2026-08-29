/* Grind för säljkursen Motparten. Utöver Fokus-kontraktet kontrollerar den att
   varje evidenspåstående har en källa som finns i källregistret, att
   färdighetstaggen är känd, och att röda listans påståenden bara förekommer
   inuti ett myt-steg.
   Kör: node tools/check-motparten.mjs */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { checkLesson } from './check-fokus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'motparten');
const REGISTER = join(HERE, '..', 'docs', 'kallor', 'motparten-kallregister.md');

/* Fraser ur röda listan. Träff utanför ett myt-steg betyder att kursen påstår
   något den själv har avfärdat. Skrivs både med och utan diakriter, eftersom
   texten är svensk men grinden ska fälla även slarvig stavning. */
const RODA = [
  /7\s*procent av kommunikationen/i,
  /kroppsspraket star for|kroppsspråket står för/i,
  /koper pa kansla|köper på känsla/i,
  /spegla.{0,20}kroppssprak|spegla.{0,20}kroppsspråk/i,
  /always be closing/i,
];

/** Källids ur registret: rubriker som "### K1." eller "### R3." */
export function lasKallor(fil = REGISTER) {
  if (!existsSync(fil)) return new Set();
  const txt = readFileSync(fil, 'utf8');
  return new Set([...txt.matchAll(/^###\s+([KR]\d+)\./gm)].map((m) => m[1]));
}

export function lasFardigheter(dir = DIR) {
  const fil = join(dir, 'fardigheter.json');
  if (!existsSync(fil)) return new Set();
  return new Set(JSON.parse(readFileSync(fil, 'utf8')).fardigheter);
}

/** Textinnehållet i ett steg, för frassökning. */
function stegText(s) {
  const delar = [s.kicker, s.titel, s.ingress, s.lead, s.underrubrik, s.forklaring,
    s.slutsats, s.takeaway, ...(s.brodtext ?? [])];
  for (const f of s.fragor ?? []) {
    delar.push(f.fraga, f.underrubrik, f.forklaring, ...(f.alternativ ?? []));
  }
  return delar.filter(Boolean).join('  ');
}

export function checkMotpartenLektion(name, raw, errs, opt) {
  const { kallor, fardigheter } = opt;

  // Fokus-kontraktet först: steg, typer, quiz, dash. Faller det är vidare
  // kontroll bara brus ovanpå en trasig grundstruktur.
  const fore = errs.length;
  checkLesson(name, raw, errs);
  if (errs.length > fore) return;

  const data = JSON.parse(raw);

  if (typeof data.fardighet !== 'string' || !data.fardighet) {
    errs.push(`${name}: fardighet saknas`);
  } else if (!fardigheter.has(data.fardighet)) {
    errs.push(`${name}: okand fardighet "${data.fardighet}"`);
  }

  data.steg.forEach((s, i) => {
    const w = `${name} steg[${i}]`;

    if (s.evidens !== undefined) {
      const e = s.evidens;
      if (!['A', 'B', 'C'].includes(e.niva)) {
        errs.push(`${w}: evidens.niva ska vara A, B eller C`);
      } else if (e.niva === 'C') {
        if (e.kalla !== undefined) errs.push(`${w}: niva C ska sakna kalla`);
      } else if (!e.kalla) {
        errs.push(`${w}: niva ${e.niva} kraver kalla`);
      }
      if (e.kalla && !kallor.has(e.kalla)) {
        errs.push(`${w}: kalla "${e.kalla}" saknas i kallregistret`);
      }
    }

    if (s.typ === 'myt' && s.kalla && !kallor.has(s.kalla)) {
      errs.push(`${w}: kalla "${s.kalla}" saknas i kallregistret`);
    }

    if (s.typ !== 'myt') {
      const txt = stegText(s);
      for (const re of RODA) {
        if (re.test(txt)) errs.push(`${w}: fras ur roda listan utanfor ett myt-steg (${re})`);
      }
    }
  });
}

export function checkMotparten(dir = DIR) {
  if (!existsSync(dir)) return [];
  const opt = { kallor: lasKallor(), fardigheter: lasFardigheter(dir) };
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'course.json' && f !== 'fardigheter.json')
    .sort();
  const errs = [];
  for (const f of files) {
    checkMotpartenLektion(f, readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n'), errs, opt);
  }
  return errs;
}

function main() {
  const errs = checkMotparten();
  if (errs.length) {
    console.error(`FEL (${errs.length}):`);
    for (const e of errs) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('OK: Motparten validerad');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
