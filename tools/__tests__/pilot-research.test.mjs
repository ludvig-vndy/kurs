import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotResearch} from '../lib/pilot-research.mjs';
import {skapaFaktaregister} from '../../functions/api/_faktaregister.js';

const searched={status:'completed',usage:{input_tokens:100,output_tokens:20},output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:[{url:'https://partner.example/project',title:'Project'}]}},{type:'message',content:[{type:'output_text',text:'UNVERIFIED SEARCH CLAIM'}]}]};
test('search candidates are not evidence; only fetched text enters existing register',async()=>{
 const register=skapaFaktaregister();let reads=0;
 const pilot=createPilotResearch({key:'test',register,search:async()=>searched,read:async url=>{reads++;return {url,finalUrl:url,text:'Original source says development continues.',sha256:'abc',readAt:'2026-09-14',links:[]};}});
 const result=JSON.parse(await pilot.run('sok_kallor',{fraga:'partner project'}));
 assert.equal(register.poster().length,0);
 assert.equal(result.kandidater.length,1);
 await pilot.run('las_kalla',{id:result.kandidater[0].id,offset:0});
 assert.equal(reads,1);assert.equal(register.poster()[0].typ,'dokument');
 assert.doesNotMatch(JSON.stringify(register.poster()),/egen kommunikation/);
 assert.match(register.poster()[0].text,/Original source/);
 assert.doesNotMatch(JSON.stringify(register.poster()),/UNVERIFIED/);
 await pilot.run('las_kalla',{id:result.kandidater[0].id,offset:0});assert.equal(reads,1);
});
test('unknown URLs and search cap cannot be bypassed through tool inputs',async()=>{
 let calls=0;const p=createPilotResearch({key:'test',register:skapaFaktaregister(),search:async()=>{calls++;return searched;},read:async()=>assert.fail('must not read')});
 await p.run('las_kalla',{id:'https://partner.example/project'});
 for(let i=0;i<5;i++)await p.run('sok_kallor',{fraga:'question'});
 assert.equal(calls,3);
});
test('failed fetch remains a coverage gap, never a source post',async()=>{
 const register=skapaFaktaregister();const p=createPilotResearch({key:'test',register,search:async()=>searched,read:async()=>{throw Error('HTTP 404');}});
 await p.run('sok_kallor',{fraga:'question'});await p.run('las_kalla',{id:'s1',offset:0});
 assert.equal(register.poster().length,0);assert.equal(p.status().failed.length,1);
});
test('read text beyond first window remains accessible without refetch and numbers stay exact',async()=>{
 const register=skapaFaktaregister();let calls=0;
 const text='A complete statement. '.repeat(130)+'The next project has 85.90 units according to source.';
 const p=createPilotResearch({key:'test',register,search:async()=>searched,read:async url=>{calls++;return {url,finalUrl:url,text,sha256:'abc',links:[]};}});
 await p.run('sok_kallor',{fraga:'question'});const first=JSON.parse(await p.run('las_kalla',{id:'s1',offset:0}));
 const next=JSON.parse(await p.run('las_kalla',{id:'s1',offset:first.nextOffset}));
 assert.equal(calls,1);assert.match(next.poster,/85\.90/);
 assert.equal(next.remaining,0);
});
test('source windows cannot start inside a number or sever negation at former cut points',async()=>{
 for(const n of [898,2698]){
  const register=skapaFaktaregister();const text='x'.repeat(n)+'85.90 units were not ordered.';
  const p=createPilotResearch({key:'test',register,search:async()=>searched,read:async url=>({url,finalUrl:url,text,sha256:'abc',links:[]})});
  await p.run('sok_kallor',{fraga:'question'});await p.run('las_kalla',{id:'s1',offset:0});
  assert.equal(register.poster().length,1);assert.equal(register.poster()[0].text,text);
  const count=register.poster().length;
  assert.ok(JSON.parse(await p.run('las_kalla',{id:'s1',offset:n+3})).error);
  assert.equal(register.poster().length,count);
 }
});
test('all provider web records are charged and stop further search at reached budget',async()=>{
 const response=structuredClone(searched);response.output.unshift(structuredClone(response.output[0]));let calls=0;
 const p=createPilotResearch({key:'test',register:skapaFaktaregister(),search:async()=>{calls++;return response;}});
 assert.equal(JSON.parse(await p.run('sok_kallor',{fraga:'question'})).kandidater.length,1);
 await p.run('sok_kallor',{fraga:'followup'});await p.run('sok_kallor',{fraga:'stop'});
 assert.equal(calls,2);assert.equal(p.status().webActions,4);assert.ok(p.status().estimatedSearchUSD>.04);
});
