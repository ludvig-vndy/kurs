// Avtalsklassificeraren, narrationssteget: vad varje besked faktiskt binder och
// var det placerar caset. Klass och bevis ur extraktionen, proportioner ur
// beräkningen, aldrig råd. verify.mjs är grinden för talen; klasserna evalueras
// mot facit i run-steget.

export function narreraAvtal(ex,c){
  const sv=v=>String(v).replace('.',',');
  const pm1=ex.pm[0],pm2=ex.pm[1],pm3=ex.pm[2];

  const verdikt=
    `${c.antal_besked} avtalsbesked från Voltcell mellan oktober 2025 och maj 2026. ${c.antal_bindande} av dem är `+
    `bindande: pilotkontraktet på ${sv(pm2.order_varde_mkr)} miljoner. De andra ${c.antal_loften}, avsiktsförklaringen `+
    `och ramavtalet, är löften om framtida affärer, inte order.`;

  const stycken=[];

  stycken.push(
    `Avsiktsförklaringen (oktober 2025): klassad som just avsiktsförklaring, för PM-texten säger det själv: `+
    `"${pm1.bevis}" Rubriken talar om strategiskt samarbete, men inget är bundet. ${sv(c.manader_sedan_loi)} månader `+
    `senare, vid det senaste kända beskedet, hade den ännu inte följts av något kommersiellt avtal (uträknat). Bevaka.`);

  stycken.push(
    `Pilotkontraktet (februari 2026): bindande order, den enda i raden. "${pm2.bevis}" Det är första gången någon `+
    `betalar för tekniken i skarp drift: steg 2 på casetrappan, avklarat. Beloppet är litet, men det är riktigt.`);

  stycken.push(
    `Ramavtalet (maj 2026): rubriken säger genombrott, avtalstexten säger något annat: "${pm3.bevis}" Ett ramavtal `+
    `flyttar inte caset förrän första avropet kommer. Det potentiella värdet på ${sv(pm3.potential_mkr)} miljoner över `+
    `${pm3.potential_ar} år förutsätter fullt utnyttjande och är ${sv(c.potential_mot_order)} gånger den enda bindande `+
    `ordern (uträknat). När rubrik och avtalstext säger olika saker är det avtalstexten som gäller.`);

  return {verdikt,stycken};
}
