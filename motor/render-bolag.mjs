// Renderar en bolagssida ur nattjobbets data-JSON i husets formspråk: delade
// tokens, hus-masthead, hårlinjesektioner (inga rundade kort), Börshuset som
// oxblodsbanderoll, och lektionslänkar som knyter produkten till kursen.
// Varje faktum med sitt citat, korskontroller räknade i kod, tydlig alpha-märkning.

import { TOKENS_CSS, FONT_LANK, MASTHEAD_CSS, masthead, BILD_BORSHUS, LEKTIONSLANK } from './tokens.mjs';

const RUBRIK = { rapport: 'Rapport', kallelse: 'Kallelse till stämma', emission: 'Emission', avtal: 'Avtal & besked', forvarv: 'Förvärv', ovrigt: 'Övrigt' };

function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ','); }

// Korskontroller i kod på emissionsdata: PM:ets egen utspädningssiffra mot
// vad aktieantalen ger (post-money). Avvikelse över 0,2 procentenheter flaggas.
function korskontroller(dok) {
  const ut = [];
  if (dok.typ === 'emission' && dok.fakta) {
    const f = dok.fakta;
    if (f.antal_nya_aktier && f.antal_aktier_fore && f.utspadning_procent) {
      const ber = Math.round(f.antal_nya_aktier.nu / (f.antal_aktier_fore.nu + f.antal_nya_aktier.nu) * 10000) / 100;
      ut.push({ namn: 'Utspädning: PM:ets siffra mot aktieantalen', beraknad: ber, uppgiven: f.utspadning_procent.nu, ok: Math.abs(ber - f.utspadning_procent.nu) <= 0.2 });
    }
    if (f.antal_nya_aktier && f.teckningskurs && f.emissionsbelopp_mkr) {
      const ber = Math.round(f.antal_nya_aktier.nu * f.teckningskurs.nu / 1e6);
      ut.push({ namn: 'Belopp: aktier gånger kurs mot uppgivet', beraknad: ber, uppgiven: f.emissionsbelopp_mkr.nu, ok: Math.abs(ber - f.emissionsbelopp_mkr.nu) <= 1 });
    }
  }
  return ut;
}

function dokSektion(dok) {
  if (dok.dublett_av) return `
  <div class="sek dub"><p class="mut" style="margin:0">Språkdubblett av samma besked, ej analyserad separat: ${(dok.rubrik || '').split('>').pop().trim().slice(0, 90)}</p></div>`;
  const kk = korskontroller(dok);
  const lank = LEKTIONSLANK[dok.typ];
  const falt = dok.fakta ? Object.entries(dok.fakta).map(([id, f]) => `
      <tr><td class="fid">${id}</td><td class="fv">${fmt(f.nu)}${f.fjol != null ? ` <span class="jmf">(jmf ${fmt(f.fjol)})</span>` : ''} <span class="enh">${f.enhet || ''}</span></td></tr>
      <tr><td></td><td class="cit">"${((dok.kallor || {})[id] || {}).citat || 'citat saknas'}"</td></tr>`).join('') : '';
  return `
  <div class="sek">
    <div class="et">${RUBRIK[dok.typ] || dok.typ} · ${dok.datum || ''}</div>
    <h2>${(dok.rubrik || '').split('>').pop().trim()}</h2>
    ${dok.klass ? `<p class="klass">Klass: <b>${dok.klass}</b> <span class="klasstext">(${dok.klass === 'bindande order' ? 'pengar som ska betalas' : dok.klass === 'ramavtal' ? 'öppnad dörr, inga garanterade volymer' : 'löfte, inget bundet'})</span></p><p class="cit">"${dok.bevis || ''}"</p>` : ''}
    ${falt ? `<table class="ft">${falt}</table>` : ''}
    ${dok.typ === 'ovrigt' ? `<p class="mut">Lagrat utan extraktion (informationspost).</p>` : ''}
    ${kk.map(k => `<p class="kk ${k.ok ? 'ok' : 'fel'}">${k.ok ? '✓ stämmer' : '✗ avviker'} · ${k.namn}: beräknat ${fmt(k.beraknad)} · dokumentet säger ${fmt(k.uppgiven)}</p>`).join('')}
    <p class="len"><a href="${dok.url}">Källdokumentet hos MFN →</a>${lank ? ` · <a href="${lank.url}">${lank.text} →</a>` : ''}</p>
  </div>`;
}

