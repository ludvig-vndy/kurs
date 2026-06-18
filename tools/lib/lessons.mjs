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
  // CRLF-tolerant: normalisera radslut innan parsning.
  const text = raw.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: text };
  const fm = {};
  for (const line of m[1].split('\n')) {
    // Endast skalärer på toppnivå (ej indenterade quiz-rader).
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
    // Antal quizfrågor: räkna "- fraga:" i frontmatter-blocket (CRLF-normaliserat).
    const fmMatch = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
    const quizCount = fmMatch ? (fmMatch[1].match(/^\s+-\s+fraga:/gm) || []).length : 0;
    lessons.push({
      path: path.split('\\').join('/'),
      frontmatter,
      body,
      sections,
      quizCount,
      modul: frontmatter.modul,
      lektion: String(frontmatter.lektion ?? ''),
      del: frontmatter.del,
      id: String(frontmatter.lektion ?? path),
    });
  }
  return lessons.sort(
    (a, b) => (a.frontmatter.ordning ?? 0) - (b.frontmatter.ordning ?? 0)
  );
}
