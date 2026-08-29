# Motparten, pilot: implementationsplan

> **För agentiska arbetare:** OBLIGATORISK UNDERFÄRDIGHET: använd
> superpowers:subagent-driven-development (rekommenderas) eller
> superpowers:executing-plans för att genomföra planen uppgift för uppgift. Stegen använder
> kryssrutor (`- [ ]`) för spårning.

**Mål:** Bygga säljkursen Motparten som ett andra ben på plattformen, med generaliserad
kursmotor, evidensmärkning i formatet, egen grind, och nio färdiga lektioner i kapitel 0 och 1.

**Arkitektur:** Fokus-spelarens tre routes innehåller i dag hårdkodade referenser till
`content/fundamental-aktieanalys`. Vi lyfter kursladdningen till `src/lib/kurs.mjs` och
sidkropparna till komponenter under `src/components/kurs/`, så att både `/fokus` och
`/motparten` blir tunna omslag kring samma kod. Formatet utökas med ett valfritt
`evidens`-fält och en ny stegtyp `myt`. En ny grind, `tools/check-motparten.mjs`, kontrollerar
att varje evidenspåstående har en källa som finns i källregistret.

**Teknikstack:** Astro 5 (static output), vanilla JS/TS, node:test för enhetstester,
Cloudflare Pages via wrangler. Inga nya beroenden.

**Spec:** `docs/superpowers/specs/2026-08-22-motparten-saljkurs-design.md`
**Källregister:** `docs/kallor/motparten-kallregister.md`

---

## Filstruktur

**Nya filer:**

| Fil | Ansvar |
| --- | --- |
| `src/lib/kurs.mjs` | Kursregister och laddning. Enda stället som känner till katalognamn och bas-URL per kurs. |
| `src/components/kurs/KursOversikt.astro` | Kursöversiktens kropp, kursoberoende. |
| `src/components/kurs/KapitelSida.astro` | Kapitelsidans kropp, kursoberoende. |
| `src/components/kurs/Spelare.astro` | Lektionsspelarens kropp, kursoberoende. |
| `src/components/fokus/Evidens.astro` | Marginalnotis för evidensnivå och källa. |
| `src/components/fokus/Myt.astro` | Steg som ställer en myt mot vad som gäller. |
| `src/pages/motparten/index.astro` | Tunt omslag. |
| `src/pages/motparten/kapitel/[nr].astro` | Tunt omslag. |
| `src/pages/motparten/[lektion].astro` | Tunt omslag. |
| `src/styles/motparten.css` | Enbart färgtokens. |
| `src/data/ordlista-motparten.json` | Säljtermer för marginalglosor. |
| `content/motparten/course.json` | Kapitelträd, delar, kursmetadata. |
| `content/motparten/fardigheter.json` | Tillåtna färdighetstaggar. |
| `content/motparten/0.1` till `1.4` (9 filer) | Lektionerna. |
| `tools/check-motparten.mjs` | Grinden. |
| `tools/dist-hash.mjs` | Verktyg för att bevisa att refaktorn inte ändrade utfallet. |
| `tools/motparten-rosttext.mjs` | Plockar ut prosan ur lektions-JSON så röstverktygen kan läsa den. |
| `tools/__tests__/kurs.test.mjs` | Tester för laddaren. |
| `tools/__tests__/check-motparten.test.mjs` | Tester för grinden. |

**Ändrade filer:**

| Fil | Ändring |
| --- | --- |
| `content/fundamental-aktieanalys/course.json` | Får `delar` och `bas`. |
| `src/pages/fokus/index.astro` | Krymper till omslag. |
| `src/pages/fokus/kapitel/[nr].astro` | Krymper till omslag. |
| `src/pages/fokus/[lektion].astro` | Krymper till omslag. |
| `src/layouts/Broadsheet.astro` | Ny valfri prop `bodyClass`. |
| `tools/check-fokus.mjs` | Exporterar stegvalideringen så grinden kan återanvända den. |
| `tools/check-all.mjs` | Kör den nya grinden. |

**Varför `.mjs` och inte `.ts` för laddaren:** projektets testkommando är
`node --test "tools/__tests__/*.test.mjs"` och kör ren Node utan TypeScript-steg. En
`.ts`-fil går inte att testa så. Astro importerar `.mjs` utan problem. Typer dokumenteras
med JSDoc.

---

## Task 1: Kursregistret och den delade laddaren

**Filer:**
- Skapa: `src/lib/kurs.mjs`
- Test: `tools/__tests__/kurs.test.mjs`

- [ ] **Steg 1: Skriv det fallerande testet**

Skapa `tools/__tests__/kurs.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KURSER, laddaKurs, laddaLektioner, byggLektionsvagar } from '../../src/lib/kurs.mjs';

test('KURSER innehåller aktiekursen med rätt bas och katalog', () => {
  const k = KURSER['fundamental-aktieanalys'];
  assert.equal(k.bas, '/fokus');
  assert.equal(k.katalog, 'content/fundamental-aktieanalys');
  assert.equal(k.ordlista, 'src/data/ordlista.json');
});

test('laddaKurs ger kapitel i stigande ordning', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  assert.ok(kurs.kapitel.length > 0);
  const nummer = kurs.kapitel.map((k) => k.nummer);
  assert.deepEqual(nummer, [...nummer].sort((a, b) => a - b));
});

test('laddaLektioner läser varje lektionsfil som finns', () => {
  const lektioner = laddaLektioner('fundamental-aktieanalys');
  assert.ok(lektioner.length >= 60);
  assert.equal(lektioner[0].lektion, lektioner[0].data.lektion);
});

test('byggLektionsvagar länkar grannar och pekar på kapitelsidan vid kapitelbyte', () => {
  const vagar = byggLektionsvagar('fundamental-aktieanalys');
  assert.equal(vagar[0].prevHref, null);
  const byte = vagar.find((v) => v.nextIsChapter);
  assert.ok(byte, 'minst ett kapitelbyte ska finnas');
  assert.match(byte.nextHref, /^\/fokus\/kapitel\/\d+$/);
  const inom = vagar.find((v) => v.nextHref && !v.nextIsChapter);
  assert.match(inom.nextHref, /^\/fokus\/[\d.]+$/);
});

test('okänd kursnyckel kastar med tydligt fel', () => {
  assert.throws(() => laddaKurs('finns-inte'), /okänd kursnyckel/i);
});
```

- [ ] **Steg 2: Kör testet och se att det fallerar**

Kör: `node --test "tools/__tests__/kurs.test.mjs"`
Förväntat: FAIL med `Cannot find module ... src/lib/kurs.mjs`

- [ ] **Steg 3: Skriv implementationen**

Skapa `src/lib/kurs.mjs`:

```javascript
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
      nextHref: next ? (nextIsChapter ? `${k.bas}/kapitel/${next.data.kapitel}` : `${k.bas}/${next.lektion}`) : null,
      nextLektion: next ? next.lektion : null,
      nextIsChapter,
      nextKapitel: next ? next.data.kapitel : null,
      chapterIds: kapitelIds[data.kapitel] ?? [],
      courseIds: alla,
      kapitelTitel: (kurs.kapitel.find((kap) => kap.nummer === data.kapitel) || { titel: '' }).titel,
    };
  });
}
```

- [ ] **Steg 4: Kör testet och se att det passerar**

Kör: `node --test "tools/__tests__/kurs.test.mjs"`
Förväntat: PASS, 5 tester.

Testet för `motparten` går inte att köra än, eftersom `content/motparten/` inte finns.
Det är avsiktligt: registret får peka på en katalog som skapas i Task 10.

- [ ] **Steg 5: Commit**

```bash
git add src/lib/kurs.mjs tools/__tests__/kurs.test.mjs
git commit -m "feat(kurs): delad kursladdare och kursregister

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Flytta delindelningen in i course.json

Delindelningen ligger i dag på två ställen i koden: som `delar`-listan i
`src/pages/fokus/index.astro:44-56` och som `partFor()` i
`src/pages/fokus/kapitel/[nr].astro`. De ska bli ett fält i data.

**Filer:**
- Ändra: `content/fundamental-aktieanalys/course.json`
- Ändra: `src/lib/kurs.mjs`
- Test: `tools/__tests__/kurs.test.mjs`

- [ ] **Steg 1: Skriv det fallerande testet**

Lägg till i `tools/__tests__/kurs.test.mjs`:

```javascript
test('delar täcker varje kapitel exakt en gång', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  assert.ok(Array.isArray(kurs.delar) && kurs.delar.length > 0);
  const iDelar = kurs.delar.flatMap((d) => d.kapitel).sort((a, b) => a - b);
  const iKapitel = kurs.kapitel.map((k) => k.nummer).sort((a, b) => a - b);
  assert.deepEqual(iDelar, iKapitel);
});

