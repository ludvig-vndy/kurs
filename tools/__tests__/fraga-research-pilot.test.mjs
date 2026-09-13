import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../../functions/api/fraga.js';
import {godkann,sys} from './_fraga-fixtur.mjs';
test('trusted pilot tool reaches actual answer pipeline; client flag alone does not',async()=>{
 const original=globalThis.fetch;let toolsSeen=[],used=0,reviewed=0;
 const invoke=async pilot=>{
  let turn=0;
  globalThis.fetch=async(url,init)=>{
   const body=JSON.parse(init.body);toolsSeen.push(...(body.tools||[]).map(t=>t.name));
   if(sys(body).startsWith('Du granskar ett svar')){reviewed++;return Response.json(godkann());}
   const content=pilot&&turn++===0
    ?[{type:'tool_use',id:'read1',name:'las_kalla',input:{id:'s1',offset:0}}]
    :[{type:'tool_use',id:'answer1',name:'svara',input:{version:1,block:[{typ:'metod',text:'En demonstrationsleverans bevisar inte kommande beställningar.'}]}}];
   return Response.json({content,stop_reason:'tool_use'});
  };
  return (await onRequestPost({request:new Request('https://x.test/api/fraga',{method:'POST',body:JSON.stringify({question:'Hur bedömer man ett projekt?',researchPilot:true})}),env:{ANTHROPIC_API_KEY:'test'},
   ...(pilot?{researchPilot:()=>({instructions:'PILOT',tools:[{name:'las_kalla',description:'read',input_schema:{type:'object',properties:{}}}],run:async()=>{used++;return 'Original läst';},status:()=>({read:used})})}:{})})).json();
 };
 try {
  const baseline=await invoke(false);assert.ok(!baseline.blockerat);assert.ok(!toolsSeen.includes('las_kalla'));
  toolsSeen=[];const result=await invoke(true);assert.ok(!result.blockerat);assert.ok(toolsSeen.includes('las_kalla'));assert.equal(used,1);assert.ok(reviewed>=2);assert.equal(result.tackning.research.read,1);
 }finally{globalThis.fetch=original;}
});
