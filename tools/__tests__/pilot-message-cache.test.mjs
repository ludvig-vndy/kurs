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