test('delFor ger rätt del för ett kapitelnummer', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  const d = delFor(kurs, 0);
  assert.equal(d.titel, 'Grunderna');
  assert.equal(d.n, 1);
});
```

Utöka importraden överst i testfilen till:

```javascript
import { KURSER, laddaKurs, laddaLektioner, byggLektionsvagar, delFor } from '../../src/lib/kurs.mjs';
```

- [ ] **Steg 2: Kör testet och se att det fallerar**

Kör: `node --test "tools/__tests__/kurs.test.mjs"`
Förväntat: FAIL, `delFor is not a function` och `kurs.delar` odefinierad.

- [ ] **Steg 3: Lägg `delar` i course.json**

Lägg till fältet direkt efter `beskrivning` i
`content/fundamental-aktieanalys/course.json`. Värdena är kopierade ordagrant ur
`src/pages/fokus/index.astro:44-56`:

```json
"delar": [
  { "n": 1, "titel": "Grunderna", "sub": "Tankesätt och hur ett bolag fungerar", "kapitel": [0, 1, 2] },
  { "n": 2, "titel": "Förstå bolaget", "sub": "Läsa rapporten och bedöma kvalitet", "kapitel": [3, 4, 5, 6, 7] },
  { "n": 3, "titel": "Värdering", "sub": "Sätta en siffra och en felmarginal", "kapitel": [8, 9, 10] },
  { "n": 4, "titel": "I praktiken", "sub": "Psykologi, case och egen process", "kapitel": [11, 12, 13, 14, 15, 16] },
  { "n": 5, "titel": "Fördjupning", "sub": "Att äga bolagen och att säkra avkastningen", "kapitel": [17, 18] }
],
```

- [ ] **Steg 4: Lägg till `delFor` i laddaren**

Lägg till i slutet av `src/lib/kurs.mjs`:

```javascript
/** Delen som ett kapitelnummer tillhör. Kastar om kapitlet saknas i delar,
    eftersom ett kapitel utan del annars försvinner tyst ur översikten. */
export function delFor(kurs, kapitelNr) {
  const d = (kurs.delar ?? []).find((del) => del.kapitel.includes(kapitelNr));
  if (!d) throw new Error(`Kapitel ${kapitelNr} saknar del i course.json`);
  return d;
}
```

- [ ] **Steg 5: Kör testet och se att det passerar**

Kör: `node --test "tools/__tests__/kurs.test.mjs"`
Förväntat: PASS, 7 tester.

- [ ] **Steg 6: Commit**

```bash
git add content/fundamental-aktieanalys/course.json src/lib/kurs.mjs tools/__tests__/kurs.test.mjs
git commit -m "refactor(kurs): flytta delindelningen fran koden till course.json

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Baslinje för att bevisa att refaktorn inte ändrar utfallet

Acceptanskriteriet i specen är att Fokus-kursen renderar identiskt efter refaktorn. Det
behöver ett mätverktyg innan refaktorn börjar, inte efter.

**Filer:**
- Skapa: `tools/dist-hash.mjs`

- [ ] **Steg 1: Skriv verktyget**

Skapa `tools/dist-hash.mjs`:

```javascript
/* Hashar varje HTML-fil under ett prefix i dist/ så att en refaktor kan bevisas
   vara utfallsneutral. Kör: node tools/dist-hash.mjs dist/fokus > /tmp/fore.txt */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function filer(dir, ut = []) {
  for (const namn of readdirSync(dir)) {
    const p = join(dir, namn);
    if (statSync(p).isDirectory()) filer(p, ut);
    else if (p.endsWith('.html')) ut.push(p);
  }
  return ut;
}

const rot = process.argv[2];
if (!rot) {
  console.error('Ange en katalog, till exempel dist/fokus');
  process.exit(2);
}
for (const f of filer(rot).sort()) {
  const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
  console.log(`${h}  ${relative(rot, f).replace(/\\/g, '/')}`);
}
```

- [ ] **Steg 2: Bygg och ta baslinjen**

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > baseline-fokus.txt
wc -l baseline-fokus.txt
```

Förväntat: en rad per genererad HTML-sida under `/fokus`, ungefär 85 rader (65 lektioner,
19 kapitelsidor, en översikt).

- [ ] **Steg 3: Commit verktyget**

Baslinjefilen ska inte checkas in, den är en arbetsfil för refaktorn.

```bash
echo "baseline-fokus.txt" >> .gitignore
git add tools/dist-hash.mjs .gitignore
git commit -m "chore(tools): dist-hash for att bevisa utfallsneutral refaktor

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Extrahera kursöversikten till en kursoberoende komponent

**Filer:**
- Skapa: `src/components/kurs/KursOversikt.astro`
- Ändra: `src/pages/fokus/index.astro`

- [ ] **Steg 1: Skapa komponenten**

Flytta hela kroppen av `src/pages/fokus/index.astro` till
`src/components/kurs/KursOversikt.astro`, oförändrad, med följande fyra ändringar och inga
andra:

1. Frontmatter börjar med props i stället för filläsning:

```astro
---
import Broadsheet from '../../layouts/Broadsheet.astro';
import { konfig, laddaKurs } from '../../lib/kurs.mjs';

interface Props { kursnyckel: string }
const { kursnyckel } = Astro.props;
const k = konfig(kursnyckel);
const kurs = laddaKurs(kursnyckel);
const delar = kurs.delar;
---
```

Ta bort `readFileSync`, `path`, `courseRaw`, `const kurs: Kurs = JSON.parse(courseRaw)`, den
hårdkodade `delar`-listan och `interface Del`. Behåll `formatTime`, `ROM`, `kapitelByNr`,
`chapterData` och `totalLessons` ordagrant.

2. `<Broadsheet title="Fundamental aktieanalys" active="kurs" nav="app">` blir
   `<Broadsheet title={kurs.titel} active="kurs" nav="app" bodyClass={k.bodyClass}>`.

3. `<h1 class="h-title" style="max-width:16ch">Fundamental aktieanalys</h1>` blir
   `<h1 class="h-title" style="max-width:16ch">{kurs.titel}</h1>`.

4. Länken `href={`/fokus/kapitel/${kap.nummer}`}` blir
   `href={`${k.bas}/kapitel/${kap.nummer}`}`.

Skriptblocket längst ned flyttar med oförändrat. Importsökvägen i skriptet,
`'../../scripts/fokus-progress'`, ligger på samma djup från `src/components/kurs/` som från
`src/pages/fokus/`, så den ändras inte.

- [ ] **Steg 2: Krymp routen till ett omslag**

Ersätt hela `src/pages/fokus/index.astro` med:

```astro
---
import KursOversikt from '../../components/kurs/KursOversikt.astro';
---

<KursOversikt kursnyckel="fundamental-aktieanalys" />
```

- [ ] **Steg 3: Bygg och jämför mot baslinjen**

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "IDENTISK"
```

Förväntat: `IDENTISK`. Blir det diff på `index.html`, öppna båda och jämför. Vanligaste
orsaken är att `bodyClass` lade till ett attribut, vilket den inte får göra när värdet är
tom sträng. Se Task 6 steg 2 för hur `bodyClass` ska implementeras.

- [ ] **Steg 4: Commit**

```bash
git add src/components/kurs/KursOversikt.astro src/pages/fokus/index.astro
git commit -m "refactor(kurs): lyft kursoversikten till kursoberoende komponent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Extrahera kapitelsidan

**Filer:**
- Skapa: `src/components/kurs/KapitelSida.astro`
- Ändra: `src/pages/fokus/kapitel/[nr].astro`

- [ ] **Steg 1: Skapa komponenten**

Flytta kroppen av `src/pages/fokus/kapitel/[nr].astro` till
`src/components/kurs/KapitelSida.astro` med dessa ändringar:

