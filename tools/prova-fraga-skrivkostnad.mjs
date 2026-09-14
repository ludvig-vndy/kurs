// Disposable architecture/model comparison. No production imports are modified.
// Inputs are registered external posts from earlier paid runs, not new research.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {frozenCases,validateCase,registerFor,writerInput,WRITER_INSTRUCTIONS} from './lib/pilot-frozen-writer.mjs';
import {SVARSVERKTYG,GRANSKA_SYSTEM,lasFaktasvar,godkandGranskning} from '../functions/api/_faktasvar.js';
import {usageCost,settleCost} from './lib/pilot-cost.mjs';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const model=arg('--model','gpt-5.6-luna'),limit=Number(arg('--budget-usd','0.5'));
const strict=process.argv.includes('--strict');
if(!['gpt-5.6-luna','claude-sonnet-5'].includes(model)||!Number.isFinite(limit)||limit<=0||limit>1)throw Error('Invalid bounded experiment settings');
const inputs=arg('--inputs','').split(',').filter(Boolean);
const cases=process.env.FROZEN_PAYLOAD?JSON.parse(gunzipSync(Buffer.from(process.env.FROZEN_PAYLOAD,'base64'),{maxOutputLength:1024*1024})).map(validateCase):frozenCases(inputs.map(p=>JSON.parse(readFileSync(p,'utf8'))));
if(cases.length>4)throw Error('Too many cases');
if(arg('--prepare',null)){writeFileSync(arg('--prepare'),JSON.stringify(cases));console.log(JSON.stringify(cases.map(c=>({question:c.question,posts:c.posts.length,chars:writerInput(c).length,hash:c.hash}))));process.exit(0);}
if(!process.argv.includes('--run')){console.log(JSON.stringify({dry:true,model,cases:cases.map(c=>({question:c.question,hash:c.hash})),budgetUSD:limit,repeats:2}));process.exit(0);}
let env={};try{env=parseEnv(readFileSync(arg('--env','C:/dev/kurs/.env'),'utf8'));}catch{}
const openai=model.startsWith('gpt-'),key=process.env[openai?'CHAT_API':'ANTHROPIC_API_KEY']||env[openai?'CHAT_API':'ANTHROPIC_API_KEY'];if(!key)throw Error('Required API key missing');
const folder='motor/out/researchpilot/writer-cost-'+Date.now();mkdirSync(folder,{recursive:true});
const rows=[],calls=[];let chargedUSD=0,stopped=false;
const save=()=>writeFileSync(folder+'/result.json',JSON.stringify({model,strict,cases,budgetUSD:limit,chargedUSD,stopped,rows,calls,scope:'Frozen writing plus review only; excludes search, planning, reading, full archive and conversation'},null,2));
async function request(system,input,stage){
 const max=stage==='write'?2500:800;
 const body=openai?{model,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:max,instructions:system,input,
  ...(stage==='write'?{tools:[{type:'function',name:'svara',description:SVARSVERKTYG.description,parameters:SVARSVERKTYG.input_schema,strict}],tool_choice:{type:'function',name:'svara'},parallel_tool_calls:false}:{})}
 :{model,max_tokens:max,system,messages:[{role:'user',content:input}],...(stage==='write'?{tools:[{...SVARSVERKTYG,...(strict?{strict:true}:{})}],tool_choice:{type:'tool',name:'svara'}}:{})};
 // Conservative per-call reservation: every request byte as an input token.
 const reservation=(Buffer.byteLength(JSON.stringify(body))*(openai?.2:2)+max*(openai?1.2:10))/1e6;
 if(stopped||chargedUSD+reservation>limit){stopped=true;throw Error('Local experiment budget exhausted');}
 const row={stage,model,request:body};const start=Date.now();let actual=null;
 try{
  const response=await fetch(openai?'https://api.openai.com/v1/responses':'https://api.anthropic.com/v1/messages',{method:'POST',headers:openai?{Authorization:'Bearer '+key,'Content-Type':'application/json'}:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
  const data=await response.json();row.http=response.status;row.response=data;actual=usageCost(model,data);
  if(!response.ok)throw Error('Provider HTTP '+response.status);
  if(openai&&data.status!=='completed'||!openai&&data.stop_reason==='max_tokens')throw Error('Incomplete provider response');
  if(stage==='write'){
   if(openai){const f=data.output?.filter(o=>o.type==='function_call');if(f?.length!==1||f[0].name!=='svara')throw Error('Missing final answer tool');return JSON.parse(f[0].arguments);}
   const f=data.content?.filter(o=>o.type==='tool_use');if(f?.length!==1||f[0].name!=='svara')throw Error('Missing final answer tool');return f[0].input;
  }
  return openai?(data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''):(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
 }finally{row.ms=Date.now()-start;row.estimatedUSD=actual;row.reservedUSD=reservation;const s=settleCost(chargedUSD,reservation,actual);chargedUSD=s.charged;stopped ||= s.stop;calls.push(row);save();}
}
try{for(let repeat=1;repeat<=2;repeat++)for(const c of repeat===1?cases:[...cases].reverse()){
 if(stopped)break;const row={question:c.question,hash:c.hash,repeat};rows.push(row);const start=Date.now(),before=chargedUSD;
 try{
  row.raw=await request(WRITER_INSTRUCTIONS,writerInput(c),'write');row.validation=lasFaktasvar(row.raw,registerFor(c));
  if(row.validation.ok){
   row.review=await request(GRANSKA_SYSTEM,JSON.stringify({fraga:c.question,svar:row.validation.block,tillgangligt:c.posts}),'review');
   row.accepted=godkandGranskning(row.review);
  }else row.accepted=false;
 }catch(e){row.error=e.message;row.accepted=false;}
 row.ms=Date.now()-start;row.estimatedUSD=chargedUSD-before;save();console.log(JSON.stringify({repeat,question:c.question,ms:row.ms,estimatedUSD:row.estimatedUSD,accepted:row.accepted,validation:row.validation?.orsak,error:row.error}));
}}finally{save();console.log(JSON.stringify({folder,chargedUSD,stopped}));}
