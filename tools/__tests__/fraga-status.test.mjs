import test from 'node:test';
import { sys } from './_fraga-fixtur.mjs';
import assert from 'node:assert/strict';
import {onRequestPost,utred,verktygsDefinitioner} from '../../functions/api/fraga.js';
import {skapaStatus,medStatus,registreraStatus} from '../../functions/api/_fraga-status.js';

test('status kommer före slutgranskning och råsvaret strömmas aldrig',async t=>{
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    const b=JSON.parse(init.body);
    if(sys(b).startsWith('Du granskar ett svar')) {
      await held;
      return new Response(JSON.stringify({content:[{type:'text',text:'{"godkand":false,"skal":"Saknar stöd."}'}],stop_reason:'end_turn'}));
    }
    return new Response(JSON.stringify({content:[{type:'tool_use',id:'s',name:'svara',input:{version:1,block:[{typ:'metod',text:'Hemlig råtext som inte får publiceras.'}]}}],stop_reason:'tool_use'}));
  });
  const pending=onRequestPost({request:new Request('https://x/api/fraga',{method:'POST',headers:{Accept:'application/x-ndjson'},body:JSON.stringify({question:'Vad är ROIC?'})}),env:{ANTHROPIC_API_KEY:'k'}});
  // Ingen gissad timer: svaret får inte invänta granskaren.
  const response=await Promise.race([pending,new Promise((_,reject)=>{const h=setTimeout(()=>{release();reject(Error('strömmen väntade på slutgranskning'));},1000);h.unref();})]);
  try {
    assert.match(response.headers.get('content-type'),/ndjson/);
    const reader=response.body.getReader(),decoder=new TextDecoder();let text='';
    while(!text.includes('kontrollerar')) text+=decoder.decode((await reader.read()).value);
    assert.ok(!text.includes('Hemlig råtext'));
    assert.ok(!text.includes('"type":"result"'));
    release();
    for(;;){const r=await reader.read();if(r.done)break;text+=decoder.decode(r.value);}
    const events=text.trim().split('\n').map(JSON.parse);
    const end=events.at(-1);
    assert.equal(end.type,'result');assert.equal(end.data.blockerat,true);
    assert.ok(!text.includes('Hemlig råtext'));
    assert.ok(end.data.tackning.tider.moment.kontrollerar>=0);
    assert.ok(end.data.tackning.tider.totalMs>=0);
  }finally{release();}
});

test('momenttider summeras vid upprepade steg utan dubbelräkning',()=>{
  let time=0;const events=[];
  const s=skapaStatus(e=>events.push(e),undefined,()=>time);
  s.byt('skriver');time=10;s.byt('laser');time=25;s.byt('skriver');time=30;
  s.byt('okänd');assert.deepEqual(s.slut(),{totalMs:30,moment:{skriver:15,laser:15}});
  assert.deepEqual(events.map(x=>x.stage),['skriver','laser','skriver']);
});

test('strömfel är begripliga och innehåller aldrig interna felmeddelanden',async()=>{
  const r=medStatus({request:new Request('https://x',{headers:{Accept:'application/x-ndjson'}})},async()=>{throw Error('hemlighet');});
  const text=await r.text();assert.ok(!text.includes('hemlighet'));
  const final=JSON.parse(text.trim().split('\n').at(-1));assert.equal(final.status,500);
  assert.ok(final.data.error);
});

test('avbruten ström avbryter pågående modellanrop utan fallbackanrop',async t=>{
  let started,aborted=false,calls=0;
  const begun=new Promise(r=>{started=r;});
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    calls++;started();
    return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));},{once:true}));
  });
  let task;
  const r=await onRequestPost({request:new Request('https://x/api/fraga',{method:'POST',headers:{Accept:'application/x-ndjson'},body:JSON.stringify({question:'Vad är ROIC?'})}),env:{ANTHROPIC_API_KEY:'k'},waitUntil:p=>{task=p;}});
  await begun;await r.body.cancel();await task;
  assert.equal(aborted,true);assert.equal(calls,1);
});

test('avbrott stoppar också pågående läsverktyg',async t=>{
  const abort=new AbortController(),tackning={verktyg:[]};let toolSignal;
  registreraStatus(tackning,skapaStatus(()=>{},abort.signal));
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({content:[{type:'tool_use',id:'l',name:'las_lektion',input:{id:'7.2'}}],stop_reason:'tool_use'})));
  const result=await utred('k',{model:'test',max_tokens:100,system:'test',fraga:'test'},verktygsDefinitioner(),async(n,i,s)=>{
    toolSignal=s;abort.abort();return new Promise(()=>{});
  },tackning,()=>({ok:true}));
  assert.equal(toolSignal.aborted,true);assert.equal(result.fel,'avbruten');
});
