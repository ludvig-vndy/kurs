import {readFileSync,writeFileSync} from 'node:fs';
import {usageCost} from './lib/pilot-cost.mjs';
const paths=process.argv.slice(2);if(!paths.length)throw Error('Provide comparison.json paths');
let out='# Faktiska kundpilotsvar\n\nUtvecklingsprov genom testchattens HTTP-flöde. Texterna nedan är faktiska levererade svar, inte godkända analyser. Se separat resultatrapport för sakfel och bedömningar. Priser är uppskattningar med 10 SEK/USD.\n';
for(const path of paths){const data=JSON.parse(readFileSync(path,'utf8'));out+='\n## Körning '+path+'\n\nArkivhash: '+data.fixtureHash+'\n';
 for(const row of data.rows){const d=row.result?.data||{};let cost=d.tackning?.research?.estimatedSearchUSD||0,unknown=false;
  for(const a of d.tackning?.anropstider||[]){const value=usageCost(a.modell,{usage:{input_tokens:a.inputTokens,output_tokens:a.outputTokens,cache_read_input_tokens:a.cacheLast,cache_creation_input_tokens:a.cacheSkrivet}});if(value===null)unknown=true;else cost+=value;}
  out+='\n### '+row.caseId+', '+row.mode+', försök '+row.repeat+'\n\n'+(row.ms/1000).toFixed(1)+' sekunder. '+(unknown?'Ofullständig kostnadsuppgift':(cost*10).toFixed(2)+' kr')+'.\n\n'+(d.answer||d.error||JSON.stringify(row.result))+'\n';
  const urls=[...new Set((d.kallor||[]).map(k=>k.url).filter(Boolean))];if(urls.length)out+='\nKällänkar i svaret:\n\n'+urls.map(url=>'- '+url).join('\n')+'\n';
 }
}
writeFileSync('docs/fraga-kundpilot-svar-2026-09-14.md',out);console.log('Wrote actual-answer appendix');
