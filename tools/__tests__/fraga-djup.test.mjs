import test from 'node:test';
import assert from 'node:assert/strict';
import {utred,verktygsDefinitioner,byggKorVerktyg} from '../../functions/api/fraga.js';
const call=(id,name,input={})=>({type:'tool_use',id,name,input});
const svar=content=>new Response(JSON.stringify({content,stop_reason:'tool_use'}));
const brev={model:'test',max_tokens:100,system:'test',fraga:'Granska'};

test('tolv faktiska verktygsanrop ar tak aven i parallella djupvarv',async t=>{
  let rounds=0,executed=0;
  t.mock.method(globalThis,'fetch',async()=>svar(++rounds===1?
    Array.from({length:30},(_,i)=>call('x'+i,'las_mer')):[call('s','svara')]));
  const tackning={djup:true,verktyg:[]};
  await utred('k',brev,verktygsDefinitioner(true),async()=>{executed++;return 'ok';},tackning,()=>({ok:true}));
  assert.equal(executed,12);
  assert.equal(tackning.verktygsanrop,12);
});
test('planering tar anrop men inte ett hamtvarv och erbjuds endast i djuplage',async t=>{
  assert.ok(!verktygsDefinitioner().some(t=>t.name==='planera'));
  assert.ok(verktygsDefinitioner(true).some(t=>t.name==='planera'));
  let rounds=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    if(rounds===0) assert.deepEqual(JSON.parse(init.body).tool_choice,{type:'tool',name:'planera'});
    return svar([++rounds===1?call('p','planera'):call('s','svara')]);
  });
  const tackning={djup:true,verktyg:[]};
  await utred('k',brev,verktygsDefinitioner(true),async()=> 'ok',tackning,()=>({ok:true}));
  assert.equal(tackning.gravvarv,0);
});
test('utgangen tidsbudget gor inga nya modellanrop och galler aven fallback',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return svar([call('s','svara')]);});
  const tackning={djup:true,verktyg:[],deadline:Date.now()-1};
  assert.equal((await utred('k',brev,[],async()=>'',tackning,()=>({ok:true}))).fel,'budget');
  assert.equal(calls,0);
});
test('riktad lasning validerar period fore sokning',async()=>{
  const ctx={arkiv:[{id:'a',namn:'Alfa',dokument:[]}],env:{},utdrag:[],tackning:{bolag:[],lektioner:[]},question:'Alfa'};
  const kor=byggKorVerktyg(ctx);
  assert.match(await kor('las_mer',{bolag:'Alfa',sokord:'kassa',fran:'2025-02-29',till:'2025-12-31'}),/datum|period/i);
});

test('hela verktyget avbryts i tid aven om en datalasning aldrig svarar',async t=>{
  let step=0,signal;
  t.mock.method(globalThis,'fetch',async()=>svar([++step===1?call('x','las_mer'):call('s','svara')]));
  const tackning={verktyg:[],deadline:Date.now()+40030};
  const result=await utred('k',brev,verktygsDefinitioner(),async(n,i,s)=>{
    signal=s; return new Promise(()=>{});
  },tackning,()=>({ok:true}));
  assert.equal(result.data!==undefined,true);
  assert.equal(signal.aborted,true);
  assert.equal(tackning.tidsbegransat,true);
});
