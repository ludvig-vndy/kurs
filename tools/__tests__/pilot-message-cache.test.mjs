import test from 'node:test';
import assert from 'node:assert/strict';
import {utred} from '../../functions/api/fraga.js';

test('message caching changes only cache metadata, preserving full tool history and answer',async()=>{
 const original=globalThis.fetch;
 async function run(cacheMessages){
  const requests=[];let turn=0;
  globalThis.fetch=async(url,init)=>{
   requests.push(JSON.parse(init.body));
   return Response.json({stop_reason:'tool_use',content:turn++===0
    ?[{type:'tool_use',id:'read1',name:'read',input:{}}]
    :[{type:'tool_use',id:'answer1',name:'svara',input:{version:1,block:[{typ:'metod',text:'En plan är inte ett utfall.'}]}}]});
  };
  const answer=await utred('test',{model:'claude-sonnet-5',max_tokens:4096,system:'Identiska regler och fullständigt register',fraga:'Hur går projektet?',cacheMessages},
   [{name:'read',description:'read',input_schema:{type:'object',properties:{}}}],async()=> 'Fullständigt underlag: prototyp planerad; verifiering återstår.',{djup:true,verktyg:[]},()=>({ok:true}));
  return {requests,answer};
 }
 try{
  const plain=await run(false),cached=await run(true);
  assert.equal(cached.requests.length,2);
  for(const r of cached.requests){assert.deepEqual(r.cache_control,{type:'ephemeral'});delete r.cache_control;}
  assert.deepEqual(cached.requests,plain.requests);
  assert.deepEqual(cached.answer.data,plain.answer.data);
  assert.match(JSON.stringify(cached.requests[1].messages),/verifiering återstår/);
 }finally{globalThis.fetch=original;}
});

test('terminal repair does not pay to cache a changed prefix that will not be reused',async()=>{
 const original=globalThis.fetch,requests=[];let attempt=0;
 globalThis.fetch=async(url,init)=>{requests.push(JSON.parse(init.body));return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',id:'answer'+requests.length,name:'svara',input:{version:1,block:[{typ:'metod',text:'En plan är inte ett utfall.'}]}}]});};
 try{
  await utred('test',{model:'claude-sonnet-5',max_tokens:4096,system:'Alla regler',fraga:'Fråga',cacheMessages:true},
   [{name:'read',description:'read',input_schema:{type:'object',properties:{}}}],async()=>'',{djup:true,verktyg:[]},()=>attempt++?{ok:true}:{ok:false,orsak:'format',klagan:'Rätta formen'});
  assert.equal(requests.length,2);
  assert.deepEqual(requests[0].cache_control,{type:'ephemeral'});
  assert.equal(requests[1].cache_control,undefined);
  assert.match(JSON.stringify(requests[1].messages),/Rätta formen/);
  assert.match(JSON.stringify(requests[1].system),/RÄTTNINGSVARV/);
 }finally{globalThis.fetch=original;}
});
