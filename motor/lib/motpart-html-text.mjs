import {parse} from 'parse5';
// Text extraction, not a sanitizer or CSS renderer. HTML entities decode once.
const omit=new Set(['head','script','style','template','noscript']);
const inline=new Set(['a','b','strong','em','i','u','s','small','span','mark','time']);
export function partnerHtmlText(html){
 const tree=parse(String(html||'')),parts=[],stack=[tree];
 let tail='';
 const append=text=>{parts.push(text);tail=(tail+text).slice(-64);};
 while(stack.length){
  const node=stack.pop();
  if(node===' '){append(' ');continue;}
  if(node.nodeName==='#text'){
   // Inline styling must not turn neighbouring numeric fields into a new value.
   const previous=tail;
   if(/\d$/.test(previous)&&/^(?:\d|[.,]\d|[eE][+-]?\d)/.test(node.value)||
      /\d(?:[.,]|[eE][+-]?)$/.test(previous)&&/^\d/.test(node.value))append(' ');
   append(node.value);continue;
  }
  if(node.nodeName==='#comment')continue;
  if(omit.has(node.tagName)){append(' ');continue;}
  const separated=node.tagName&&!inline.has(node.tagName);
  if(separated){append(' ');stack.push(' ');}
  for(let i=(node.childNodes?.length||0)-1;i>=0;i--)stack.push(node.childNodes[i]);
 }
 return parts.join('').replace(/\s+/gu,' ').trim();
}
