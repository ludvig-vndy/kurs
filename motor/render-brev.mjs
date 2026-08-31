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

/* Kalenderblocket. Formuleras i dagar OCH datum: "om 4 dagar" svarar på frågan
   läsaren faktiskt har, datumet gör det kontrollerbart. Värderingsraden skrivs
   bara ut för de bolag som passerat spärren i borsdata.mjs; för övriga står det
   ingenting alls, inte "ej jämförbar", eftersom ett tomrum är lättare att läsa
   än en förklaring till varför en siffra saknas. */
/* Rubriken över kalendern. Den ska säga det läsaren vill veta utan att räkna:
   står nästa rapport för dörren, eller är det långt dit. Ett långt avstånd är
   ett lika riktigt besked som ett kort. */
function narmast(rader) {
  const med = rader.filter(r => r.kalender).sort((a, b) => a.kalender.dagar - b.kalender.dagar);
  if (!med.length) return 'Inget satt rapportdatum i dina bolag';
  const f = med[0];
  const veckodag = new Date(f.kalender.datum + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'long' });
  if (f.kalender.dagar === 0) return `${f.bolag} rapporterar i dag`;
  if (f.kalender.dagar === 1) return `${f.bolag} rapporterar i morgon`;
  if (f.kalender.dagar <= 7) return `${f.bolag} rapporterar på ${veckodag}`;
  const veckor = Math.round(f.kalender.dagar / 7);
  return `Närmast är ${f.bolag}, om ${veckor} ${veckor === 1 ? 'vecka' : 'veckor'}`;
}

function radBorsdata(r, s) {
  const nar = r.kalender
    ? (r.kalender.dagar === 0 ? 'i dag'
      : r.kalender.dagar === 1 ? 'i morgon'
      : `om ${r.kalender.dagar} dagar`)
    : null;
  const datumtext = r.kalender
    ? new Date(r.kalender.datum + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
    : null;
  const v = r.vardering?.pe;
  const rikt = v ? (v.avvikelse > 0 ? 'över' : 'under') : null;
  return `<tr>
    <td style="${s.td};font-weight:600">${r.bolag}</td>
    <td style="${s.td}">${r.kalender ? `${r.kalender.typ} ${nar}<span style="color:#8A8172"> · ${datumtext}</span>` : '<span style="color:#8A8172">inget satt datum</span>'}</td>
    <td style="${s.td}">${v
      ? `P/E ${fmt(v.nu)} mot ${fmt(v.median)} <span style="color:#8A8172">(medianen ${v.fran} till ${v.till}, ${Math.abs(v.avvikelse)}% ${rikt})</span>`
      : ''}</td>
  </tr>`;
}

export function renderDagsbrev({ datum, poster, lugna, borsdata = [] }) {
  const d = new Date(datum + 'T12:00:00');
  const veckodag = d.toLocaleDateString('sv-SE', { weekday: 'long' });
  const datumtext = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });
  const nr = Math.max(1, Math.round((d - new Date('2026-07-07T12:00:00')) / 864e5) + 1);
  const s = {
    sek: 'background:#FCFAF4;border:1px solid #E4DDCC;border-top:2px solid #211C17;padding:16px 18px;margin-bottom:12px',
    et: 'font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8A2E26;margin:0 0 4px',
    h2: 'font-weight:600;font-size:16px;margin:0 0 6px;color:#211C17',
    p: 'font-size:13px;color:#5C544A;margin:0 0 6px;line-height:1.5',
    a: 'color:#8A2E26;display:inline-block;padding:6px 2px;min-height:20px',
    td: 'font-size:12px;color:#5C544A;padding:6px 8px 6px 0;border-bottom:1px solid #EFE9DA;line-height:1.45;vertical-align:top'
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
    ${borsdata.length ? `<div style="${s.sek};border-top:2px solid #9A6E1C">
      <p style="${s.et}">Kalendern</p>
      <h2 style="${s.h2}">${narmast(borsdata)}</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">${borsdata.map(r => radBorsdata(r, s)).join('')}</table>
      <p style="${s.p};margin-top:8px;color:#8A8172">Rapportdatum och nyckeltal från Börsdata. Medianen räknas på bolagets egna avslutade år, och visas bara när bolaget gått med vinst hela vägen.</p>
    </div>` : ''}
    ${lugna.length ? `<div style="${s.sek};border-top:2px solid #2E6B4C"><p style="${s.et}">Lugnt</p><p style="${s.p}">Inget nytt i: ${lugna.join(', ')}.</p></div>` : ''}
    <p style="font-family:monospace;font-size:10px;color:#6E6456;text-align:center;margin-top:20px;line-height:1.7">Nästa brev i morgon bitti · passeras en gräns säger vi till direkt<br>Maskinläst, mänskligt ogranskad · aldrig råd · Ägarkollen är arbetsnamn</p>
  </div></body></html>`;
}
