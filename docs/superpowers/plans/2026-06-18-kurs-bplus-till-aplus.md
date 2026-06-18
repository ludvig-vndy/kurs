# Kurs B+ → A+: Implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lyfta kursen i fundamental analys från B+ (86/100) till A+ genom att skära mall/redundans, förankra i verkliga fall, täppa de tunga luckorna och bygga om capstonen — utan att införa nya fel.

**Architecture:** Strategin finns redan i `Omskrivningsplan_fran_Bplus_till_Aplus.md`. Den här planen gör den körbar: först byggs **automatiska grindar** (integritet, döda referenser, mall-struktur, dedup) och **frysta indata** (formelbilaga, mall, stilguide). Sedan körs den breda omskrivningen som ett *gate-verifierat kontrakt* per modul med parallella agenter. Varje milstolpe måste passera `npm run check` grönt. Nya lektioner och capstone-ombygget författas sist mot samma grindar.

**Tech Stack:** Astro 5 content collections, Node 24 (`node:test`, inga nya beroenden), Zod-schema, parallella underagenter för omskrivning, Cloudflare Pages för deploy.

**Princip:** Korta genom att skära mallen och dubbletterna, inte ämnena. Lektionsantalet *härleds* ur strukturen — det är inget mål i sig.

---

## Faser och beroenden

```
Fas A  Grund & grindar (kodbar, TDD) ──► måste vara GRÖN och FRYST innan B
Fas B  Bred omskrivning (orkestrerad, gate-verifierad per modul)
Fas C  Nytt innehåll (diskontingsränta, sektor, svensk praktik, index, fall, capstone, 15.1/18.4)
Fas D  Polish, röst, verktyg, quiz, slutgrind
```

Fas A är där den här planen tillför mest över strategidokumentet: utan grindarna konvergerar inte en omskrivning av 100+ lektioner. **Hård grind: ingen Fas B-modul börjar förrän Fas A är grön och formelbilagan + mallen är godkända av användaren.**

---

## Filstruktur (skapas i Fas A)

| Fil | Ansvar |
|---|---|
| `course.manifest.json` | Kanonisk lista över förväntade lektioner (källa: kursstrukturen). Sanning för integritetskollen. |
| `tools/lib/lessons.mjs` | Delad parser: läs alla lektioner, returnera `{id, modul, lektion, del, frontmatter, body, sections, path}`. |
| `tools/check-integrity.mjs` | Frontmatter-fält, niva-enum, ordning unik/stigande, slug ASCII, alla manifest-lektioner på plats. |
| `tools/check-refs.mjs` | Varje korsreferens `(X.Y)`/`korsref X.Y`/`Modul N` pekar på något som finns. |
| `tools/check-structure.mjs` | Varje innehållslektion följer den magra mallen; inga bannlysta mallfraser; ordlängd inom intervall. |
| `tools/check-dedup.mjs` | Samma mening (>8 ord) får inte förekomma i >2 lektioner; rapporterar redundans. |
| `tools/check-all.mjs` | Kör alla fyra; exit 1 om någon fallerar. Wire:as till `npm run check`. |
| `tools/__tests__/*.test.mjs` | `node:test`-tester per grind mot fixtures i `tools/__tests__/fixtures/`. |
| `docs/lean-lesson-template.md` | FRYST indata: den nya magra lektionsmallen (sektioner, längdmål, ton). |
| `docs/course-style-guide.md` | FRYST indata: röst, bannlysta fraser, svensk terminologi, sifferpolicy för riktiga bolag. |
| `src/content/kurs/00-referens/formelbilaga.md` | FRYST indata: kanoniska definitioner (NOPAT, FCFF/FCFE, ROIC, DuPont, WACC/CAPM, LTV/CAC, regeln om 40, felmarginal). Lektioner länkar hit i stället för att omdefiniera. |

---

## FAS A — Grund & grindar (kodbar, TDD)

### Task A0: Repo-synk och nulägeskoll  ✅ (delvis gjort)

**Status:** De tidigare saknade filerna **15.1 (Vad risk faktiskt är)** och **18.4 (Kursavslutning)** är nu inlagda i repot och verifierade. Repot innehåller **107 lektioner**. `_MANIFEST.txt` (genererad ur den verifierade filuppsättningen) och en uppdaterad kursstruktur (18.4 tillagd) finns redan.

**Files:**
- Exists: `_MANIFEST.txt` (verifierad uppsättning, 107 rader, inkl. 15.1 och 18.4)
- Create: `course.manifest.json`

- [ ] **Step 1: Seeda manifestet ur den VERIFIERADE filuppsättningen, inte strukturdokumentet**

