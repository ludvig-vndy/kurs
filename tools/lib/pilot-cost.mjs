// Standard short-context prices checked 2026-09-14, estimates not invoices.
// https://developers.openai.com/api/docs/pricing
// https://platform.claude.com/docs/en/about-claude/pricing
export function usageCost(model,data){
 const openai=model==='gpt-5.6-luna';
 const p=openai?{i:.2,o:1.2}:model==='claude-sonnet-5'?{i:2,o:10}:model==='claude-haiku-4-5-20251001'?{i:1,o:5}:null;
 if(!p)return null;const u=data?.usage;
 const cached=openai?(u?.input_tokens_details?.cached_tokens??0):(u?.cache_read_input_tokens??0);
 const write=openai?(u?.input_tokens_details?.cache_write_tokens??0):(u?.cache_creation_input_tokens??0);
 if(![u?.input_tokens,u?.output_tokens,cached,write].every(n=>Number.isSafeInteger(n)&&n>=0)||openai&&(cached+write>u.input_tokens||u.input_tokens>128000))return null;
 const total=((u.input_tokens-(openai?cached+write:0))*p.i+cached*p.i*.1+write*p.i*1.25+u.output_tokens*p.o)/1e6+(openai?(data.output||[]).filter(o=>o.type==='web_search_call').length*.01:0);
 return Number.isFinite(total)&&total>=0?total:null;
}
export function settleCost(charged,reservation,actual){
 const valid=typeof actual==='number'&&Number.isFinite(actual)&&actual>=0;
 return {charged:charged+(valid?actual:reservation),stop:!valid||actual>reservation};
}
