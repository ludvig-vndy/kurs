/* Delad rendering for bada fragaytorna. All text och alla attribut escapes. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const prosa = s => esc(s).replace(/\n/g, '<br>');
  const urlOk = s => /^https?:\/\/[^\s]+$/i.test(s || '') || /^\/fokus\/[a-z0-9.%_-]+$/i.test(s || '');

  function kallor(lista) {
    return (lista || []).map(k => {
      const titel = esc(k.rubrik || 'Dokument');
      const lank = urlOk(k.url) ? '<a href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer">' + titel + '</a>' : titel;
      return '<details class="fraga-kalla"><summary>Källställe: ' + lank +
        (k.sida ? ', sida ' + esc(k.sida) : '') +
        (k.datum ? ', ' + esc(k.datum) : '') + '</summary>' +
        (k.citat ? '<blockquote>' + prosa(k.citat) + '</blockquote>' : '') + '</details>';
    }).join('');
  }

  function tackning(t) {
    if (!t) return '';
    const rader = [];
    if (t.period) rader.push('Frågans period: ' + t.period.fran + ' till ' + t.period.till + '.');
    if (t.orsak) rader.push('Begränsning: ' + t.orsak + '.');
    for (const b of t.bolag || []) {
      rader.push(b.arkiv
        ? b.namn + ': arkiv från ' + (b.aldst || 'okänt datum') + ' till ' + (b.nyast || 'okänt datum') + '.'
        : b.namn + ': ' + (b.av || 'saknar underlag') + '.');
    }
    if (t.lasta != null) rader.push('Lästa utdrag: ' + t.lasta + '.');
    if (t.utelamnade?.length) rader.push('Inte undersökta i detta svar: ' + t.utelamnade.join(', ') + '.');
    if (t.modellfall) rader.push('Svaret togs fram med en enklare modell efter ett tekniskt fel.');
    if (t.faktaregister?.begransat) rader.push('Ett begränsat urval av faktaposter fick plats. Avgränsa frågan för att undersöka fler.');
    if (t.samtal?.begransat) rader.push('Äldre delar av samtalet fick inte plats i underlaget för detta svar.');
    if (Array.isArray(t.utredning) && t.utredning.length) {
      for (const del of t.utredning) {
        if (del.status === 'undersokt') rader.push('Sökningar gjorda: ' + del.rubrik + '.');
        else if (del.status === 'ej_undersokt') rader.push('Inte undersökt: ' + del.rubrik + '.');
      }
      rader.push('En genomförd sökning betyder inte att frågan är besvarad. Svaret visar vad källorna ger stöd för.');
    }
    return '<div class="fraga-underlag"><strong>Underlag och begränsningar</strong>' +
      rader.map(s => '<div>' + esc(s) + '</div>').join('') + '</div>';
  }

  function blocktext(b) {
    if (b.typ !== 'beraknat') return '<p>' + prosa(b.text) + '</p>';
    const [resultat, ...rader] = String(b.text || '').split(/\r?\n/);
    const tekniskt = [], forutsattningar = [];
    let varning = false;
    for (const rad of rader) {
      if (/^(?:Förutsättning:|Beräkningen vilar på)/.test(rad)) varning = true;
      else if (/^(?:Så räknades det:|Enheter i beräkningen:)/.test(rad)) varning = false;
      // Antaganden kan själva innehålla radbrytningar: håll också dem synliga.
      (varning ? forutsattningar : tekniskt).push(rad);
    }
    const utrakning = tekniskt.join('\n').replace(/^Så räknades det:\s*/, '').trim();
    return '<p>' + prosa(resultat) + '</p>' +
      (forutsattningar.length ? '<p class="fraga-forutsattning">' + prosa(forutsattningar.join('\n')) + '</p>' : '') +
      (utrakning ? '<details class="fraga-berakning"><summary>Så räknades det</summary><p>' + prosa(utrakning) + '</p></details>' : '');
  }

  function render(d) {
    const body = !d.blockerat && d.block?.length
      ? d.block.map(b => '<section class="fraga-block"><strong class="fraga-etikett">' +
        esc(b.etikett) + '</strong>' + (b.tidigare ? '<span class="fraga-tidigare">Tidigare svar i samtalet</span>' : '') +
        blocktext(b) + kallor(b.kallor) + '</section>').join('')
      : '<p>' + prosa(d.answer || 'Inget svar kunde visas.') + '</p>';
    return body + tackning(d.tackning);
  }
  root.FragaSvar = { render };
})(globalThis);
