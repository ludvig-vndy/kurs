import test from 'node:test';
import assert from 'node:assert/strict';
import { lasTrad, skrivTrad, skapaTur, samtalsText, routingUrTrad, periodUrPoster } from '../../functions/api/_trad.js';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';
const nu = Date.UTC(2026, 8, 9), secret = 'test-only-secret';
const leaf = (id, typ = 'rapporterat') => ({ id, typ, varde: 2, enhet: 'MSEK', kallor: [{url:'https://example.test/a', citat:'2 MSEK'}] });
const graph = [leaf('a', 'egen_uppgift'), { id:'b',typ:'beraknat',indata:['a'],vilar_pa:{poster:['a'],ursprung:'egen_uppgift',ursprung_per_post:{a:'egen_uppgift'}} }, {id:'c',typ:'beraknat',indata:['b'],vilar_pa:{poster:['a'],ursprung:'egen_uppgift',ursprung_per_post:{a:'egen_uppgift'}}}];
const tur = (poster = graph) => skapaTur('Och kassan?', [{typ:'post',id:poster.at(-1).id},{typ:'tolkning',text:'Kassan är begränsad.',stod:[poster.at(-1).id]}], {get:id=>poster.find(p=>p.id===id)}, {},nu);

test('signed memory binds uid, signature and 24 hour validity', async () => {
  const token = await skrivTrad([tur()], 'u', secret, nu);
  assert.equal((await lasTrad(token,'u',secret,nu))[0].poster.length,3);
  for (const [t,u,s,n] of [[token,'x',secret,nu],[token,'u','wrong',nu],[token,'u',secret,nu+86400000],[token+'x','u',secret,nu],[token,'u',secret,nu-1]]) assert.deepEqual(await lasTrad(t,u,s,n),[]);
  assert.equal(await skrivTrad([tur()], '',secret,nu),'');
  assert.deepEqual(await lasTrad('x'.repeat(20000),'u',secret,nu),[]);
});
test('turn captures complete chained dependencies and import remaps provenance atomically', () => {
  const t=tur(); assert.deepEqual(new Set(t.poster.map(p=>p.id)),new Set(['a','b','c']));
  const r=skapaFaktaregister(), ids=r.importeraTidigare(t.poster);
  assert.equal(ids.size,3); assert.notEqual(ids.get('a'),'a');
  assert.equal(r.get(ids.get('a')).typ,'egen_uppgift');
  assert.deepEqual(r.get(ids.get('c')).indata,[ids.get('b')]);
  assert.deepEqual(r.get(ids.get('c')).vilar_pa.ursprung_per_post,{[ids.get('a')]:'egen_uppgift'});
  assert.equal(r.get(ids.get('a')).tidigare,true);
  assert.deepEqual(r.get(ids.get('a')).kallor,graph[0].kallor);
  assert.equal(r.importeraTidigare(graph.slice(1)).size,0);
  assert.equal(r.poster().length,3);
  assert.equal(r.importeraTidigare([{...graph[0],text:'x'.repeat(45000)}]).size,0);
  assert.equal(r.poster().length,3);
});
test('budget keeps at most six turns, three post turns, ten posts and 12kB token', async () => {
  const ts=Array.from({length:8},(_,i)=>tur([leaf('p'+i)]));
  const token=await skrivTrad(ts,'u',secret,nu), read=await lasTrad(token,'u',secret,nu);
  assert.ok(token.length<=12000); assert.equal(read.length,6);
  assert.equal(read.filter(t=>t.poster.length).length,3);
  for(const t of read) for(const b of t.block) for(const id of b.stod|| (b.id?[b.id]:[])) assert.ok(t.poster.some(p=>p.id===id));
  const huge=tur([leaf('x')]); huge.poster[0].text='å'.repeat(20000);
  const trimmed=await lasTrad(await skrivTrad([huge],'u',secret,nu),'u',secret,nu);
  assert.equal(trimmed[0].poster.length,0); assert.equal(trimmed[0].block.length,0); assert.equal(trimmed[0].begransat,true);
});
test('incomplete graph cannot carry interpretation without its support', () => {
  assert.deepEqual(tur(graph.slice(1)).block,[]);
});
test('routing prioritizes explicit companies and years, handles previous year without ambiguous fallback', () => {
  const a={id:'a',name:'Alfa AB'},b={id:'b',name:'Beta AB'}, holdings=[a,b];
  const ts=[{routing:{bolag:[a],period:{fran:'2025-01-01',till:'2025-12-31',kalla:'artal'}}}];
  assert.deepEqual(routingUrTrad('och kassan då?',holdings,ts).bolag,[a]);
  assert.deepEqual(routingUrTrad('och Beta 2024?',holdings,ts).bolag,[b]);
  assert.equal(routingUrTrad('och Beta 2024?',holdings,ts).period.fran,'2024-01-01');
  assert.equal(routingUrTrad('och året innan?',holdings,ts).period.fran,'2024-01-01');
  assert.equal(routingUrTrad('och kassan?',holdings,[{routing:{bolag:[a,b]}}]).bolag,null);
  assert.equal(routingUrTrad('och Tesla då?',holdings,ts).bolag,null);
  assert.equal(routingUrTrad('hur går det för tesla?',holdings,ts).bolag,null);
  assert.equal(routingUrTrad('och kassan hos Tesla?',holdings,ts).bolag,null);
  assert.equal(routingUrTrad('och kassan i tesla?',holdings,ts).bolag,null);
  assert.equal(routingUrTrad('och kassan, Tesla?',holdings,ts).bolag,null);
  assert.equal(routingUrTrad('och Beta då?',holdings,ts).period,null);
  assert.equal(routingUrTrad('och kassan i senaste rapporten?',holdings,ts).period,null);
  assert.equal(routingUrTrad('och kassan 2035?',holdings,ts).period,null);
});
test('graph budget never admits partial eleven-post chain, cycles rejected',async()=>{
  const posts=Array.from({length:11},(_,i)=>({...leaf('p'+i),...(i?{typ:'beraknat',indata:['p'+(i-1)]}:{})}));
  const read=await lasTrad(await skrivTrad([tur(posts)],'u',secret,nu),'u',secret,nu);
  assert.equal(read[0].poster.length,0); assert.equal(read[0].block.length,0);
  const r=skapaFaktaregister();
  assert.equal(r.importeraTidigare([{...leaf('a'),indata:['b']},{...leaf('b'),indata:['a']}]).size,0);
  assert.equal(r.poster().length,0);
});
test('routing never treats unknown lowercase company as the preceding company',()=>{
  const a={id:'a',name:'Alfa AB'};
  const ts=[{routing:{bolag:[a],period:{fran:'2025-01-01',till:'2025-12-31',kalla:'artal'}}}];
  for(const q of ['och kassan, tesla?','och kassan tesla?','Hur förändrades marginalen i tesla?']) {
    assert.deepEqual(routingUrTrad(q,[a],ts),{bolag:null,period:null},q);
  }
});
test('natural followups resolve time comparison and current holding identity',()=>{
  const old={id:'a',name:'Alfa AB',quantity:1},current={id:'a',name:'Alfa AB',quantity:3};
  const ts=[{routing:{bolag:[old],period:{fran:'2025-01-01',till:'2025-12-31',kalla:'artal'}}}];
  assert.deepEqual(routingUrTrad('och kassan jämfört med året innan?',[current],ts),{
    bolag:[current],period:{fran:'2024-01-01',till:'2024-12-31',kalla:'samtal'}});
  for(const q of ['Hur förändrades marginalen?','Varför minskade den?','Kan du förklara det?','Hur ser skuldsättningen ut då?','Vad blir den summan per månad?','Hur blir det per månad?']) {
    assert.deepEqual(routingUrTrad(q,[current],ts).bolag,[current],q);
  }
  assert.deepEqual(routingUrTrad('och kassan då?',[],ts),{bolag:null,period:null});
});
test('history prompt labels interpretation as data, never evidence', () => {
  const text=samtalsText([tur()]);
  assert.match(text,/DATA/); assert.match(text,/inte belägg/); assert.match(text,/Kassan är begränsad/);
  assert.ok(text.length<12000);
});
test('period from answer posts requires one complete unambiguous reporting interval',()=>{
  const p={...leaf('a'),ar:2025,kvartal:4,langd:1};
  assert.deepEqual(periodUrPoster([p]),{fran:'2025-10-01',till:'2025-12-31',kalla:'poster'});
  assert.deepEqual(periodUrPoster([{...p,langd:4}]),{fran:'2025-01-01',till:'2025-12-31',kalla:'poster'});
  assert.deepEqual(periodUrPoster([p,{...p,id:'b',typ:'beraknat'}]),periodUrPoster([p]));
  assert.equal(periodUrPoster([p,{...p,id:'b',kvartal:3}]),null);
  assert.equal(periodUrPoster([p,{...p,id:'b',langd:4}]),null);
  assert.equal(periodUrPoster([p,leaf('b')]),null);
  assert.equal(periodUrPoster([{...p,kvartal:5}]),null);
  assert.equal(periodUrPoster([{id:'d',typ:'dokument',text:'Q4 2025'}]),null);
});
