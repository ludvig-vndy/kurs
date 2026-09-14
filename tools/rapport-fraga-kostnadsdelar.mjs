// Reconstruct paid pilot costs from recorded provider usage, not character guesses.
import {readFileSync,writeFileSync} from 'node:fs';
const paths=process.argv.slice(2);if(!paths.length)throw Error('Provide comparison.json files');
const groups={};let totalUSD=0,inputUSD=0,outputUSD=0,questions=0;
for(const path of paths){
 const d=JSON.parse(readFileSync(path,'utf8'));let index=0;
 for(const r of d.rows){
  const t=r.result.data.tackning;
  const count=(t.anropstider||[]).length+(t.research?.calls||[]).filter(c=>c.type==='search').length;
  const calls=d.calls.slice(index,index+count);index+=count;
  if(r.mode!=='pilot')continue;questions++;
  for(const c of calls){
   if(typeof c.estimatedUSD!=='number'||c.estimatedUSD<0)throw Error('Unknown cost');
   const system=JSON.stringify(c.request.system||'');
   const stage=c.model==='gpt-5.6-luna'?'search':system.includes('Du granskar')?'review':system.includes('Du redigerar')?'edit':c.response.content?.some(b=>b.type==='tool_use'&&b.name==='svara')?'answer_or_repair':'investigation';
   const g=groups[stage]??={usd:0,calls:0,ms:0};g.usd+=c.estimatedUSD;g.calls++;g.ms+=c.ms;totalUSD+=c.estimatedUSD;
   if(stage!=='search'){
    if(c.model!=='claude-sonnet-5'||!Number.isSafeInteger(c.response?.usage?.output_tokens))throw Error('Unsupported model accounting');
    const output=c.response.usage.output_tokens*10/1e6;outputUSD+=output;inputUSD+=c.estimatedUSD-output;
   }
  }
 }
 if(index!==d.calls.length)throw Error('Call count mismatch; do not attribute costs');
}
for(const g of Object.values(groups))g.share=g.usd/totalUSD;
const result={questions,totalUSD,groups,inputUSD,outputUSD,scope:'Seven recorded full-pilot attempts; input includes cache read/write. Stage inferred from actual API tool response. All failed attempts included.'};
writeFileSync('motor/out/researchpilot/pilot-cost-breakdown.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