1. Frontmatter, ersätt `getStaticPaths` och filläsningen med props:

```astro
---
import Broadsheet from '../../layouts/Broadsheet.astro';
import { konfig, laddaKurs, delFor } from '../../lib/kurs.mjs';

interface Props { kursnyckel: string; kap: any }
const { kursnyckel, kap } = Astro.props;
const k = konfig(kursnyckel);
const kurs = laddaKurs(kursnyckel);
const del = delFor(kurs, kap.nummer);
---
```

Ta bort funktionen `partFor` helt och den lokala `const del = partFor(kap.nummer)`.
Behåll `formatTime`, `lessonCount`, `metaText`, `chapterOrder`, `plateImg`, `plateX`,
`plateY` ordagrant.

2. `plateImg` blir kursberoende så att kurserna inte delar bildmapp:

```javascript
const plateImg = `/bilder/${k.nyckel === 'fundamental-aktieanalys' ? '' : k.nyckel + '-'}kapitel-${kap.nummer}.jpg`;
```

Aktiekursen behåller därmed exakt sina nuvarande sökvägar, `/bilder/kapitel-N.jpg`, och
Motparten får `/bilder/motparten-kapitel-N.jpg`.

3. `<Broadsheet ...>` får `bodyClass={k.bodyClass}`.

4. Alla fyra hårdkodade `/fokus`-länkar blir `${k.bas}`:
   - brödsmulan `<a href="/fokus">Kursöversikt</a>` blir `<a href={k.bas}>Kursöversikt</a>`
   - lektionslänken `href={`/fokus/${l.lektion}`}` blir `href={`${k.bas}/${l.lektion}`}`
   - fotens `<a class="btn-ghost" href="/fokus">` blir `href={k.bas}`
   - CTA `href={`/fokus/${chapterOrder[0]}`}` blir `href={`${k.bas}/${chapterOrder[0]}`}`

5. I skriptblocket längst ned, raden
   `if (cta && target) cta.href = `/fokus/${target}`;`
   ersätts med en bas som skickas in via data-attribut. Lägg till på `<main>`:
   `data-kursbas={k.bas}` och ändra raden till:

```javascript
const bas = document.querySelector<HTMLElement>('[data-kursbas]')?.dataset.kursbas || '/fokus';
if (cta && target) cta.href = `${bas}/${target}`;
```

6. Skriptets import, `'../../../scripts/fokus-progress'`, ligger ett steg för djupt från
   `src/components/kurs/`. Ändra till `'../../scripts/fokus-progress'`.

- [ ] **Steg 2: Krymp routen**

Ersätt hela `src/pages/fokus/kapitel/[nr].astro` med:

```astro
---
import KapitelSida from '../../../components/kurs/KapitelSida.astro';
import { laddaKurs } from '../../../lib/kurs.mjs';

export async function getStaticPaths() {
  const kurs = laddaKurs('fundamental-aktieanalys');
  return kurs.kapitel.map((kap) => ({ params: { nr: String(kap.nummer) }, props: { kap } }));
}

const { kap } = Astro.props;
---

<KapitelSida kursnyckel="fundamental-aktieanalys" kap={kap} />
```

- [ ] **Steg 3: Bygg och jämför**

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "IDENTISK"
```

Förväntat: `IDENTISK`. En diff på kapitelsidorna beror sannolikt på `data-kursbas`, som
lägger till ett attribut i utfallet. Det är en avsiktlig och accepterad ändring: notera
vilka filer som skiljer, öppna en av dem, bekräfta att enda skillnaden är attributet, och
ta sedan en ny baslinje med `node tools/dist-hash.mjs dist/fokus > baseline-fokus.txt`
innan nästa uppgift.

- [ ] **Steg 4: Commit**

```bash
git add src/components/kurs/KapitelSida.astro src/pages/fokus/kapitel/[nr].astro
git commit -m "refactor(kurs): lyft kapitelsidan till kursoberoende komponent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Extrahera lektionsspelaren

Den största filen, 490 rader. Kroppen flyttar oförändrad. Alla kursspecifika värden blir
props.

**Filer:**
- Skapa: `src/components/kurs/Spelare.astro`
- Ändra: `src/pages/fokus/[lektion].astro`
- Ändra: `src/layouts/Broadsheet.astro`

- [ ] **Steg 1: Skapa komponenten**

Flytta hela innehållet i `src/pages/fokus/[lektion].astro` till
`src/components/kurs/Spelare.astro` med dessa ändringar:

1. Ta bort `export async function getStaticPaths()` helt, den flyttar till routen.

2. Frontmatterns inledning blir:

```astro
---
import fs from 'node:fs';
import path from 'node:path';
import Broadsheet from '../../layouts/Broadsheet.astro';
import Rutnat from '../fokus/Rutnat.astro';
import Linjediagram from '../fokus/Linjediagram.astro';
import Jamforelse from '../fokus/Jamforelse.astro';
import Stapeldiagram from '../fokus/Stapeldiagram.astro';
import Flode from '../fokus/Flode.astro';
import Andel from '../fokus/Andel.astro';
import FokusQuiz from '../fokus/FokusQuiz.astro';
import { konfig } from '../../lib/kurs.mjs';

const { kursnyckel, lesson, prevHref, nextHref, nextLektion, nextIsChapter, nextKapitel,
        chapterIds, courseIds, kapitelTitel } = Astro.props;
const k = konfig(kursnyckel);
---
```

Typdeklarationerna `interface CourseLektion`, `CourseKapitel`, `CourseJson` tas bort, de
användes bara av `getStaticPaths`. `StegTyp`, `VisualObj`, `Fraga`, `Steg`, `LessonJson`
behålls.

3. Ordlistan blir kursberoende. Raden

```javascript
fs.readFileSync(path.resolve('src/data/ordlista.json'), 'utf8')
```

blir

```javascript
fs.readFileSync(path.resolve(k.ordlista), 'utf8')
```

4. `<Broadsheet title={lesson.titel} chrome="none">` blir
   `<Broadsheet title={lesson.titel} chrome="none" bodyClass={k.bodyClass}>`.

5. Löprubrikens två hårdkodade namn blir kursberoende:

```astro
<a class="rh-mark" href="/hem">{k.varumarke}</a>
<span class="rh-ed">{kurs.titel}</span>
```

Lägg till `laddaKurs` i importen från `../../lib/kurs.mjs` och
`const kurs = laddaKurs(kursnyckel);` i frontmattern.

6. Alla `/fokus`-länkar i kroppen blir `${k.bas}`. Det gäller kapitellänken i brödsmulan
   och glosslänken `href={`/fokus/${g.lektion}`}`.

7. Skriptets import `'../../scripts/fokus'` ligger på samma djup från
   `src/components/kurs/`, och ändras inte.

- [ ] **Steg 2: Lägg `bodyClass` i Broadsheet**

I `src/layouts/Broadsheet.astro`, utöka `interface Props` med:

```typescript
  /** klass på body som sätter om färgtokens för en annan kurs */
  bodyClass?: string;
```

och destrukturering med `bodyClass = '',`. Lägg till stilarket och klassen. Sätt aldrig
attributet när värdet är tomt, annars ändras utfallet för aktiekursen:

```astro
<body class:list={[bodyClass || undefined]}>
```

Om `<body>` redan har klasser i filen, lägg `bodyClass || undefined` sist i den befintliga
`class:list`. Importera stilarket ovillkorligt tillsammans med `broadsheet.css`:

```javascript
import '../styles/broadsheet.css';
import '../styles/motparten.css';
```

Stilarket är scopat till `body.kurs-motparten` och påverkar därför inte aktiekursen.

- [ ] **Steg 3: Krymp routen**

Ersätt hela `src/pages/fokus/[lektion].astro` med:

```astro
---
import Spelare from '../../components/kurs/Spelare.astro';
import { byggLektionsvagar } from '../../lib/kurs.mjs';

export async function getStaticPaths() {
  return byggLektionsvagar('fundamental-aktieanalys').map((v) => ({
    params: { lektion: v.lektion },
    props: {
      lesson: v.data,
      prevHref: v.prevHref,
      nextHref: v.nextHref,
      nextLektion: v.nextLektion,
      nextIsChapter: v.nextIsChapter,
      nextKapitel: v.nextKapitel,
      chapterIds: v.chapterIds,
      courseIds: v.courseIds,
      kapitelTitel: v.kapitelTitel,
    },
  }));
}
const p = Astro.props;
---

<Spelare kursnyckel="fundamental-aktieanalys" {...p} />
```

