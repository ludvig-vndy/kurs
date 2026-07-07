// Narration för Lifco-fallet. Daterad ram enligt fallkällans användningsregler:
// en genomgång av ett avslutat räkenskapsår, aldrig en aktuell värdering eller
// rekommendation. Härledda tal (P/E, direktavkastning, payout) anges som uträkningar.
// Bara tal ur fakta/beräkningar; verify.mjs är grinden.

export function narreraLifco(ex,c){
  const f=ex.fakta;
  const sv=v=>String(v).replace('.',',');
  const dec=(v,n)=>v.toFixed(n).replace('.',',');
  const fmt=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
  const abs=v=>sv(Math.abs(v));

  const verdikt=
    `Lifcos räkenskapsår 2025, rapporterat 30 januari 2026: omsättningen växte ${sv(f.omsattning_rapporterad_yoy.nu)}% `+
    `till ${fmt(f.omsattning.nu)} miljoner, varav ${sv(f.organisk_tillvaxt.nu)}% av egen kraft, och vinsten per aktie `+
    `steg ${sv(f.vpa_rapporterad_yoy.nu)}% till ${dec(f.vpa.nu,2)} kronor. Det här är en daterad genomgång av ett `+
    `avslutat år, ingen aktuell värdering.`;

  const stycken=[];

  stycken.push(
    `Tillväxtens sammansättning: av årets ${sv(f.omsattning_rapporterad_yoy.nu)}% kom ${sv(f.organisk_tillvaxt.nu)}% `+
    `av egen kraft (organisk tillväxt), resten från förvärv, medan valutan drog ned med ${sv(f.valutaeffekt.nu)}%. `+
    `Under året konsoliderades ${f.antal_forvarv.nu} förvärv.`);

  stycken.push(
    `Lönsamheten: EBITA blev ${fmt(f.ebita.nu)} miljoner (${fmt(f.ebita.fjol)}), upp ${sv(c.ebita_yoy)}%, med en `+
    `marginal på ${sv(f.ebita_marginal.nu)}% mot ${sv(f.ebita_marginal.fjol)}% året innan, ned ${abs(c.ebita_marginal_diff)} procentenheter.`);

  stycken.push(
    `Kassaflödet från den löpande verksamheten steg ${sv(c.kassaflode_yoy)}% till ${fmt(f.kassaflode_lopande.nu)} miljoner `+
    `(${fmt(f.kassaflode_lopande.fjol)}). Avkastningen på sysselsatt kapital var ${sv(f.roce_ex_goodwill.nu)}% exklusive `+
    `goodwill och kring ${sv(f.roce_inkl_goodwill.nu)}% inklusive: skillnaden är vad Lifco betalat för förvärven.`);

  stycken.push(
    `Skulden: räntebärande nettoskuld ${fmt(f.nettoskuld.nu)} miljoner, motsvarande ${sv(f.rantebarande_ns_ebitda.nu)} gånger `+
    `EBITDA (${sv(f.rantebarande_ns_ebitda.fjol)}), mot bolagets eget tak på ${f.skuldtak.nu} gånger. Marginalen till taket `+
    `är ${sv(c.skuldmarginal)} gånger, uträknat härifrån.`);

  stycken.push(
    `Utdelningen föreslås till ${dec(f.utdelning.nu,2)} kronor per aktie. Mot vinsten ${dec(f.vpa.nu,2)} är det ${sv(c.payout)}% `+
    `(uträknat), inom policyn ${sv(f.utdelningspolicy_lag.nu)} till ${sv(f.utdelningspolicy_hog.nu)}%.`);

  stycken.push(
    `Daterad värderingspunkt: aktien handlades runt ${fmt(f.pris_rapportdag.nu)} kronor på rapportdagen. Det ger P/E `+
    `cirka ${sv(c.pe)} och direktavkastning cirka ${sv(c.direktavkastning)}%, båda uträknade ur rapportens tal, inte `+
    `rapporterade. Fallets fråga är vad som är inbakat i det priset, inte om bolaget är bra.`);

  return {verdikt,stycken};
}
