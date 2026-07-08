import { LEKTIONSLANK, BILD_BORSHUS } from './tokens.mjs';

// Dagsbrevet: renderas ur nattens faktiska fynd (nya dokument per bolag), inte
// fixturer. Mejlvänlig HTML (inline-stil, en kolumn). Lugna bolag redovisas
// uttryckligen, tystnad är ett besked.

const TYPNAMN = { rapport: 'Rapport', kallelse: 'Kallelse', emission: 'Emission', avtal: 'Avtal', forvarv: 'Förvärv', insyn: 'Insynshandel', avvikelse: 'Avvikelse', omvarld: 'Omvärld', ovrigt: 'Övrigt' };

function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ','); }

function radFakta(post) {
  if (post.klass) return `Klass: <b>${post.klass}</b>. <i>"${(post.bevis || '').slice(0, 180)}"</i>`;
  if (post.bevis) return `<i>${post.bevis.slice(0, 200)}</i>`;
  if (post.fakta && Object.keys(post.fakta).length) {
    return Object.entries(post.fakta).slice(0, 3)
      .map(([id, f]) => `${id.replace(/_/g, ' ')}: <b>${fmt(f.nu)}</b>${f.fjol != null ? ` (${fmt(f.fjol)})` : ''}`)
      .join(' · ');
  }
  return '';
}

export function renderDagsbrev({ datum, poster, lugna }) {
  const d = new Date(datum + 'T12:00:00');
  const veckodag = d.toLocaleDateString('sv-SE', { weekday: 'long' });
  const datumtext = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });
  const nr = Math.max(1, Math.round((d - new Date('2026-07-07T12:00:00')) / 864e5) + 1);
  const s = {
    sek: 'background:#FCFAF4;border:1px solid #E4DDCC;border-radius:10px;padding:16px 18px;margin-bottom:12px',
    et: 'font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A2E26;margin:0 0 4px',
    h2: 'font-weight:600;font-size:16px;margin:0 0 6px;color:#211C17',
    p: 'font-size:13px;color:#5C544A;margin:0 0 6px;line-height:1.5',
    a: 'color:#8A2E26'
  };
  const sektioner = poster.map(({ bolag, post }) => `
  <div style="${s.sek}">
    <p style="${s.et}">${bolag} · ${TYPNAMN[post.typ] || post.typ}</p>
    <h2 style="${s.h2}">${(post.rubrik || '').split('>').pop().trim()}</h2>
    <p style="${s.p}">${radFakta(post)}</p>
    <p style="${s.p}"><a style="${s.a}" href="${post.url}">Källdokumentet →</a>${LEKTIONSLANK[post.typ] ? ` · <a style="${s.a}" href="${LEKTIONSLANK[post.typ].url}">Fördjupning i kursen →</a>` : ''}</p>
  </div>`).join('');

  return `<!doctype html><html lang="sv"><body style="margin:0;background:#F7F4EC;padding:24px 12px;font-family:-apple-system,Segoe UI,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <p style="font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A8172;border-bottom:2px solid #8A2E26;padding-bottom:6px">Ägarkollen · av Marginalen · alpha</p>
    <div style="height:52px;background:#8A2E26 url('${BILD_BORSHUS}') center 40%/cover;margin:12px 0 0"></div>
    <h1 style="font-weight:700;font-size:26px;color:#211C17;margin:14px 0 4px">Ägarbrevet</h1>
    <p style="font-size:13px;color:#5C544A;margin:0 0 18px">№ ${nr} · ${veckodag} ${datumtext} · ${poster.length} ${poster.length === 1 ? 'sak' : 'saker'} i dina bolag i natt. Varje siffra bär citat ur källdokumentet.</p>
    ${sektioner || `<div style="${s.sek}"><p style="${s.p}">Inget nytt i något bevakat bolag. Det är ett besked, inte ett fel.</p></div>`}
    ${lugna.length ? `<div style="${s.sek};border-top:2px solid #2E6B4C"><p style="${s.et}">Lugnt</p><p style="${s.p}">Inget nytt i: ${lugna.join(', ')}.</p></div>` : ''}
    <p style="font-family:monospace;font-size:10px;color:#8A8172;text-align:center;margin-top:20px;line-height:1.7">Maskinläst, mänskligt ogranskad · aldrig råd · Ägarkollen är arbetsnamn</p>
  </div></body></html>`;
}
