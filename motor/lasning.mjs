/* Vad motorn faktiskt gick igenom i natt, per ägare.
   ------------------------------------------------------------------------
   Talen hamnar i brevets checked-fält och blir raden "Vi gick igenom N
   pressmeddelanden och M insynsanmälningar i natt".

   FELET DE ERSATTER: checked räknade förut posterna som TOG SIG IN i brevet.
   En lugn dag har noll sådana, så sidan skrev "Vi läste 0 rapporter, 0
   pressmeddelanden och 0 insynsanmälningar i natt" samtidigt som brevtexten
   intill sa att flödet och registren hade lästs. Den lugna dagen är hela
   produktens löfte, och den såg ut som en motor som inte startat.

   Det som ska räknas är alltså kontrollen, inte utfallet: hur många
   pressmeddelanden vi vägde mot arkivet, hur många insynsrader vi läste. De
   talen är stora en tyst dag, och det är precis poängen.

   Räkningen är per ägare eftersom brevet är det: ett brev får aldrig räkna in
   ett bolag läsaren inte äger. */

// lasningar: { [bolagsnamn]: { flode, insyn, rapporter } }
// minaBolag: Set eller lista med bolagsnamnen ägaren har.
export function rakna(lasningar, minaBolag) {
  const mina = minaBolag instanceof Set ? minaBolag : new Set(minaBolag || []);
  const ut = { reports: 0, filings: 0, insiders: 0 };
  for (const [namn, l] of Object.entries(lasningar || {})) {
    if (!mina.has(namn)) continue;
    ut.reports += Number(l && l.rapporter) || 0;
    ut.filings += Number(l && l.flode) || 0;
    ut.insiders += Number(l && l.insyn) || 0;
  }
  return ut;
}
