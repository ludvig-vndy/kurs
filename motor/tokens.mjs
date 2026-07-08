// Husets delade tokens för de maskingenererade ytorna (bolagssidor, brev,
// rapportkollen). En källa i stället för driftande kopior; värdena följer
// hus 1 (broadsheet.css) och typspår A: Outfit display, Inter UI, JetBrains
// Mono ENDAST för tabellsiffror och datafält.

export const FONT_LANK = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';

export const TOKENS_CSS = `:root{
  --bg:#F6F4EF; --card:#FCFAF4; --line:#E4DDCC; --line-stark:#211C17;
  --ink:#211C17; --mut:#5C544A; --faint:#8A8172;
  --ox:#8A2E26; --ox-ink:#FBF7EE; --gold:#9A6E1C; --pos:#2E6B4C; --neg:#A8382E;
  --disp:'Outfit',system-ui,sans-serif; --sans:'Inter',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
}`;

// Kursens bas-URL för korslänkar från lokala/alpha-ytor, och bildbäraren.
export const KURS_BAS = 'https://trunk.kurs-7m8.pages.dev';
export const BILD_BORSHUS = `${KURS_BAS}/bilder/borshuset-1600.jpg`;

// Fördjupningslänkar per dokumenttyp: produkten citerar kursen.
export const LEKTIONSLANK = {
  rapport: { url: `${KURS_BAS}/fokus/kapitel/4`, text: 'Fördjupning i kursen: läsa räkenskaperna' },
  kallelse: { url: `${KURS_BAS}/fokus/17.3`, text: 'Fördjupning i kursen: kallelsen och utspädningen' },
  emission: { url: `${KURS_BAS}/fokus/17.3`, text: 'Fördjupning i kursen: kallelsen och utspädningen' },
  avtal: { url: `${KURS_BAS}/fokus/17.2`, text: 'Fördjupning i kursen: avtalsspråket' },
  forvarv: { url: `${KURS_BAS}/fokus/17.2`, text: 'Fördjupning i kursen: avtalsspråket' },
  insyn: { url: `${KURS_BAS}/fokus/kapitel/7`, text: 'Fördjupning i kursen: ledning och ägande' },
  avvikelse: { url: `${KURS_BAS}/fokus/17.5`, text: 'Fördjupning i kursen: att hålla och att släppa' }
};

// Husets masthead för genererade sidor.
export function masthead(undertitel) {
  return `<header class="hmast">
    <div class="hmast-rad"><span class="hmast-mark">ÄGAR<span>KOLLEN</span></span>
    <span class="hmast-ed">av Marginalen<br>${undertitel}</span></div>
    <div class="hmast-rule"></div>
  </header>`;
}

export const MASTHEAD_CSS = `
  .hmast{padding:4px 0 0}
  .hmast-rad{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:10px}
  .hmast-mark{font-family:var(--disp);font-weight:500;font-size:clamp(24px,3vw,32px);letter-spacing:.04em;line-height:.9;color:var(--ink)}
  .hmast-ed{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);text-align:right;line-height:1.7}
  .hmast-rule{height:2px;background:var(--line-stark)}`;