- [ ] **Steg 4: Bygg och jämför**

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "IDENTISK"
```

Förväntat: `IDENTISK`. Uppstår diff på alla lektionssidor, kontrollera först att
`<body>` inte fått ett tomt `class=""`.

- [ ] **Steg 5: Kör hela grinden och bygg**

```bash
npm run check && npm run test:tools
```

Förväntat: `Allt grönt` och alla tester passerar.

- [ ] **Steg 6: Commit**

```bash
git add src/components/kurs/Spelare.astro "src/pages/fokus/[lektion].astro" src/layouts/Broadsheet.astro
git commit -m "refactor(kurs): lyft lektionsspelaren till kursoberoende komponent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Evidens-komponenten

**Filer:**
- Skapa: `src/components/fokus/Evidens.astro`
- Ändra: `src/components/kurs/Spelare.astro`

- [ ] **Steg 1: Skapa komponenten**

Skapa `src/components/fokus/Evidens.astro`:

```astro
---
/* Marginalnotis som märker ett stegs evidensnivå. Delar marginalspalt med
   ordlisteglosorna och renderas före dem. */
interface Props {
  evidens: { niva: 'A' | 'B' | 'C'; kalla?: string; notering?: string };
}
const { evidens } = Astro.props;

const ETIKETT = {
  A: 'Robust forskning',
  B: 'Omdiskuterat',
  C: 'Hantverk, inte forskning',
};
const etikett = ETIKETT[evidens.niva] ?? 'Okänd nivå';
---

<div class:list={['evid', `evid--${evidens.niva.toLowerCase()}`]}>
  <div class="evid__niva">{etikett}</div>
  {evidens.kalla && <div class="evid__kalla">Källa {evidens.kalla}</div>}
  {evidens.notering && <p class="evid__not">{evidens.notering}</p>}
</div>

<style>
  .evid { border-left: 2px solid var(--rule-strong); padding: 2px 0 2px 12px; margin-bottom: 18px; }
  .evid--a { border-left-color: var(--oxblood); }
  .evid--b { border-left-color: var(--gold); }
  .evid--c { border-left-color: var(--faint); }
  .evid__niva { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); }
  .evid__kalla { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; color: var(--muted); margin-top: 3px; }
  .evid__not { font-family: var(--serif); font-size: 14px; line-height: 1.45; color: var(--ink-soft); margin: 8px 0 0; }
</style>
```

- [ ] **Steg 2: Rendera i spelarens marginal**

I `src/components/kurs/Spelare.astro`:

1. Lägg importen `import Evidens from '../fokus/Evidens.astro';` bland komponentimporterna.

2. Utöka `interface Steg` med:

```typescript
  evidens?: { niva: 'A' | 'B' | 'C'; kalla?: string; notering?: string };
```

3. Ändra raden som beräknar `sideTake` så marginalen inte får tre saker att bära:

```javascript
const sideTake = s.typ === 'reading' && !!s.takeaway && s.rost !== 'sebastian' && !hasGloss && !s.evidens;
```

4. Ändra `class:list` på `<section>` så att marginalen slås på även för ett steg med bara
   evidens:

```astro
class:list={['step', { 'has-gloss': hasGloss || !!s.evidens, 'has-aside': sideTake, 'step--intro': s.typ === 'intro' }]}
```

5. Ersätt blocket `{hasGloss && (<aside class="gloss" ...>...</aside>)}` med ett block som
   renderar evidensen först i samma aside:

```astro
{(hasGloss || s.evidens) && (
  <aside class="gloss" aria-label="Marginalanteckningar">
    {s.evidens && <Evidens evidens={s.evidens} />}
    {gloss.map((g) => (
      <div class="gloss__item">
        <div class="gloss__term">{g.term}</div>
        <div class="gloss__def">{g.forklaring}</div>
        {g.lektion && g.lektion !== lesson.lektion && (
          <a class="gloss__lesson" href={`${k.bas}/${g.lektion}`}>Lärs ut i {g.lektion} →</a>
        )}
      </div>
    ))}
  </aside>
)}
```

- [ ] **Steg 3: Verifiera att aktiekursen är oförändrad**

Ingen lektion i aktiekursen har `evidens`, så utfallet ska vara identiskt.

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "IDENTISK"
```

Förväntat: `IDENTISK`.

- [ ] **Steg 4: Commit**

```bash
git add src/components/fokus/Evidens.astro src/components/kurs/Spelare.astro
git commit -m "feat(kurs): evidensmarkning som marginalnotis

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Myt-stegtypen

**Filer:**
- Skapa: `src/components/fokus/Myt.astro`
- Ändra: `src/components/kurs/Spelare.astro`

- [ ] **Steg 1: Skapa komponenten**

Skapa `src/components/fokus/Myt.astro`:

```astro
---
/* Ett steg som ställer ett spritt påstående mot vad som faktiskt gäller.
   Kapitel 0 i Motparten är byggt kring den här formen. */
interface Props {
  pastaende: string;
  varifran: string;
  vad_som_galler: string;
  kalla: string;
}
const { pastaende, varifran, vad_som_galler, kalla } = Astro.props;
---

<div class="myt">
  <div class="myt__block myt__block--pastaende">
    <div class="myt__lbl">Påståendet</div>
    <p class="myt__pastaende">{pastaende}</p>
    <p class="myt__varifran">{varifran}</p>
  </div>
  <div class="myt__block myt__block--galler">
    <div class="myt__lbl">Vad som gäller</div>
    <p class="myt__galler">{vad_som_galler}</p>
    <div class="myt__kalla">Källa {kalla}</div>
  </div>
</div>

<style>
  .myt { display: grid; gap: 0; border: 1px solid var(--rule); background: var(--card); margin: 8px 0; }
  .myt__block { padding: 22px 24px; }
  .myt__block--pastaende { border-bottom: 1px solid var(--rule); }
  .myt__block--galler { border-top: 2px solid var(--oxblood); }
  .myt__lbl { font-family: var(--mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .myt__pastaende { font-family: var(--display); font-weight: 300; font-size: clamp(20px, 2.4vw, 26px); line-height: 1.3; color: var(--ink-soft); margin: 0; text-decoration: line-through; text-decoration-color: var(--faint); text-decoration-thickness: 1px; }
  .myt__varifran { font-family: var(--serif); font-size: 15px; line-height: 1.5; color: var(--muted); margin: 12px 0 0; }
  .myt__galler { font-family: var(--serif); font-size: 18px; line-height: 1.55; color: var(--ink); margin: 0; }
  .myt__kalla { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; color: var(--muted); margin-top: 14px; }
  @media (min-width: 900px) {
    .myt { grid-template-columns: 1fr 1fr; }
    .myt__block--pastaende { border-bottom: none; border-right: 1px solid var(--rule); }
    .myt__block--galler { border-top: none; border-left: 2px solid var(--oxblood); }
  }
</style>
```

- [ ] **Steg 2: Rendera i spelaren**

I `src/components/kurs/Spelare.astro`:

1. Lägg importen `import Myt from '../fokus/Myt.astro';`

2. Utöka `type StegTyp` med `| 'myt'` och `interface Steg` med:

```typescript
  pastaende?: string;
  varifran?: string;
  vad_som_galler?: string;
  kalla?: string;
```

3. Lägg renderingsblocket direkt efter `{s.typ === 'quiz' && (...)}`:

```astro
{s.typ === 'myt' && (
  <div class="s-col">
    {s.kicker && <div class="kicker">{s.kicker}</div>}
    {s.titel && <h2 class="s-ctitle">{s.titel}</h2>}
    <Myt
      pastaende={s.pastaende ?? ''}
      varifran={s.varifran ?? ''}
      vad_som_galler={s.vad_som_galler ?? ''}
      kalla={s.kalla ?? ''}
    />
  </div>
)}
```

- [ ] **Steg 3: Verifiera att aktiekursen är oförändrad**

```bash
npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "IDENTISK"
```

Förväntat: `IDENTISK`.

- [ ] **Steg 4: Commit**

