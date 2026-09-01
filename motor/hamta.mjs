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
    .replace(/&nbsp;/g, ' ').replace(/[   ]/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, ' till ').replace(/&#8212;|&mdash;/g, ', ')
    .replace(/&aring;/g, 'å').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö')
    .replace(/&Aring;/g, 'Å').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

// PDF-bilagor i ett pressmeddelande, bäst först.
//
// Värden får inte hårdkodas. Fram till 2026-08-31 matchades bara storage.mfn.se,
// men beQuoted-distribuerade bolag (MFN-URL med /beq/) lägger bilagorna på
// cdn.bequoted.com. Följden var att tio av Unibaps rapporter låg olästa och
// kassan, som bara står i PDF:en och aldrig i pressmeddelandet, saknades helt.
//
// Ordningen är en del av kontraktet: natt.mjs tar pdfLankar[0], så den fulla
// rapporten ska ligga före pressmeddelandeversionen (samma text som vi redan
// har) och svenska före engelska.
export function pdfLankarUr(html) {
  const alla = [...new Set(
    [...String(html || '').matchAll(/https?:\/\/[^"'\s)<>]+\.pdf/gi)].map(m => m[0])
  )];
  const rank = u => (/[-/]PM[-.]/i.test(u) ? 2 : 0) + (/interim|english|[-_]en[-.]/i.test(u) ? 1 : 0);
  return alla.sort((a, b) => rank(a) - rank(b));   // stabil sort: lika rang behåller sidans ordning
}

export async function hamta(url, namn) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha; dokumenthamtning for intern analys)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const typ = res.headers.get('content-type') || '';
  mkdirSync(p('./in'), { recursive: true });

  if (typ.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
    const buf = Buffer.from(await res.arrayBuffer());
    const fil = p(`./in/${namn}.pdf`);
    writeFileSync(fil, buf);
    return { fil, typ: 'pdf', byte: buf.length };
  }

  const html = await res.text();
  const pdfLankar = pdfLankarUr(html);
  const text = stadaHtml(html);
  const fil = p(`./in/${namn}.txt`);
  writeFileSync(fil, text, 'utf8');
  return { fil, typ: 'text', tecken: text.length, pdfLankar };
}

// CLI
if (process.argv[1] && process.argv[1].includes('hamta.mjs')) {
  const [url, namn] = process.argv.slice(2);
  if (!url || !namn) { console.error('Användning: node motor/hamta.mjs <url> <namn>'); process.exit(1); }
  const r = await hamta(url, namn);
  console.log(`Sparat: ${r.fil} (${r.tecken} tecken)`);
}
