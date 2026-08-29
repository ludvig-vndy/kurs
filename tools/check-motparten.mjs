/* Grind för säljkursen Motparten. Utöver Fokus-kontraktet kontrollerar den att
   varje evidenspåstående har en källa som finns i källregistret, att
   färdighetstaggen är känd, och att röda listans påståenden bara förekommer
   inuti ett myt-steg.
   Kör: node tools/check-motparten.mjs */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { byggKorpus, byggMaterial } from './bygg-korpus.mjs';
import { dirname, join } from 'node:path';
import { checkLesson } from './check-fokus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'motparten');
const REGISTER = join(HERE, '..', 'docs', 'kallor', 'motparten-kallregister.md');

/* Fraser ur röda listan. Träff utanför ett myt-steg betyder att kursen påstår
   något den själv har avfärdat. Skrivs både med och utan diakriter, eftersom
   texten är svensk men grinden ska fälla även slarvig stavning.

   Listan innehåller bara påståenden som kursen aldrig har anledning att skriva
   utanför ett myt-steg. R5, always be closing, står medvetet inte här: den
   måste gå att namna historiskt i löptext, till exempel i 0.1. Att kursen inte
   förespråkar den är en granskningsfråga, inte något en regex kan avgöra. */
const RODA = [
  /7\s*procent av kommunikationen/i,
  /kroppsspraket star for|kroppsspråket står för/i,
  /koper pa kansla|köper på känsla/i,
  /spegla.{0,20}kroppssprak|spegla.{0,20}kroppsspråk/i,
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

  // Korpusen: forst att den ar i synk med lektionerna, sedan att den ar semantiskt hel.
  const korpusfil = join(HERE, '..', 'functions', 'api', '_korpus.js');
  if (existsSync(korpusfil)) {
    const forvantad = byggKorpus(dir);
    const paDisk = readFileSync(korpusfil, 'utf8').replace(/\r\n/g, '\n');
    if (paDisk !== forvantad) {
      errs.push('korpus: functions/api/_korpus.js ar ur synk, kor `node tools/bygg-korpus.mjs`');
    }
    // Canaries kors mot materialet, inte mot filstrangen: i filen ar lektionstexten
    // JSON-escapad, sa raderna finns inte som rader.
    errs.push(...kollaKorpus(Object.values(byggMaterial(dir)).join('\n')));
  }
  return errs;
}

/* Semantiska canaries for korpusen. Synkkontrollen nedan visar att _korpus.js kommer ur
   samma generatorversion som lektionerna. Den visar INTE att generatorn tar med det den
   borde: en generator kan vara perfekt synkad och anda tappa visualtext, evidens eller
   myt-pastaenden, vilket ar precis det fel som hittades nar korpusen designades.
   En canary per innehallstyp, inte 42 snapshots. Strangarna ar kontrollerade som unika i
   materialet. Forsvinner en for att en lektion andrats: byt fixture medvetet. */
const CANARIES = [
  { typ: 'jamforelse-rubrik', text: 'Ingen har försökt', kravs: true },
  { typ: 'jamforelse-text', text: 'Utan en ägare finns ingen som tar strid för budgeten', kravs: true },
  { typ: 'quizdistraktor', text: 'Att kunden inte vill uppge en budget', kravs: false },
];
const EVIDENS_CANARY = 'Effekten finns i vissa sammanhang och är nära noll i genomsnitt';
const MYT_CANARY = 'Bara 7 procent av kommunikationen är ord';

export function kollaKorpus(korpus) {
  const errs = [];
  for (const c of CANARIES) {
    const finns = korpus.includes(c.text);
    if (c.kravs && !finns) {
      errs.push(`korpus: ${c.typ} saknas, "${c.text}" borde finnas`);
    }
    if (!c.kravs && finns) {
      errs.push(`korpus: distraktor lackte in, "${c.text}" far aldrig finnas i korpusen`);
    }
  }
  const rader = korpus.split('\n');
  const evidensrad = rader.find((r) => r.includes(EVIDENS_CANARY));
  if (!evidensrad) {
    errs.push(`korpus: evidensreservation saknas, "${EVIDENS_CANARY}" borde finnas`);
  } else if (!evidensrad.includes('nivå B')) {
    errs.push('korpus: evidensreservationen har tappat "nivå B" pa sin rad');
  }
  const mytrad = rader.find((r) => r.includes(MYT_CANARY));
  if (!mytrad) {
    errs.push(`korpus: myt-pastaende saknas, "${MYT_CANARY}" borde finnas`);
  } else if (!mytrad.startsWith('MYT-PÅSTÅENDE')) {
    errs.push('korpus: myt-pastaendet star omärkt, raden maste borja med MYT-PÅSTÅENDE');
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
