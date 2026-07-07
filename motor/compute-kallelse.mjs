// Utspädningsvakten, beräkningssteget: andelar och maxutspädning räknas här, i kod.
// Korskontrollerna jämför kallelsens egna uppgifter (cirka-procent, uppgivet antal
// konvertibelaktier) mot vad som följer av de rapporterade nivåerna.

export function beraknaKallelse(ex){
  const f=ex.fakta,c={},korskontroll=[];
  const r=(v,d)=>{const k=Math.pow(10,d);return Math.round(v*k)/k;};
  const bas=f.antal_aktier.nu;

  c.bemyndigande_andel=r(f.bemyndigande_aktier.nu/bas*100,1);
  korskontroll.push({namn:'Bemyndigandets andel mot kallelsens cirka-uppgift',
    beraknad:c.bemyndigande_andel,rapporterad:f.bemyndigande_andel_uppgiven.nu,
    ok:Math.abs(c.bemyndigande_andel-f.bemyndigande_andel_uppgiven.nu)<=0.5});

  c.konvertibel_aktier=Math.floor(f.konvertibel_nominellt.nu/f.konverteringskurs.nu);
  korskontroll.push({namn:'Konvertibelaktier mot kallelsens uppgift',
    beraknad:c.konvertibel_aktier,rapporterad:f.konvertibel_aktier_uppgivna.nu,
    ok:Math.abs(c.konvertibel_aktier-f.konvertibel_aktier_uppgivna.nu)<=1});

  c.konvertibel_andel=r(f.konvertibel_aktier_uppgivna.nu/bas*100,1);
  c.optioner_andel=r(f.optioner_antal.nu/bas*100,1);

  c.nya_aktier_max=f.bemyndigande_aktier.nu+f.konvertibel_aktier_uppgivna.nu+f.optioner_antal.nu;
  c.aktier_efter_max=bas+c.nya_aktier_max;
  c.max_utspadning=r(c.nya_aktier_max/bas*100,1);
  c.konvertibel_mkr=r(f.konvertibel_nominellt.nu/1e6,0);

  return {c,korskontroll};
}
