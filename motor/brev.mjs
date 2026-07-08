// Brevgeneratorn: nattjobbets sista steg. Tar motorns utdata (extraktion,
// beräkning, narration, allt genom grinden) och renderar ett färdigt Ägarbrev
// som självständig HTML i husets formspråk, redo att mejlas eller läggas bakom
// lösenordsgrinden. Innehållet här kommer ur fixturer + Lifco-fallkällan;
// alphans riktiga dokument pluggas in i samma flöde.
//
// Kör: node motor/brev.mjs   ->  motor/out/agarbrevet.html

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narrera } from './narrate.mjs';
import { extraheraLifco } from './extract-lifco.mjs';
import { beraknaLifco } from './compute-lifco.mjs';
import { narreraLifco } from './narrate-lifco.mjs';
import { extraheraKallelse } from './extract-kallelse.mjs';
import { beraknaKallelse } from './compute-kallelse.mjs';
import { narreraKallelse } from './narrate-kallelse.mjs';
import { extraheraAvtal } from './extract-avtal.mjs';
import { beraknaAvtal } from './compute-avtal.mjs';
import { narreraAvtal } from './narrate-avtal.mjs';
import { verifiera } from './verify.mjs';
import { TOKENS_CSS, FONT_LANK, MASTHEAD_CSS, masthead, BILD_BORSHUS } from './tokens.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const läs = f => readFileSync(p(f), 'utf8');

// En sektion = en källa genom hela pipelinen. Grinden är obligatorisk:
// en sektion som inte passerar renderas inte, den ersätts av en felruta.
function sektion({ rubrik, etikett, extrahera, berakna, narrera, text }) {
  const ex = extrahera(text);
  const res = berakna(ex);
  const c = res.c || res;
  const n = narrera(ex, c);
  const full = n.verdikt + '\n\n' + n.stycken.join('\n\n');
  const v = verifiera(full, ex, c);
  return { rubrik, etikett, verdikt: n.verdikt, stycken: n.stycken, ok: v.ok, antalTal: v.resultat.length, omatchade: v.omatchade };
}

const sektioner = [
  sektion({
    rubrik: 'Norlux Industri: stark rapport, höjd prognos', etikett: 'RAPPORT · FIKTIVT EXEMPELBOLAG',
    extrahera, berakna: ex => ({ c: berakna(ex) }), narrera, text: läs('./fixtures/norlux-q3-2026.txt')
  }),
  sektion({
    rubrik: 'Lifco: räkenskapsåret 2025, daterad genomgång', etikett: 'RAPPORT · VERKLIG DATA, VERIFIERAD KÄLLA',
    extrahera: extraheraLifco, berakna: beraknaLifco, narrera: narreraLifco, text: läs('../docs/case-sources/fall-lifco-2025.md')
  }),
  sektion({
    rubrik: 'Voltcell: kallelsen innehåller tre utspädningskällor', etikett: 'UTSPÄDNINGSVAKTEN · FIKTIVT EXEMPELBOLAG',
    extrahera: extraheraKallelse, berakna: beraknaKallelse, narrera: narreraKallelse, text: läs('./fixtures/voltcell-kallelse-2026.txt')
  }),
  sektion({
    rubrik: 'Voltcell: tre avtalsbesked, ett är bindande', etikett: 'AVTALSLIGGAREN · FIKTIVT EXEMPELBOLAG',
    extrahera: extraheraAvtal, berakna: beraknaAvtal, narrera: narreraAvtal, text: läs('./fixtures/voltcell-pm-2026.txt')
  })
];

const talTotalt = sektioner.reduce((a, s) => a + s.antalTal, 0);
const allaOk = sektioner.every(s => s.ok);

const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ägarbrevet</title>
<link href="${FONT_LANK}" rel="stylesheet">
<style>
  ${TOKENS_CSS}
  ${MASTHEAD_CSS}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.6}
  .wrap{max-width:680px;margin:0 auto;padding:28px 20px 60px}
  .mast{display:flex;justify-content:space-between;border-bottom:2px solid var(--ox);padding-bottom:8px;
    font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
  h1{font-family:var(--disp);font-weight:700;font-size:30px;margin:16px 0 4px;letter-spacing:-.4px}
  .sub{color:var(--mut);margin:0 0 22px}
  .sek{border-top:1px solid var(--line);padding:18px 0 20px}
  .et{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ox);margin-bottom:8px}
  h2{font-family:var(--disp);font-weight:600;font-size:19px;margin:0 0 10px;letter-spacing:-.2px;line-height:1.25}
  .verdikt{font-family:var(--disp);font-size:15.5px;line-height:1.5;margin:0 0 10px}
  p{color:var(--mut);font-size:13.5px;margin:0 0 10px}
  .grind{font-family:var(--mono);font-size:10px;color:var(--faint);border-top:1px solid var(--line);padding-top:8px;margin-top:4px}
  .grind b{color:var(--pos);font-weight:500}
  .fel{background:#F6E4E0;padding:18px 14px}
  .foot{font-family:var(--mono);font-size:10px;color:var(--faint);text-align:center;margin-top:24px;line-height:1.8}
</style>
</head>
<body>
<div class="wrap">
  ${masthead('genererat av motorn · alpha')}
  <div style="height:52px;background:linear-gradient(rgba(122,38,30,.85),rgba(96,28,22,.9)),url('${BILD_BORSHUS}') center 40%/cover;margin-top:14px"></div>
  <h1>Ägarbrevet</h1>
  <p class="sub">${sektioner.length} saker i dag. Varje siffra nedan är spårad till sin källa innan brevet byggdes: ${talTotalt} tal, ${allaOk ? 'alla godkända' : 'FEL, se nedan'}.</p>
  ${sektioner.map(s => s.ok ? `
  <div class="sek">
    <div class="et">${s.etikett}</div>
    <h2>${s.rubrik}</h2>
    <p class="verdikt">${s.verdikt}</p>
    ${s.stycken.map(st => `<p>${st}</p>`).join('\n    ')}
    <div class="grind"><b>✓ grindad</b> · ${s.antalTal} tal spårade till källa</div>
  </div>` : `
  <div class="sek fel">
    <div class="et">${s.etikett}</div>
    <h2>${s.rubrik}</h2>
    <p>Sektionen blockerades av noll-hallucinationsgrinden: ${s.omatchade.length} tal utan källa. Innehåll utan källa visas aldrig.</p>
  </div>`).join('\n')}
  <div class="foot">Information, aldrig råd. Fiktiva bolag är märkta; Lifco-avsnittet bygger på verifierad källa och är en daterad genomgång.<br>Ägarkollen är arbetsnamn · motor-alpha</div>
</div>
</body>
</html>`;

mkdirSync(p('./out'), { recursive: true });
writeFileSync(p('./out/agarbrevet.html'), html, 'utf8');
console.log(`Brevet byggt: motor/out/agarbrevet.html · ${sektioner.length} sektioner · ${talTotalt} tal genom grinden · ${allaOk ? 'ALLA PASS' : 'FEL FINNS'}`);
if (!allaOk) process.exitCode = 1;
