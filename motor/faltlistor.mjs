// Generiska fältlistor per dokumenttyp: det LLM-extraktionen får hämta ur
// riktiga dokument. Delas av kor-dokument.mjs (manuell körning) och natt.mjs
// (nattjobbet). Per-bolags-facit byggs ovanpå dessa när bolag onboardas skarpt.

export const FALT = {
  rapport: [
    { id: 'omsattning', beskrivning: 'Nettoomsättning för perioden, med jämförelseperioden om den anges', enhet: 'Mkr eller tkr enligt dokumentet' },
    { id: 'orderingang', beskrivning: 'Orderingång för perioden om den anges', enhet: 'Mkr' },
    { id: 'rorelseresultat', beskrivning: 'Rörelseresultat (EBIT eller EBITDA, ange vilket i citatet)', enhet: 'Mkr' },
    { id: 'periodens_resultat', beskrivning: 'Periodens resultat efter skatt', enhet: 'Mkr' },
    { id: 'kassa', beskrivning: 'Likvida medel eller kassa vid periodens slut', enhet: 'Mkr' },
    { id: 'kassaflode', beskrivning: 'Kassaflöde från den löpande verksamheten', enhet: 'Mkr' },
    { id: 'antal_aktier', beskrivning: 'Antal aktier vid periodens slut om det anges', enhet: 'st' }
  ],
  kallelse: [
    { id: 'stamma_dag', beskrivning: 'Dag i månaden för stämman', enhet: 'dag' },
    { id: 'antal_aktier', beskrivning: 'Totalt antal aktier och röster i bolaget om det anges', enhet: 'st' },
    { id: 'bemyndigande_aktier', beskrivning: 'Högsta antal nya aktier i eventuellt emissionsbemyndigande', enhet: 'st' },
    { id: 'bemyndigande_andel_uppgiven', beskrivning: 'Bemyndigandets andel i procent om kallelsen anger den', enhet: '%' },
    { id: 'emission_aktier', beskrivning: 'Antal nya aktier i emission som stämman ska godkänna', enhet: 'st' },
    { id: 'teckningskurs', beskrivning: 'Teckningskurs per aktie i kronor', enhet: 'kr' },
    { id: 'emissionsbelopp', beskrivning: 'Emissionens totala belopp', enhet: 'kr eller Mkr enligt dokumentet' }
  ],
  emission: [
    { id: 'emissionsbelopp_mkr', beskrivning: 'Emissionens belopp i miljoner kronor', enhet: 'Mkr' },
    { id: 'antal_nya_aktier', beskrivning: 'Antal nya aktier som ges ut', enhet: 'st' },
    { id: 'teckningskurs', beskrivning: 'Teckningskurs per aktie i kronor', enhet: 'kr' },
    { id: 'rabatt_procent', beskrivning: 'Rabatt mot marknadskurs i procent om den anges (ange som positivt tal)', enhet: '%' },
    { id: 'utspadning_procent', beskrivning: 'Utspädning i procent om den anges (ange som positivt tal)', enhet: '%' },
    { id: 'antal_aktier_fore', beskrivning: 'Antal aktier före emissionen om det anges', enhet: 'st' }
  ]
};

// Typbestämning ur MFN-slug/rubrik. 'ovrigt' lagras utan LLM-extraktion.
export function bestamTyp(slugEllerRubrik) {
  const s = slugEllerRubrik.toLowerCase();
  if (/(kallelse)/.test(s)) return 'kallelse';
  if (/(emission|foretradesemission|riktad)/.test(s)) return 'emission';
  if (/(delarsrapport|bokslutskommunike|kvartalsrapport|arsredovisning|interim|year-end|quarterly)/.test(s)) return 'rapport';
  if (/(kommunike|videomaterial|inbjudan|presentation|valberedning|analys)/.test(s)) return 'ovrigt';
  return 'avtal';
}
