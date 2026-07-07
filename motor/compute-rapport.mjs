// Beräkningar för generiska rapporter: förändringar mot jämförelseperioden
// räknas i kod ur de extraherade fälten. Narrationen får aldrig räkna själv.

export function beraknaRapport(fakta) {
  const c = {};
  const r = (v, d) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  for (const [id, f] of Object.entries(fakta)) {
    if (f.fjol == null || f.fjol === 0) continue;
    c[id + '_forandring_pct'] = r((f.nu - f.fjol) / Math.abs(f.fjol) * 100, 1);
    c[id + '_forandring_abs'] = r(f.nu - f.fjol, 3);
  }
  return c;
}