Viktigt (användarfeedback): om manifestet härleds enbart ur `Fundamental_analys_kursstruktur.md` riskerar 18.4 att saknas och då skyddar integritetsgrinden den aldrig — den kan tyst falla bort. Generera därför `course.manifest.json` ur `_MANIFEST.txt` (sanningen är de filer som faktiskt finns och verifierats), och *korskolla* mot strukturdokumentet som sekundär kontroll.

```bash
node tools/gen-manifest.mjs   # uppdaterar _MANIFEST.txt vid behov
```
Format på `course.manifest.json`:
```json
{
  "seededFrom": "_MANIFEST.txt (verifierad filuppsättning)",
  "crosscheckedAgainst": "Fundamental_analys_kursstruktur.md",
  "count": 107,
  "lessons": [{ "lektion": "1.1", "modul": 1, "titel": "Vad det innebär att äga en aktie" }]
}
```

- [ ] **Step 2: Korskolla manifest vs strukturdokument**

Integritetsgrinden (A2) ska rapportera diff åt *båda* håll: filer som finns men saknas i strukturdokumentet, och tvärtom. Strukturdokumentet är nu uppdaterat med 18.4 så de ska stämma. Avvikelser stoppar Fas B.

- [ ] **Step 3: Commit**

```bash
git add course.manifest.json _MANIFEST.txt tools/gen-manifest.mjs Fundamental_analys_kursstruktur.md
git commit -m "chore: seed manifest from verified file set (107 lessons incl 15.1, 18.4)"
```

---

### Task A1: Delad lektionsparser

**Files:**
- Create: `tools/lib/lessons.mjs`
- Test: `tools/__tests__/lessons.test.mjs`
- Create: `tools/__tests__/fixtures/ok/01-x/1.1-a.md`

- [ ] **Step 1: Write the failing test**

```javascript
// tools/__tests__/lessons.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLessons } from '../lib/lessons.mjs';

test('loadLessons parses frontmatter, body and H2 sections', async () => {
  const lessons = await loadLessons('tools/__tests__/fixtures/ok');
  assert.equal(lessons.length, 1);
  const l = lessons[0];
  assert.equal(l.lektion, '1.1');
  assert.equal(l.modul, 1);
  assert.equal(l.frontmatter.titel, 'A');
  assert.deepEqual(l.sections, ['Kärnan', 'Övning']);
});
```

- [ ] **Step 2: Create the fixture**

```markdown
<!-- tools/__tests__/fixtures/ok/01-x/1.1-a.md -->
---
del: "Grunden"
modul: 1
modulTitel: "X"
lektion: "1.1"
titel: "A"
niva: "Nybörjare"
ordning: 101
fardighet: "F"
---

## Kärnan
Text.

## Övning
Gör.
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tools/__tests__/lessons.test.mjs`
Expected: FAIL ("Cannot find module '../lib/lessons.mjs'").

- [ ] **Step 4: Implement the parser**

```javascript
// tools/lib/lessons.mjs
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-ZåäöÅÄÖ]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].replace(/#.*$/, '').trim().replace(/^["']|["']$/g, '');
    if (/^-?\d+$/.test(v)) v = Number(v);
    fm[kv[1]] = v;
  }
  return { frontmatter: fm, body: m[2] };
}

export async function loadLessons(base = 'src/content/kurs') {
  const files = await walk(base);
  const lessons = [];
  for (const path of files) {
    const raw = await readFile(path, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const sections = [...body.matchAll(/^##\s+(.+)$/gm)].map((x) => x[1].trim());
    lessons.push({
      path,
      frontmatter,
      body,
      sections,
      modul: frontmatter.modul,
      lektion: String(frontmatter.lektion ?? ''),
      del: frontmatter.del,
      id: String(frontmatter.lektion ?? path),
    });
  }
  return lessons.sort((a, b) => (a.frontmatter.ordning ?? 0) - (b.frontmatter.ordning ?? 0));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tools/__tests__/lessons.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/lib/lessons.mjs tools/__tests__/
git commit -m "feat(tools): shared lesson parser with tests"
```

---

### Task A2: Integritetsgrind

> Utöver fälten nedan ska grinden även **korskolla mot `course.manifest.json`**: varje manifest-lektion måste finnas som fil (annars kan en lektion tyst falla bort), och varje fil måste finnas i manifestet. Lägg ett test `flags a lesson missing vs manifest` och utöka `checkIntegrity` att läsa manifestet och rapportera diff åt båda håll.

**Files:**
- Create: `tools/check-integrity.mjs`
- Test: `tools/__tests__/integrity.test.mjs`
- Create fixtures: `tools/__tests__/fixtures/bad-niva/01-x/1.1-a.md`

- [ ] **Step 1: Write the failing test**

