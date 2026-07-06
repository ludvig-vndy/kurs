// Deltaberäkningar: ALL matematik sker här, i kod. Narrationen får aldrig räkna.

export function berakna(ex) {
  const f = ex.fakta;
  const c = {};

  const pct = (nu, fjol) => ((nu - fjol) / fjol) * 100;

  if (f.omsattning) c.omsattning_yoy = round(pct(f.omsattning.nu, f.omsattning.fjol), 1);
  if (f.fritt_kassaflode) c.fkf_yoy = round(pct(f.fritt_kassaflode.nu, f.fritt_kassaflode.fjol), 0);
  if (f.ebit_marginal) c.ebit_marginal_diff = round(f.ebit_marginal.nu - f.ebit_marginal.fjol, 1);
  if (f.bruttomarginal) c.brutto_diff = round(f.bruttomarginal.nu - f.bruttomarginal.fjol, 1);
  if (f.nettoskuld_ebitda) c.skuld_diff = round(f.nettoskuld_ebitda.nu - f.nettoskuld_ebitda.fjol, 1);
  if (f.antal_aktier) c.utspadning = f.antal_aktier.nu === f.antal_aktier.fjol ? 0 : round(pct(f.antal_aktier.nu, f.antal_aktier.fjol), 1);

  if (ex.guidning && f.organisk_tillvaxt) {
    c.over_gammal_guidning = f.organisk_tillvaxt.nu > ex.guidning.gammal_hog;
    c.guidning_hojd = ex.guidning.ny_lag > ex.guidning.gammal_lag;
  }

  return c;
}

function round(v, d) {
  const k = Math.pow(10, d);
  return Math.round(v * k) / k;
}
