/* Kursregister och laddning. Enda stället i kodbasen som känner till var en kurs
   bor och under vilken bas-URL den ligger. Både /fokus och /motparten går genom
   den här filen. */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * @typedef {Object} KursKonfig
 * @property {string} nyckel
 * @property {string} titel        Kursens namn i mastheaden
 * @property {string} bas          Bas-URL utan avslutande snedstreck
 * @property {string} katalog      Innehållskatalog relativt projektroten
 * @property {string} ordlista     Sökväg till ordlistan för marginalglosor
 * @property {string} bodyClass    Klass som sätter färgtokens, tom sträng för standard
 * @property {string} varumarke    Namnet i spelarens löprubrik
 */

/** @type {Record<string, KursKonfig>} */
export const KURSER = {
  'fundamental-aktieanalys': {
    nyckel: 'fundamental-aktieanalys',
    titel: 'Fundamental aktieanalys',
    bas: '/fokus',
    katalog: 'content/fundamental-aktieanalys',
    ordlista: 'src/data/ordlista.json',
    bodyClass: '',
    varumarke: 'Delägaren',
  },
  motparten: {
    nyckel: 'motparten',
    titel: 'Motparten',
    bas: '/motparten',
    katalog: 'content/motparten',
    ordlista: 'src/data/ordlista-motparten.json',
    bodyClass: 'kurs-motparten',
    varumarke: 'Motparten',
  },
};

/** @param {string} nyckel */
export function konfig(nyckel) {
  const k = KURSER[nyckel];
  if (!k) throw new Error(`Okänd kursnyckel: ${nyckel}`);
  return k;
}

/** Läser course.json och sorterar kapitlen stigande. */
export function laddaKurs(nyckel) {
  const k = konfig(nyckel);
  const fil = path.resolve(k.katalog, 'course.json');
  const kurs = JSON.parse(readFileSync(fil, 'utf8'));
  kurs.kapitel = [...kurs.kapitel].sort((a, b) => a.nummer - b.nummer);
  return kurs;
}

/** Läser varje lektionsfil som faktiskt finns på disk, i kursordning. */
export function laddaLektioner(nyckel) {
  const k = konfig(nyckel);
  const kurs = laddaKurs(nyckel);
  const ut = [];
  for (const kapitel of kurs.kapitel) {
    for (const l of kapitel.lektioner) {
      if (!l.fil) continue;
      const filPath = path.resolve(k.katalog, l.fil);
      if (!existsSync(filPath)) continue;
      ut.push({ lektion: l.lektion, data: JSON.parse(readFileSync(filPath, 'utf8')) });
    }
  }
  return ut;
}

/** Delen som ett kapitelnummer tillhör. Kastar om kapitlet saknas i delar,
    eftersom ett kapitel utan del annars försvinner tyst ur översikten. */
export function delFor(kurs, kapitelNr) {
  const d = (kurs.delar ?? []).find((del) => del.kapitel.includes(kapitelNr));
  if (!d) throw new Error(`Kapitel ${kapitelNr} saknar del i course.json`);
  return d;
}

/** Lektionerna med grannlänkar. Nästa lektion i ett NYTT kapitel landar på
    kapitelsidan i stället för rakt in i lektionen. */
export function byggLektionsvagar(nyckel) {
  const k = konfig(nyckel);
  const kurs = laddaKurs(nyckel);
  const lektioner = laddaLektioner(nyckel);
  const kapitelIds = {};
  for (const kap of kurs.kapitel) kapitelIds[kap.nummer] = kap.lektioner.map((l) => l.lektion);
  const alla = lektioner.map((l) => l.lektion);

  return lektioner.map(({ lektion, data }, i) => {
    const prev = i > 0 ? lektioner[i - 1] : null;
    const next = i < lektioner.length - 1 ? lektioner[i + 1] : null;
    const nextIsChapter = !!next && next.data.kapitel !== data.kapitel;
    return {
      lektion,
      data,
      prevHref: prev ? `${k.bas}/${prev.lektion}` : null,
      nextHref: next
        ? nextIsChapter
          ? `${k.bas}/kapitel/${next.data.kapitel}`
          : `${k.bas}/${next.lektion}`
        : null,
      nextLektion: next ? next.lektion : null,
      nextIsChapter,
      nextKapitel: next ? next.data.kapitel : null,
      chapterIds: kapitelIds[data.kapitel] ?? [],
      courseIds: alla,
      kapitelTitel: (kurs.kapitel.find((kap) => kap.nummer === data.kapitel) || { titel: '' }).titel,
    };
  });
}