```javascript
// tools/__tests__/integrity.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIntegrity } from '../check-integrity.mjs';

test('passes a clean fixture', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/ok');
  assert.deepEqual(errors, []);
});

test('flags invalid niva', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/bad-niva');
  assert.ok(errors.some((e) => /niva/.test(e)));
});
```

- [ ] **Step 2: Create the bad fixture** (copy of ok fixture but `niva: "Expert"`).

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tools/__tests__/integrity.test.mjs`
Expected: FAIL ("Cannot find module '../check-integrity.mjs'").

- [ ] **Step 4: Implement**

```javascript
// tools/check-integrity.mjs
import { loadLessons } from './lib/lessons.mjs';

const REQUIRED = ['del', 'modul', 'modulTitel', 'lektion', 'titel', 'niva', 'ordning', 'fardighet'];
const NIVA = new Set(['Nybörjare', 'Mellan', 'Avancerad']);

export async function checkIntegrity(base) {
  const lessons = await loadLessons(base);
  const errors = [];
  const seenOrdning = new Map();
  for (const l of lessons) {
    for (const k of REQUIRED) {
      if (l.frontmatter[k] === undefined || l.frontmatter[k] === '')
        errors.push(`${l.path}: saknar frontmatter-fält "${k}"`);
    }
    if (!NIVA.has(l.frontmatter.niva))
      errors.push(`${l.path}: ogiltig niva "${l.frontmatter.niva}"`);
    if (!/^[\x00-\x7F]*$/.test(l.path.split(/[\\/]/).pop().replace(/[åäöÅÄÖ]/g, 'x')))
      errors.push(`${l.path}: slug har icke-ASCII utöver åäö`);
    const o = l.frontmatter.ordning;
    if (seenOrdning.has(o)) errors.push(`${l.path}: dubblerad ordning ${o} (även ${seenOrdning.get(o)})`);
    else seenOrdning.set(o, l.path);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await checkIntegrity(process.argv[2] || 'src/content/kurs');
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} integritetsfel` : '✓ integritet OK');
  process.exit(errors.length ? 1 : 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tools/__tests__/integrity.test.mjs`
Expected: PASS (both tests).

- [ ] **Step 6: Run against real repo**

Run: `node tools/check-integrity.mjs`
Expected: `✓ integritet OK` (eller en lista att åtgärda).

- [ ] **Step 7: Commit**

```bash
git add tools/check-integrity.mjs tools/__tests__/
git commit -m "feat(tools): integrity gate with tests"
```

---

### Task A3: Grind för döda referenser

**Files:**
- Create: `tools/check-refs.mjs`
- Test: `tools/__tests__/refs.test.mjs`
- Create fixture: `tools/__tests__/fixtures/deadref/01-x/1.1-a.md` (body innehåller `(9.9)`).

- [ ] **Step 1: Write the failing test**

```javascript
// tools/__tests__/refs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRefs } from '../check-refs.mjs';

test('clean fixture has no dead refs', async () => {
  assert.deepEqual(await checkRefs('tools/__tests__/fixtures/ok'), []);
});

test('flags a reference to a non-existent lesson', async () => {
  const errors = await checkRefs('tools/__tests__/fixtures/deadref');
  assert.ok(errors.some((e) => /9\.9/.test(e)));
});
```

- [ ] **Step 2: Create the deadref fixture** (ok-lektion + en rad: `Se vidare (9.9).`).

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tools/__tests__/refs.test.mjs`
Expected: FAIL (modul saknas).

- [ ] **Step 4: Implement**

```javascript
// tools/check-refs.mjs
import { loadLessons } from './lib/lessons.mjs';

export async function checkRefs(base) {
  const lessons = await loadLessons(base);
  const existing = new Set(lessons.map((l) => l.lektion));
  const errors = [];
  for (const l of lessons) {
    // Endast tydliga lektionsreferenser: "(X.Y)" och "korsref X.Y"
    const refs = [
      ...l.body.matchAll(/\((\d{1,2}\.\d{1,2})\)/g),
      ...l.body.matchAll(/korsref\s+(\d{1,2}\.\d{1,2})/gi),
    ].map((m) => m[1]);
    for (const r of refs) {
      if (!existing.has(r)) errors.push(`${l.path}: död referens (${r})`);
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await checkRefs(process.argv[2] || 'src/content/kurs');
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} döda referenser` : '✓ referenser OK');
  process.exit(errors.length ? 1 : 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tools/__tests__/refs.test.mjs`
Expected: PASS.

- [ ] **Step 6: Run against real repo (förväntad RÖD: 15.1)**

Run: `node tools/check-refs.mjs`
Expected: rapporterar döda `(15.1)`-referenser i modul 15 — bekräftar Task C7-behovet.

- [ ] **Step 7: Commit**

```bash
git add tools/check-refs.mjs tools/__tests__/
git commit -m "feat(tools): dead cross-reference gate with tests"
```

---

### Task A4: Mall-strukturgrind

**Files:**
- Create: `docs/lean-lesson-template.md`
- Create: `tools/check-structure.mjs`
- Test: `tools/__tests__/structure.test.mjs`

- [ ] **Step 1: Definiera och frys den magra mallen**

Create `docs/lean-lesson-template.md`. Den magra mallen för en innehållslektion (synteslektioner och `00-referens` undantas):

```markdown
## Varför det spelar roll        (kort krok, gärna en berättelse)
## Så fungerar det               (koncept enkelt → fördjupning, ett spår)
## Hur en erfaren investerare tänker
## Exempel                       (siffror ELLER ett namngivet, daterat fall)
## Vad du letar efter och vad som varnar   (slår ihop gröna/röda flaggor + vanliga misstag)
## Checklista och övning         (kort checklista + en konkret övning)
```

Bannlysta mallfraser (får inte förekomma): "Samma X, motsatta", "Det är därför", "En konkret kontrast: ett annat bolag", "Tecknet: fråga". Längdmål per innehållslektion: 700–1600 ord. Markera undantag i frontmatter med `format: "syntes"` eller `format: "referens"`.

- [ ] **Step 2: Lägg `format` (valfritt) i Zod-schemat**

Modify `src/content.config.ts`: lägg till `format: z.enum(['standard', 'syntes', 'referens']).optional()` i schemat.

- [ ] **Step 3: Write the failing test**

```javascript
// tools/__tests__/structure.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStructure } from '../check-structure.mjs';

test('clean standard lesson passes', async () => {
  assert.deepEqual(await checkStructure('tools/__tests__/fixtures/lean-ok'), []);
});

test('flags banned template phrase', async () => {
  const errors = await checkStructure('tools/__tests__/fixtures/banned');
  assert.ok(errors.some((e) => /bannlyst fras/.test(e)));
});
```

- [ ] **Step 4: Create fixtures** `lean-ok` (alla sex sektionerna, 700+ ord) och `banned` (innehåller "Samma sak, motsatta utfall").

- [ ] **Step 5: Run test to verify it fails**

Run: `node --test tools/__tests__/structure.test.mjs`
Expected: FAIL (modul saknas).

- [ ] **Step 6: Implement**

```javascript
// tools/check-structure.mjs
import { loadLessons } from './lib/lessons.mjs';

const REQUIRED = ['Varför det spelar roll', 'Så fungerar det', 'Hur en erfaren investerare tänker',
  'Exempel', 'Vad du letar efter och vad som varnar', 'Checklista och övning'];
const BANNED = ['Samma sak, motsatta', 'Samma X, motsatta', 'Det är därför',
  'En konkret kontrast: ett annat bolag', 'Tecknet: fråga'];

export async function checkStructure(base) {
  const lessons = await loadLessons(base);
  const errors = [];
  for (const l of lessons) {
    const fmt = l.frontmatter.format || 'standard';
    if (fmt !== 'standard') continue; // syntes/referens undantas
    for (const s of REQUIRED)
      if (!l.sections.some((sec) => sec.startsWith(s.split(' ')[0])))
        errors.push(`${l.path}: saknar sektion "${s}"`);
    for (const b of BANNED)
      if (l.body.includes(b)) errors.push(`${l.path}: bannlyst fras "${b}"`);
    const words = l.body.trim().split(/\s+/).length;
    if (words < 700 || words > 1600)
      errors.push(`${l.path}: ordlängd ${words} utanför 700–1600`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await checkStructure(process.argv[2] || 'src/content/kurs');
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} strukturavvik` : '✓ struktur OK');
  process.exit(errors.length ? 1 : 0);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test tools/__tests__/structure.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add docs/lean-lesson-template.md src/content.config.ts tools/check-structure.mjs tools/__tests__/
git commit -m "feat(tools): lean-template structure gate + frozen template"
```

> Obs: körd mot dagens repo kommer denna grind vara RÖD (gamla mallen). Det är meningen — den blir grön modul för modul under Fas B.

---

### Task A5: Dedup-grind

**Files:**
- Create: `tools/check-dedup.mjs`
- Test: `tools/__tests__/dedup.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tools/__tests__/dedup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateSentences } from '../check-dedup.mjs';

test('flags a long sentence repeated across 3 lessons', () => {
  const lessons = [
    { path: 'a', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
    { path: 'b', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
    { path: 'c', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
  ];
  const dups = findDuplicateSentences(lessons, { minWords: 8, maxLessons: 2 });
  assert.equal(dups.length, 1);
  assert.equal(dups[0].count, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/__tests__/dedup.test.mjs`
Expected: FAIL (modul saknas).

- [ ] **Step 3: Implement**

```javascript
// tools/check-dedup.mjs
import { loadLessons } from './lib/lessons.mjs';

const norm = (s) => s.toLowerCase().replace(/[^a-zåäö0-9 ]/g, '').replace(/\s+/g, ' ').trim();

export function findDuplicateSentences(lessons, { minWords = 8, maxLessons = 2 } = {}) {
  const map = new Map(); // mening -> Set(path)
  for (const l of lessons) {
    for (const raw of l.body.split(/(?<=[.!?])\s+/)) {
      const s = norm(raw);
      if (s.split(' ').length < minWords) continue;
      if (!map.has(s)) map.set(s, new Set());
      map.get(s).add(l.path);
    }
  }
  return [...map.entries()]
    .filter(([, paths]) => paths.size > maxLessons)
    .map(([sentence, paths]) => ({ sentence, count: paths.size, paths: [...paths] }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const lessons = await loadLessons(process.argv[2] || 'src/content/kurs');
  const dups = findDuplicateSentences(lessons);
  dups.forEach((d) => console.error(`✗ ×${d.count}: "${d.sentence.slice(0, 70)}…"`));
  console.log(dups.length ? `\n${dups.length} upprepade meningar` : '✓ ingen grov redundans');
  process.exit(dups.length ? 1 : 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/__tests__/dedup.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/check-dedup.mjs tools/__tests__/
git commit -m "feat(tools): cross-lesson dedup gate with tests"
```

---

### Task A6: Samlad grind + npm-script

**Files:**
- Create: `tools/check-all.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement runner**

```javascript
// tools/check-all.mjs
import { checkIntegrity } from './check-integrity.mjs';
import { checkRefs } from './check-refs.mjs';
import { checkStructure } from './check-structure.mjs';
import { loadLessons } from './lib/lessons.mjs';
import { findDuplicateSentences } from './check-dedup.mjs';

const base = process.argv[2] || 'src/content/kurs';
const integrity = await checkIntegrity(base);
const refs = await checkRefs(base);
const structure = await checkStructure(base);
const dups = findDuplicateSentences(await loadLessons(base)).map((d) => `×${d.count}: ${d.sentence.slice(0, 60)}…`);

const groups = { integritet: integrity, referenser: refs, struktur: structure, dedup: dups };
let failed = 0;
for (const [name, errs] of Object.entries(groups)) {
  console.log(`\n${errs.length ? '✗' : '✓'} ${name} (${errs.length})`);
  errs.slice(0, 20).forEach((e) => console.log('   ', e));
  failed += errs.length;
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Add npm scripts**

Modify `package.json` scripts:
```json
"check": "node tools/check-all.mjs",
"test:tools": "node --test tools/__tests__/"
```

- [ ] **Step 3: Run both**

Run: `npm run test:tools && npm run check`
Expected: tester PASS; `check` rapporterar dagens röda lägen (gammal mall, 15.1-refs) — det är baslinjen Fas B/C ska göra grön.

- [ ] **Step 4: Commit**

```bash
git add tools/check-all.mjs package.json
git commit -m "feat(tools): npm run check aggregate gate"
```

---

### Task A7: Frysta indata — formelbilaga + stilguide

**Files:**
- Create: `src/content/kurs/00-referens/formelbilaga.md`
- Create: `docs/course-style-guide.md`

- [ ] **Step 1: Skriv formelbilagan med de korrekta definitionerna**

Create `src/content/kurs/00-referens/formelbilaga.md`. Frontmatter måste vara **komplett och Zod-giltig** (annars fallerar integritetsgrinden): `del: "Referens"`, `modul: 0`, `modulTitel: "Referens"`, `lektion: "0.0"`, `titel: "Formelbilaga"`, `niva: "Nybörjare"`, `ordning: 9000` (sist, stör inte läsordningen), `fardighet: "..."`, samt `format: "referens"` (undantas av struktur- och quiz-grindarna). Innehåll: kanoniska, lärobokskorrekta definitioner enligt korrekthetsklustret:
- **NOPAT** = rörelseresultat (EBIT) × (1 − skattesats).
- **FCFF** ≈ rörelsekassaflöde − investeringar (till hela bolaget, diskonteras med WACC). **FCFE** = efter ränta och amortering (till ägarna, diskonteras med avkastningskravet på eget kapital).
- **ROIC** = NOPAT / investerat kapital. **DuPont ROE** = nettomarginal × kapitalomsättning × hävstång (bas: tillgångar/eget kapital) — hålls isär från ROIC-nedbrytningen.
- **WACC/CAPM**: avkastningskrav eget kapital = riskfri ränta + beta × marknadsriskpremie.
- **LTV** ≈ (intäkt per kund × bruttomarginal) / churn (stabilt läge), helst diskonterad. **CAC** och LTV/CAC-tolkning.
- **Regeln om 40** = omsättningstillväxt (%) + FCF-/rörelsemarginal (%).
- **Felmarginal** = (uppskattat värde − pris) / uppskattat värde.

- [ ] **Step 2: Skriv stilguiden**

Create `docs/course-style-guide.md`: mentor-ton (mot 19.9), korta läsbara meningar (bryt >40 ord), bannlysta fraser (samma lista som strukturgrinden), ingen svengelska ("moat" får användas men inte böjas till "moatad/moats"), och **sifferpolicy för riktiga bolag**: agenter får skriva *kvalitativa* mönster om namngivna bolag men **aldrig uppfinna finansiella tal**; alla siffror om ett verkligt bolag måste antingen vara uttryckligen "illustrativa/ungefärliga och daterade" eller hämtas från en användarlevererad datakälla (Task C-fall).

- [ ] **Step 3: Verifiera att bilagan bygger**

Run: `npm run build`
Expected: bygger; ny referenssida genereras.

- [ ] **Step 4: Commit**

```bash
git add src/content/kurs/00-referens/ docs/course-style-guide.md
git commit -m "feat(content): frozen formula appendix + style guide"
```

---

### Task A8: Korrekthetssvepet (de 8 begreppsfixarna)

**Files (modify):** `06-kassaflodesanalysen/6.3-*.md`, `09-roic-och-kapitalavkastning/9.1-*.md`, `08-nyckeltal-och-marginaler/8.3-*.md`, `8.2-*.md`, `17-*/17.3-*.md`, `17.5-*.md`, `19-*/19.5-*.md`, `19.4-*.md`, `03-introduktion-till-arsredovisningen/3.4-*.md`

- [ ] **Step 1: Applicera fix 1–8** enligt formelbilagan (FCFF/FCFE 6.3; NOPAT 9.1; DuPont-baser 8.3/9.1; regeln om 40 8.2; LTV 17.3/17.5/19.5; scenariovärde per aktie 17.5; operating leverage vs S&M 19.4; svenska revisionstermer 3.4). Varje berörd lektion länkar till `formelbilaga.md` i stället för att omdefiniera.

- [ ] **Step 2: Verifiera**

Run: `npm run build && npm run check`
Expected: bygger; integritet/refs gröna (struktur fortfarande röd tills Fas B).

- [ ] **Step 3: Commit**

```bash
git add src/content/kurs
git commit -m "fix(content): correctness sweep (8 conceptual fixes) linked to appendix"
```

---

### Task A9: Godkänn mall på EN exempellektion (användargrind)

**Files (modify):** en representativ lektion, t.ex. `09-roic-och-kapitalavkastning/9.1-vad-roic-ar.md`

- [ ] **Step 1: Skriv om 9.1 i den magra mallen** (frusen i A4), mentor-ton, länk till formelbilagan, ett namngivet kvalitativt exempel.

- [ ] **Step 2: Verifiera mot grindarna**

Run: `npm run check 2>&1 | head -40` och granska att 9.1 inte längre flaggas av strukturgrinden.

- [ ] **Step 3: Bygg och visuell koll i decket**

Run: `npm run build` och granska 9.1 i webbläsaren (deck-format).

- [ ] **Step 4: HÅRD GRIND — användaren godkänner mallen**

Visa 9.1 (före/efter) för användaren. **Ingen Fas B startar förrän mallen är godkänd.** Vid ändringar: uppdatera `docs/lean-lesson-template.md` + strukturgrinden, kör om.

- [ ] **Step 5: Commit**

```bash
git add src/content/kurs docs/lean-lesson-template.md
git commit -m "feat(content): exemplar lesson 9.1 in lean template (template freeze candidate)"
```

---

## FAS B — Bred omskrivning (orkestrerad, gate-verifierad)

**Förutsättning:** Fas A grön + mall godkänd + formelbilaga/stilguide frysta.

**Omskrivningskontrakt (samma för varje agent):** indata = (1) lektionens nuvarande text, (2) `docs/lean-lesson-template.md`, (3) `docs/course-style-guide.md`, (4) `formelbilaga.md`, (5) modulens grannlektioner (för att referera i stället för att återförklara). Utdata måste passera `npm run check` för den modulen. Agenter får **inte** uppfinna bolagssiffror (stilguidens sifferpolicy).

### Task B1..B19: Skriv om en modul per task

För **varje modul N** (kör 3–4 parallellt via subagent-driven-development):

- [ ] **Step 1:** Dispatcha en underagent med omskrivningskontraktet för modul N: skär mall till de sex sektionerna, slå ihop flaggor/misstag, konsolidera överlapp och **referera** grannmoduler (enhetsekonomi 2.3↔17.3↔19.5; serieförvärvare 8.2↔11.2↔11.3; anchoring↔sunk cost 16.6↔16.7; risk 15↔17; 17-mekanik från 19.6/19.8). Synteslektioner → markera `format: "syntes"` och gör om till en integrerande övning.
- [ ] **Step 2:** Run: `npm run check src/content/kurs/NN-*` — modulen måste vara grön på integritet/refs/struktur.
- [ ] **Step 3:** Run: `npm run build` — måste bygga.
- [ ] **Step 4:** Granska diff mot stilguiden (mentor-ton, inga bannlysta fraser, inga uppfunna siffror).
- [ ] **Step 5:** Commit: `git commit -m "rewrite(modul N): lean template + dedup + appendix links"`

### Task B20: Cross-lesson konsistens- och dedup-pass (barriär)

Per-modul-agenter är blinda för varandra. Detta steg körs **efter** att alla moduler är omskrivna.

> **Grinden fångar meningar, inte begrepp (användarfeedback).** `check-dedup` flaggar ordagrann upprepning (samma mening >8 ord i >2 lektioner). Men den dyraste redundansen är *begreppslig*: enhetsekonomi förklarad tre gånger med olika ord, samma "två bolag, en variabel"-grepp. Två lektioner kan förklara samma sak helt olika utan att dela en mening — då tiger grinden. Därför är "dedup grön" ett *nödvändigt men otillräckligt* villkor; B20 måste innehålla en mänsklig/agent-läsning för begreppslig överlappning.

- [ ] **Step 1:** Run: `npm run check`; samla de ordagranna dedup-träffarna.
- [ ] **Step 2:** Dispatcha en konsistensagent (får dedup-rapporten + manifestet) som löser *både* ordagranna *och begreppsliga* dubbletter: lär ut ett begrepp på ett ställe, referera från övriga (enhetsekonomi, serieförvärvare, risk, 17-mekanik), harmonisera terminologi, gör korsreferenser ömsesidiga.
- [ ] **Step 3:** **Mänsklig genomläsning** av de moduler som strategin pekar ut som överlappstunga (2/8/9/11/15/16/17/19) för begreppslig redundans grinden inte ser. Lita inte på grönt här.
- [ ] **Step 4:** Run: `npm run check` — ordagrann dedup = 0; notera att detta inte bevisar att begreppslig redundans är borta (det är Step 3:s ansvar).
- [ ] **Step 5:** Commit.

---

## FAS C — Nytt innehåll och capstone

Alla nya lektioner skrivs i den magra mallen och måste passera `npm run check`. Lägg in i rätt modulmapp med korrekt `ordning`.

**Korrekthetsgrind för nytt innehåll (planens verkliga kvarvarande hål — användarfeedback).** De automatiska grindarna säger inget om huruvida WACC-formeln, combined ratio eller index-forskningen är *rätt förklarad*. Nyskriven text (C1 WACC/CAPM, C2 bank/försäkring/fastighet/råvara, C4 index) är mest benägen att få nya begreppsfel. Därför avslutas **varje Fas C-task** med ett obligatoriskt steg:

> **Korrekthetsverifiering (oberoende):** dispatcha en *annan* underagent än författaren (en sakkunnig granskare) som adversariellt kontrollerar varje formel, definition och sifferpåstående mot `formelbilaga.md` och vedertagen finansteori. Den ska aktivt försöka *motbevisa*. Verkliga bolagssiffror kontrolleras mot den användarlevererade källan (aldrig agentens minne). Fel → tillbaka till författaren. Först grön verifiering → commit. Den oberoende **slutgranskaren (D4) lägger sin tyngd här.**

- [ ] **Task C1 — Diskonteringsräntan.** Ny lektion i modul 14 (WACC, CAPM, riskfri = svenska 10-åringen, riskpremie ~4–5 %, hur man landar i ~9 %). Länkar till formelbilagan. Gate + build + commit.
- [ ] **Task C2 — Sektormodul.** Ny modul (bank: räntenetto/kapitaltäckning/P/B/kreditförluster; försäkring: combined ratio/float; fastighet: substansvärde/EPRA/belåningsgrad; råvara: normaliserad vinst/kostnadskurva). Egen mapp `NN-sektoranalys`, frontmatter konsekvent. Gate + build + commit.
- [ ] **Task C3 — Svenskt praktiklager.** Ny lektion(er): ISK/KF/depå, First North/Spotlight, rapportkadens, var svensk redovisning skiljer sig. Gate + build + commit.
- [ ] **Task C4 — Indexhederlighet.** Ny lektion tidigt (efter modul 1) som möter index-frågan rakt + återbesök i capstonen. Ramas "för den som vill göra jobbet". Gate + build + commit.
- [ ] **Task C5 — Källor.** Ny lektion: var i årsredovisningen man läser vad, Börsdata/screeners. Gate + build + commit.
- [ ] **Task C6 — Fullständig(a) fallstudie(r).** 1–2 riktiga svenska bolag genom hela tratten med Ägarboken. **Siffror måste levereras av användaren eller en datakälla** (stilguidens policy) — agenten ramar in, hittar inte på. Markera siffror daterade. Gate + build + commit.
- [ ] **Task C7 — Capstone-ombygge.** (15.1 och 18.4 är redan inlagda — döda 15.1-referenser ska därmed vara gröna; verifiera med `npm run check`.) Ifyllbar case-mall (ej prosa), master-checklista på ett ark, kör ett olönsamt tillväxtbolag genom tratten, visa hur DCF-antaganden blir falsifieringsvillkor, lös 18/19-ordningen. Gate + build + commit.

---

## FAS D — Polish, röst, verktyg, quiz, slutgrind

- [ ] **Task D1 — Röst/korrektur.** Pass över hela kursen mot stilguidens mentor-ton; bryt långa meningar; rensa "moatad/moats". Gate + commit.
  > **Rösten är människo-bedömd, inte maskinell (användarfeedback).** Strukturgrinden dödar bannlysta fraser och kapar långa meningar — det tar de värsta tecknen, men en lektion kan passera grinden och ändå vara platt. "Rösten är mätbar" är nödvändigt men inte tillräckligt. Lägg därför in en **mänsklig röstläsning på ett urval (t.ex. 1–2 lektioner per modul) vid varje milstolpe**, kalibrerat mot 19.9:s mentor-ton. Detta är ett krav vid varje milstolpe, inte bara i D1.
- [ ] **Task D2 — Verktyget (Ägarboken).** Kalibrera om så poäng ramas som tankehjälp, inte dom; notis om att 0–4-skalan speglar egna bedömningar. (Om verktyget är `agarboken-analysverktyg.html` i repo-roten: integrera eller uppdatera enligt användarens önskemål.)
- [ ] **Task D3 — Quiz på alla innehållslektioner.** Generera `quiz:` i frontmatter (mall i 1.1) via parallella agenter; quiz ska testa förståelse, inte återupprepa flaggor. Lägg en quiz-grind i `check-structure` (varje standardlektion har ≥3 frågor). Gate + build + commit.
- [ ] **Task D4 — Oberoende slutgranskning.** Kör samma 8-delars kritiska granskning som baslinjen på en färsk ögonblicksbild (annan instans än den som skrev). Jämför mot acceptanskriterierna nedan.
- [ ] **Task D5 — Deploy.** `npm run build` + `wrangler pages deploy dist --project-name=kurs`.

---

## Acceptanskriterier (maskinkontrollerbara där möjligt)

**Maskinellt verifierbara:**
- [ ] `npm run test:tools` grön (grindarna fungerar).
- [ ] `npm run check` grön: integritet 0 (inkl. manifest-korskoll åt båda håll), döda referenser 0, strukturavvik 0, **ordagrann** dedup 0 meningar i >2 lektioner.
- [ ] `npm run build` grön; alla lektioner + nya moduler genereras.
- [ ] De 8 korrekthetsfixarna gjorda och formelbilagan länkad från berörda lektioner.

**Människo-/granskar-bedömda (grön grind räcker inte):**
- [ ] **Nytt innehåll (C1/C2/C4 m.fl.) korrekthetsverifierat oberoende** mot formelbilagan — planens viktigaste kvarvarande risk.
- [ ] **Begreppslig** redundans åtgärdad (B20 Step 3), inte bara ordagrann.
- [ ] **Rösten** kalibrerad mot 19.9 enligt mänsklig urvalsläsning per milstolpe.
- [ ] Lektioner finns för: diskonteringsränta, sektorundantag, svensk praktik, indexhederlighet, källor.
- [ ] ≥1 fullständig fallstudie på ett verkligt bolag med daterade, källverifierade siffror.
- [ ] Capstonen har ifyllbar case-mall + master-checklista + ett genomarbetat fall; 18/19-ordningen löst; inga döda 15.1-referenser.
- [ ] Quiz på alla standardlektioner (≥3 frågor).
- [ ] Lektionsantalet *härlett* (ej påtvingat 80) — rapportera slutligt antal och ordmängd.
- [ ] Oberoende slutgranskare ger ≥ A (mål A+).
```
