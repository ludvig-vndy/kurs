// Deterministisk extraktion för Lifco-fallkällan (docs/case-sources/fall-lifco-2025.md).
// Verklig, användarverifierad data i prosaformat: tal inbakade i löpande punktlistor,
// inte i en nyckeltalstabell. Varje faktum bär sitt källcitat (raden) och avsnitt
// (närmaste rubrik). Härledda tal räknas aldrig här, bara i compute-steget.

function tal(s){if(s==null)return undefined;const v=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:undefined;}

const NUM='(\\d[\\d ]*(?:,\\d+)?)';
const re=(s)=>new RegExp(s);

const FALT=[
  {id:'omsattning',start:'- Omsättning:',enhet:'Mkr',m:re(`SEK ${NUM} miljoner \\(${NUM}\\)`),extra:[
    {id:'omsattning_rapporterad_yoy',m:re(`upp ${NUM} procent`),enhet:'%'},
    {id:'organisk_tillvaxt',m:re(`organiskt ${NUM} procent`),enhet:'%'},
    {id:'valutaeffekt',m:re(`med ${NUM} procent`),enhet:'%'}]},
  {id:'ebita',start:'- EBITA:',enhet:'Mkr',m:re(`SEK ${NUM} miljoner \\(${NUM}\\)`),extra:[
    {id:'ebita_rapporterad_yoy',m:re(`upp ${NUM} procent`),enhet:'%'}]},
  {id:'ebita_marginal',start:'- EBITA-marginal:',enhet:'%',m:re(`${NUM} procent \\(${NUM}\\)`)},
  {id:'resultat_fore_skatt',start:'- Resultat före skatt:',enhet:'Mkr',m:re(`SEK ${NUM} miljoner`)},
  {id:'nettoresultat',start:'- Nettoresultat:',enhet:'Mkr',m:re(`SEK ${NUM} miljoner`),extra:[
    {id:'nettoresultat_rapporterad_yoy',m:re(`upp ${NUM} procent`),enhet:'%'}]},
  {id:'vpa',start:'- Vinst per aktie:',enhet:'kr',m:re(`SEK ${NUM}`),extra:[
    {id:'vpa_rapporterad_yoy',m:re(`upp ${NUM} procent`),enhet:'%'}]},
  {id:'kassaflode_lopande',start:'- Kassaflöde från löpande verksamhet:',enhet:'Mkr',m:re(`SEK ${NUM} miljoner \\(${NUM}\\)`),extra:[
    {id:'kassaflode_rapporterad_yoy',m:re(`upp ${NUM} procent`),enhet:'%'}]},
  {id:'fkf_per_aktie',start:'- Fritt kassaflöde per aktie:',enhet:'kr',m:re(`SEK ${NUM}`)},
  {id:'roce_ex_goodwill',start:'- Avkastning på sysselsatt kapital exklusive goodwill:',enhet:'%',m:re(`${NUM} procent`)},
  {id:'roce_inkl_goodwill',start:'- Avkastning på sysselsatt kapital inklusive goodwill:',enhet:'%',m:re(`kring ${NUM} procent`)},
  {id:'nettoskuld',start:'- Räntebärande nettoskuld: SEK',enhet:'Mkr',m:re(`SEK ${NUM} miljoner`)},
  {id:'nettoskuld_ebitda',start:'- Nettoskuld i förhållande till EBITDA:',enhet:'x',m:re(`${NUM} gånger \\(${NUM}\\)`)},
  {id:'rantebarande_ns_ebitda',start:'- Räntebärande nettoskuld i förhållande till EBITDA:',enhet:'x',m:re(`${NUM} gånger \\(${NUM}\\)`)},
  {id:'ns_eget_kapital',start:'- Nettoskuld i förhållande till eget kapital:',enhet:'x',m:re(`kapital: ${NUM}`)},
  {id:'skuldtak',start:'- Mål: räntebärande nettoskuld',enhet:'x',konst:3},
  {id:'antal_forvarv',start:'- Under 2025 konsoliderades',enhet:'st',m:re(`konsoliderades ${NUM} förvärv`)},
  {id:'utdelning',start:'- Föreslagen utdelning:',enhet:'kr',m:re(`SEK ${NUM} per aktie`)},
  {id:'utdelningspolicy_lag',start:'- Utdelningspolicy:',enhet:'%',m:re(`ut ${NUM} till`)},
  {id:'utdelningspolicy_hog',start:'- Utdelningspolicy:',enhet:'%',m:re(`till ${NUM} procent`)},
  {id:'pris_rapportdag',start:'- Aktien handlades runt',enhet:'kr',m:re(`runt ${NUM} SEK`)},
  {id:'riktkurs',start:'- Senaste analytikerrekommendation',enhet:'kr',m:re(`riktkurs ${NUM} SEK`)}
];

export function extraheraLifco(text){
  const fakta={},kallor={};
  let avsnitt='(inledning)';
  const satt=(id,nu,fjol,enhet,rad)=>{
    if(fakta[id]||nu==null)return;
    fakta[id]={nu,...(fjol!=null?{fjol}:{}),enhet};
    kallor[id]={citat:rad.trim(),avsnitt};
  };
  for(const rad of text.split('\n')){
    const h=rad.match(/^##\s+(.+)/);
    if(h){avsnitt=h[1].trim();continue;}
    const dat=rad.match(/Rapporterat (\d{1,2}) januari (\d{4})/);
    if(dat){satt('rapport_dag',tal(dat[1]),null,'dag',rad);satt('rapport_ar',tal(dat[2]),null,'år',rad);}
    for(const f of FALT){
      if(!rad.startsWith(f.start))continue;
      if(f.konst!=null){satt(f.id,f.konst,null,f.enhet,rad);continue;}
      const m=f.m.exec(rad);
      if(m)satt(f.id,tal(m[1]),tal(m[2]),f.enhet,rad);
      for(const x of f.extra||[]){
        const mx=x.m.exec(rad);
        if(mx)satt(x.id,tal(mx[1]),null,x.enhet,rad);
      }
    }
  }
  return {bolag:'Lifco',period:'räkenskapsåret 2025',fakta,kallor,guidning:null};
}
