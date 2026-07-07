// Beräkningar för Lifco-fallet: all matematik i kod, aldrig i narrationen.
// Innehåller dessutom korskontrollen: rapportens egna procentsatser ("upp 8,1 procent")
// räknas om ur de rapporterade nivåerna. Avvikelse över 0,1 procentenheter är fel,
// antingen i extraktionen eller i källan, och båda ska synas.

export function beraknaLifco(ex){
  const f=ex.fakta,c={},korskontroll=[];
  const pct=(nu,fjol)=>((nu-fjol)/fjol)*100;
  const r=(v,d)=>{const k=Math.pow(10,d);return Math.round(v*k)/k;};
  const cross=(namn,beraknad,rapId)=>{
    const rap=f[rapId]&&f[rapId].nu;
    if(rap==null||beraknad==null)return;
    korskontroll.push({namn,beraknad,rapporterad:rap,ok:Math.abs(beraknad-rap)<=0.1});
  };

  if(f.omsattning&&f.omsattning.fjol!=null){
    c.omsattning_yoy=r(pct(f.omsattning.nu,f.omsattning.fjol),1);
    cross('Omsättning, tillväxt mot i fjol',c.omsattning_yoy,'omsattning_rapporterad_yoy');
  }
  if(f.ebita&&f.ebita.fjol!=null){
    c.ebita_yoy=r(pct(f.ebita.nu,f.ebita.fjol),1);
    cross('EBITA, tillväxt mot i fjol',c.ebita_yoy,'ebita_rapporterad_yoy');
  }
  if(f.kassaflode_lopande&&f.kassaflode_lopande.fjol!=null){
    c.kassaflode_yoy=r(pct(f.kassaflode_lopande.nu,f.kassaflode_lopande.fjol),1);
    cross('Kassaflöde, tillväxt mot i fjol',c.kassaflode_yoy,'kassaflode_rapporterad_yoy');
  }
  if(f.ebita_marginal&&f.ebita_marginal.fjol!=null)
    c.ebita_marginal_diff=r(f.ebita_marginal.nu-f.ebita_marginal.fjol,1);

  if(f.pris_rapportdag&&f.vpa)c.pe=r(f.pris_rapportdag.nu/f.vpa.nu,0);
  if(f.utdelning&&f.pris_rapportdag)c.direktavkastning=r(f.utdelning.nu/f.pris_rapportdag.nu*100,1);
  if(f.utdelning&&f.vpa)c.payout=r(f.utdelning.nu/f.vpa.nu*100,0);
  if(f.skuldtak&&f.rantebarande_ns_ebitda)c.skuldmarginal=r(f.skuldtak.nu-f.rantebarande_ns_ebitda.nu,1);

  return {c,korskontroll};
}
