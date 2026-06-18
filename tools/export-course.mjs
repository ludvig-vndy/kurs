// Exporterar hela kursen (brödtext + quiz) till en enda läsbar markdown-fil.
// Körs: node tools/export-course.mjs  →  KURS-EXPORT.md
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';

const BASE = 'src/content/kurs';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function parse(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  let fm = {};
  try { fm = yaml.load(m[1]) || {}; } catch { fm = {}; }
  return { fm, body: m[2].trim() };
}

function renderQuiz(quiz) {
  if (!Array.isArray(quiz) || quiz.length === 0) return '';
  const lines = ['', '### Quiz', ''];
  quiz.forEach((q, i) => {
    const ratt = Array.isArray(q.ratt) ? q.ratt : [q.ratt];
    lines.push(`**${i + 1}. ${q.fraga}**`, '');
    (q.svar || []).forEach((s, j) => {
      const mark = ratt.includes(j) ? '✓' : ' ';
      lines.push(`- [${mark}] ${s}`);
    });
    if (q.forklaring) lines.push('', `*Förklaring:* ${q.forklaring}`);
    lines.push('');
  });
  return lines.join('\n');
}

const files = await walk(BASE);
const lessons = [];
for (const path of files) {
  const { fm, body } = parse(await readFile(path, 'utf8'));
  lessons.push({ fm, body, ordning: Number(fm.ordning) || 0 });
}
lessons.sort((a, b) => a.ordning - b.ordning);

const out = [];
out.push('# Fundamental aktieanalys — komplett kurstext', '');
out.push(`Export av ${lessons.length} lektioner i läsordning, med brödtext och quiz (✓ = rätt svar).`, '');
out.push('---', '');

let lastDel = null;
let lastModul = null;
for (const l of lessons) {
  const f = l.fm;
  if (f.del !== lastDel) {
    out.push('', `# DEL: ${f.del}`, '');
    lastDel = f.del;
    lastModul = null;
  }
  if (f.modul !== lastModul) {
    out.push('', `## Modul ${f.modul}: ${f.modulTitel}`, '');
    lastModul = f.modul;
  }
  out.push('', `### ${f.lektion} ${f.titel}`, '');
  if (f.niva) out.push(`*Nivå: ${f.niva}. Färdighet: ${f.fardighet || ''}*`, '');
  out.push(l.body);
  out.push(renderQuiz(f.quiz));
  out.push('', '---', '');
}

await writeFile('KURS-EXPORT.md', out.join('\n'));
const words = out.join(' ').split(/\s+/).filter(Boolean).length;
console.log(`Skrev KURS-EXPORT.md: ${lessons.length} lektioner, ~${words.toLocaleString('sv-SE')} ord.`);
