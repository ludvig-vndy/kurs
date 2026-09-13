import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {createPublicPageReader, isPublicAddress} from '../lib/pilot-public-reader.mjs';

function fixture(pages, lookup = async () => [{address:'93.184.216.34',family:4}]) {
  const calls=[];
  const request=(url, options, callback)=>{
    calls.push({url:String(url),options});
    const req=new EventEmitter();
    req.destroy=(error)=>{ if(error) queueMicrotask(()=>req.emit('error',error)); };
    req.end=()=>queueMicrotask(()=>{
      const page=pages[calls.length-1] || {};
      const res=Readable.from(page.chunks || [Buffer.from(page.body || '<p>Hello</p>')]);
      res.statusCode=page.status || 200;
      res.headers={'content-type':'text/html; charset=utf-8',...page.headers};
      callback(res);
    });
    return req;
  };
  return {read:createPublicPageReader({lookup,request}),calls};
}

test('rejects private, special and mapped addresses; accepts global addresses',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.100.100.200','0.0.0.0','224.0.0.1','192.0.0.1','198.18.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2001:db8::1','2002:7f00:1::1']) assert.equal(isPublicAddress(ip),false,ip);
  for(const ip of ['93.184.216.34','8.8.8.8','2606:4700:4700::1111']) assert.equal(isPublicAddress(ip),true,ip);
});
test('rejects non HTTPS, credentials, local hosts and nonstandard ports before request',async()=>{
  const {read,calls}=fixture([]);
  for(const url of ['http://example.com','https://a:b@example.com','https://localhost','https://127.1','https://[::1]','https://example.com:8443']) await assert.rejects(read(url));
  assert.equal(calls.length,0);
});
test('rejects DNS answers containing any private address',async()=>{
  const {read,calls}=fixture([],async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]);
  await assert.rejects(read('https://example.com'),/public/i); assert.equal(calls.length,0);
});
test('pins DNS, selects main text, preserves numeric boundaries and returns hash',async()=>{
  const {read,calls}=fixture([{body:'<nav>Ignore</nav><main><span>85</span><span>90</span><script>bad</script> MSEK</main>'}]);
  const result=await read('https://example.com/a#anchor');
  assert.equal(result.text,'85 90 MSEK'); assert.equal(result.truncated,false);
  assert.equal(result.sha256,createHash('sha256').update(result.text).digest('hex'));
  assert.ok(Number.isFinite(Date.parse(result.readAt)));
  calls[0].options.lookup('example.com',{},(err,address,family)=>{assert.equal(err,null);assert.equal(address,'93.184.216.34');assert.equal(family,4);});
  assert.equal(calls[0].options.agent,false);
  assert.equal(calls[0].options.headers.Cookie,undefined);
});
test('validates redirect target and refuses private destination',async()=>{
  const {read,calls}=fixture([{status:302,headers:{location:'https://169.254.169.254/latest'}}]);
  await assert.rejects(read('https://example.com'),/public/i); assert.equal(calls.length,1);
});
test('follows relative redirects and bounds redirect chains',async()=>{
  const redirect={status:302,headers:{location:'/next'}};
  const good=fixture([redirect,{body:'<article>Report</article>'}]);
  assert.equal((await good.read('https://example.com')).finalUrl,'https://example.com/next');
  const loop=fixture([redirect,redirect,redirect,redirect]);
  await assert.rejects(loop.read('https://example.com'),/redirect/i); assert.equal(loop.calls.length,4);
});
test('rejects advertised and streamed oversized bodies',async()=>{
  for(const page of [{headers:{'content-length':'1000'}},{chunks:[Buffer.alloc(6),Buffer.alloc(6)]}]) {
    await assert.rejects(fixture([page]).read('https://example.com',{maxBytes:10}),/size|large|limit/i);
  }
});
test('rejects unsupported content, encodings, statuses and cancellation',async()=>{
  for(const page of [{headers:{'content-type':'application/pdf'}},{headers:{'content-encoding':'gzip'}},{status:404}]) await assert.rejects(fixture([page]).read('https://example.com'));
  const controller=new AbortController();controller.abort();
  await assert.rejects(fixture([]).read('https://example.com',{signal:controller.signal}));
});
test('timeout bounds DNS resolution too',async()=>{
  await assert.rejects(fixture([],()=>new Promise(()=>{})).read('https://example.com',{timeoutMs:10}),/timed out/i);
});
test('returns document title and bounded, deduplicated safe links in main',async()=>{
  const body='<title>Report &amp; facts</title><nav><a href="/nav">Navigation</a></nav><main>'+[
    '<a href="/report#part">Annual <b>report</b></a>',
    '<a href="/report#other">Duplicate</a>',
    '<a href="https://10.0.0.1">Private</a>',
    '<a href="http://example.com">HTTP</a>',
    '<a href="https://user:pass@example.com">Credentials</a>',
    ...Array.from({length:45},(_,index)=>`<a href="/page-${index}">Page ${index}</a>`),
  ].join('')+'</main>';
  const result=await fixture([{body}]).read('https://example.com');
  assert.equal(result.title,'Report & facts');assert.equal(result.links.length,40);
  assert.deepEqual(result.links[0],{url:'https://example.com/report',title:'Annual report'});
  assert.ok(result.links.every(link=>!['Private','HTTP','Credentials','Navigation','Duplicate'].includes(link.title)));
});
test('resolves and checks DNS again for each redirect hostname',async()=>{
  const hosts=[];
  const {read,calls}=fixture([{status:302,headers:{location:'https://private.example.org'}}],async host=>{
    hosts.push(host);return [{address:host==='example.com'?'8.8.8.8':'192.168.1.1',family:4}];
  });
  await assert.rejects(read('https://example.com'),/public/i);
  assert.deepEqual(hosts,['example.com','private.example.org']);assert.equal(calls.length,1);
});
