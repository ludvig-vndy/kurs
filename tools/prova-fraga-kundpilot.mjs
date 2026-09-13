// Paid end-to-end development comparison through the local HTTP testchat.
// No seeded external URLs. Run explicitly; missing credentials fail closed.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {usageCost,settleCost} from './lib/pilot-cost.mjs';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const cases=[
 {id:'unibap-bifrost',question:'Vad talar för att Unibap kan följa med Space Inventor till fler försvarsprojekt? Undersök vad projektpartner och myndigheter faktiskt säger om Bifrost och efterföljande projekt. Vad är belagt och vilken länk är fortfarande öppen?',critical:'Bifrost contribution must not imply confirmed Unibap role or order in subsequent missions.'},
 {id:'sivers-poet',question:'Hur långt har Sivers och POET kommit från utveckling mot kommersiella leveranser? Sök hos båda parter efter senare besked och förklara vad som stärker eller försvagar möjligheten till fler affärer.',critical:'General Sivers qualification plan must not become a POET-specific plan; prototype is not series order.'},
 {id:'aac-maritime',question:'Har AAC Clyde Spaces satsning på satellitbaserad sjöfartskommunikation kommit närmare en kommersiell tjänst? Följ ett konkret spår hos projektpartner eller kunder och förklara vad som fortfarande behöver bekräftas.',critical:'Demonstration is not operational service or confirmed recurring revenue.'},
 {id:'unibap-unproven',question:'Hur stor order har Unibap fått till BEACONSAT? Kontrollera först om en sådan order verkligen är offentliggjord och förklara vad källorna faktiskt visar om kopplingen.',critical:'Do not presume an order. Missing searched evidence does not prove no order exists.'},
];
const selected=arg('--case',null),jobs=selected===null?cases:cases.filter(c=>c.id===selected);
const repeats=Number(arg('--repeats',2)),limit=Number(arg('--budget-usd',2));
if(!jobs.length||!Number.isInteger(repeats)||repeats<1||repeats>2||!Number.isFinite(limit)||limit<=0||limit>2)throw Error('Invalid bounded test settings');
if(!process.argv.includes('--run')){console.log(JSON.stringify({dry:true,cases:jobs,repeats,budgetUSD:limit,criteria:['relevant external original independently found and read','key facts retained','conditional analytical value','no critical unsupported inference','complete time and cost including errors'],scope:'Development comparison, not held-out evaluation or ChatGPT benchmark'}));process.exit(0);}
const envFile=arg('--env','C:/dev/kurs/.env');let keys={};try{keys=parseEnv(readFileSync(envFile,'utf8'));}catch{}
for(const name of ['CHAT_API','ANTHROPIC_API_KEY'])if(!keys[name]&&!process.env[name])throw Error(name+' missing; no live comparison started');
const folder='motor/out/researchpilot/customer-comparison-'+Date.now();mkdirSync(folder,{recursive:true});
let fixture=arg('--fixture',null);
if(process.argv.includes('--from-kv')){
 const kv=key=>{const raw=execFileSync(process.platform==='win32'?'npx.cmd':'npx',['--yes','wrangler@4','kv','key','get','--namespace-id=97d78256ff664c54a724878034c8f0fd',key,'--remote'],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});const first=[raw.indexOf('{'),raw.indexOf('[')].filter(i=>i>=0).sort((a,b)=>a-b)[0];if(first===undefined)throw Error('KV response not JSON');return JSON.parse(raw.slice(first));};
 const index=kv('arkiv:index').filter(p=>/Unibap|Sivers|AAC Clyde/i.test(p.namn));
 if(!index.length)throw Error('No public companies matched production archive');
 const bucket={'arkiv:index':index};for(const p of index)bucket['arkiv:'+p.id]=kv('arkiv:'+p.id);
 bucket['arkiv:motpart']=kv('arkiv:motpart');
 fixture=folder+'/archive.json';writeFileSync(fixture,JSON.stringify(bucket));
}
if(!fixture)throw Error('A public archive snapshot is required for the comparison');
const fixtureHash=createHash('sha256').update(readFileSync(fixture)).digest('hex');
const calls=[],rows=[];let charged=0,stopped=false;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input);if(!url.startsWith('https://api.anthropic.com/')&&!url.startsWith('https://api.openai.com/'))return nativeFetch(input,init);
 const body=JSON.parse(init.body),openai=url.startsWith('https://api.openai.com/');
 const price=openai?{i:.2,o:1.2}:body.model==='claude-sonnet-5'?{i:2,o:10}:body.model==='claude-haiku-4-5-20251001'?{i:1,o:5}:null;
 if(!price)throw Error('Unknown model pricing');
 const reserve=openai?.25:(Buffer.byteLength(init.body)+16384)*price.i*1.25/1e6+(body.max_tokens||4096)*price.o/1e6;
 if(stopped||charged+reserve>limit){stopped=true;return Response.json({error:{type:'local_budget',message:'Local comparison budget exhausted'}},{status:429});}
 const row={model:body.model,request:body,started:new Date().toISOString()};const start=Date.now();let actual=null;
 try{
  const response=await nativeFetch(input,init),data=await response.clone().json();row.http=response.status;row.response=data;
  actual=usageCost(body.model,data);
  return response;
 }finally{row.ms=Date.now()-start;row.estimatedUSD=actual;row.reservedUSD=reserve;const settled=settleCost(charged,reserve,actual);charged=settled.charged;stopped ||= settled.stop;calls.push(row);}
};
const {createCustomerPilot}=await import('./fraga-kundpilot-server.mjs');
const server=await createCustomerPilot({envFile,fixture,outDir:folder,port:0});const origin='http://127.0.0.1:'+server.address().port;
const save=()=>writeFileSync(folder+'/comparison.json',JSON.stringify({created:new Date().toISOString(),fixtureHash,cases:jobs,repeats,budgetUSD:limit,chargedUSD:charged,stopped,accountingSEKperUSD:10,priceBasis:'Repository test prices; estimate, not invoice',rows,calls},null,2));
try{
 outer:for(let repeat=1;repeat<=repeats;repeat++)for(const c of jobs)for(const mode of repeat%2?['baseline','pilot']:['pilot','baseline']){
  if(stopped)break outer;const start=Date.now();
  const r=await nativeFetch(origin+'/api/fraga',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({question:c.question,mode}),signal:AbortSignal.timeout(180000)});
  const messages=(await r.text()).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)),result=messages.findLast(m=>m.type==='result');
  const row={caseId:c.id,repeat,mode,http:r.status,ms:Date.now()-start,result,messages};rows.push(row);save();
  console.log(JSON.stringify({case:c.id,repeat,mode,ms:row.ms,blocked:result?.data?.blockerat,error:result?.data?.error,chargedUSD:charged}));
 }
}finally{save();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({folder,rows:rows.length,chargedUSD:charged,stopped}));}
