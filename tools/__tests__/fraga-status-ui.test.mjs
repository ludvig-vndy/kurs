import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('strömmande vänteläge visar status, bara slutligt svar och tydligt avbrott',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.setContent('<form><input type="text"><button type="submit">Fråga</button></form><input id="deep" type="checkbox"><button id="reset">Om</button><div id="chat"></div>');
    await page.addScriptTag({content:await readFile(new URL('../../public/fraga-svar.js',import.meta.url),'utf8')});
    await page.addScriptTag({content:await readFile(new URL('../../public/fraga-trad.js',import.meta.url),'utf8')});
    await page.evaluate(()=>{
      const encoder=new TextEncoder();
      window.fetch=async(url,init)=>{
        window.headersSeen=init.headers;
        return new Response(new ReadableStream({start(c){
          window.emit=text=>c.enqueue(encoder.encode(text));window.end=()=>c.close();
          init.signal.addEventListener('abort',()=>c.error(new DOMException('Abort','AbortError')),{once:true});
        }}),{headers:{'Content-Type':'application/x-ndjson'}});
      };
      window.chat=FragaTrad.mount({container:document.querySelector('#chat'),form:document.querySelector('form'),deep:document.querySelector('#deep'),reset:document.querySelector('#reset')});
      window.ask=()=>{window.result=chat.ask('En fråga');};
    });
    await page.evaluate(()=>ask());
    await page.locator('.thinking').waitFor();
    await page.evaluate(()=>{emit('{"type":"status","stage":"kontrol');emit('lerar","elapsedMs":23}\n');});
    await page.getByText('Kontrollerar svaret mot underlaget…',{exact:true}).first().waitFor();
    assert.equal(await page.locator('article').count(),1);
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    await page.evaluate(()=>{emit(JSON.stringify({type:'result',status:200,data:{answer:'Godkänt slutligt svar'}})+'\n');end();return result;});
    await page.getByText('Godkänt slutligt svar',{exact:true}).waitFor();
    assert.equal(await page.locator('.thinking').count(),0);
    await page.evaluate(()=>ask());await page.locator('.fraga-avbryt').waitFor();
    await page.locator('.fraga-avbryt').click();
    await page.getByText('Frågan avbröts.',{exact:true}).first().waitFor();
    assert.equal(await page.locator('button[type=submit]').isDisabled(),false);
    await page.evaluate(()=>ask());await page.locator('.thinking').waitFor();
    await page.evaluate(()=>{end();return result;});
    await page.getByText('Anslutningen bröts innan svaret blev klart. Försök igen.',{exact:true}).waitFor();
    // Svar mottaget, men kontrollen av aktuell session väntar fortfarande.
    await page.evaluate(()=>ask());await page.locator('.thinking').waitFor();
    await page.evaluate(()=>{
      window.AB={ready:true,getSession:()=>new Promise(resolve=>{window.releaseSession=resolve;})};
      emit(JSON.stringify({type:'result',status:200,data:{answer:'Får inte visas efter avbrott'}})+'\n');end();
    });
    await page.waitForFunction(()=>!!window.releaseSession);
    await page.locator('.fraga-avbryt').click();
    await page.evaluate(()=>{releaseSession(null);return result;});
    assert.equal(await page.getByText('Får inte visas efter avbrott',{exact:true}).count(),0);
    assert.equal(await page.locator('button[type=submit]').isDisabled(),false);
  }finally{await browser.close();}
});
