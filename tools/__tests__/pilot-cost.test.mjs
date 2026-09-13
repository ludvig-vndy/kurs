import test from 'node:test';
import assert from 'node:assert/strict';
import {usageCost,settleCost} from '../lib/pilot-cost.mjs';
test('invalid and unknown usage never lowers spending or permits another call',()=>{
 for(const usage of [undefined,{input_tokens:-1,output_tokens:1},{input_tokens:1,output_tokens:-1},{input_tokens:1,output_tokens:1,input_tokens_details:{cached_tokens:2}},{input_tokens:1,output_tokens:1,input_tokens_details:{cache_write_tokens:2}}]){
  const actual=usageCost('gpt-5.6-luna',{usage});assert.equal(actual,null);
  assert.deepEqual(settleCost(.5,.25,actual),{charged:.75,stop:true});
 }
});
test('valid cached costs and unknown timeout reservation are counted',()=>{
 const value=usageCost('gpt-5.6-luna',{usage:{input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:500,cache_write_tokens:100}},output:[{type:'web_search_call'}]});
 assert.ok(Math.abs(value-.010235)<1e-9);
 assert.deepEqual(settleCost(.5,.25,null),{charged:.75,stop:true});
 assert.deepEqual(settleCost(.5,.25,.3),{charged:.8,stop:true});
});
