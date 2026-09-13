import test from 'node:test';
import assert from 'node:assert/strict';
import {textUrHtml} from '../../motor/bygg-motparter.mjs';
import {byggMotparter} from '../../motor/bygg-motparter.mjs';
import {skapaFaktaregister} from '../../functions/api/_faktaregister.js';
import {lasFaktasvar} from '../../functions/api/_faktasvar.js';
test('keeps inline product names, signs and entities readable',()=>{
 assert.equal(textUrHtml('<p>Un<strong>ibap</strong> iX<span>5</span>-105: &#x2212;85 MSEK &amp; 3&nbsp;000 enheter.</p>'),'Unibap iX5-105: −85 MSEK & 3 000 enheter.');
});
test('separates blocks and table cells without joining financial values',()=>{
 assert.equal(textUrHtml('<p>Alfa</p><p>Beta</p><table><tr><td>10</td><td>20</td></tr></table>'),'Alfa Beta 10 20');
});
test('removes comments, scripts and unfinished script tails',()=>{
 assert.equal(textUrHtml('<p>Belagd text.</p><!-- hidden 999 --><script>injected 777'),'Belagd text.');
});
test('decodes once without interpreting encoded tags as markup',()=>{
 assert.equal(textUrHtml('<p>&lt;plan&gt; &amp;lt; &#39; &#x2019;</p>'),"<plan> &lt; ' ’");
});
test('does not invent values from invalid codepoints or unknown entities',()=>{
 assert.equal(textUrHtml('<p>&#x110000; &#xD800; &unknown; 1 000 1.5 -85</p>'),'� � &unknown; 1 000 1.5 -85');
});
test('handles greater-than signs in attributes and separates superscripts',()=>{
 assert.equal(textUrHtml('<p>Un<span title="a > b">ibap</span> 10<sup>3</sup></p>'),'Unibap 10 3');
});
test('does not concatenate numeric fields through markup or removed script content',()=>{
 assert.equal(textUrHtml('<span>85</span><span>90</span>'),'85 90');
 assert.equal(textUrHtml('<p>85<script>hidden</script>90</p>'),'85 90');
 for(const [left,right] of [['85','.90'],['85',',90'],['85.','90'],['85,','90'],['85','e3'],['85e+','3']]){
  assert.equal(textUrHtml(`<p><span>${left}</span><span>${right}</span> MSEK</p>`),`${left} ${right} MSEK`);
 }
 for(const tokens of [['85','.','90'],['85',',','90'],['85','e','3'],['85','e','+','3']]){
  const result=textUrHtml(tokens.map(t=>`<span>${t}</span>`).join(''));
  assert.notEqual(result,tokens.join(''));assert.match(result,/ /);
 }
});
test('decoded source survives ingestion, registry and server rendering with its attribution',async()=>{
 const text=textUrHtml('<p>Leverant<strong>oren</strong>: &#x2212;85 MSEK. Produkt iX<span>5</span>-105.</p>');
 const book=await byggMotparter([{bolag:'Kundbolaget',motpart:'Leverantoren',urler:['https://example.test/report']}],async()=>({text}));
 const register=skapaFaktaregister();register.synka({question:'Leverantoren',motparter:book.motparter});
 const post=register.poster().find(p=>p.typ==='motpart');assert.ok(post);
 const rendered=lasFaktasvar({version:1,block:[{typ:'post',id:post.id}]},register);
 assert.equal(rendered.ok,true);assert.equal(post.text,text);
 assert.ok(rendered.block[0].text.endsWith(`”${text}”`));
 assert.equal(rendered.block[0].typ,'motpart');assert.equal(rendered.block[0].kallor[0].url,'https://example.test/report');
});
