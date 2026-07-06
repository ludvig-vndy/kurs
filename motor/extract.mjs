// Extraktion v0: deterministisk parser för sammandrags-sektionen i en rapport.
// I produktion är detta steg LLM-assisterat med samma utdata-schema; parsern här
// bevisar pipelinens form och ger en LLM-fri baslinje för eval.

const RADER = [
  { id: 'omsattning', label: /Nettoomsättning, Mkr/, enhet: 'Mkr' },
  { id: 'organisk_tillvaxt', label: /Organisk tillväxt, %/, enhet: '%' },
  { id: 'bruttomarginal', label: /Bruttomarginal, %/, enhet: '%' },
  { id: 'ebit', label: /Rörelseresultat EBIT, Mkr/, enhet: 'Mkr' },
  { id: 'ebit_marginal', label: /EBIT-marginal, %/, enhet: '%' },
  { id: 'fritt_kassaflode', label: /Fritt kassaflöde, Mkr/, enhet: 'Mkr' },
  { id: 'nettoskuld_ebitda', label: /Nettoskuld\/EBITDA, ggr/, enhet: 'x' },
  { id: 'antal_aktier', label: /Antal aktier, miljoner/, enhet: 'M' }
];

function tal(s) {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.'));
}

export function extrahera(text) {
  const rader = text.split('\n');
  const fakta = {};
  const kallor = {};
  let sida = 0;

  for (const rad of rader) {
    const sidmatch = rad.match(/\[Sida (\d+)\]/);
    if (sidmatch) { sida = parseInt(sidmatch[1]); continue; }

    for (const r of RADER) {
      if (r.label.test(rad)) {
        const m = rad.match(/:\s*(-?[\d\s]+(?:,\d+)?)\s*\((-?[\d\s]+(?:,\d+)?)\)/);
        if (m) {
          fakta[r.id] = { nu: tal(m[1]), fjol: tal(m[2]), enhet: r.enhet };
          kallor[r.id] = { citat: rad.trim(), sida };
        }
      }
    }
  }

  // Guidning ur löptext: "höjer vi prognosen ... till X till Y procent, från tidigare A till B procent"
  let guidning = null;
  const g = text.match(/höjer vi prognosen[^.]*till (\d+) till (\d+) procent, från tidigare (\d+) till (\d+) procent/);
  if (g) {
    guidning = { ny_lag: +g[1], ny_hog: +g[2], gammal_lag: +g[3], gammal_hog: +g[4] };
    kallor.guidning = { citat: g[0], sida: 2 };
  }

  const bolag = (text.match(/^(.+?) AB/m) || [null, 'Okänt'])[1];
  const period = (text.match(/Tredje kvartalet, (juli-september \d{4})/) || [null, 'okänd period'])[1];

  return { bolag, period, fakta, guidning, kallor };
}
