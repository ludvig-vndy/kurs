import {lookup as dnsLookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import {createHash} from 'node:crypto';
import {parse, serialize} from 'parse5';
import {partnerHtmlText} from '../../motor/lib/motpart-html-text.mjs';

// Conservative public-unicast policy: special-purpose networks are never read.
export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 ||
      a===100 && b>=64 && b<=127 || a===169 && b===254 ||
      a===172 && b>=16 && b<=31 || a===192 && (b===168 || b===0 || b===2 || b===88 && c===99) ||
      a===198 && (b===18 || b===19 || b===51 && c===100) || a===203 && b===0 && c===113);
  }
  if (isIP(address) === 6) {
    const normalized=new URL(`https://[${address}]/`).hostname.slice(1,-1);
    const first=parseInt(normalized.split(':')[0],16);
    // Exclude transition/tunnel, benchmark, documentation and protocol ranges.
    return first>=0x2000 && first<=0x3fff && first!==0x2002 && first!==0x3fff &&
      !/^2001:(?:[0-1]?[0-9a-f]{0,2}:|db8:)/i.test(normalized);
  }
  return false;
}

function publicUrl(value) {
  const url=new URL(value);
  const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(url.protocol!=='https:' || url.username || url.password || url.port && url.port!=='443') throw new Error('Only public HTTPS URLs on port 443 are allowed');
  if(!host || host.endsWith('.') || !host.includes('.') && !isIP(host) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|onion|home|lan)$/.test(host) ||
    isIP(host) && !isPublicAddress(host)) throw new Error('Destination must be public');
  url.hash='';
  return url;
}

function extract(html, finalUrl) {
  const tree=parse(html), nodes=[], stack=[tree];
  while(stack.length) {
    const node=stack.pop();nodes.push(node);
    for(let i=(node.childNodes?.length || 0)-1;i>=0;i--) stack.push(node.childNodes[i]);
  }
  const selected=nodes.find(node=>node.tagName==='main') || nodes.find(node=>node.tagName==='article') || tree;
  const text=partnerHtmlText(serialize(selected));
  const titleNode=nodes.find(node=>node.tagName==='title');
  const title=titleNode ? partnerHtmlText(serialize(titleNode)) : '';
  const links=[],seen=new Set(), pending=[selected];
  while(pending.length && links.length<40) {
    const node=pending.pop();
    if(node.tagName==='a') {
      const href=node.attrs?.find(attr=>attr.name==='href')?.value;
      if(href) try {
        const url=publicUrl(new URL(href,finalUrl)).href;
        if(!seen.has(url)) { seen.add(url);links.push({url,title:partnerHtmlText(serialize(node)).slice(0,300)}); }
      } catch { /* Unsafe/non-web links are not candidates. */ }
    }
    for(let i=(node.childNodes?.length || 0)-1;i>=0;i--) pending.push(node.childNodes[i]);
  }
  return {text,title,links};
}

// Dependency injection is for deterministic offline tests; normal callers use readPublicPage.
export function createPublicPageReader({lookup=dnsLookup,request=httpsRequest}={}) {
  return async function readPublicPage(value,{signal,maxBytes=512*1024,timeoutMs=12000}={}) {
    if(!Number.isSafeInteger(maxBytes) || maxBytes<1 || maxBytes>2*1024*1024) throw new Error('Invalid size limit');
    if(!Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>60000) throw new Error('Invalid timeout');
    const initial=publicUrl(value);
    const controller=new AbortController();
    const onAbort=()=>controller.abort(signal.reason || new Error('Read aborted'));
    if(signal?.aborted) onAbort(); else signal?.addEventListener('abort',onAbort,{once:true});
    const timer=setTimeout(()=>controller.abort(new Error('Public page read timed out')),timeoutMs);
    let abortListener;
    const aborted=new Promise((_,reject)=>{
      abortListener=()=>reject(controller.signal.reason);
      if(controller.signal.aborted) abortListener(); else controller.signal.addEventListener('abort',abortListener,{once:true});
    });
    const work=async()=>{
      let url=initial;
      for(let redirects=0;redirects<=3;redirects++) {
        controller.signal.throwIfAborted();
        const host=url.hostname.replace(/^\[|\]$/g,'');
        const addresses=isIP(host) ? [{address:host,family:isIP(host)}] : await lookup(host,{all:true,verbatim:true});
        controller.signal.throwIfAborted();
        if(!addresses.length || addresses.some(item=>!isPublicAddress(item.address) || isIP(item.address)!==item.family)) throw new Error('DNS destination must be public');
        const pinned=addresses[0];
        const page=await new Promise((resolve,reject)=>{
          let response;
          const req=request(url,{
            method:'GET',agent:false,signal:controller.signal,
            headers:{Accept:'text/html, application/xhtml+xml','Accept-Encoding':'identity','User-Agent':'KursLocalResearchPilot/1.0'},
            lookup:(_hostname,options,callback)=> options?.all ? callback(null,[pinned]) : callback(null,pinned.address,pinned.family),
          },res=>{
            response=res;
            res.on('error',reject);
            if([301,302,303,307,308].includes(res.statusCode)) {
              resolve({location:res.headers.location});res.destroy();return;
            }
            const fail=message=>{res.destroy();reject(new Error(message));};
            if(res.statusCode<200 || res.statusCode>=300) return fail(`HTTP status ${res.statusCode}`);
            if(!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(res.headers['content-type'] || '')) return fail('Response is not HTML');
            if(res.headers['content-encoding'] && res.headers['content-encoding']!=='identity') return fail('Unsupported content encoding');
            if(Number(res.headers['content-length'])>maxBytes) return fail('Response exceeds size limit');
            let size=0;const chunks=[];
            res.on('data',chunk=>{
              const buffer=Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              size+=buffer.length;
              if(size>maxBytes) {fail('Response exceeds size limit');return;}
              chunks.push(buffer);
            });
            res.on('aborted',()=>reject(new Error('Response was interrupted')));
            res.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8')}));
          });
          req.on('error',reject);
          const stop=()=>{response?.destroy();req.destroy(controller.signal.reason);reject(controller.signal.reason);};
          controller.signal.addEventListener('abort',stop,{once:true});
          req.on('close',()=>controller.signal.removeEventListener('abort',stop));
          req.end();
        });
        if('html' in page) {
          const extracted=extract(page.html,url.href);
          return {url:initial.href,finalUrl:url.href,...extracted,sha256:createHash('sha256').update(extracted.text).digest('hex'),readAt:new Date().toISOString(),truncated:false};
        }
        if(!page.location || redirects===3) throw new Error('Invalid redirect or redirect limit exceeded');
        url=publicUrl(new URL(page.location,url));
      }
    };
    try { return await Promise.race([work(),aborted]); }
    finally {clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.signal.removeEventListener('abort',abortListener);}
  };
}

export const readPublicPage=createPublicPageReader();
