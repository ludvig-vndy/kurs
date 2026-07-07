// Utspädningsvakten, extraktionssteget: läser en kallelse till bolagsstämma och
// plockar ut allt som kan späda ut ägarens andel: bemyndiganden, konvertibler,
// optionsprogram. Varje faktum med källcitat och sidnummer. Beräkningarna
// (andelar, maxutspädning) sker aldrig här, bara i compute-steget.

function tal(s){if(s==null)return undefined;const v=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:undefined;}
const NUM='(\\d[\\d ]*(?:,\\d+)?)';

const MONSTER=[
  {id:'antal_aktier',enhet:'st',re:new RegExp(`totala antalet aktier och röster i bolaget till ${NUM}`)},
  {id:'bemyndigande_aktier',enhet:'st',re:new RegExp(`nyemission av högst ${NUM} aktier`)},
  {id:'bemyndigande_andel_uppgiven',enhet:'%',re:new RegExp(`motsvarande cirka ${NUM} procent`)},
  {id:'konvertibel_nominellt',enhet:'kr',re:new RegExp(`konvertibellån om nominellt ${NUM} kronor`)},
  {id:'konverteringskurs',enhet:'kr',re:new RegExp(`Konverteringskursen är ${NUM} kronor`)},
  {id:'konvertibel_aktier_uppgivna',enhet:'st',re:new RegExp(`full konvertering tillkommer högst ${NUM} nya aktier`)},
  {id:'optioner_antal',enhet:'st',re:new RegExp(`finns ${NUM} utestående teckningsoptioner`)},
  {id:'teckningskurs',enhet:'kr',re:new RegExp(`teckningskurs ${NUM} kronor`)},
  {id:'stamma_dag',enhet:'dag',re:new RegExp(`årsstämma torsdagen den ${NUM} maj`)},
  {id:'stamma_ar',enhet:'år',re:new RegExp(`maj (\\d{4})`)},
  {id:'forfall_dag',enhet:'dag',re:new RegExp(`förfaller till betalning den ${NUM} mars`)},
  {id:'forfall_ar',enhet:'år',re:new RegExp(`mars (\\d{4})`)}
];

export function extraheraKallelse(text){
  const fakta={},kallor={},flaggor={};
  let sida=0;
  for(const rad of text.split('\n')){
    const sm=rad.match(/\[Sida (\d+)\]/);
    if(sm){sida=parseInt(sm[1]);continue;}
    for(const m of MONSTER){
      if(fakta[m.id])continue;
      const t=m.re.exec(rad);
      if(t){fakta[m.id]={nu:tal(t[1]),enhet:m.enhet};kallor[m.id]={citat:rad.trim().slice(0,120),sida};}
    }
    if(rad.includes('med eller utan avvikelse från aktieägarnas företrädesrätt')&&!flaggor.utan_foretradesratt){
      flaggor.utan_foretradesratt=true;
      kallor.utan_foretradesratt={citat:rad.trim().slice(0,120),sida};
    }
  }
  return {bolag:'Voltcell (fiktivt)',period:'kallelse till årsstämma 2026',fakta,kallor,flaggor,guidning:null};
}
