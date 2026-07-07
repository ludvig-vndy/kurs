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

export const FALT_LIFCO = [
  { id: 'omsattning', beskrivning: 'Omsättning helåret i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
  { id: 'omsattning_rapporterad_yoy', beskrivning: 'Omsättningens rapporterade tillväxt i procent', enhet: '%' },
  { id: 'organisk_tillvaxt', beskrivning: 'Organisk tillväxt i procent', enhet: '%' },
  { id: 'ebita', beskrivning: 'EBITA i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
  { id: 'ebita_marginal', beskrivning: 'EBITA-marginal i procent, fjolåret i parentesen', enhet: '%' },
  { id: 'resultat_fore_skatt', beskrivning: 'Resultat före skatt i miljoner SEK', enhet: 'Mkr' },
  { id: 'nettoresultat', beskrivning: 'Nettoresultat i miljoner SEK', enhet: 'Mkr' },
  { id: 'vpa', beskrivning: 'Vinst per aktie i SEK', enhet: 'kr' },
  { id: 'kassaflode_lopande', beskrivning: 'Kassaflöde från löpande verksamhet i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
  { id: 'nettoskuld', beskrivning: 'Räntebärande nettoskuld i miljoner SEK', enhet: 'Mkr' },
  { id: 'rantebarande_ns_ebitda', beskrivning: 'Räntebärande nettoskuld genom EBITDA, gånger, fjolåret i parentesen', enhet: 'x' },
  { id: 'antal_forvarv', beskrivning: 'Antal konsoliderade förvärv under året', enhet: 'st' },
  { id: 'utdelning', beskrivning: 'Föreslagen utdelning per aktie i SEK', enhet: 'kr' }
];

// Typbestämning ur MFN-slug/rubrik. 'ovrigt' lagras utan LLM-extraktion.
// Ordningen är viktig: brus-mönstren prövas före rapport, annars blir en
// "inbjudan till presentation av bokslutskommuniké" en rapport.
export function bestamTyp(slugEllerRubrik) {
  const s = slugEllerRubrik.toLowerCase();
  if (/(kallelse)/.test(s)) return 'kallelse';
  if (/(inbjudan|invitation|presentation|webcast|videomaterial|kommunike|general-meeting|bolagsstamma|valberedning|nomination|analys|flaggning)/.test(s)) return 'ovrigt';
  if (/(aterkop|own-shares|buy-back|klimat|sustainability|hallbarhet|utsedd|appointed|head-of|rekryter|tilltrader|lamnar-sin)/.test(s)) return 'ovrigt';
  if (/(publishes-its-report|publicerar-rapporten|publicerar-arsredovisning|publishes-annual)/.test(s)) return 'ovrigt';
  if (/(emission|foretradesemission|riktad)/.test(s)) return 'emission';
  if (/(forvarvar|acquires|acquisition)/.test(s)) return 'forvarv';
  if (/(delarsrapport|bokslutskommunike|kvartalsrapport|arsredovisning|interim|year-end|quarterly|halvarsrapport)/.test(s)) return 'rapport';
  return 'avtal';
}
