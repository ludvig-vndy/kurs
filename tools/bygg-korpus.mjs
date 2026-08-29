/* Genererar functions/api/_korpus.js ur lektions-JSON.

   Filen committas. Skalen: en deploy utan foregaende bygge far anda ratt korpus, och
   diffen visar vad coachen kan nar materialet andras. Underscore-prefixet gor att Pages
   inte routar filen, den importeras bara.

   Kor: node tools/bygg-korpus.mjs
   Grinden i check-motparten.mjs faller om filen ar ur synk med lektionerna. */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lektionsMaterial, registerRad } from './lib/motparten-text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'motparten');
const UT = join(HERE, '..', 'functions', 'api', '_korpus.js');

function lasLektioner(dir = DIR) {
  const kurs = JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8'));
  const kapitelTitel = new Map(kurs.kapitel.map((k) => [k.nummer, k.titel]));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'course.json' && f !== 'fardigheter.json')
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => a.lektion.localeCompare(b.lektion, 'sv', { numeric: true }))
    .map((d) => ({ d, kapitelTitel: kapitelTitel.get(d.kapitel) ?? '' }));
}

/** Korpusens innehall som strang. Exporteras sa grinden kan jamfora utan att skriva fil. */
export function byggKorpus(dir = DIR) {
  const lektioner = lasLektioner(dir);
  const register = lektioner.map(({ d }) => registerRad(d)).join('\n');
  const material = {};
  const titlar = {};
  for (const { d, kapitelTitel } of lektioner) {
    material[d.lektion] = lektionsMaterial(d, kapitelTitel);
    titlar[d.lektion] = d.titel;
  }

  return [
    '/* GENERERAD FIL, redigera inte for hand.',
    '   Kor `node tools/bygg-korpus.mjs` efter andring i content/motparten/.',
    '   Grinden i tools/check-motparten.mjs faller om den ar ur synk. */',
    '',
    `export const REGISTER = ${JSON.stringify(register)};`,
    '',
    `export const LEKTIONER = ${JSON.stringify(material, null, 2)};`,
    '',
    `export const TITLAR = ${JSON.stringify(titlar, null, 2)};`,
    '',
  ].join('\n');
}

function main() {
  const innehall = byggKorpus();
  writeFileSync(UT, innehall, 'utf8');
  const rader = innehall.split('\n').length;
  console.log(`OK: skrev functions/api/_korpus.js (${innehall.length} tecken, ${rader} rader)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
