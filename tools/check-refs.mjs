import { pathToFileURL } from 'node:url';
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await checkRefs(process.argv[2] || 'src/content/kurs');
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} döda referenser` : '✓ referenser OK');
  process.exit(errors.length ? 1 : 0);
}
