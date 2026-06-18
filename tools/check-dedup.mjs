import { pathToFileURL } from 'node:url';
import { loadLessons } from './lib/lessons.mjs';

const norm = (s) => s.toLowerCase().replace(/[^a-zåäö0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// Fångar ORDAGRANN upprepning. Begreppslig redundans måste fångas av människa (B20).
export function findDuplicateSentences(lessons, { minWords = 8, maxLessons = 2 } = {}) {
  const map = new Map(); // mening -> Set(path)
  for (const l of lessons) {
    for (const raw of l.body.split(/(?<=[.!?])\s+/)) {
      const s = norm(raw);
      if (s.split(' ').filter(Boolean).length < minWords) continue;
      if (!map.has(s)) map.set(s, new Set());
      map.get(s).add(l.path);
    }
  }
  return [...map.entries()]
    .filter(([, paths]) => paths.size > maxLessons)
    .map(([sentence, paths]) => ({ sentence, count: paths.size, paths: [...paths] }))
    .sort((a, b) => b.count - a.count);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lessons = await loadLessons(process.argv[2] || 'src/content/kurs');
  const dups = findDuplicateSentences(lessons);
  dups.forEach((d) => console.error(`✗ ×${d.count}: "${d.sentence.slice(0, 70)}…"`));
  console.log(dups.length ? `\n${dups.length} upprepade meningar` : '✓ ingen grov redundans');
  process.exit(dups.length ? 1 : 0);
}
