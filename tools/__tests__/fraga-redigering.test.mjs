import test from 'node:test';
import { sys } from './_fraga-fixtur.mjs';
import assert from 'node:assert/strict';
import {kortningsbehov, valjRedigering, redigeraSvar} from '../../functions/api/_redigering.js';
import {skapaFaktaregister} from '../../functions/api/_faktaregister.js';
import {lasFaktasvar, SVAR_KONTRAKT} from '../../functions/api/_faktasvar.js';
const raw=text=>({version:1,block:[{typ:'metod',text}]});
const long=raw(Array(24).fill('Granska resultatet och kontrollera vad underlaget faktiskt visar.').join(' '));

test('kortning väljs för lång prosa eller upprepning, inte för faktaposternas storlek',()=>{
  const r=skapaFaktaregister();
  assert.equal(kortningsbehov(lasFaktasvar(long,r),false),true);
  assert.equal(kortningsbehov(lasFaktasvar(raw('Jämför samma perioder.'),r),false),false);
  assert.equal(kortningsbehov({prosa:[],block:[{typ:'dokument',text:'ord '.repeat(2000)}]},false),false);
});
test('kortare giltig prosa kan väljas men egna tal och längre text avslås',()=>{
  const r=skapaFaktaregister();
  assert.ok(valjRedigering(long,raw('Kontrollera vad underlaget visar.'),r));
  assert.equal(valjRedigering(long,raw('Kassan är 12 MSEK.'),r),null);
  assert.equal(valjRedigering(raw('Kort text.'),long,r),null);
});

test('avvisad kortning anger fast orsakskod utan svarstext',async()=>{
  const r=skapaFaktaregister(),t={djup:false,modellanrop:0,deadline:Date.now()+90000};
  await redigeraSvar(long,r,t,'fråga',async()=>({data:raw('Kassan är 12 MSEK.'),stopp:'tool_use'}));
  assert.equal(t.redigering.orsak,'fri_uppgift');
  assert.ok(!JSON.stringify(t.redigering).includes('Kassan'));
});

test('kortningen får samma prosakontrakt som den valideras mot',async()=>{
  const r=skapaFaktaregister(),t={djup:false,modellanrop:0,deadline:Date.now()+90000};
  let skickat;
  await redigeraSvar(long,r,t,'fråga',async kropp=>{
    skickat=kropp;
    return {data:raw('Kontrollera underlaget.'),stopp:'tool_use'};
  });
  assert.ok(sys(skickat).includes(SVAR_KONTRAKT),'editorn saknar svarsgeneratorns kontrakt');
  assert.equal(t.redigering.status,'kortat');
});

test('kortning ser redan lästa lektioner som hänvisas till i metodtext',async()=>{
  const r=skapaFaktaregister();
  r.synka({lektioner:[{id:'5.1',titel:'Marginaler',text:'Kursens metod.'},{id:'7.2',titel:'Kapitalallokering',text:'En annan metod.'}]});
  const original=raw(long.block[0].text+' Se lektion 5.1.');
  assert.ok(lasFaktasvar(original,r).ok);
  let data;
  const result=await redigeraSvar(original,r,{modellanrop:0,deadline:Date.now()+90000},'fråga',async kropp=>{
    data=JSON.parse(kropp.messages[0].content);
    return {data:raw('Kontrollera underlaget. Se lektion 5.1.'),stopp:'tool_use'};
  });
  assert.deepEqual(data.poster.filter(p=>p.typ==='kurs').map(p=>p.lektion),['5.1']);
  assert.ok(result.andrat);
});
test('kortning får inte tappa källreferenser, faktaposter eller alla reservationer',()=>{
  const r=skapaFaktaregister();
  r.synka({question:'Ett antagande om bolaget.',lektioner:[],holdings:[],teser:[],arkiv:[],utdrag:[]});
  const id=r.poster()[0].id;
  const a={version:1,block:[{typ:'post',id},{typ:'tolkning',text:'Detta är ett möjligt samband som ännu inte har belagts i underlaget.',stod:[id]},
    {typ:'saknas',text:'Kostnadsuppgifter saknas och behöver undersökas.'}]};
  const b=structuredClone(a); b.block[1].text='Sambandet är osäkert.';b.block[2].text='Kostnadsuppgifter saknas.';
  assert.ok(valjRedigering(a,b,r));
  for(const blocks of [b.block.slice(1),b.block.slice(0,2),[b.block[0],{typ:'metod',text:'Sambandet är osäkert.'},b.block[2]]])
    assert.equal(valjRedigering(a,{version:1,block:blocks},r),null);
});
test('editor körs högst en gång och avstår när granskarens budget behövs',async()=>{
  const r=skapaFaktaregister();let calls=0;
  const call=async()=>{calls++;return {data:raw('Kontrollera underlaget.'),stopp:'tool_use'};};
  const t={djup:false,modellanrop:0,deadline:Date.now()+90000};
  const result=await redigeraSvar(long,r,t,'frågan',call);
  assert.ok(result.andrat);assert.equal(calls,1);
  await redigeraSvar(long,r,{...t,modellanrop:9},'frågan',call);
  await redigeraSvar(long,r,{...t,deadline:Date.now()+10000},'frågan',call);
  assert.equal(calls,1);
});
test('fel, avklippt eller ogiltig redigering behåller originalet för slutgranskning',async()=>{
  const r=skapaFaktaregister();
  for(const response of [{fel:'timeout'},{data:raw('Kort.'),stopp:'max_tokens'},{data:raw('Kassan är 12 MSEK.'),stopp:'tool_use'}]){
    const t={djup:false,modellanrop:0,deadline:Date.now()+90000};
    const result=await redigeraSvar(long,r,t,'frågan',async()=>response);
    assert.equal(result.andrat,false);assert.deepEqual(result.raw,long);
  }
});
