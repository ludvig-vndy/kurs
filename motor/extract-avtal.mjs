// Avtalsklassificeraren, extraktionssteget: läser pressmeddelanden och avgör vad
// varje avtal faktiskt binder. Klasserna är tre: bindande order, ramavtal,
// avsiktsförklaring. Klassificeringen är regelbaserad i v0 (i produktion LLM bakom
// samma schema) och varje klassning bär sitt bevis: den mening ur PM:et som avgör.
// Småbolags-PM kallar allt "strategiskt samarbete"; avtalstexten gäller, inte rubriken.

function tal(s){if(s==null)return undefined;const v=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:undefined;}
const MAN={januari:1,februari:2,mars:3,april:4,maj:5,juni:6,juli:7,augusti:8,september:9,oktober:10,november:11,december:12};
export const KLASSER=['avsiktsförklaring','ramavtal','bindande order'];

function mening(text,nyckel){
  const m=text.split(/(?<=\.)\s+/).find(s=>s.toLowerCase().includes(nyckel));
  return m?m.trim().slice(0,160):null;
}

function klassificera(brodtext){
  const lc=brodtext.toLowerCase();
  if(lc.includes('avsiktsförklaring')||lc.includes('letter of intent'))
    return {klass:'avsiktsförklaring',bevis:mening(brodtext,'icke-bindande')||mening(brodtext,'avsiktsförklaring')};
  if(lc.includes('ramavtal'))
    return {klass:'ramavtal',bevis:mening(brodtext,'inga garanterade volymer')||mening(brodtext,'avrop')||mening(brodtext,'ramavtal')};
  if(lc.includes('bindande')||lc.includes('ordervärdet uppgår till'))
    return {klass:'bindande order',bevis:mening(brodtext,'ordervärdet')||mening(brodtext,'bindande')};
  return {klass:'okänd',bevis:null};
}

export function extraheraAvtal(text){
  const fakta={},kallor={},pm=[];
  const block=text.split(/=== PM \d+ ===/).slice(1);
  block.forEach((b,i)=>{
    const id='pm'+(i+1);
    const rader=b.trim().split('\n').filter(r=>r.trim());
    const dat=b.match(/den (\d{1,2}) ([a-zåäö]+) (\d{4})/);
    const rubrik=rader[1]||'';
    const {klass,bevis}=klassificera(b);
    const post={id,rubrik:rubrik.trim(),klass,bevis,
      datum:dat?{dag:tal(dat[1]),manad:MAN[dat[2]]||null,ar:tal(dat[3])}:null};
    const ord=b.match(/[Oo]rdervärdet uppgår till (\d[\d ]*(?:,\d+)?) miljoner/);
    if(ord){post.order_varde_mkr=tal(ord[1]);fakta[id+'_order_varde']={nu:post.order_varde_mkr,enhet:'Mkr'};kallor[id+'_order_varde']={citat:mening(b,'ordervärdet'),avsnitt:id.toUpperCase()};}
    const pot=b.match(/potentiella ordervärdet till upp till (\d[\d ]*(?:,\d+)?) miljoner kronor över (fem|\d+) år/);
    if(pot){post.potential_mkr=tal(pot[1]);post.potential_ar=pot[2]==='fem'?5:tal(pot[2]);
      fakta[id+'_potential']={nu:post.potential_mkr,enhet:'Mkr'};kallor[id+'_potential']={citat:mening(b,'potentiella'),avsnitt:id.toUpperCase()};
      fakta[id+'_potential_ar']={nu:post.potential_ar,enhet:'år'};kallor[id+'_potential_ar']=kallor[id+'_potential'];}
    if(post.datum){
      fakta[id+'_ar']={nu:post.datum.ar,enhet:'år'};kallor[id+'_ar']={citat:rader[0].trim().slice(0,120),avsnitt:id.toUpperCase()};
    }
    pm.push(post);
  });
  return {bolag:'Voltcell (fiktivt)',period:'pressmeddelanden okt 2025 till maj 2026',fakta,kallor,pm,guidning:null};
}
