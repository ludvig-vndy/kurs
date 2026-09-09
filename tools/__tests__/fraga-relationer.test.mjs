import test from 'node:test';
import assert from 'node:assert/strict';
import {berakna} from '../../functions/api/_berakning.js';
import {skapaFaktaregister} from '../../functions/api/_faktaregister.js';
import {lasFaktasvar} from '../../functions/api/_faktasvar.js';

const serie = values => values.map((v,i)=>({id:'p'+i,typ:'rapporterat',bolagId:'exempel',bolag:'Exempelbolag',
  matt:'intäkter',slag:'flode',ar:2025,kvartal:i+1,langd:1,period:'Q'+(i+1)+' 2025',
  varde:v,enhet:'MSEK',normaliserat:{varde:v,enhet:'MSEK'},kallor:[]}));

test('10/20/30/40 fördubblas bara i första jämförelsen och accelererar inte',()=>{
  const r=berakna('utveckling',serie([10,20,30,40]));
  assert.equal(r.ok,true,r.skal);
  assert.deepEqual(r.post.jamforelser.map(p=>p.fordubbling),[true,false,false]);
  assert.equal(r.post.acceleration,false);
  assert.match(r.post.utsaga,/Q1 2025 till Q2 2025/);
  assert.match(r.post.utsaga,/inte.*varje/);
  assert.deepEqual(r.post.indata,['p0','p1','p2','p3']);
});
test('omfattning, riktning och exakta värden avgör relationerna',()=>{
  const dubbelt=berakna('utveckling',serie([10,20,40,80])).post;
  assert.ok(dubbelt.jamforelser.every(p=>p.fordubbling));
  assert.equal(dubbelt.acceleration,false,'konstant procentuell tillväxt accelererar inte');
  assert.ok(berakna('utveckling',serie([80,40,20])).post.jamforelser.every(p=>p.halvering));
  assert.equal(berakna('utveckling',serie([10,20,60])).post.acceleration,true);
  assert.equal(berakna('utveckling',serie([10,19.999])).post.jamforelser[0].fordubbling,false);
  assert.equal(berakna('utveckling',serie([10,20])).post.acceleration,null);
});
test('fel bolag, mått, enhet, periodluckor och icke-positiva baser avslås',()=>{
  const [a,b]=serie([10,20]);
  for(const change of [{bolagId:'annan'},{matt:'kassa'},{normaliserat:{varde:20,enhet:'SEK'}},
    {kvartal:3},{kvartal:1},{langd:2},{normaliserat:{varde:0,enhet:'MSEK'}},
    {normaliserat:{varde:-10,enhet:'MSEK'}},{normaliserat:{varde:Infinity,enhet:'MSEK'}}])
    assert.equal(berakna('utveckling',[a,{...b,...change}]).ok,false,JSON.stringify(change));
});
test('kända kvantifierade relationspåståenden får inte smygas in i prosa',()=>{
  const r=skapaFaktaregister();
  for(const text of ['Omsättningen fördubblades varje kvartal.','Omsättningen har inte fördubblats.',
    'Tillväxten accelererar.','Kassan halverades.','Intäkterna blev dubbelt så stora.']){
    const d=lasFaktasvar({version:1,block:[{typ:'metod',text}]},r);
    assert.equal(d.ok,false,text);
    assert.equal(d.orsak,'relation');
  }
  assert.equal(lasFaktasvar({version:1,block:[{typ:'metod',text:'Jämför förändringen mellan motsvarande perioder.'}]},r).ok,true);
});
