/* Bevisar att en refaktor är utfallsneutral, genom att hasha varje HTML-sida
   under ett prefix i dist/.
   Kör: node tools/dist-hash.mjs dist/fokus > baseline-fokus.txt

   Två hashar per sida, för att mäta rätt sak:

     dom  innehållet med alla <style>-block borttagna
     css  alla CSS-regler ur sidans <style>-block, sorterade

   Uppdelningen finns för att Astro flyttar runt saker som inte syns för
   användaren. Bundlens filnamn följer den ingångsfil som råkar använda den, och
   scope-id:t för ett <style>-block härleds ur filsökvägen. Flyttar man en
   sidkropp till en komponent byter alltså både chunknamn och scope-id, och ett
   scopat <style>-block kan hamna ihopslaget med ett annat, utan att en enda
   pixel ändras. Bundlens namn normaliseras därför bort, scope-id:n numreras om
   i den ordning de först förekommer (så att ett trasigt scope, där en regel
   pekar på ett id som inget element har, fortfarande ger utslag), och CSS
   jämförs som mängd i stället för på position.

   En diff betyder "titta på den här sidan", inte "fel". */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function filer(dir, ut = []) {
  for (const namn of readdirSync(dir)) {
    const p = join(dir, namn);
    if (statSync(p).isDirectory()) filer(p, ut);
    else if (p.endsWith('.html')) ut.push(p);
  }
  return ut;
}

function normalisera(text) {
  const ut = text.replace(/\/_astro\/[^"'\s>]+\.(css|js)/g, '/_astro/X.$1');
  const sedda = new Map();
  return ut.replace(/astro-cid-[a-z0-9]+/g, (m) => {
    if (!sedda.has(m)) sedda.set(m, `astro-cid-${sedda.size + 1}`);
    return sedda.get(m);
  });
}

function dela(text) {
  const css = [];
  // Blanktecknen runt blocket äts med, annars blir ett borttaget <style> kvar
  // som ett spökmellanslag. Astro lägger sina style-block i head eller mellan
  // element, aldrig inne i löptext, så inga textnoder slås ihop av detta.
  const dom = text.replace(/\s*<style>([\s\S]*?)<\/style>\s*/g, (_, inner) => {
    css.push(inner);
    return '';
  });
  const regler = css
    .join('\n')
    .split('}')
    .map((r) => r.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();
  return { dom: dom.replace(/\s+/g, ' ').trim(), css: regler.join('}\n') };
}

const kort = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

const rot = process.argv[2];
if (!rot) {
  console.error('Ange en katalog, till exempel dist/fokus');
  process.exit(2);
}
for (const f of filer(rot).sort()) {
  // Dela först, normalisera sedan var del för sig. Kör normaliseringen på hela
  // filen numreras scope-id om i en ordning som style-blocken påverkar, och då
  // ser DOM ändrad ut så fort en CSS-regel läggs till.
  const { dom, css } = dela(readFileSync(f, 'utf8'));
  console.log(`${kort(normalisera(dom))} ${kort(normalisera(css))}  ${relative(rot, f).replace(/\\/g, '/')}`);
}
