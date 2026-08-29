/* Routningseval for Saljcoachen. Kraver en deployad endpoint och en pilotcookie.

   Kor:
     PILOT_COOKIE='motparten_pilot=...' node tools/prova-routning.mjs
     PILOT_COOKIE='...' BAS=https://motparten.pages.dev node tools/prova-routning.mjs

   Assertionen ar INTE exakt uppsattning, det blir for skort. Den ar att minst en av de
   forvantade lektionerna finns bland kandidaterna. Kategori 2 ar listans tyngdpunkt:
   det ar dar det avgors om saknar_underlag ar verkligt eller teoretiskt. Se specen 10.2. */

import { pathToFileURL } from 'node:url';

const BAS = process.env.BAS || 'https://motparten.pages.dev';
const COOKIE = process.env.PILOT_COOKIE || '';

const FALL = [
  // 1. Direkt traff.
  { fraga: 'Jag frågade om budget direkt i första mötet och det blev tyst', vantar: ['6.2', '6.4', '4.4'] },
  { fraga: 'Kunden svarar inte på mina mejl längre', vantar: ['10.1', '10.2', '10.3'] },
  { fraga: 'Hur vet jag om det här är värt att jobba vidare på?', vantar: ['6.4', '9.1'] },
  { fraga: 'Jag pratar för mycket på mötena', vantar: ['5.1', '5.2', '5.3'] },
  { fraga: 'Kunden sa att de skulle återkomma och sedan hände inget', vantar: ['8.1', '10.2'] },
  { fraga: 'Vad är skillnaden mellan 4.3 och 4.4?', vantar: ['4.3', '4.4'] },
  { fraga: 'Hur avslutar jag en affär som inte går någonstans?', vantar: ['10.3'] },
  { fraga: 'De tyckte att det var för dyrt', vantar: ['7.1', '7.2', '7.3'] },

  // 2. Narliggande men utanfor mandatet. Listans tyngdpunkt.
  { fraga: 'Vilken prismodell bör ett SaaS-bolag använda?', vantar: 'inget_underlag' },
  { fraga: 'Vad ska stå i avtalet när vi väl skriver på?', vantar: 'inget_underlag' },
  { fraga: 'Hur bygger jag upp min pipeline i CRM:et?', vantar: 'inget_underlag' },
  { fraga: 'Hur räknar jag ut min provision på en affär?', vantar: 'inget_underlag' },
  { fraga: 'Vilket CRM ska vi köpa?', vantar: 'inget_underlag' },
  { fraga: 'Hur skriver jag en bra LinkedIn-profil?', vantar: 'inget_underlag' },

  // 3. Helt utanfor.
  { fraga: 'Hur installerar jag en skrivare?', vantar: 'inget_underlag' },
];

async function fraga(text) {
  const r = await fetch(`${BAS}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BAS,
      Cookie: COOKIE,
    },
    body: JSON.stringify({ fraga: text }),
  });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, d };
}

async function main() {
  if (!COOKIE) {
    console.error('Satt PILOT_COOKIE. Logga in pa /pilot och kopiera cookien ur webblasaren.');
    process.exit(2);
  }
  let fel = 0;
  for (const f of FALL) {
    const { status, d } = await fraga(f.fraga);
    const lektioner = (d.lektioner || []).map((l) => l.id);
    const inget = d.form === 'inget_underlag';
    const ok = f.vantar === 'inget_underlag' ? inget : f.vantar.some((id) => lektioner.includes(id));
    if (!ok) fel++;
    const vantat = f.vantar === 'inget_underlag' ? 'inget_underlag' : `nagon av ${f.vantar.join(', ')}`;
    const fick = inget ? 'inget_underlag' : (lektioner.join(', ') || `(status ${status}${d.error ? ': ' + d.error : ''})`);
    console.log(`${ok ? 'OK  ' : 'FEL '} ${f.fraga}`);
    console.log(`       vantat: ${vantat}`);
    console.log(`       fick:   ${fick}`);
  }
  console.log(`\n${FALL.length - fel} av ${FALL.length} ratt.`);
  if (fel) {
    console.log('Faller kategori 2 upprepat ar routningsprompten for slapp:');
    console.log('skarp kravet pa att lektionen ska BESVARA fragan, inte ligga i narheten.');
    console.log('Lagg INTE till ett tredje modellanrop. Se specen 10.2.');
  }
  process.exit(fel ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
