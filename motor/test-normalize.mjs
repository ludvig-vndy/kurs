// Facit-test för uttalsnormaliseraren. Varje par är (in, förväntad ut).
// Kör: node motor/test-normalize.mjs

import { normaliseraTal, talTillOrd } from './tts-normalize.mjs';

const TAL=[
  [0,'noll'],[1,'ett'],[11,'elva'],[21,'tjugoett'],[100,'etthundra'],[148,'etthundrafyrtioåtta'],
  [329,'trehundratjugonio'],[388,'trehundraåttioåtta'],[1000,'ettusen'],[2203,'tvåtusentvåhundratre'],
  [2410,'tvåtusenfyrahundratio'],[28251,'tjugoåttatusentvåhundrafemtioett']
];

const TEXT=[
  ['Försäljningen blev 2 410 miljoner, upp 9,4% mot i fjol (2 203 miljoner).',
   'Försäljningen blev tvåtusenfyrahundratio miljoner, upp nio komma fyra procent mot i fjol, tvåtusentvåhundratre miljoner.'],
  ['det kommer in 1,15 kronor för varje krona som delas ut',
   'det kommer in en krona och femton öre för varje krona som delas ut'],
  ['Utdelningen föreslås till 2,70 kronor per aktie.',
   'Utdelningen föreslås till två kronor och sjuttio öre per aktie.'],
  ['skulden motsvarar 1,4x mot taket 3x',
   'skulden motsvarar ett komma fyra gånger mot taket tre gånger'],
  ['rapporterat den 30 januari 2026',
   'rapporterat den trettionde januari tjugohundratjugosex'],
  ['växte 11,0% av egen kraft (organisk tillväxt), mer än prognosen 7 till 9%',
   'växte elva komma noll procent av egen kraft, organisk tillväxt, mer än prognosen sju till nio procent'],
  ['upp 1,2 procentenheter från 18,0%',
   'upp ett komma två procentenheter från arton komma noll procent'],
  ['kassaflödet steg 18% till 388 miljoner',
   'kassaflödet steg arton procent till trehundraåttioåtta miljoner']
];

let fel=0;
for(const [n,ord] of TAL){
  const fick=talTillOrd(n);
  if(fick!==ord){console.log(`FEL tal ${n}: fick "${fick}", väntade "${ord}"`);fel++;}
}
for(const [i,vantat] of TEXT){
  const fick=normaliseraTal(i);
  if(fick!==vantat){console.log(`FEL text:\n  in:      ${i}\n  fick:    ${fick}\n  väntade: ${vantat}`);fel++;}
}
console.log(fel===0?`PASS: alla ${TAL.length+TEXT.length} normaliseringar korrekta.`:`FAIL: ${fel} fel.`);
if(fel>0)process.exitCode=1;
