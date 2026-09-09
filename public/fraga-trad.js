/* Signering är inte kryptering. Spara aldrig tråden under en gemensam kontonyckel.
   Innehållet är serverns; klienten återger det men tolkar aldrig trådsträngen. */
(function (root) {
  'use strict';
  const prefix = 'agarbrevet-fraga-trad:';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusText={forbereder:'Förbereder frågan…',underlag:'Söker i ditt underlag…',
    planerar:'Planerar undersökningen…',laser:'Läser mer underlag…',beraknar:'Beräknar och jämför uppgifter…',
    skriver:'Arbetar med svaret…',kortar:'Gör svaret mer koncentrerat…',kontrollerar:'Kontrollerar svaret mot underlaget…'};
  async function readResponse(response,onStatus){
    if(!response.headers.get('content-type')?.includes('application/x-ndjson')) return response.json();
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result;
    try {
      for(;;){
        const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});
        if(buffer.length>2000000)throw Error('Svaret blev för stort.');
        let i;
        while((i=buffer.indexOf('\n'))>=0){
          const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;
          const event=JSON.parse(line);
          if(event.type==='status' && statusText[event.stage])onStatus(statusText[event.stage]);
          if(event.type==='result'){
            if(result)throw Error('Felaktigt svarsformat.');
            result=event.data;
            if(event.status>=400)throw Error(result?.error || 'Kunde inte slutföra frågan.');
          }
        }
        if(done)break;
      }
      if(buffer.trim() || !result)throw Error('Anslutningen bröts innan svaret blev klart. Försök igen.');
      return result;
    } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  function mount({ container, form, deep, reset, onPending, onRender }) {
    let uid, trad = '', turns = [], generation = 0, authRevision = 0, busy = false;
    let abortCurrent=null;
    const live=document.createElement('span');live.className='fraga-status-live';live.setAttribute('role','status');form.after(live);
    container.setAttribute('aria-live', 'polite');
    function draw() {
      container.innerHTML = turns.map(t => '<article class="qa"><div class="q"><span class="who">Du</span> <span class="qt">' + esc(t.question) + '</span></div><div class="a">' + root.FragaSvar.render(t.response) + '</div></article>').join('');
      if (!uid && turns.length) container.insertAdjacentHTML('beforeend', '<p class="foot"><a href="/labs/inbjudan.html">Logga in för att fråga om ditt innehav →</a></p>');
      if (onRender) onRender(turns.length);
    }
    function setBusy(value) {
      busy = value;
      container.setAttribute('aria-busy', String(value));
      form.querySelector('[type="submit"]').disabled = value;
    }
    function read() {
      trad = ''; turns = [];
      if (!uid) return;
      try {
        const value = JSON.parse(root.localStorage.getItem(prefix + uid) || 'null');
        if (value && typeof value.trad === 'string' && Date.now() - value.saved < 86400000 && Array.isArray(value.turns)) {
          trad = value.trad;
          turns = value.turns.filter(t => typeof t.question === 'string' && t.response && typeof t.response === 'object').slice(-6);
        }
      } catch (_) { /* Lagring kan vara avstängd eller innehålla gammalt format. */ }
    }
    function save() {
      if (!uid) return;
      try {
        // Begränsa även den lokala svarsvyn; serverns minnesbudget gäller separat.
        let value = JSON.stringify({ trad, turns, saved: Date.now() });
        while (value.length > 250000 && turns.length) {
          turns.shift(); value = JSON.stringify({ trad, turns, saved: Date.now() });
        }
        root.localStorage.setItem(prefix + uid, value);
      } catch (_) { /* Samtalet fortsätter i minnet när lagring inte går. */ }
    }
    function identity(session) {
      const next = session?.user?.id || null;
      if (next === uid) return;
      if (uid !== undefined) generation++;
      abortCurrent?.abort();
      uid = next; setBusy(false); read(); draw();
      deep.checked = false;
      form.querySelector('input[type="text"]').value = '';
    }
    async function session() {
      try { return root.AB?.ready ? await root.AB.getSession() : null; }
      catch (_) { return null; }
    }
    const ready = new Promise(resolve => {
      async function boot() {
        if (root.AB?.ready && root.AB.onAuthChange) root.AB.onAuthChange((_event, ses) => {
          authRevision++;
          identity(ses);
        });
        const before = generation;
        const authBefore = authRevision;
        const ses = await session();
        // Även första auth-händelsen ersätter ett äldre sessionsuppslag.
        if (generation === before && authRevision === authBefore) identity(ses);
        resolve();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
      else boot();
    });
    reset.addEventListener('click', () => {
      abortCurrent?.abort();
      generation++; trad = ''; turns = []; setBusy(false); deep.checked = false;
      form.querySelector('input[type="text"]').value = '';
      try { if (uid) root.localStorage.removeItem(prefix + uid); } catch (_) {}
      draw();
    });
    root.addEventListener('storage', event => {
      if (uid && (event.key === prefix + uid || event.key === null)) {
        abortCurrent?.abort();
        generation++; setBusy(false); read(); draw();
      }
    });
    return {
      async ask(question) {
        question = String(question || '').trim();
        if (!question || busy) return false;
        const initial = generation;
        await ready;
        if (initial !== generation) return false;
        const before = generation;
        const ses = await session();
        if (generation !== before) return false;
        identity(ses);
        if (busy) return false;
        const current = generation;
        const controller=new AbortController();abortCurrent=controller;
        setBusy(true);
        const pending = document.createElement('article'); pending.className = 'qa';
        pending.innerHTML = '<div class="q">' + esc(question) + '</div><div class="a"><p class="thinking">Förbereder frågan…</p><div class="fraga-vantar"><span class="fraga-vantetid" aria-hidden="true">0 s</span><button type="button" class="fraga-avbryt">Avbryt</button></div></div>';
        container.appendChild(pending);
        live.textContent='Förbereder frågan…';
        pending.querySelector('.fraga-avbryt').addEventListener('click',()=>controller.abort());
        const start=Date.now();
        const timer=setInterval(()=>{if(pending.isConnected)pending.querySelector('.fraga-vantetid').textContent=Math.floor((Date.now()-start)/1000)+' s';},1000);
        if (onPending) onPending(pending);
        const active = () => generation === current;
        try {
          const response = await fetch('/api/fraga', { method: 'POST', signal:controller.signal, headers: { 'Content-Type': 'application/json',Accept:'application/x-ndjson' },
            body: JSON.stringify({ question, token: ses?.access_token || null, trad: uid ? trad : '', djup: deep.checked }) });
          const data = await readResponse(response,text=>{if(active()){
            pending.querySelector('.thinking').textContent=text;live.textContent=text;
          }});
          if (!active()) return false;
          const latest = await session();
          if (!active()) return false;
          if(controller.signal.aborted)throw new DOMException('Avbruten','AbortError');
          identity(latest);
          if (!active()) return false;
          if (!response.ok || data.error) throw new Error(data.error || 'Kunde inte hämta svaret. Försök igen.');
          // Ett stoppat eller misslyckat svar får aldrig ersätta giltigt minne.
          if (!data.blockerat && uid && typeof data.trad === 'string') trad = data.trad;
          turns.push({ question, response: data }); turns = turns.slice(-6);
          save(); draw();
        } catch (error) {
          if (active()) pending.querySelector('.a').innerHTML = '<p>' + esc(controller.signal.aborted?'Frågan avbröts.':error.message || 'Kunde inte nå tjänsten just nu.') + '</p>';
        } finally {
          clearInterval(timer);
          if(abortCurrent===controller)abortCurrent=null;
          if (active()) {setBusy(false);live.textContent=controller.signal.aborted?'Frågan avbröts.':'Frågan är färdigbehandlad.';}
        }
        return true;
      }
    };
  }
  root.FragaTrad = { mount,readResponse };
})(globalThis);
