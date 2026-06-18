import { pathToFileURL } from 'node:url';
import { loadLessons } from './lib/lessons.mjs';

// Obligatoriska sektioner matchas på nyckelord (formuleringen får varieras något).
const REQUIRED = [
  { label: 'Varför det spelar roll', re: /varför/i },
  { label: 'Så fungerar det', re: /så fungerar|hur det fungerar|så funkar/i },
  { label: 'Hur en erfaren investerare tänker', re: /erfaren investerare/i },
  { label: 'Exempel', re: /exempel/i },
  { label: 'Vad du letar efter och vad som varnar', re: /letar efter|flagg|varnar/i },
  { label: 'Checklista och övning', re: /checklista|övning/i },
];

const BANNED = [
  'Samma sak, motsatta',
  'Samma X, motsatta',
  'Det är därför',
  'En konkret kontrast: ett annat bolag',
  'Tecknet: fråga',
];

export async function checkStructure(base, { minWords = 700, maxWords = 1600, requireQuiz = true } = {}) {
  const lessons = await loadLessons(base);
  const errors = [];
  for (const l of lessons) {
    const fmt = l.frontmatter.format || 'standard';
    if (fmt !== 'standard') continue; // syntes/referens undantas

    for (const req of REQUIRED) {
      if (!l.sections.some((sec) => req.re.test(sec)))
        errors.push(`${l.path}: saknar sektion "${req.label}"`);
    }
    for (const b of BANNED) {
      if (l.body.includes(b)) errors.push(`${l.path}: bannlyst fras "${b}"`);
    }
    const words = l.body.trim().split(/\s+/).filter(Boolean).length;
    if (words < minWords || words > maxWords)
      errors.push(`${l.path}: ordlängd ${words} utanför ${minWords}–${maxWords}`);
    if (requireQuiz && (l.quizCount ?? 0) < 3)
      errors.push(`${l.path}: saknar quiz (${l.quizCount ?? 0}/3 frågor)`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await checkStructure(process.argv[2] || 'src/content/kurs');
  errors.forEach((e) => console.error('✗', e));
  console.log(errors.length ? `\n${errors.length} strukturavvik` : '✓ struktur OK');
  process.exit(errors.length ? 1 : 0);
}