export function renderBolag(data) {
  return `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${data.namn} · Ägarkollen alpha</title>
<link href="${FONT_LANK}" rel="stylesheet">
<style>
  ${TOKENS_CSS}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55}
  .wrap{max-width:780px;margin:0 auto;padding:22px 20px 60px}
  ${MASTHEAD_CSS}
  .band{margin:14px -20px 0;padding:22px 20px;background:linear-gradient(rgba(122,38,30,.88),rgba(96,28,22,.92)),url('${BILD_BORSHUS}') center 40%/cover;color:var(--ox-ink)}
  .band h1{font-family:var(--disp);font-weight:600;font-size:clamp(24px,3.4vw,34px);margin:0 0 2px;letter-spacing:-.01em}
  .band .sub{font-size:12.5px;color:rgba(251,247,238,.8);margin:0}
  .varn{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--ox);border:1px solid var(--ox);display:inline-block;padding:3px 9px;margin:16px 0 6px}
  .sek{border-top:1px solid var(--line);padding:16px 0 18px}
  .sek.dub{padding:8px 0}
  .sek:first-of-type{border-top:none}
  .et{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ox);margin-bottom:6px}
  h2{font-family:var(--disp);font-weight:500;font-size:17px;margin:0 0 10px;letter-spacing:-.01em;line-height:1.3}
  .ft{width:100%;border-collapse:collapse}
  .fid{font-family:var(--mono);font-size:10.5px;color:var(--faint);padding:6px 12px 0 0;vertical-align:top;white-space:nowrap}
  .fv{font-family:var(--mono);font-size:14px;padding-top:6px;font-variant-numeric:tabular-nums}
  .jmf{color:var(--mut);font-size:11px}.enh{color:var(--faint);font-size:10px}
  .cit{color:var(--mut);font-size:11.5px;font-style:italic;padding:1px 0 7px;border-bottom:1px solid var(--line)}
  td.cit{display:block}
  .klass{font-size:13px;margin:0 0 4px}.klass b{color:var(--ox);text-transform:uppercase;font-family:var(--mono);font-size:11px;letter-spacing:.06em}
  .klasstext{color:var(--mut);font-size:12px}
  .kk{font-family:var(--mono);font-size:11px;margin:8px 0 0}.kk.ok{color:var(--pos)}.kk.fel{color:var(--neg)}
  .len{margin:10px 0 0;font-size:11.5px}.len a{color:var(--ox)}
  .mut{color:var(--faint);font-size:12px}
  .sektion-rubrik{display:flex;align-items:center;gap:12px;margin:26px 0 4px;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
  .sektion-rubrik::after{content:'';flex:1;height:2px;background:var(--line-stark)}
  .foot{font-family:var(--mono);font-size:10px;color:var(--faint);text-align:center;margin-top:26px;border-top:1px solid var(--line);padding-top:10px;line-height:1.8}
</style></head><body><div class="wrap">
  ${masthead('bolagssida · alpha')}
  <div class="band"><h1>${data.namn}</h1><p class="sub">${data.dokument.length} dokument bevakade · varje siffra med ordagrant citat ur källan · genererad ${data.uppdaterad}</p></div>
  <div class="varn">ALPHA · RIKTIG DATA · MASKINLÄST, MÄNSKLIGT OGRANSKAD · ALDRIG RÅD</div>
  ${data.blankning ? `
  <div class="sektion-rubrik">Blankning · FI:s aggregat${data.blankning.datum ? ' · per ' + data.blankning.datum : ''}</div>
  <div class="sek"><p style="font-family:var(--mono);font-size:17px;margin:0">${String(data.blankning.procent).replace('.', ',')}% av aktierna${data.blankning.procent === 0 ? ' (under registrets tröskel)' : ''}</p>
  <p class="len"><a href="${data.blankning.kalla}">Registret hos FI →</a></p></div>` : ''}
  ${data.insyn ? `
  <div class="sektion-rubrik">Insynshandel · FI:s register · 12 månader</div>
  <div class="sek">
    <p style="font-family:var(--mono);font-size:13px;margin:0 0 8px">${data.insyn.antal_12m} transaktioner · netto ${fmt(Math.round(data.insyn.netto_12m / 1000))} tkr ${data.insyn.netto_12m >= 0 ? 'köp' : 'sälj'}</p>
    ${data.insyn.senaste.map(t => `<p class="cit" style="font-style:normal">${t.pub} · ${t.person} (${t.befattning}) · ${t.karaktar} · ${t.volym != null ? fmt(t.volym) + ' st' : ''} ${t.pris != null ? 'à ' + fmt(t.pris) + ' ' + t.valuta : ''}</p>`).join('')}
    <p class="len"><a href="${data.insyn.kalla}">Registret hos FI →</a> · <a href="${LEKTIONSLANK.insyn.url}">${LEKTIONSLANK.insyn.text} →</a></p>
  </div>` : ''}
  <div class="sektion-rubrik">Dokumenten</div>
  ${data.dokument.map(dokSektion).join('\n')}
  <div class="sektion-rubrik">Det här bevakas för bolaget</div>
  <div class="sek"><p class="mut" style="margin:0">MFN-flödet (pressmeddelanden, rapporter, kallelser, emissioner) · rapport-PDF-bilagor · FI:s insynsregister · FI:s blankningsregister. Listan är löftet "du missar inget" i verifierbar form.</p></div>
  <div class="foot">Ägarkollen är arbetsnamn · av Marginalen · källor: bolagets egna dokument via MFN samt FI:s register · information, aldrig råd<br>Foto i banderollen: Börshuset, Stockholm · Jorge Láscar (CC BY 2.0)</div>
</div></body></html>`;
}
