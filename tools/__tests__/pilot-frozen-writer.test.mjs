import test from 'node:test';
import assert from 'node:assert/strict';
import {frozenCases, writerInput, registerFor} from '../lib/pilot-frozen-writer.mjs';
import {lasFaktasvar} from '../../functions/api/_faktasvar.js';

const post={id:'p1',typ:'dokument',text:'Prototype planned in 2026. Qualification remains unfinished.',kallor:[{url:'https://example.com/project',typ:'text'}]};
const review={fraga:'How far?',researchUnderlag:[post]};
const call={request:{system:'Du granskar ett svar',messages:[{role:'user',content:JSON.stringify(review)}]}};
test('freezes first complete evidence packet per question, never the earlier answer',()=>{
 const input={calls:[call,{request:{...call.request,messages:[{role:'user',content:JSON.stringify({...review,svar:'SECRET OLD ANSWER'})}]}}]};
 const cases=frozenCases([input]);assert.equal(cases.length,1);assert.deepEqual(cases[0].posts,[post]);assert(!writerInput(cases[0]).includes('SECRET'));
 assert.equal(frozenCases([input])[0].hash,cases[0].hash);
});
test('keeps qualifications and numbers verbatim, including evidence not cited by original answer',()=>{
 const c=frozenCases([{calls:[call]}])[0];assert(writerInput(c).includes(post.text));assert.equal(registerFor(c).get('p1').text,post.text);
 assert.equal(lasFaktasvar({version:1,block:[{typ:'tolkning',text:'Bolaget har 777 MSEK i kassan.',stod:['p1']}]},registerFor(c)).ok,false);
 assert.equal(lasFaktasvar({version:1,block:[{typ:'post',id:'invented'}]},registerFor(c)).ok,false);
});
test('rejects ambiguous or missing evidence rather than silently overwriting IDs',()=>{
 const bad={...review,researchUnderlag:[post,{...post,text:'Conflicting'}]};
 assert.throws(()=>frozenCases([{calls:[{request:{...call.request,messages:[{role:'user',content:JSON.stringify(bad)}]}}]}]),/duplicate/i);
 assert.throws(()=>frozenCases([{calls:[]}]),/evidence/i);
});
