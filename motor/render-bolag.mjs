// Renderar en bolagssida ur nattjobbets data-JSON: husets formspråk, varje
// faktum med sitt citat, korskontroller räknade i kod, tydlig alpha-märkning.

const RUBRIK = { rapport: 'Rapport', kallelse: 'Kallelse till stämma', emission: 'Emission', avtal: 'Avtal & besked', ovrigt: 'Övrigt' };

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
  const kk = korskontroller(dok);
  const falt = dok.fakta ? Object.entries(dok.fakta).map(([id, f]) => `
      <tr><td class="fid">${id}</td><td class="fv">${fmt(f.nu)}${f.fjol != null ? ` <span class="jmf">(jmf ${fmt(f.fjol)})</span>` : ''} <span class="enh">${f.enhet || ''}</span></td></tr>
      <tr><td></td><td class="cit">"${((dok.kallor || {})[id] || {}).citat || 'citat saknas'}"</td></tr>`).join('') : '';
  return `
  <div class="sek">
    <div class="et">${RUBRIK[dok.typ] || dok.typ} · ${dok.datum || ''}</div>
    <h2>${(dok.rubrik || '').split('>').pop().trim()}</h2>
    ${dok.klass ? `<p class="klass">Klass: <b>${dok.klass}</b></p><p class="cit">"${dok.bevis || ''}"</p>` : ''}
    ${falt ? `<table class="ft">${falt}</table>` : ''}
    ${dok.typ === 'ovrigt' ? `<p class="mut">Lagrat utan extraktion (informationspost).</p>` : ''}
    ${kk.map(k => `<p class="kk ${k.ok ? 'ok' : 'fel'}">${k.ok ? '✓' : '✗'} ${k.namn}: beräknat ${fmt(k.beraknad)} · dokumentet säger ${fmt(k.uppgiven)}</p>`).join('')}
    <p class="len"><a href="${dok.url}">Källdokumentet hos MFN →</a></p>
  </div>`;
}

export function renderBolag(data) {
  return `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${data.namn} · Ägarkollen alpha</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{--bg:#F7F4EC;--card:#FCFAF4;--line:#E4DDCC;--ink:#211C17;--mut:#5C544A;--faint:#8A8172;--ox:#8A2E26;--pos:#2E6B4C;--neg:#A8382E;
    --disp:'Fraunces',Georgia,serif;--sans:'Inter',system-ui,sans-serif;--mono:'JetBrains Mono',monospace}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55}
  .wrap{max-width:760px;margin:0 auto;padding:26px 20px 60px}
  .mast{display:flex;justify-content:space-between;border-bottom:2px solid var(--ox);padding-bottom:8px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
  h1{font-family:var(--disp);font-weight:700;font-size:28px;margin:16px 0 2px;letter-spacing:-.4px}
  .sub{color:var(--mut);margin:0 0 8px;font-size:13px}
  .varn{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--ox);border:1px solid var(--ox);border-radius:6px;display:inline-block;padding:3px 9px;margin-bottom:18px}
  .sek{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:12px}
  .et{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ox);margin-bottom:6px}
  h2{font-family:var(--disp);font-weight:600;font-size:16.5px;margin:0 0 10px;letter-spacing:-.2px;line-height:1.3}
  .ft{width:100%;border-collapse:collapse}
  .fid{font-family:var(--mono);font-size:10.5px;color:var(--faint);padding:6px 12px 0 0;vertical-align:top;white-space:nowrap}
  .fv{font-family:var(--mono);font-size:14px;padding-top:6px}
  .jmf{color:var(--mut);font-size:11px}.enh{color:var(--faint);font-size:10px}
  .cit{color:var(--mut);font-size:11.5px;font-style:italic;padding:1px 0 7px;border-bottom:1px solid var(--line)}
  td.cit{display:block}
  .klass{font-size:13px;margin:0 0 4px}.klass b{color:var(--ox);text-transform:uppercase;font-family:var(--mono);font-size:11px;letter-spacing:.06em}
  .kk{font-family:var(--mono);font-size:11px;margin:8px 0 0}.kk.ok{color:var(--pos)}.kk.fel{color:var(--neg)}
  .len{margin:10px 0 0;font-size:11.5px}.len a{color:var(--mut)}
  .mut{color:var(--faint);font-size:12px}
  .foot{font-family:var(--mono);font-size:10px;color:var(--faint);text-align:center;margin-top:22px;line-height:1.8}
</style></head><body><div class="wrap">
  <div class="mast"><span>Ägarkollen · av Marginalen</span><span>Alpha · genererad ${data.uppdaterad}</span></div>
  <h1>${data.namn}</h1>
  <p class="sub">${data.dokument.length} dokument bevakade · varje siffra med ordagrant citat ur källan · korskontroller räknade i kod</p>
  <div class="varn">ALPHA · RIKTIG DATA · MASKINLÄST, MÄNSKLIGT OGRANSKAD · ALDRIG RÅD</div>
  ${data.dokument.map(dokSektion).join('\n')}
  <div class="foot">Ägarkollen är arbetsnamn · källor: bolagets egna pressmeddelanden via MFN · information, aldrig råd</div>
</div></body></html>`;
}
