// Narration v0: mallbaserad, på klarspråk enligt husets språkregler.
// I produktion polerar en LLM texten, men den får bara använda tal som finns i
// fakta/beräkningar, och verify.mjs är grinden som garanterar det oavsett vem som skrev.

export function narrera(ex, c) {
  const f = ex.fakta;
  const sv = (v) => String(v).replace('.', ',');

  const verdikt = c.guidning_hojd
    ? `En stark rapport. Försäljningen växte ${sv(f.organisk_tillvaxt.nu)}% av egen kraft (organisk tillväxt), mer än bolagets egen prognos, och prognosen för året höjdes.`
    : `Rapporten i korthet: organisk tillväxt ${sv(f.organisk_tillvaxt.nu)}%.`;

  const stycken = [];

  stycken.push(
    `Försäljningen blev ${sv(f.omsattning.nu)} miljoner, upp ${sv(c.omsattning_yoy)}% mot samma kvartal i fjol (${sv(f.omsattning.fjol)} miljoner). ` +
    `Av egen kraft, utan förvärv, växte bolaget ${sv(f.organisk_tillvaxt.nu)}%, mot ${sv(f.organisk_tillvaxt.fjol)}% i fjol.`
  );

  stycken.push(
    `Lönsamheten förbättrades: rörelsemarginalen (EBIT) blev ${sv(f.ebit_marginal.nu)}%, upp ${sv(c.ebit_marginal_diff)} procentenheter från ${sv(f.ebit_marginal.fjol)}%. ` +
    `När allt var betalt blev ${sv(f.fritt_kassaflode.nu)} miljoner kvar i kassan (fritt kassaflöde), upp ${sv(c.fkf_yoy)}% mot fjolårets ${sv(f.fritt_kassaflode.fjol)} miljoner.`
  );

  stycken.push(
    `Skulden motsvarar nu ${sv(f.nettoskuld_ebitda.nu)} årsvinster (nettoskuld/EBITDA), ner från ${sv(f.nettoskuld_ebitda.fjol)}. ` +
    (c.utspadning === 0
      ? `Antalet aktier är oförändrat, ${sv(f.antal_aktier.nu)} miljoner, inga nya aktier har getts ut.`
      : `Antalet aktier ändrades med ${sv(c.utspadning)}%.`)
  );

  if (ex.guidning && c.guidning_hojd) {
    stycken.push(
      `Bolaget höjde sin egen prognos för årets organiska tillväxt till ${ex.guidning.ny_lag} till ${ex.guidning.ny_hog}%, från tidigare ${ex.guidning.gammal_lag} till ${ex.guidning.gammal_hog}%.`
    );
  }

  return { verdikt, stycken };
}
