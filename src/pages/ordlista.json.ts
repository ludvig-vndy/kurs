import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';

// En sanningskalla for termerna: samma src/data/ordlista.json som driver
// kursens marginalnoter och /ordlista byggs har ut som statisk JSON, sa
// produktytorna (labs) kan hamta identiska forklaringar + lektionspekare
// via /labs/term-gloss.js. Slug matchar /ordlista#<id>-ankarna.
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9åäö]+/g, '-').replace(/^-|-$/g, '');

export const GET: APIRoute = () => {
  const ordlista = JSON.parse(
    fs.readFileSync(path.resolve('src/data/ordlista.json'), 'utf8')
  ) as Record<string, { forklaring: string; lektion?: string }>;
  const out: Record<string, { forklaring: string; lektion?: string; slug: string }> = {};
  for (const [term, v] of Object.entries(ordlista)) {
    out[term] = { forklaring: v.forklaring, lektion: v.lektion, slug: slug(term) };
  }
  return new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
