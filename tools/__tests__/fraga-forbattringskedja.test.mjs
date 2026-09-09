import test from 'node:test';
import assert from 'node:assert/strict';
import {valjLektioner,onRequestPost,utred,verktygsDefinitioner} from '../../functions/api/fraga.js';
import {valjRedigering} from '../../functions/api/_redigering.js';
import {skapaFaktaregister} from '../../functions/api/_faktaregister.js';
import {lasFaktasvar} from '../../functions/api/_faktasvar.js';
const ids=q=>valjLektioner(q).map(x=>x.id);

test('steg 6: relationsrättning får utföra beräkningen den uppmanas att göra',async t=>{
  let n=0,executed=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    const b=JSON.parse(init.body);n++;
    if(n===2) assert.deepEqual(b.tools.map(x=>x.name),['berakna','svara']);
    if(n===3) assert.deepEqual(b.tools.map(x=>x.name),['svara']);
    return new Response(JSON.stringify({content:[{type:'tool_use',id:'t'+n,name:n===2?'berakna':'svara',input:{}}],stop_reason:'tool_use'}));
  });
  const tackning={verktyg:[]};
  const r=await utred('k',{system:'test',fraga:'test',model:'test',max_tokens:100},verktygsDefinitioner(),async()=>{executed++;return 'Verifierad post';},tackning,
    ()=>n===1?{ok:false,orsak:'relation',klagan:'Använd berakna.'}:{ok:true});
  assert.equal(r.fel,undefined);
  assert.equal(executed,1);
  assert.equal(n,3);
  assert.equal(tackning.reparation,1);
});

test('steg 6: parallella rättningsanrop får bara utföra en beräkning',async t=>{
  let n=0,executed=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    n++;
    if(n===3) {
      const results=JSON.parse(init.body).messages.at(-1).content;
      assert.equal(results.length,2);
      assert.equal(results.filter(x=>x.is_error).length,1);
    }
    const calls=n===2 ? ['berakna','berakna'] : ['svara'];
    return new Response(JSON.stringify({content:calls.map((name,i)=>({type:'tool_use',id:`t${n}-${i}`,name,input:{}})),stop_reason:'tool_use'}));
  });
  const r=await utred('k',{system:'test',fraga:'test',model:'test',max_tokens:100},verktygsDefinitioner(),async()=>{executed++;return 'ok';},{verktyg:[]},
    ()=>n===1?{ok:false,orsak:'relation',klagan:'Beräkna.'}:{ok:true});
  assert.equal(r.fel,undefined);
  assert.equal(executed,1);
});

test('steg 6: övriga rättningar öppnar inga nya läs- eller beräkningsverktyg',async t=>{
  let n=0,offered;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    if(++n===2) offered=JSON.parse(init.body).tools.map(x=>x.name);
    return new Response(JSON.stringify({content:[{type:'tool_use',id:'s'+n,name:'svara',input:{}}],stop_reason:'tool_use'}));
  });
  await utred('k',{system:'test',fraga:'test',model:'test',max_tokens:100},verktygsDefinitioner(),async()=>assert.fail('ska inte köras'),{verktyg:[]},
    ()=>n===1?{ok:false,orsak:'fri_uppgift',klagan:'Rätta text.'}:{ok:true});
  assert.deepEqual(offered,['svara']);
});

test('steg 5: samma relationsord granskas även med osynliga eller kompatibla tecken',()=>{
  const r=skapaFaktaregister();
  const wide='accelererar'.replace(/[a-z]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0));
  for(const text of ['Omsättningen för\u200bdubblades.',`Tillväxten ${wide}.`]) {
    const d=lasFaktasvar({version:1,block:[{typ:'metod',text}]},r);
    assert.equal(d.orsak,'relation',text);
  }
  assert.ok(lasFaktasvar({version:1,block:[{typ:'metod',text:'Jämför motsvarande perioder.'}]},r).ok);
});

test('steg 1: uttryckligen vald lektion hittas utan ämnesord',()=>{
  assert.equal(ids('Förklara lektion 5.3')[0],'5.3');
  assert.equal(ids('Vad betyder avsnitt 7.2?')[0],'7.2');
  assert.deepEqual(ids('Förklara lektion 99.9'),[]);
  assert.deepEqual(ids('Förklara lektion 5.3.1'),[]);
  assert.deepEqual(ids('Vad hände den 5.3?'),[]);
});

test('steg 4: kortning bevarar posternas identitet oberoende av JSON-nyckelordning',()=>{
  const r=skapaFaktaregister();
  r.synka({question:'Min fråga',lektioner:[],holdings:[],teser:[],arkiv:[],utdrag:[]});
  const id=r.poster()[0].id;
  const a={version:1,block:[{typ:'post',id},{typ:'metod',text:'Kontrollera noggrant vad underlaget faktiskt visar innan en slutsats dras.'}]};
  const b={version:1,block:[{id,typ:'post'},{typ:'metod',text:'Kontrollera underlaget.'}]};
  assert.ok(valjRedigering(a,b,r));
  assert.equal(valjRedigering(a,{...b,block:b.block.slice(1)},r),null);
});

test('steg 3: metodfråga utan arkiv kan läsa en vald fördjupning',async t=>{
  let n=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    const body=JSON.parse(init.body);
    if(body.system.startsWith('Du granskar ett svar'))
      return new Response(JSON.stringify({content:[{type:'text',text:'{"godkand":true}'}],stop_reason:'end_turn'}));
    n++;
    if(n===1) {
      assert.ok(body.tools.some(x=>x.name==='las_lektion'));
      assert.ok(!body.tools.some(x=>x.name==='hamta_historik'));
      return new Response(JSON.stringify({content:[{type:'tool_use',id:'l',name:'las_lektion',input:{id:'7.2'}}],stop_reason:'tool_use'}));
    }
    const results=body.messages.at(-1).content;
    assert.ok(results.some(x=>String(x.content).includes('Kapitalallokering')));
    return new Response(JSON.stringify({content:[{type:'tool_use',id:'s',name:'svara',input:{version:1,block:[{typ:'metod',text:'Jämför avkastningen på nya investeringar med kapitalkostnaden.'}]}}],stop_reason:'tool_use'}));
  });
  const response=await onRequestPost({request:new Request('https://x/api/fraga',{method:'POST',body:JSON.stringify({question:'Hur hänger ROIC och återinvestering ihop?'})}),env:{ANTHROPIC_API_KEY:'k'}});
  const data=await response.json();
  assert.equal(data.blockerat,undefined);
  assert.ok(data.tackning.lektioner.includes('7.2'));
  assert.equal(n,2);
});
