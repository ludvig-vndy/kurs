// Dokumenthämtaren: URL in, ren text ut i motor/in/ (gitignorerad, externt
// innehåll committas inte). HTML städas till läsbar text; PDF:er är nästa
// steg och flaggas tydligt. Alphans nattjobb anropar samma funktion.
//
// Kör: node motor/hamta.mjs <url> <namn>

import { writeFileSync, mkdirSync } from 'fs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

export function stadaHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, ' till ').replace(/&#8212;|&mdash;/g, ', ')
    .replace(/&aring;/g, 'å').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö')
    .replace(/&Aring;/g, 'Å').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export async function hamta(url, namn) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha; dokumenthamtning for intern analys)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const typ = res.headers.get('content-type') || '';
  if (typ.includes('pdf')) throw new Error(`${url} är PDF. PDF-till-text är nästa byggsteg; hämta HTML-versionen om den finns.`);
  const text = stadaHtml(await res.text());
  mkdirSync(p('./in'), { recursive: true });
  const fil = p(`./in/${namn}.txt`);
  writeFileSync(fil, text, 'utf8');
  return { fil, tecken: text.length };
}

// CLI
if (process.argv[1] && process.argv[1].includes('hamta.mjs')) {
  const [url, namn] = process.argv.slice(2);
  if (!url || !namn) { console.error('Användning: node motor/hamta.mjs <url> <namn>'); process.exit(1); }
  const r = await hamta(url, namn);
  console.log(`Sparat: ${r.fil} (${r.tecken} tecken)`);
}
