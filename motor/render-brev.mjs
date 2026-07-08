import { LEKTIONSLANK, KURS_BAS } from './tokens.mjs';
const BILD_MEJL = KURS_BAS + '/bilder/borshuset-800.jpg';

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
    sek: 'background:#FCFAF4;border:1px solid #E4DDCC;border-top:2px solid #211C17;padding:16px 18px;margin-bottom:12px',
    et: 'font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A2E26;margin:0 0 4px',
    h2: 'font-weight:600;font-size:16px;margin:0 0 6px;color:#211C17',
    p: 'font-size:13px;color:#5C544A;margin:0 0 6px;line-height:1.5',
    a: 'color:#8A2E26;display:inline-block;padding:6px 2px;min-height:20px'
  };
  const sektioner = poster.map(({ bolag, post }) => `
  <div style="${s.sek}">
    <p style="${s.et}">${bolag} · ${TYPNAMN[post.typ] || post.typ}</p>
    <h2 style="${s.h2}">${(post.rubrik || '').split('>').pop().trim()}</h2>
    <p style="${s.p}">${radFakta(post)}</p>
    <p style="${s.p}"><a style="${s.a}" href="${post.url}">Källdokumentet →</a>${LEKTIONSLANK[post.typ] ? ` · <a style="${s.a}" href="${LEKTIONSLANK[post.typ].url}">Fördjupning i kursen →</a>` : ''}</p>
  </div>`).join('');

  const forhandsrad = poster.length ? poster.map(p => p.bolag + ': ' + (p.post.rubrik || '').slice(0, 40)).join(' · ').slice(0, 140) : 'Inget nytt i dina bolag, det är ett besked.';
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ägarbrevet № ${nr}</title></head><body style="margin:0;background:#F6F4EF;padding:24px 12px;font-family:-apple-system,Segoe UI,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${forhandsrad}</div>
  <div style="max-width:600px;margin:0 auto">
    <p style="font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A8172;border-bottom:2px solid #8A2E26;padding-bottom:6px">Ägarkollen · av Marginalen · alpha</p>
    <div style="background:#8A2E26;background-image:linear-gradient(rgba(122,38,30,.82),rgba(96,28,22,.9)),url('${BILD_MEJL}');background-size:cover;background-position:center 40%;margin:12px 0 0;padding:22px 18px">
      <div style="font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(251,247,238,.85)">№ ${nr} · ${veckodag} ${datumtext}</div>
      <div style="font-weight:700;font-size:26px;color:#FBF7EE;margin-top:2px">Ägarbrevet</div>
    </div>
    <p style="font-size:13px;color:#5C544A;margin:10px 0 18px">${poster.length} ${poster.length === 1 ? 'sak' : 'saker'} i dina bolag i natt. Varje siffra bär citat ur källdokumentet.</p>
    ${sektioner || `<div style="${s.sek}"><p style="${s.p}">Inget nytt i något bevakat bolag. Det är ett besked, inte ett fel.</p></div>`}
    ${lugna.length ? `<div style="${s.sek};border-top:2px solid #2E6B4C"><p style="${s.et}">Lugnt</p><p style="${s.p}">Inget nytt i: ${lugna.join(', ')}.</p></div>` : ''}
    <p style="font-family:monospace;font-size:10px;color:#6E6456;text-align:center;margin-top:20px;line-height:1.7">Nästa brev i morgon bitti · passeras en gräns säger vi till direkt<br>Maskinläst, mänskligt ogranskad · aldrig råd · Ägarkollen är arbetsnamn</p>
  </div></body></html>`;
}
