import {secureJson} from './_lib.js';

const namn=new Set(['forbereder','underlag','planerar','laser','beraknar','skriver','kortar','kontrollerar']);
const trackers=new WeakMap();
export function registreraStatus(tackning,status){if(status)trackers.set(tackning,status);}
export function sattMoment(tackning,moment){trackers.get(tackning)?.byt(moment);}
export function statusSignal(tackning){return trackers.get(tackning)?.signal;}

export function skapaStatus(emit=()=>{},signal,now=Date.now){
  const start=now(),moment={};let current=null,since=start;
  function avsluta(){const t=now();if(current)moment[current]=(moment[current]||0)+Math.max(0,t-since);since=t;}
  return {signal,
    byt(next){
      if(signal?.aborted) throw new DOMException('Avbruten','AbortError');
      if(!namn.has(next)||next===current)return;
      avsluta();current=next;emit({type:'status',stage:next,elapsedMs:Math.max(0,now()-start)});
    },
    slut(){avsluta();current=null;return {totalMs:Math.max(0,now()-start),moment:{...moment}};},
  };
}

// Endast fasta statuskoder före det färdigkontrollerade JSON-svaret.
// Äldre klienter och provskript behåller samma HTTP/JSON-kontrakt.
/* Vad en fraga faktiskt kostade, per moment.

   Tidigare sparades bara output_tokens, och input ar cirka 89 procent av
   notan. Utan input- och cachefalten gick det varken att se vad en riktig
   kundfraga kostar eller om prompt-cachen traffar. Sammanfattningen foljer
   med varje svar, aven ett blockerat, sa fordelningen gar att folja i drift. */
export function tokensammanfattning(anrop) {
  if (!Array.isArray(anrop) || !anrop.length) return undefined;
  const ut = {};
  for (const a of anrop) {
    const m = ut[a.moment] ||= { anrop: 0, in: 0, ut: 0, cacheLast: 0, cacheSkrivet: 0 };
    m.anrop++;
    m.in += a.inputTokens || 0;
    m.ut += a.outputTokens || 0;
    m.cacheLast += a.cacheLast || 0;
    m.cacheSkrivet += a.cacheSkrivet || 0;
  }
  return ut;
}

export function medStatus(context,work){
  const streaming=context.request.headers.get('Accept')?.includes('application/x-ndjson');
  const abort=new AbortController();
  const cancel=()=>abort.abort();
  context.request.signal?.addEventListener('abort',cancel,{once:true});
  if(context.request.signal?.aborted)cancel();
  async function run(emit){
    const status=skapaStatus(emit,abort.signal);
    try {
      status.byt('forbereder');
      const response=await work({...context,fragaStatus:status});
      const data=await response.json();
      const tider=status.slut();
      if(data.tackning){data.tackning.tider=tider;data.tackning.tokens=tokensammanfattning(data.tackning.anropstider);}
      return {status:response.status,data};
    }finally{context.request.signal?.removeEventListener('abort',cancel);}
  }
  if(!streaming)return run(()=>{}).then(r=>secureJson(r.data,r.status));
  const encoder=new TextEncoder();let closed=false;
  const stream=new ReadableStream({
    start(controller){
      const emit=event=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
      const task=(async()=>{
        try {const result=await run(emit);if(!abort.signal.aborted)emit({type:'result',...result});}
        catch {if(!closed)emit({type:'result',status:500,data:{error:'Kunde inte slutföra frågan. Försök igen.'}});}
        finally{if(!closed){closed=true;controller.close();}}
      })();
      context.waitUntil?.(task);
    },
    cancel(){closed=true;cancel();},
  });
  const headers=new Headers(secureJson({}).headers);
  headers.set('Content-Type','application/x-ndjson; charset=utf-8');
  headers.set('Cache-Control','no-store, no-transform');
  return new Response(stream,{headers});
}
