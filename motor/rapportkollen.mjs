// Rapportkollen: fas 1-ytan som körbart verktyg. Peka på en rapport (MFN-länk,
// PDF-länk eller lokal fil) och få en grindad analys: extraktion med citat,
// förändringar räknade i kod, klarspråksnarration via LLM, och noll-
// hallucinationsgrinden före visning. Utdata: HTML i husets formspråk.
//
// Kör: node motor/rapportkollen.mjs <url-eller-fil> [namn]

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { hamta } from './hamta.mjs';
import { extraheraLLM } from './extract-llm.mjs';
import { FALT } from './faltlistor.mjs';
import { beraknaRapport } from './compute-rapport.mjs';
import { anropa } from './llm.mjs';
import { verifiera } from './verify.mjs';
import { TOKENS_CSS, FONT_LANK, MASTHEAD_CSS, masthead, LEKTIONSLANK } from './tokens.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MODELL = process.env.MOTOR_MODELL || 'claude-haiku';

const kalla = process.argv[2];
if (!kalla) { console.error('Användning: node motor/rapportkollen.mjs <url-eller-fil> [namn]'); process.exit(1); }
const namn = process.argv[3] || (kalla.split(/[\\/]/).pop() || 'rapport').replace(/\.[a-z]+$/i, '').slice(0, 60);

// 1. Hämta: URL (HTML med ev. PDF-bilaga, eller direkt PDF) eller lokal fil.
let text = null, pdfBase64 = null, kallaBeskrivning = kalla;
if (/^https?:/.test(kalla)) {
  const h = await hamta(kalla, 'rapportkollen-' + namn);
  if (h.typ === 'pdf') pdfBase64 = readFileSync(h.fil).toString('base64');
  else if (h.pdfLankar && h.pdfLankar.length) {
    console.log(`PDF-bilaga hittad, läser den i stället: ${h.pdfLankar[0].split('/').pop()}`);
    const hp = await hamta(h.pdfLankar[0], 'rapportkollen-' + namn + '-bilaga');
    pdfBase64 = readFileSync(hp.fil).toString('base64');
    kallaBeskrivning = h.pdfLankar[0];
  } else text = readFileSync(h.fil, 'utf8');
} else if (kalla.toLowerCase().endsWith('.pdf')) pdfBase64 = readFileSync(kalla).toString('base64');
else text = readFileSync(kalla, 'utf8');

// 2. Extrahera med citatkrav.
console.log(`Extraherar (${MODELL})...`);
const ex = await extraheraLLM(text, FALT.rapport, MODELL, { pdfBase64 });
if (!Object.keys(ex.fakta).length) { console.error('Inga fält funna. Är det här en rapport?'); process.exit(1); }

// 3. Räkna i kod.
const c = beraknaRapport(ex.fakta);

// 4. Narrera via LLM, bara tal ur underlaget.
const SYSTEM = `Du skriver en kort svensk rapportsammanfattning i klarspråk för en icke-expert.
Regler, absoluta: använd ENDAST tal ur JSON-underlaget (fakta och beräkningar), hitta aldrig på och avrunda aldrig själv.
Svenska talformat (decimalkomma, mellanslag i tusental). Vardagssvenska först, facktermen i parentes.
Aldrig köp-, sälj- eller behåll-råd. Inga tankstreck. En verdikt-mening först, sedan 2 till 3 korta stycken.`;
console.log('Narrerar...');
const n = await anropa(MODELL, { system: SYSTEM, prompt: `Underlag:\n${JSON.stringify({ fakta: ex.fakta, beraknat: c }, null, 1)}`, maxTokens: 800, json: false });

// 5. Grinden: varje tal i texten måste ha källa i fakta eller beräkningar.
const v = verifiera(n.text, { fakta: ex.fakta, guidning: null, period: '' }, c);

// 6. Rendera.
mkdirSync(p('./out'), { recursive: true });
const rader = Object.entries(ex.fakta).map(([id, f]) => `
  <tr><td class="fid">${id.replace(/_/g, ' ')}</td><td class="fv">${String(f.nu).replace('.', ',')}${f.fjol != null ? ` <span class="jmf">(jmf ${String(f.fjol).replace('.', ',')})</span>` : ''} <span class="enh">${f.enhet || ''}</span>${c[id + '_forandring_pct'] != null ? ` <span class="d">${c[id + '_forandring_pct'] > 0 ? '+' : ''}${String(c[id + '_forandring_pct']).replace('.', ',')}%</span>` : ''}</td></tr>
  <tr><td></td><td class="cit">"${(ex.kallor[id] || {}).citat || ''}"</td></tr>`).join('');

