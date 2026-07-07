// Utspädningsvakten, narrationssteget: klarspråk om vad kallelsen faktiskt ber om
// och vad det kan betyda för ägarens andel. Fakta ur kallelsen, all matematik ur
// compute-steget, aldrig råd. verify.mjs är grinden.

export function narreraKallelse(ex,c){
  const f=ex.fakta;
  const sv=v=>String(v).replace('.',',');
  const dec=(v,n)=>v.toFixed(n).replace('.',',');
  const fmt=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,' ');

  const verdikt=
    `Voltcells kallelse till årsstämman den ${f.stamma_dag.nu} maj ${f.stamma_ar.nu} innehåller tre saker som kan `+
    `späda ut din andel: ett bemyndigande om nya aktier, ett konvertibellån som förfaller i mars ${f.forfall_ar.nu} `+
    `och ett optionsprogram. Läggs allt ihop kan antalet aktier öka med som mest ${sv(c.max_utspadning)}%, uträknat ur kallelsens egna tal.`;

  const stycken=[];

  stycken.push(
    `Bemyndigandet: styrelsen ber om rätt att ge ut högst ${fmt(f.bemyndigande_aktier.nu)} nya aktier före nästa stämma, `+
    `${sv(c.bemyndigande_andel)}% av dagens ${fmt(f.antal_aktier.nu)} (uträknat; kallelsen säger cirka ${sv(f.bemyndigande_andel_uppgiven.nu)}). `+
    (ex.flaggor.utan_foretradesratt
      ?`Emission kan ske utan företrädesrätt: bolaget kan sälja nya aktier till någon annan utan att du får köpa först. `
      :``)+
    `Ett bemyndigande är en möjlighet styrelsen ber om i förväg, inte en beslutad emission.`);

  stycken.push(
    `Konvertibeln: lånet på ${fmt(f.konvertibel_nominellt.nu)} kronor förfaller den ${f.forfall_dag.nu} mars ${f.forfall_ar.nu}. `+
    `Konverteringskursen är ${dec(f.konverteringskurs.nu,2)} kronor: står aktien över den nivån lär lånet bli aktier i stället `+
    `för att betalas tillbaka, högst ${fmt(f.konvertibel_aktier_uppgivna.nu)} nya (${sv(c.konvertibel_andel)}% utspädning, uträknat). `+
    `Står aktien under ska bolaget i stället betala ${sv(c.konvertibel_mkr)} miljoner kontant, värt att ställa mot kassan.`);

  stycken.push(
    `Optionsprogrammet: högst ${fmt(f.optioner_antal.nu)} nya aktier till teckningskurs ${dec(f.teckningskurs.nu,2)} kronor, `+
    `${sv(c.optioner_andel)}% av dagens antal (uträknat).`);

  stycken.push(
    `Taket, om allt ovan blir aktier: antalet ökar med ${fmt(c.nya_aktier_max)} till ${fmt(c.aktier_efter_max)}, en `+
    `utspädning på som mest ${sv(c.max_utspadning)}% (uträknat). Inget av detta har hänt än, det är möjligheter bolaget `+
    `ber om eller redan gett ut, men nu vet du var taket ligger innan stämman den ${f.stamma_dag.nu} maj. Vi säger till om något av besluten tas.`);

  return {verdikt,stycken};
}
