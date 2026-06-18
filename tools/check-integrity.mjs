import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLessons } from './lib/lessons.mjs';

const REQUIRED = ['del', 'modul', 'modulTitel', 'lektion', 'titel', 'niva', 'ordning', 'fardighet'];
const NIVA = new Set(['Nybörjare', 'Mellan', 'Avancerad']);

// manifestLektioner: null = ingen korskoll; annars array av lektion-strängar.
export async function checkIntegrity(base, manifestLektioner = null) {
  const lessons = await loadLessons(base);
  const errors = [];
  const seenOrdning = new Map();

  for (const l of lessons) {
    const fmt = l.frontmatter.format || 'standard';
    for (const k of REQUIRED) {
      if (l.frontmatter[k] === undefined || l.frontmatter[k] === '')
        errors.push(`${l.path}: saknar frontmatter-fält "${k}"`);
    }
    if (l.frontmatter.niva && !NIVA.has(l.frontmatter.niva))
      errors.push(`${l.path}: ogiltig niva "${l.frontmatter.niva}"`);

    const slug = basename(l.path).replace(/\.mdx?$/, '');
    if (!/^[\x20-\x7E]+$/.test(slug))
      errors.push(`${l.path}: slug har icke-ASCII-tecken ("${slug}")`);

    if (fmt === 'standard') {
      const o = l.frontmatter.ordning;
      if (seenOrdning.has(o)) errors.push(`${l.path}: dubblerad ordning ${o} (även ${seenOrdning.get(o)})`);
      else seenOrdning.set(o, l.path);
    }
  }

  if (manifestLektioner) {
    const onDisk = new Set(lessons.map((l) => l.lektion));
    const inManifest = new Set(manifestLektioner);
    for (const m of inManifest)
      if (!onDisk.has(m)) errors.push(`manifest: lektion ${m} saknas på disk`);
    for (const d of onDisk)
      if (d && !inManifest.has(d)) errors.push(`disk: lektion ${d} saknas i manifest`);
  }

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let manifest = null;
  try {
    const raw = await readFile('course.manifest.json', 'utf8');
    manifest = JSON.parse(raw).lessons.map((x) => x.lektion);
  } catch {
    console.warn('⚠ course.manifest.json saknas — hoppar över manifest-korskoll');
  }
  const errors = await checkIntegrity(process.argv[2] || 'src/content/kurs', manifest);
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} integritetsfel` : '✓ integritet OK');
  process.exit(errors.length ? 1 : 0);
}