const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rapportkollen · ${namn}</title>
<link href="${FONT_LANK}" rel="stylesheet">
<style>${TOKENS_CSS}${MASTHEAD_CSS}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.6}
.wrap{max-width:680px;margin:0 auto;padding:26px 20px 60px}
.mast{display:flex;justify-content:space-between;border-bottom:2px solid var(--ox);padding-bottom:8px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
h1{font-family:var(--disp);font-weight:600;font-size:26px;margin:16px 0 4px}
.sub{color:var(--mut);font-size:12.5px;margin:0 0 18px;word-break:break-all}
.sek{border-top:1px solid var(--line);padding:16px 0 18px}
.et{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ox);margin-bottom:8px}
p{color:var(--mut);font-size:13.5px;margin:0 0 10px;white-space:pre-line}
table{width:100%;border-collapse:collapse}
.fid{font-family:var(--mono);font-size:10.5px;color:var(--faint);padding:6px 12px 0 0;vertical-align:top;white-space:nowrap}
.fv{font-family:var(--mono);font-size:14px;padding-top:6px}
.jmf{color:var(--mut);font-size:11px}.enh{color:var(--faint);font-size:10px}.d{font-size:11px;color:var(--mut)}
.cit{display:block;color:var(--mut);font-size:11.5px;font-style:italic;padding:1px 0 7px;border-bottom:1px solid var(--line)}
.grind{font-family:var(--mono);font-size:10.5px;padding:10px 0;border-top:2px solid;margin-bottom:6px}
.grind.ok{color:var(--pos);border-color:var(--pos)}.grind.fel{color:var(--neg);border-color:var(--neg)}
.verdiktp::first-line{font-family:var(--disp);font-weight:600;font-size:16.5px;color:var(--ink)}
.foot{font-family:var(--mono);font-size:10px;color:var(--faint);text-align:center;margin-top:20px;line-height:1.8}</style></head>
<body><div class="wrap">
${masthead('rapportkollen · alpha')}<div class="mast" style="border:none;padding-top:6px"><span>Rapportkollen</span><span>${new Date().toISOString().slice(0, 10)}</span></div>
<h1>Rapporten, läst och grindad</h1>
<p class="sub">Källa: ${kallaBeskrivning}</p>
<div class="grind ${v.ok ? 'ok' : 'fel'}">${v.ok ? `✓ GRINDEN: alla ${v.resultat.length} tal i analysen spårade till extraherad fakta eller beräkning` : `✗ GRINDEN: ${v.omatchade.length} tal utan källa, analysen är blockerad`}</div>
${v.ok ? `<div class="sek"><div class="et">Analys · AI-skriven, grindad</div><p class="verdiktp">${n.text}</p></div>` : `<div class="sek"><div class="et">Blockerad</div><p>Analysen innehöll tal utan källa och visas inte. Siffrorna nedan är extraherade med citat och kan läsas direkt.</p></div>`}
<div class="sek"><div class="et">Siffrorna, med citat ur källan</div><table>${rader}</table>
${ex.fel.length ? `<p style="margin-top:10px;font-size:11px">Anmärkningar: ${ex.fel.join(' · ')}</p>` : ''}</div>
<p style="font-size:11.5px"><a style="color:var(--ox)" href="${LEKTIONSLANK.rapport.url}">${LEKTIONSLANK.rapport.text} →</a></p>
<div class="foot">Information, aldrig råd · varje värde bär ordagrant citat · maskinläst, mänskligt ogranskad</div>
</div></body></html>`;

const ut = p(`./out/rapport-${namn}.html`);
writeFileSync(ut, html, 'utf8');
console.log(`${v.ok ? 'PASS' : 'BLOCKERAD NARRATION (fälten visas ändå)'} · ${ut} · kostnad $${(ex.kostnad_usd + n.kostnad_usd).toFixed(4)}`);
if (!v.ok) process.exitCode = 1;