```bash
git add src/components/fokus/Myt.astro src/components/kurs/Spelare.astro
git commit -m "feat(kurs): myt-stegtyp som staller pastaende mot vad som galler

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Grinden check-motparten.mjs

**Filer:**
- Ändra: `tools/check-fokus.mjs`
- Skapa: `tools/check-motparten.mjs`
- Ändra: `tools/check-all.mjs`
- Test: `tools/__tests__/check-motparten.test.mjs`

- [ ] **Steg 1: Exportera stegvalideringen ur check-fokus.mjs**

I `tools/check-fokus.mjs`, ändra raden

```javascript
function checkLesson(name, raw, errs) {
```

till

```javascript
export function checkLesson(name, raw, errs) {
```

och lägg till `myt` i `STEG_TYPER`:

```javascript
const STEG_TYPER = ['intro', 'reading', 'concept', 'dataviz', 'quiz', 'myt'];
```

Lägg till valideringen av myt-steget i `checkLesson`, direkt före `else if (s.typ === 'quiz')`:

```javascript
    } else if (s.typ === 'myt') {
      for (const f of ['pastaende', 'varifran', 'vad_som_galler', 'kalla']) {
        if (!isStr(s[f])) errs.push(`${w}: ${f} saknas`);
      }
```

- [ ] **Steg 2: Skriv de fallerande testerna**

Skapa `tools/__tests__/check-motparten.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMotpartenLektion } from '../check-motparten.mjs';

const KALLOR = new Set(['K1', 'K3', 'R1']);
const FARDIGHETER = new Set(['grund.evidens', 'fortroende.grund']);
const opt = { kallor: KALLOR, fardigheter: FARDIGHETER };

function lektion(over = {}) {
  return JSON.stringify({
    kapitel: 1, lektion: '1.1', titel: 'T', niva: 'Nybörjare', tid_min: 8,
    mal: 'M', fardighet: 'fortroende.grund',
    steg: [
      { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
      { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F' },
      { typ: 'quiz', fragor: [
        { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
        { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
        { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      ] },
    ],
    ...over,
  });
}

test('en giltig lektion ger inga fel', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion(), errs, opt);
  assert.deepEqual(errs, []);
});

test('okänd källa fälls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ steg: [
    { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
    { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'A', kalla: 'K99' } },
    { typ: 'quiz', fragor: [
      { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
      { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    ] },
  ] }), errs, opt);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /K99.*saknas i kallregistret/i);
});

test('niva A utan kalla fälls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ steg: [
    { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
    { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'A' } },
    { typ: 'quiz', fragor: [
      { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
      { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    ] },
  ] }), errs, opt);
  assert.match(errs.join(' '), /niva A kraver kalla/i);
});

test('niva C med kalla fälls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ steg: [
    { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
    { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'F', evidens: { niva: 'C', kalla: 'K1' } },
    { typ: 'quiz', fragor: [
      { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
      { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    ] },
  ] }), errs, opt);
  assert.match(errs.join(' '), /niva C ska sakna kalla/i);
});

test('okänd fardighet fälls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ fardighet: 'hittepa.tagg' }), errs, opt);
  assert.match(errs.join(' '), /okand fardighet/i);
});

test('saknad fardighet fälls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ fardighet: undefined }), errs, opt);
  assert.match(errs.join(' '), /fardighet saknas/i);
});

test('roda listans fraser utanfor ett myt-steg falls', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ steg: [
    { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
    { typ: 'concept', kicker: 'K', titel: 'T', forklaring: 'Folk koper pa kansla och rattfardigar med logik.' },
    { typ: 'quiz', fragor: [
      { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
      { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    ] },
  ] }), errs, opt);
  assert.match(errs.join(' '), /roda listan/i);
});

test('samma fras inuti ett myt-steg gar igenom', () => {
  const errs = [];
  checkMotpartenLektion('1.1.json', lektion({ steg: [
    { typ: 'intro', kicker: 'K', titel: 'T', ingress: 'I' },
    { typ: 'myt', pastaende: 'Folk koper pa kansla och rattfardigar med logik',
      varifran: 'V', vad_som_galler: 'G', kalla: 'R1' },
    { typ: 'quiz', fragor: [
      { typ: 'single', fraga: 'F1', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
      { typ: 'single', fraga: 'F2', alternativ: ['a', 'b'], ratt: [1], forklaring: 'E' },
      { typ: 'single', fraga: 'F3', alternativ: ['a', 'b'], ratt: [0], forklaring: 'E' },
    ] },
  ] }), errs, opt);
  assert.deepEqual(errs, []);
});
```

- [ ] **Steg 3: Kör testerna och se att de fallerar**

Kör: `node --test "tools/__tests__/check-motparten.test.mjs"`
Förväntat: FAIL med `Cannot find module ../check-motparten.mjs`

- [ ] **Steg 4: Skriv grinden**

Skapa `tools/check-motparten.mjs`:

```javascript
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
   något den själv har avfärdat. */
const RODA = [
  /7\s*procent av kommunikationen/i,
  /kroppsspraket star for|kroppsspråket står för/i,
  /koper pa kansla|köper på känsla/i,
  /speglar? du kundens kroppssprak|speglar? du kundens kroppsspråk/i,
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
  const kallor = opt.kallor;
  const fardigheter = opt.fardigheter;

  // Fokus-kontraktet först: steg, typer, quiz, dash.
  const fore = errs.length;
  checkLesson(name, raw, errs);
  if (errs.length > fore) return; // trasig grundstruktur, vidare kontroll är brus

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
```

- [ ] **Steg 5: Kör testerna och se att de passerar**

Kör: `node --test "tools/__tests__/check-motparten.test.mjs"`
Förväntat: PASS, 8 tester.

- [ ] **Steg 6: Anslut till npm run check**

I `tools/check-all.mjs`, lägg till importen efter `import { checkFokus } ...`:

```javascript
import { checkMotparten } from './check-motparten.mjs';
```

Lägg till raden efter `const fokus = checkFokus();`:

```javascript
const motparten = checkMotparten();
```

och utöka `groups`:

```javascript
const groups = { integritet: integrity, referenser: refs, struktur: structure, dedup: dups, fokus, motparten };
```

- [ ] **Steg 7: Kör hela grinden**

```bash
npm run check && npm run test:tools
```

Förväntat: `Allt grönt`. `motparten (0)` eftersom innehållskatalogen ännu inte finns, och
`checkMotparten` returnerar tom lista då.

- [ ] **Steg 8: Commit**

```bash
git add tools/check-motparten.mjs tools/check-fokus.mjs tools/check-all.mjs tools/__tests__/check-motparten.test.mjs
git commit -m "feat(tools): grind for Motparten med kallregister- och fardighetskontroll

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Innehållsskelettet för Motparten

**Filer:**
- Skapa: `content/motparten/course.json`
- Skapa: `content/motparten/fardigheter.json`
- Skapa: `src/data/ordlista-motparten.json`
- Skapa: `src/styles/motparten.css`

- [ ] **Steg 1: Skapa färdighetslistan**

Skapa `content/motparten/fardigheter.json`:

```json
{
  "fardigheter": [
    "grund.avlarning",
    "grund.evidens",
    "grund.sjalvinsikt",
    "grund.definition",
    "grund.kontrakt",
    "fortroende.grund",
    "fortroende.varme",
    "fortroende.reparation",
    "fortroende.handling"
  ]
}
```

Listan växer när fler kapitel skrivs. Grinden fäller okända värden, så en ny tagg måste
läggas till här först.

- [ ] **Steg 2: Skapa course.json**

Skapa `content/motparten/course.json`. Kapitel 2 till 11 tas inte med, de finns inte än och
en kapitelpost utan lektioner skulle rendera en tom kapitelsida.

```json
{
  "kurs": "motparten",
  "titel": "Motparten",
  "beskrivning": "En kurs i försäljning som handlar om att förstå människor, inte om att bli bättre på att prata. Byggd på forskning där det finns, och märkt som hantverk där det inte gör det.",
  "delar": [
    { "n": 1, "titel": "Avlärning", "sub": "Göra plats innan något nytt får fäste", "kapitel": [0] },
    { "n": 2, "titel": "Personen", "sub": "Förtroende, trygghet och nyfikenhet", "kapitel": [1] }
  ],
  "kapitel": [
    {
      "nummer": 0,
      "titel": "Glöm det du lärt dig",
      "niva": "Nybörjare",
      "tid_min": 34,
      "blurb": "Manus, avslutstekniker och invändningshantering kom ur en värld där säljaren satt på informationen. Den världen finns inte kvar. Kapitlet river arvet med belägg, inte med attityd, och gör plats för resten av kursen.",
      "outcomes": [
        "Veta varför den gamla säljskolan uppstod och vad som förändrats sedan dess",
        "Kunna skilja de fyra vanligaste säljmyterna från vad forskningen faktiskt visar",
        "Känna igen när behovet av att ha rätt eller behovet av affären styr ditt beteende",
        "Kunna formulera vad försäljning är utan att använda ordet övertala"
      ],
      "sebastian": "PLATSHÅLLARE: Sebastian skriver sin kapitelram här.",
      "lektioner": [
        { "lektion": "0.1", "titel": "Vad du blivit lärd, och varifrån det kom", "niva": "Nybörjare", "tid_min": 7, "status": "kommande", "fil": "0.1-vad-du-blivit-lard.json" },
        { "lektion": "0.2", "titel": "Myterna som inte håller", "niva": "Nybörjare", "tid_min": 9, "status": "kommande", "fil": "0.2-myterna-som-inte-haller.json" },
        { "lektion": "0.3", "titel": "Egot i vägen", "niva": "Nybörjare", "tid_min": 7, "status": "kommande", "fil": "0.3-egot-i-vagen.json" },
        { "lektion": "0.4", "titel": "Vad försäljning faktiskt är", "niva": "Nybörjare", "tid_min": 7, "status": "kommande", "fil": "0.4-vad-forsaljning-faktiskt-ar.json" },
        { "lektion": "0.5", "titel": "Kontraktet", "niva": "Nybörjare", "tid_min": 4, "status": "kommande", "fil": "0.5-kontraktet.json" }
      ]
    },
    {
      "nummer": 1,
      "titel": "Förtroende",
      "niva": "Nybörjare",
      "tid_min": 32,
      "blurb": "Förtroende är inte en varm känsla, det är kundens vilja att göra sig sårbar inför dig. Kapitlet visar vad den viljan vilar på, varför du är diskonterad från start, och varför ett brutet löfte väger tyngre än ett misslyckat projekt.",
      "outcomes": [
        "Kunna dela upp trovärdighet i förmåga, välvilja och integritet",
        "Veta varför värme bedöms före kompetens och vad det betyder för ett första möte",
        "Kunna skilja ett kompetensbrott från ett integritetsbrott och veta varför de repareras olika",
        "Ha tre konkreta beteenden som höjer förtroende utan att vara tekniker"
      ],
      "sebastian": "PLATSHÅLLARE: Sebastian skriver sin kapitelram här.",
      "lektioner": [
        { "lektion": "1.1", "titel": "Vad förtroende faktiskt är", "niva": "Nybörjare", "tid_min": 8, "status": "kommande", "fil": "1.1-vad-fortroende-faktiskt-ar.json" },
        { "lektion": "1.2", "titel": "Varför du är diskonterad från start", "niva": "Nybörjare", "tid_min": 8, "status": "kommande", "fil": "1.2-diskonterad-fran-start.json" },
        { "lektion": "1.3", "titel": "Hur förtroende rivs", "niva": "Mellan", "tid_min": 9, "status": "kommande", "fil": "1.3-hur-fortroende-rivs.json" },
        { "lektion": "1.4", "titel": "Vad du faktiskt kan göra", "niva": "Mellan", "tid_min": 7, "status": "kommande", "fil": "1.4-vad-du-faktiskt-kan-gora.json" }
      ]
    }
  ]
}
```

Alla nio har `status: "kommande"`. Varje lektion flippas till `"klar"` i samma commit som
lektionsfilen skrivs, i Task 12 och 13.

- [ ] **Steg 3: Skapa ordlistan**

Skapa `src/data/ordlista-motparten.json`. Samma form som `src/data/ordlista.json`:
term som nyckel, objekt med `forklaring` och valfri `lektion`.

```json
{
  "discovery": { "forklaring": "Den del av säljarbetet där du tar reda på hur kundens situation faktiskt ser ut, innan du föreslår något.", "lektion": "0.4" },
  "pipeline": { "forklaring": "Samlingen av pågående affärer, ofta indelad i steg efter hur långt de kommit." },
  "ICP": { "forklaring": "Ideal customer profile, beskrivningen av vilken sorts kund din lösning faktiskt passar." },
  "intressent": { "forklaring": "En person som påverkar eller påverkas av köpbeslutet, även när hen inte är den som skriver under." },
  "reaktans": { "forklaring": "Motreaktionen som uppstår när en människa upplever att hennes valfrihet hotas. Får folk att göra tvärtom.", "lektion": "0.1" },
  "status quo-bias": { "forklaring": "Tendensen att välja att behålla det man redan har, även när ett byte vore bättre.", "lektion": "0.4" }
}
```

- [ ] **Steg 4: Skapa stilarket**

Skapa `src/styles/motparten.css`:

```css
/* Motparten ärver hela broadsheet-formspråket och byter bara accentfärgerna.
   Tokens sätts på body, inte :root, så att aktiekursen är helt orörd. */
body.kurs-motparten {
  --oxblood: #234B5E;   /* petrolblå, kursens accent */
  --gold: #7A6A2E;      /* dämpad mässing, sekundär */
}
```

Accentfärgen ska godkännas av Ludvig innan innehållet läggs på. Kravet i specen är att den
står tydligt mot aktiekursens oxblod utan att lämna pappersgrunden.

- [ ] **Steg 5: Kör grinden**

```bash
npm run check
```

Förväntat: `Allt grönt`, och `motparten (0)` eftersom inga lektionsfiler finns än.

- [ ] **Steg 6: Commit**

```bash
git add content/motparten src/data/ordlista-motparten.json src/styles/motparten.css
git commit -m "feat(motparten): innehallsskelett, fardighetslista och fargtokens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Routerna för Motparten

**Filer:**
- Skapa: `src/pages/motparten/index.astro`
- Skapa: `src/pages/motparten/kapitel/[nr].astro`
- Skapa: `src/pages/motparten/[lektion].astro`

- [ ] **Steg 1: Skapa översikten**

Skapa `src/pages/motparten/index.astro`:

```astro
---
import KursOversikt from '../../components/kurs/KursOversikt.astro';
---

<KursOversikt kursnyckel="motparten" />
```

- [ ] **Steg 2: Skapa kapitelsidan**

Skapa `src/pages/motparten/kapitel/[nr].astro`:

```astro
---
import KapitelSida from '../../../components/kurs/KapitelSida.astro';
import { laddaKurs } from '../../../lib/kurs.mjs';

export async function getStaticPaths() {
  const kurs = laddaKurs('motparten');
  return kurs.kapitel.map((kap) => ({ params: { nr: String(kap.nummer) }, props: { kap } }));
}

const { kap } = Astro.props;
---

<KapitelSida kursnyckel="motparten" kap={kap} />
```

- [ ] **Steg 3: Skapa spelaren**

Skapa `src/pages/motparten/[lektion].astro`:

```astro
---
import Spelare from '../../components/kurs/Spelare.astro';
import { byggLektionsvagar } from '../../lib/kurs.mjs';

export async function getStaticPaths() {
  return byggLektionsvagar('motparten').map((v) => ({
    params: { lektion: v.lektion },
    props: {
      lesson: v.data,
      prevHref: v.prevHref,
      nextHref: v.nextHref,
      nextLektion: v.nextLektion,
      nextIsChapter: v.nextIsChapter,
      nextKapitel: v.nextKapitel,
      chapterIds: v.chapterIds,
      courseIds: v.courseIds,
      kapitelTitel: v.kapitelTitel,
    },
  }));
}
const p = Astro.props;
---

<Spelare kursnyckel="motparten" {...p} />
```

- [ ] **Steg 4: Bygg och verifiera**

```bash
npm run build
ls dist/motparten
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "FOKUS IDENTISK"
```

Förväntat: `dist/motparten/index.html` och `dist/motparten/kapitel/0/` och `1/` finns.
Inga lektionssidor än, eftersom `byggLektionsvagar` hoppar över filer som inte finns.
`/fokus` ska vara oförändrad.

- [ ] **Steg 5: Verifiera åtkomstgrinden**

`functions/_middleware.js` släpper igenom endast `PUBLIC_EXACT` plus `/api/`, `/_astro/`
och `/bilder/`. `/motparten` finns inte i listan och är därmed redan grindad. Bekräfta:

```bash
grep -n "motparten" functions/_middleware.js || echo "inte publik, alltsa grindad"
```

Förväntat: `inte publik, alltsa grindad`. Ingen kodändring krävs.

- [ ] **Steg 6: Commit**

```bash
git add src/pages/motparten
git commit -m "feat(motparten): routes for oversikt, kapitel och spelare

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Kapitel 0, fem lektioner

Innehåll, inte kod. Skriv en lektion i taget och commit:a var för sig. Grinden är testet.

**Före första lektionen, läs:**
- `Hus-stil_rost.md`, särskilt Sebastian-stycket som är kalibreringsmåttet
- `docs/course-style-guide.md`
- `docs/kallor/motparten-kallregister.md`
- Två befintliga lektioner som formmått, till exempel
  `content/fundamental-aktieanalys/0.1-oddsen.json` och
  `content/fundamental-aktieanalys/1.1-aga-en-aktie.json`

**Formkrav per lektion:** 6 till 11 steg, exakt ett quiz-steg med 3 till 6 frågor,
`fardighet` satt, inga em-dashes eller en-dashes, evidensmärkning där påståendet bär
lektionen och inte överallt.

- [ ] **Steg 1: Skriv 0.1**

Skapa `content/motparten/0.1-vad-du-blivit-lard.json`. Färdighet: `grund.avlarning`.
Källor: K8 (reaktans), K13 (motiverande samtal), R5, R7.

Innehållsbåge: den gamla säljskolan uppstod när säljaren satt på informationen och köparen
inte kunde jämföra. Beskriv den utan förakt, den fungerade i sin tid. Sedan vad som
förändrats: köparen har priset, recensionerna och konkurrenten i handen innan du ringer.
Sedan reaktansen, som förklarar varför pressen känns effektiv för säljaren men inte är det.
Avsluta med att det som ska bort inte är ambitionen utan verktygen.

Ett `evidens`-block med `niva: "A"`, `kalla: "K8"` på reaktanssteget.

- [ ] **Steg 2: Flippa status och kör grinden**

Ändra `status` för 0.1 i `content/motparten/course.json` till `"klar"`.

```bash
npm run check
```

Förväntat: `Allt grönt`, `motparten (0)`.

- [ ] **Steg 3: Commit 0.1**

```bash
git add content/motparten/0.1-vad-du-blivit-lard.json content/motparten/course.json
git commit -m "feat(motparten): lektion 0.1, vad du blivit lard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Steg 4: Skriv 0.2, upprepa steg 2 och 3**

Skapa `content/motparten/0.2-myterna-som-inte-haller.json`. Färdighet: `grund.evidens`.
Kapitlets tyngsta lektion, fyra `myt`-steg i rad, ett per myt:

| Myt | `kalla` | Vad som gäller |
| --- | --- | --- |
| Bara 7 procent av kommunikationen är ord | R1 | Två labbstudier från 1967 om motstridiga signaler om gillande, som Mehrabian själv sagt inte gäller kommunikation i allmänhet |
| Spegla kundens kroppsspråk så bygger du rapport | R2 | Spontan spegling samvarierar med sympati, medveten spegling som teknik saknar stöd och kan slå tillbaka när den upptäcks (K11) |
| Läs av kundens personlighetstyp och anpassa dig | R3 | Typtesterna förutsäger inte arbetsprestation väl och delar ett kontinuum i lådor |
| Folk köper på känsla och rättfärdigar med logik | R4 | Känsla behövs för att kunna besluta alls, men i ett affärsbeslut är försvaret inför andra en verklig arbetsuppgift, inte en efterhandskonstruktion |

Fyra myt-steg i rad blir monotont. Bryt med ett `reading`-steg mellan myt två och tre som
kliver tillbaka och frågar varför myterna sprids: de är lätta att lära ut, de känns sanna,
och de ger säljaren något att göra. Avsluta med ett `concept`-steg om vad eleven ska göra i
stället, alltså fråga efter belägget.

Kör `npm run check` och verifiera särskilt att inga röd-listefraser läckt ut i
brödtexten utanför myt-stegen. Grinden fäller det.

- [ ] **Steg 5: Skriv 0.3, upprepa steg 2 och 3**

Skapa `content/motparten/0.3-egot-i-vagen.json`. Färdighet: `grund.sjalvinsikt`.
Källor: K5, K8, K12.

Båge: två behov gör säljare sämre, behovet av att ha rätt och behovet av affären. Behovet
av att ha rätt gör att du argumenterar, vilket utlöser reaktans. Behovet av affären syns i
tonfall och tempo, och det är princip 11 i kursen, alltså hantverk och ska märkas C. Sedan
det som vänder på elevens intuition: att be om råd höjer den upplevda kompetensen (K5,
niva A). Avsluta med personlighetsfyndet, att extraversion förutsäger säljresultat dåligt
(K12, niva B), så att "jag är inte säljartypen" faller.

- [ ] **Steg 6: Skriv 0.4, upprepa steg 2 och 3**

Skapa `content/motparten/0.4-vad-forsaljning-faktiskt-ar.json`. Färdighet:
`grund.definition`. Källor: K6, K10, K13.

Båge: definitionen byggd från första principer, alltså att hjälpa någon fatta ett beslut
under osäkerhet när du själv tjänar på utfallet. Sedan status quo-biasen (K6, niva A) som
ger den skarpaste konsekvensen: din konkurrent är att kunden gör ingenting. Sedan risk mot
värde som kursens bärande spänning, med K10 märkt niva B och den uttryckliga brasklappen
att vi inte påstår att förlust väger dubbelt.

Ett `concept`-steg med `visual` av typen `jamforelse` passar här, med två element:
"Höja värdet" mot "Sänka risken". Bara om jämförelsen bär något prosan inte kan, annars
utelämnas den.

- [ ] **Steg 7: Skriv 0.5, upprepa steg 2 och 3**

Skapa `content/motparten/0.5-kontraktet.json`. Färdighet: `grund.kontrakt`. Inga
forskningskällor, lektionen är kursens eget löfte.

Båge: vad kursen lovar, alltså förståelse och omdöme, och vad den inte lovar, alltså en
teknik som får folk att köpa. Hur de fyra evidensnivåerna ska läsas, med ett konkret
exempel på var och en. Vad som krävs av eleven. Motsvarigheten i aktiekursen är
`content/fundamental-aktieanalys/0.3-vad-kursen-lovar.json`, läs den för tonfallet, och
skriv inte av den.

Kortaste lektionen i kapitlet, sikta på 6 steg.

---

## Task 13: Kapitel 1, fyra lektioner

- [ ] **Steg 1: Klara ut Huang-korrigeringen först**

Källa K4 är märkt "att kontrollera" i registret. Korrigeringen till Huang med flera
publicerades i JPSP i mars 2025, doi 10.1037/pspi0000491. Ta reda på vad den gäller.

Gäller den huvudfyndet: flytta K4 till nivå B i
`docs/kallor/motparten-kallregister.md` med förklaring, eller ta bort den och skriv 1.4
utan den. Gäller den något perifert, till exempel en siffra i en tabell: notera det i
registret och behåll nivå A.

Commit:a registeruppdateringen för sig innan 1.4 skrivs.

- [ ] **Steg 2: Skriv 1.1**

Skapa `content/motparten/1.1-vad-fortroende-faktiskt-ar.json`. Färdighet:
`fortroende.grund`. Källor: K1, K2, båda niva A.

Båge: förtroende är viljan att göra sig sårbar, inte en varm känsla. Trovärdighet vilar på
förmåga, välvilja och integritet, och de tre bedöms separat, vilket förklarar varför en
kund kan gilla dig och ändå inte köpa. Sedan att värme bedöms först och väger tyngst.

Ett `concept`-steg med `visual` av typen `flode` eller `jamforelse` för de tre
bedömningarna, men bara om formen tillför. Tre ord i en ruta är inte en graf.

Flippa status, kör `npm run check`, commit.

- [ ] **Steg 3: Skriv 1.2**

Skapa `content/motparten/1.2-diskonterad-fran-start.json`. Färdighet: `fortroende.varme`.
Källor: K1, K2, K15, K8.

Båge: kundens utgångsläge är rimlig misstänksamhet, inte fientlighet. Första intrycket
bildas på tiondelar av en sekund och är trögt att flytta (K15, niva B), med den uttryckliga
brasklappen att snabba omdömen inte är korrekta och att detta beskriver motpartens bias,
inte ett skäl att optimera sitt utseende. Sedan det som faktiskt flyttar bedömningen:
signaler som kostar dig något. Att säga nej till merförsäljning. Att säga att du inte vet.
Att lämna en invändning oemotsagd när den stämmer. Dessa är hantverk, niva C.

Flippa status, kör `npm run check`, commit.

- [ ] **Steg 4: Skriv 1.3**

Skapa `content/motparten/1.3-hur-fortroende-rivs.json`. Färdighet:
`fortroende.reparation`. Källa: K3, niva A.

Kapitlets starkaste fynd. Båge: ett kompetensbrott läses som en händelse, ett
integritetsbrott som en egenskap. Därför repareras de olika: ursäkten fungerar på
kompetensbrottet men bekräftar integritetsbrottet. Var noga med brasklappen i registret:
studien mäter hur mottagaren reagerar, inte vad som är rätt att göra, och kursen drar inte
slutsatsen att man ska förneka sig ur något man gjort. Den praktiska konsekvensen är att
den enda hållbara hanteringen av ett integritetsbrott är att inte begå det.

Ett `concept`-steg med `visual` av typen `jamforelse`, två element: kompetensbrott mot
integritetsbrott, med vad kunden drar för slutsats i vardera fallet. Här bär jämförelsen
faktiskt lektionen, så grafiken är befogad.

Flippa status, kör `npm run check`, commit.

- [ ] **Steg 5: Skriv 1.4**

Skapa `content/motparten/1.4-vad-du-faktiskt-kan-gora.json`. Färdighet:
`fortroende.handling`. Källor: K4 (efter steg 1), K5, K7.

Båge: kapitlets handlingsdel, och den som lättast blir en teknikruta. Håll den vid varför
beteendena fungerar. Frågor och följdfrågor höjer upplevd lyhördhet (K4), med brasklappen
att studierna mäter sympati och inte affärer. Att be om råd höjer upplevd kompetens (K5).
Trygghet nog att säga obekväma saker är en förutsättning för att kunden ska berätta det som
betyder något (K7, med noteringen att studien gäller arbetsgrupper och att överföringen är
kursens tolkning).

Flippa status, kör `npm run check`, commit.

---

## Task 14: Röstpass

**Filer:**
- Skapa: `tools/motparten-rosttext.mjs`
- Ändra: de nio lektionsfilerna i `content/motparten/`

Båda röstverktygen läser markdown, inte JSON. `granska_rost.py` delar en fil på rubriker
som matchar `^###\s+(\d+\.\d+)\s+(.*)$`, och `tools/rost-flagga.mjs` läser
`src/content/kurs`. Aktiekursen kunde köra dem direkt eftersom dess källa är markdown.
Motpartens källa är JSON, så prosan behöver plockas ut först.

- [ ] **Steg 1: Skriv textutdragaren**

Skapa `tools/motparten-rosttext.mjs`:

```javascript
/* Plockar ut prosan ur Motpartens lektions-JSON till en markdown-fil som
   granska_rost.py kan läsa. Rubrikformatet är det skriptet delar på.
   Kör: node tools/motparten-rosttext.mjs > rost-motparten.md */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'motparten');

function stegProsa(s) {
  const rader = [s.ingress, s.lead, s.forklaring, s.slutsats, s.takeaway,
    s.vad_som_galler, s.varifran, ...(s.brodtext ?? [])];
  for (const f of s.fragor ?? []) rader.push(f.fraga, f.forklaring);
  return rader.filter(Boolean);
}

const filer = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'course.json' && f !== 'fardigheter.json')
  .sort();

for (const f of filer) {
  const d = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  console.log(`### ${d.lektion} ${d.titel}\n`);
  for (const s of d.steg) for (const rad of stegProsa(s)) console.log(rad + '\n');
}
```

Kickers, titlar och etiketter utelämnas medvetet. De är versala fragment, inte prosa, och
skulle dra upp meningslängds- och tretalsflaggorna med brus.

- [ ] **Steg 2: Kör röstgranskningen**

```bash
node tools/motparten-rosttext.mjs > rost-motparten.md
python granska_rost.py rost-motparten.md
```

Förväntat: en rangordnad lista med tell-poäng per lektion. `hen` måste vara 0, annars
avslutar skriptet med kod 1.

Lägg `rost-motparten.md` i `.gitignore`, det är en arbetsfil:

```bash
echo "rost-motparten.md" >> .gitignore
```

- [ ] **Steg 3: Åtgärda flaggorna**

Prioriteringsordning ur `Hus-stil_rost.md`: hen är hårt fel och ska bort helt. Därefter
metaprat, antites som manér, fyllnadsorden genuint, faktiskt, just, själva, precis,
verkligen, tretal på rad, och meningar över fyrtio ord.

- [ ] **Steg 4: Läs igenom kapitel 0 i följd**

Kontrollera tre saker som inget verktyg fångar: att kapitlet är mer inbjudande än
nedrivande, att de fyra myt-stegen i 0.2 inte blir monotona, och att evidensmärkningen
sitter där påståendet bär lektionen och inte på varje steg.

- [ ] **Steg 5: Kör grinden och commit**

```bash
npm run check && npm run test:tools
git add content/motparten tools/motparten-rosttext.mjs .gitignore
git commit -m "style(motparten): rostpass mot hus-stilen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Bygg, verifiera och deploy

- [ ] **Steg 1: Full kontroll**

```bash
npm run check && npm run test:tools && npm run build
node tools/dist-hash.mjs dist/fokus > efter-fokus.txt
diff baseline-fokus.txt efter-fokus.txt && echo "FOKUS IDENTISK"
ls dist/motparten
```

Förväntat: allt grönt, `/fokus` oförändrad, nio lektionssidor och två kapitelsidor under
`dist/motparten`.

- [ ] **Steg 2: Granska lokalt**

```bash
npm run preview
```

Öppna `/motparten`, en kapitelsida och tre lektioner. Kontrollera att accentfärgen slår
igenom, att marginalnotiserna syns, att myt-stegen ser rätt ut i både smalt och brett
fönster, och att aktiekursen fortfarande är oxblodsröd.

- [ ] **Steg 3: Deploy**

```bash
wrangler pages deploy dist --project-name=kurs --branch=main
```

`--branch=main` är obligatoriskt. Utan det hamnar bygget i preview i stället för produktion.

- [ ] **Steg 4: Verifiera i produktion**

Öppna `https://kurs-7m8.pages.dev/motparten` i ett privat fönster och bekräfta att
inloggningsgrinden slår till. Logga in och gå igenom en lektion.

- [ ] **Steg 5: Uppdatera CLAUDE.md**

Lägg till Motparten under Struktur och Status: andra kursen, kursnyckeln, katalogen,
routerna, evidenspolicyn och grinden. Notera att `src/lib/kurs.mjs` är den enda platsen som
känner till var en kurs bor.

```bash
git add CLAUDE.md
git commit -m "docs: dokumentera Motparten som andra kurs pa plattformen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Kvar efter piloten

Ligger utanför planen och kräver egna beslut:

- Sebastians kapitelramar, som står som PLATSHÅLLARE i `content/motparten/course.json`.
- Granskning av de tolv principerna, som specen kräver innan kapitel 2 skrivs.
- Kapitel 2 till 11 enligt kurskartan.
- Ingång till Motparten från `/hem`, som i dag bara känner till aktiekursen.
- Kapitelbilder under `/bilder/motparten-kapitel-N.jpg`. Saknas de renderas kapitelhuvudet
  utan bakgrundsbild, vilket fungerar men ser tunnare ut än aktiekursen.
- AI-coachen, som får egen spec och hänger på `fardighet`-taggarna.
