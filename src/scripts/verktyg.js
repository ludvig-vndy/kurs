/* ---------- Konfiguration ---------- */
const TABS = [
  {id:"checklista", n:"01", title:"Checklista"},
  {id:"kvalitet",   n:"02", title:"Kvalitetspoäng"},
  {id:"smallcap",   n:"03", title:"Small cap-potential"},
  {id:"moat",       n:"04", title:"Moat"},
  {id:"ledning",    n:"05", title:"Ledning"},
  {id:"risk",       n:"06", title:"Risk"},
  {id:"vardering",  n:"07", title:"Värdering"},
  {id:"summa",      n:"\u03A3", title:"Sammanställning"},
];

const QUALITY = {
  intro:"Är det här en god verksamhet, oavsett pris? Poängen väger samman marginaler, avkastning på kapital, tillväxtens kvalitet, balansräkning och kapitalallokering. Bedöm bara det du faktiskt undersökt.",
  crit:[
    {id:"grossmargin",label:"Bruttomarginal",w:1,hint:"Hög och stabil? Sätter taket för all lönsamhet."},
    {id:"opmargin",label:"Rörelsemarginal",w:1,hint:"Hög, och stabil eller stigande över tid?"},
    {id:"roic",label:"ROIC vs kapitalkostnad",w:2,hint:"Avkastning på kapital klart över kostnaden? Den viktigaste kvalitetsmätaren."},
    {id:"stability",label:"Intjäningsstabilitet",w:1,hint:"Förutsägbar vinst, eller svängig och cyklisk?"},
    {id:"growthq",label:"Tillväxtkvalitet",w:1.5,hint:"Organisk och lönsam, inte köpt eller oekonomisk."},
    {id:"balance",label:"Finansiell styrka",w:1.5,hint:"Låg skuld, god soliditet, tål ett dåligt år."},
    {id:"capalloc",label:"Kapitalallokering",w:1.5,hint:"Klok historik: investerar och återför kapital väl."},
    {id:"fcf",label:"Kassaflödeskonvertering",w:1,hint:"Blir den redovisade vinsten verkligt fritt kassaflöde?"},
    {id:"moat",label:"Vallgrav (moat)",w:2,hint:"Finns en hållbar konkurrensfördel? Djupdykning i moat-verktyget."},
  ]
};
const SMALLCAP = {
  intro:"Den offensiva linsen: kan ett litet, ofta olönsamt bolag bli mångdubbelt större innan siffrorna ser fantastiska ut? Poängen läser de ledande indikatorerna. Kom ihåg att de flesta misslyckas, så detta avgör en kandidat, inte en säkerhet.",
  crit:[
    {id:"tam",label:"TAM (marknadsstorlek)",w:1.5,hint:"Stor, nåbar marknad, många gånger nuvarande omsättning?"},
    {id:"pmf",label:"Product-market fit",w:2,hint:"Hög retention, NRR över 100%, organisk dragning. Viktigaste tidiga signalen."},
    {id:"scale",label:"Skalbarhet & operating leverage",w:1.5,hint:"Hög bruttomarginal och fasta kostnader, marginalen kan expandera."},
    {id:"unit",label:"Enhetsekonomi",w:1.5,hint:"LTV klart över CAC (3x+), rimlig återbetalningstid."},
    {id:"growthq",label:"Tillväxtkvalitet",w:1,hint:"Hållbar, effektiv, sammansättande (NRR över 100%)."},
    {id:"runway",label:"Runway & utspädningsrisk",w:1.5,hint:"Når självfinansiering innan kassan tar slut, låg utspädning."},
    {id:"founder",label:"Grundare & insiderägande",w:1,hint:"Kompetent, samordnat, betydande insiderägande."},
    {id:"edge",label:"Teknologiskt försprång",w:1.5,hint:"Verkligt, svårkopierat, och vidgas när bolaget växer."},
    {id:"loss",label:"Bra vs dålig förlust",w:1,hint:"Skalbar, och lönsam före tillväxtspendering?"},
  ]
};
const MOAT = {
  intro:"Hur djup och hållbar är konkurrensfördelen? En vallgrav skyddar avkastningen från konkurrens. Det viktigaste är inte bara att den finns, utan om den håller och vidgas.",
  crit:[
    {id:"switch",label:"Byteskostnader",w:1,hint:"Kostsamt eller krångligt för kunden att byta?"},
    {id:"network",label:"Nätverkseffekter",w:1,hint:"Blir produkten bättre ju fler som använder den?"},
    {id:"cost",label:"Kostnads- eller skalfördel",w:1,hint:"Strukturellt lägre kostnad än konkurrenterna?"},
    {id:"intangible",label:"Immateriella tillgångar",w:1,hint:"Varumärke, patent eller licenser som skyddar."},
    {id:"escale",label:"Effektiv skala / nisch",w:0.5,hint:"Marknad som bara rymmer få lönsamma aktörer?"},
    {id:"strength",label:"Styrka idag",w:1.5,hint:"Syns vallgraven i uthålligt höga marginaler och ROIC?"},
    {id:"durability",label:"Hållbarhet",w:2,hint:"Hur länge håller fördelen mot konkurrens och förändring?"},
    {id:"direction",label:"Riktning",w:1.5,hint:"Vidgas vallgraven över tid, eller krymper den?"},
  ]
};
const MGMT = {
  intro:"Är ledningen ärlig och skicklig på att förvalta ditt kapital? Du bedömer karaktär och kapitalallokering, inte karisma. Insiderägande visar om de vinner när du vinner.",
  crit:[
    {id:"integrity",label:"Integritet & ärlighet",w:2,hint:"Rättframma, erkänner misstag, ingen försköning."},
    {id:"capalloc",label:"Kapitalallokering",w:2,hint:"Disciplinerade, värdeskapande beslut över tid."},
    {id:"ownership",label:"Insiderägande & incitament",w:1.5,hint:"Äger betydande andel, samordnade med dig."},
    {id:"track",label:"Track record",w:1.5,hint:"Har levererat på vad de lovat över tid."},
    {id:"comm",label:"Kommunikation",w:1,hint:"Tydlig, transparent rapportering, även om dåliga nyheter."},
    {id:"discipline",label:"Kapitaldisciplin",w:1,hint:"Återköp vid undervärde, undviker dyra förvärv och utspädning."},
  ]
};
const RISK = {
  intro:"Vad kan gå fel, och hur illa? Risk är risken att förlora kapital permanent, inte volatilitet. Bedöm varje faktors allvarlighet och sannolikhet. Hög risk betyder mindre position och större krav på felmarginal.",
  factors:[
    {id:"debt",label:"Finansiell risk / skuldsättning",hint:"Hur sårbart är bolaget vid en nedgång eller kreditåtstramning?"},
    {id:"concentration",label:"Kundkoncentration",hint:"Beroende av få stora kunder?"},
    {id:"cyclical",label:"Cyklikalitet",hint:"Hur hårt slår en konjunkturnedgång mot vinsten?"},
    {id:"competition",label:"Konkurrens / moat-erosion",hint:"Kan konkurrenter ta marknad och marginal?"},
    {id:"regulation",label:"Regulatorisk / politisk risk",hint:"Beroende av regler, tillstånd eller politiska beslut?"},
    {id:"disruption",label:"Teknologisk disruption",hint:"Kan tekniken eller modellen bli omsprungen?"},
    {id:"dilution",label:"Utspädningsrisk",hint:"Behöver bolaget resa kapital och späda ägare?"},
    {id:"keyperson",label:"Nyckelpersonsberoende",hint:"Hänger bolaget på en eller få personer?"},
    {id:"valuation",label:"Värderingsrisk",hint:"Förutsätter priset redan perfektion?"},
    {id:"permanent",label:"Permanent kapitalförlust",hint:"Hur illa kan det gå i värsta fall, inte bara ett dåligt kvartal?"},
  ]
};
const CHECKLIST = [
  {g:"Förstå verksamheten",items:[
    {id:"c_understand",q:"Jag förstår hur bolaget tjänar pengar."},
    {id:"c_circle",q:"Bolaget ligger inom min kompetenscirkel."},
  ]},
  {g:"Räkenskaperna",items:[
    {id:"c_statements",q:"Jag har läst resultaträkning, balansräkning och kassaflöde."},
    {id:"c_fcf",q:"Vinsten blir verkligt fritt kassaflöde."},
    {id:"c_balance",q:"Balansräkningen tål ett dåligt år."},
  ]},
  {g:"Kvalitet",items:[
    {id:"c_returns",q:"Marginaler och ROIC är höga och uthålliga."},
    {id:"c_moat",q:"Det finns en hållbar vallgrav."},
    {id:"c_mgmt",q:"Ledningen är ärlig och allokerar kapital väl."},
  ]},
  {g:"Värdering",items:[
    {id:"c_value",q:"Jag har värderat bolaget i ett intervall."},
    {id:"c_mos",q:"Det finns en felmarginal mot priset."},
  ]},
  {g:"Risk",items:[
    {id:"c_downside",q:"Jag har kartlagt vad som kan gå fel."},
    {id:"c_worst",q:"Jag förstår nedsidan i ett värsta fall."},
  ]},
  {g:"Psykologi & beslut",items:[
    {id:"c_story",q:"Jag jagar inte en berättelse eller FOMO."},
    {id:"c_case",q:"Jag har skrivit ett case med falsifieringsvillkor."},
    {id:"c_size",q:"Jag vet hur stor positionen ska vara."},
  ]},
];

/* ---------- State ---------- */
const blank = ()=>({
  meta:{name:"",ticker:"",price:""},
  kvalitet:{}, smallcap:{}, moat:{}, ledning:{},
  risk:{}, checklista:{},
  vardering:{fcf:100,growth:8,disc:10,term:3,netdebt:300,shares:100,eps:"",mult:"",mos:30},
});
let S = blank();

/* ---------- Beräkning ---------- */
function scoreOf(obj, crit){
  let num=0, den=0, n=0;
  crit.forEach(c=>{ const v=obj[c.id]; if(v!==undefined&&v!==null){ num+=c.w*v; den+=c.w*4; n++; } });
  return {pct: den>0?Math.round(num/den*100):null, n:n, total:crit.length};
}
function band(pct){
  if(pct===null) return {label:"Ej bedömd",key:"none",col:"var(--ink-faint)"};
  if(pct>=80) return {label:"Fantastisk",key:"great",col:"var(--great)"};
  if(pct>=60) return {label:"God",key:"good",col:"var(--good)"};
  if(pct>=40) return {label:"Medelmåttig",key:"mid",col:"var(--mid)"};
  return {label:"Svag",key:"bad",col:"var(--bad)"};
}
function scband(pct){ // small cap, mer återhållsamma etiketter
  if(pct===null) return {label:"Ej bedömd",col:"var(--ink-faint)"};
  if(pct>=80) return {label:"Stark kandidat",col:"var(--great)"};
  if(pct>=60) return {label:"Lovande",col:"var(--good)"};
  if(pct>=40) return {label:"Svag potential",col:"var(--mid)"};
  return {label:"Undvik",col:"var(--bad)"};
}
function riskScore(){
  let sum=0, n=0, flags=[];
  RISK.factors.forEach(f=>{
    const o=S.risk[f.id];
    if(o&&o.sev!=null&&o.lik!=null){ const c=o.sev*o.lik; sum+=c; n++; if(c>=6) flags.push(f.label); }
  });
  const idx = n>0?Math.round(sum/(n*9)*100):null;
  return {idx,n,total:RISK.factors.length,flags};
}
function riskBand(idx){
  if(idx===null) return {label:"Ej bedömd",col:"var(--ink-faint)"};
  if(idx>=65) return {label:"Mycket hög",col:"var(--vhigh)"};
  if(idx>=40) return {label:"Hög",col:"var(--bad)"};
  if(idx>=20) return {label:"Måttlig",col:"var(--mid)"};
  return {label:"Låg",col:"var(--good)"};
}
function dcf(fcf,g,r,term,netdebt,shares){
  g/=100; r/=100; term/=100;
  if(r<=term||shares<=0||r<=0) return null;
  let pv=0, last=fcf;
  for(let t=1;t<=5;t++){ last=fcf*Math.pow(1+g,t); pv+=last/Math.pow(1+r,t); }
  const tv=last*(1+term)/(r-term);
  const pvtv=tv/Math.pow(1+r,5);
  const ev=pv+pvtv;
  const eq=ev-netdebt;
  return {perShare:eq/shares, ev, eq, pvFcf:pv, pvTv:pvtv};
}
function valuation(){
  const v=S.vardering;
  const central=dcf(v.fcf,v.growth,v.disc,v.term,v.netdebt,v.shares);
  if(!central) return null;
  const low=dcf(v.fcf,v.growth-2,v.disc+1,v.term-1,v.netdebt,v.shares);
  const high=dcf(v.fcf,v.growth+2,v.disc-1,v.term+1,v.netdebt,v.shares);
  const mult = (v.eps!==""&&v.mult!=="") ? Number(v.eps)*Number(v.mult) : null;
  const price = S.meta.price!==""?Number(S.meta.price):null;
  let mos=null, verdict=null;
  if(price!=null&&central.perShare>0){
    mos=(central.perShare-price)/central.perShare*100;
    if(price<=central.perShare*(1-v.mos/100)) verdict={t:"KÖP",d:"Felmarginal uppnådd",col:"var(--great)"};
    else if(price<central.perShare) verdict={t:"BEVAKA",d:"Under värde men utan tillräcklig felmarginal",col:"var(--mid)"};
    else verdict={t:"ÖVERVÄRDERAD",d:"Pris över beräknat värde, avstå",col:"var(--bad)"};
  }
  return {central:central.perShare, low:low?low.perShare:null, high:high?high.perShare:null, mult, price, mos, verdict, detail:central};
}

/* ---------- Rendering ---------- */
const $ = s=>document.querySelector(s);
// Fylls om vid varje montering: under ClientRouter byts DOM ut vid navigering,
// sa panel-referenser fran modulens forsta korning blir annars foraldralosa.
const panels = {};
function refreshPanels(){
  for(const k in panels) delete panels[k];
  document.querySelectorAll(".panel").forEach(p=>panels[p.dataset.tab]=p);
}

function gaugeHTML(pct,b){
  const w = pct===null?0:pct;
  // Editorial reframe: a thin progress rule, not a needle-and-ticks dashboard gauge.
  return `<div class="gauge"><div class="fill" style="width:${w}%;background:${b.col}"></div></div>`;
}
function scorebarHTML(s,b){
  return `<div class="scorebar">
    <div class="scorenum" style="color:${b.col}">${s.pct===null?"-":s.pct}<small>/100</small></div>
    <div class="gaugewrap">
      <div class="gaugetop"><span class="bandlabel" style="color:${b.col}">${b.label}</span><span class="assessed">${s.n} av ${s.total} bedömda</span></div>
      ${gaugeHTML(s.pct,b)}
    </div></div>`;
}
const LEGEND = `<div class="legend"><b>Skala:</b><span>0 saknas</span><span>1 svagt</span><span>2 medel</span><span>3 starkt</span><span>4 utmärkt</span><span style="color:var(--brass)">talen i guld = vikt</span></div>`;

function critRows(tabKey, conf){
  return conf.crit.map(c=>{
    const val=S[tabKey][c.id];
    const btns=[0,1,2,3,4].map(v=>`<button data-v="${v}" class="${val===v?"on":""}" onclick="setScore('${tabKey}','${c.id}',${v})">${v}</button>`).join("");
    return `<div class="crit">
      <div><span class="label">${c.label}<span class="wt">\u00D7${c.w}</span></span><div class="hint">${c.hint}</div></div>
      <div class="seg scaled">${btns}</div>
    </div>`;
  }).join("");
}
function renderScoreTab(tabKey, conf, n, title, bandFn){
  const s=scoreOf(S[tabKey],conf.crit); const b=bandFn(s.pct);
  panels[tabKey].innerHTML = `
    <div class="phead"><span class="pn">${n}</span><h2>${title}</h2></div>
    <p class="pintro">${conf.intro}</p>
    ${scorebarHTML(s,b)}
    ${LEGEND}
    ${critRows(tabKey,conf)}`;
}
function setScore(tabKey,id,v){
  if(S[tabKey][id]===v) delete S[tabKey][id]; else S[tabKey][id]=v;
  renderTab(tabKey);
}

function renderChecklist(){
  let done=0,total=0,warn=0;
  CHECKLIST.forEach(g=>g.items.forEach(i=>{ total++; const v=S.checklista[i.id]; if(v) done++; if(v==="nej") warn++; }));
  const pct=total>0?Math.round(done/total*100):0;
  const groups = CHECKLIST.map(g=>`
    <div class="grp"><h3>${g.g}</h3>${g.items.map(i=>{
      const v=S.checklista[i.id]||"";
      const opt=[["ja","Ja"],["oklart","Oklart"],["nej","Nej"]].map(([k,l])=>`<button data-v="${k}" class="${v===k?"on":""}" onclick="setChk('${i.id}','${k}')">${l}</button>`).join("");
      return `<div class="chk"><span class="q">${i.q}</span><span class="tri">${opt}</span></div>`;
    }).join("")}</div>`).join("");
  panels.checklista.innerHTML = `
    <div class="phead"><span class="pn">01</span><h2>Checklista före köp</h2></div>
    <p class="pintro">Hela analysprocessen som en följd av kontroller. Markera Ja, Oklart eller Nej. Varje Nej är en varning att ta på allvar. Du behöver inte ett perfekt facit, men du måste veta var luckorna finns.</p>
    ${scorebarHTML({pct:pct,n:done,total:total},{label:done+" av "+total+" besvarade",col:"var(--petrol)"})}
    <p style="font-family:var(--mono);font-size:12px;color:${warn>0?"var(--bad)":"var(--ink-faint)"};margin:-8px 0 4px">${warn>0?warn+" varning"+(warn>1?"ar":"")+" (Nej)":"Inga varningar markerade"}</p>
    ${groups}`;
}
function setChk(id,v){ if(S.checklista[id]===v) delete S.checklista[id]; else S.checklista[id]=v; renderChecklist(); renderSummaryIfActive(); }

function renderRisk(){
  const rs=riskScore(); const b=riskBand(rs.idx);
  const head=`<div class="riskhead"><span>Riskfaktor</span><span>Allvarlighet</span><span>Sannolikhet</span></div>`;
  const rows=RISK.factors.map(f=>{
    const o=S.risk[f.id]||{};
    const sev=[0,1,2,3].map(v=>`<button data-v="${v}" class="${o.sev===v?"on":""}" onclick="setRisk('${f.id}','sev',${v})">${v}</button>`).join("");
    const lik=[0,1,2,3].map(v=>`<button data-v="${v}" class="${o.lik===v?"on":""}" onclick="setRisk('${f.id}','lik',${v})">${v}</button>`).join("");
    const flag=(o.sev!=null&&o.lik!=null&&o.sev*o.lik>=6)?`<span class="rflag">framträdande</span>`:"";
    return `<div class="rrow">
      <div><span class="label">${f.label}${flag}</span><div class="hint">${f.hint}</div></div>
      <div class="seg s3">${sev}</div><div class="seg s3">${lik}</div></div>`;
  }).join("");
  panels.risk.innerHTML = `
    <div class="phead"><span class="pn">06</span><h2>Riskanalys</h2></div>
    <p class="pintro">${RISK.intro}</p>
    ${scorebarHTML({pct:rs.idx,n:rs.n,total:rs.total},b)}
    <p style="font-family:var(--mono);font-size:12px;color:var(--ink-faint);margin:-8px 0 4px">Högre poäng = mer risk. ${rs.flags.length?("Framträdande: "+rs.flags.join(", ")):"Inga framträdande risker markerade."}</p>
    <div class="legend"><b>Allvarlighet & sannolikhet:</b><span>0 ingen</span><span>1 låg</span><span>2 medel</span><span>3 hög</span></div>
    ${head}${rows}`;
}
function setRisk(id,kind,v){
  if(!S.risk[id]) S.risk[id]={};
  if(S.risk[id][kind]===v) S.risk[id][kind]=null; else S.risk[id][kind]=v;
  renderRisk(); renderSummaryIfActive();
}

function renderValuation(){
  const v=S.vardering; const r=valuation();
  const f=(id,label,suffix="")=>`<div class="field"><label for="v_${id}">${label}</label><input id="v_${id}" type="number" step="any" value="${v[id]}" oninput="setVal('${id}',this.value)">${suffix}</div>`;
  let out=`<div class="vout"><p style="margin:0 0 6px;color:#B9C6C0;font-size:12px">Fyll i antaganden till vänster</p></div>`;
  if(r){
    const fmt=x=>x==null?"-":x.toLocaleString("sv-SE",{maximumFractionDigits:2})+" kr";
    out=`<div class="vout">
      <div class="row"><span class="k">Värde per aktie (DCF)</span><span class="v big">${fmt(r.central)}</span></div>
      <div class="row"><span class="k">Intervall (känslighet)</span><span class="v">${fmt(r.low)} till ${fmt(r.high)}</span></div>
      ${r.mult!=null?`<div class="row"><span class="k">Multipelkontroll</span><span class="v">${fmt(r.mult)}</span></div>`:""}
      <div class="row"><span class="k">Aktuellt pris</span><span class="v">${r.price!=null?fmt(r.price):"-"}</span></div>
      <div class="row"><span class="k">Felmarginal mot värde</span><span class="v">${r.mos!=null?r.mos.toFixed(0)+" %":"-"}</span></div>
    </div>`;
    if(r.verdict) out+=`<div class="verdict" style="background:${r.verdict.col};color:#fff">${r.verdict.t} \u00b7 ${r.verdict.d}</div>`;
    if(r.detail) out+=`<p class="vmath">Nuvärde 5 års kassaflöde: ${r.detail.pvFcf.toFixed(0)} \u00b7 Nuvärde slutvärde: ${r.detail.pvTv.toFixed(0)} \u00b7 Rörelsevärde: ${r.detail.ev.toFixed(0)} \u00b7 minus nettoskuld ${v.netdebt} = eget kapital ${r.detail.eq.toFixed(0)} Mkr \u00f7 ${v.shares} milj aktier.</p>`;
  }
  panels.vardering.innerHTML = `
    <div class="phead"><span class="pn">07</span><h2>Värderingsmall</h2></div>
    <p class="pintro">Värde är nuvärdet av framtida kassaflöden. Modellen räknar en enkel DCF och jämför med priset. Mata in konservativa antaganden, sikta på ett intervall, inte ett exakt facit, och kräv en felmarginal. Standardvärdena reproducerar kursens exempel (cirka 15 kr).</p>
    <div class="vgrid">
      <div class="vbox">
        <h3>Antaganden</h3>
        ${f("fcf","Fritt kassaflöde, år 0 (Mkr)")}
        ${f("growth","Tillväxt år 1 till 5 (% per år)")}
        ${f("disc","Diskonteringsränta (%)")}
        ${f("term","Evig tillväxt efter år 5 (%)")}
        ${f("netdebt","Nettoskuld (Mkr)")}
        ${f("shares","Antal aktier (miljoner)")}
        <h3 style="margin-top:20px">Multipelkontroll (valfri)</h3>
        ${f("eps","Normaliserad vinst per aktie (kr)")}
        ${f("mult","Rimlig multipel (P/E)")}
        <h3 style="margin-top:20px">Krav</h3>
        ${f("mos","Önskad felmarginal (%)")}
      </div>
      <div class="vbox"><h3>Resultat</h3>${out}</div>
    </div>`;
}
function setVal(id,val){ S.vardering[id]= val===""?"":Number(val); renderValuation(); renderSummaryIfActive(); }

/* Kombinerat ägarbetyg: en grindad sammanvägning av alla sju steg.
   Felmarginalen är ett krav, inte en faktor: den sätter taket, kvalitet,
   risk och checklista kan bara sänka eller bekräfta, aldrig köpa sig förbi
   en saknad felmarginal. Bandet härleds ur slutscoren så de aldrig krockar. */
function ownerGrade(q, mo, mg, sc, rs, val, warn, chkDone){
  let steps=0;
  [q.n>0, mo.n>0, mg.n>0, sc.n>0, rs.n>0, !!(val&&val.mos!=null), chkDone>0].forEach(b=>{ if(b) steps++; });

  // Verksamhetsbas: viktat snitt av bedömda kvalitetssidor (kvalitet väger tyngst)
  const dims=[];
  if(q.pct!=null) dims.push([q.pct,3]);
  if(mo.pct!=null) dims.push([mo.pct,2]);
  if(mg.pct!=null) dims.push([mg.pct,2]);
  let base=null;
  if(dims.length){ let n=0,d=0; dims.forEach(([v,w])=>{ n+=v*w; d+=w; }); base=n/d; }
  if(base==null && sc.pct!=null) base=sc.pct; // small cap som alternativ verksamhetslins

  const hasVal = !!(val && val.mos!=null);
  if(base==null && !hasVal)
    return {score:null, band:{t:"Ofullständig",col:"var(--ink-faint)"},
      reason:"Bedöm verksamheten och fyll i värderingen för att få ett ägarbetyg.", steps};

  // Riskdrag (högre index = mer risk, upp till -40 %) och checklistedrag (-6 per Nej, max -24)
  let s = base!=null ? base : 50;
  if(rs.idx!=null) s *= 1 - (rs.idx/100)*0.4;
  if(warn>0) s = Math.max(0, s - Math.min(24, warn*6));

  let band, reason;
  if(!hasVal){
    s = Math.round(Math.min(s, 49));
    band = {t:"Preliminär", col:"var(--ink-faint)"};
    reason = "Verksamheten är bedömd, men sätt aktuellt pris och fyll i värderingsmallen. Utan en felmarginal går ingen hållning att ge.";
    return {score:s, band, reason, steps};
  }

  const verdict = val.verdict ? val.verdict.t : null;
  const mos = Math.round(val.mos);
  const reqMos = Number(S.vardering.mos);
  if(verdict==="ÖVERVÄRDERAD") s = Math.min(s, 34); // grind: ingen felmarginal -> AVSTÅ
  else if(verdict==="BEVAKA")  s = Math.min(s, 64); // grind: otillräcklig marginal -> max BEVAKA
  s = Math.round(s);

  band = s>=65 ? {t:"KÖPVÄRD",col:"var(--great)"}
       : s>=40 ? {t:"BEVAKA",col:"var(--mid)"}
       :         {t:"AVSTÅ",col:"var(--bad)"};

  // Dominerande begränsning, för en konkret förklaring
  let lim=null;
  if(base!=null && base<45) lim="kvaliteten i verksamheten";
  else if(rs.idx!=null && rs.idx>=50) lim="risknivån";
  else if(warn>0) lim="öppna punkter i checklistan";

  if(verdict==="ÖVERVÄRDERAD")
    reason = "Priset ligger över ditt beräknade värde. Hur god verksamheten än är saknas felmarginal, och då är det inget köp.";
  else if(verdict==="BEVAKA")
    reason = `Under ditt värde men utan tillräcklig felmarginal (${mos}% mot kravet ${reqMos}%). Ett bra bolag kan ändå vara fel pris. Bevaka och vänta på ett bättre läge.`;
  else if(s>=65)
    reason = `Felmarginal uppnådd (${mos}%), verksamheten håller och risken är hanterbar. De tre kraven möts samtidigt.`;
  else if(lim)
    reason = `Felmarginal finns (${mos}%), men ${lim} drar ned helheten. ${s<40?"En billig svag verksamhet är sällan ett fynd.":"Bevaka tills bilden stärks."}`;
  else
    reason = `Felmarginal finns (${mos}%), men för få steg är bedömda för att helheten ska övertyga. Fyll i fler för en säkrare hållning.`;

  return {score:s, band, reason, steps};
}

function renderSummary(){
  const q=scoreOf(S.kvalitet,QUALITY.crit), qb=band(q.pct);
  const sc=scoreOf(S.smallcap,SMALLCAP.crit), scb=scband(sc.pct);
  const mo=scoreOf(S.moat,MOAT.crit), mob=band(mo.pct);
  const mg=scoreOf(S.ledning,MGMT.crit), mgb=band(mg.pct);
  const rs=riskScore(), rb=riskBand(rs.idx);
  const val=valuation();
  let done=0,total=0,warn=0; CHECKLIST.forEach(g=>g.items.forEach(i=>{total++;const x=S.checklista[i.id];if(x)done++;if(x==="nej")warn++;}));

  const card=(t,s,b,suffix="/100")=>`<div class="scard"><div class="t">${t}</div>
    <div class="sline"><span class="sn" style="color:${b.col}">${s===null?"-":s}<span style="font-size:13px;color:var(--ink-faint)">${s===null?"":suffix}</span></span><span class="sb" style="color:${b.col}">${b.label}</span></div>
    <div class="minigauge"><div class="fill" style="width:${s===null?0:s}%;background:${b.col}"></div></div></div>`;

  // Bolagsnamnet interpoleras i innerHTML nedan och kan komma fran en importerad
  // (delad, opalitlig) analys-JSON, sa det maste HTML-escapas for att inte bli XSS.
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const name=esc(S.meta.name||"Bolaget");
  const cards = card("Kvalitet",q.pct,qb)+card("Moat",mo.pct,mob)+card("Ledning",mg.pct,mgb)+card("Small cap-potential",sc.pct,scb)
    + `<div class="scard"><div class="t">Risk</div><div class="sline"><span class="sn" style="color:${rb.col}">${rs.idx===null?"-":rs.idx}<span style="font-size:13px;color:var(--ink-faint)">${rs.idx===null?"":"/100"}</span></span><span class="sb" style="color:${rb.col}">${rb.label}</span></div><div class="minigauge"><div class="fill" style="width:${rs.idx===null?0:rs.idx}%;background:${rb.col}"></div></div></div>`
    + `<div class="scard"><div class="t">Värdering</div><div class="sline"><span class="sn" style="color:${val&&val.verdict?val.verdict.col:'var(--ink-faint)'}">${val?val.central.toLocaleString("sv-SE",{maximumFractionDigits:1}):"-"}<span style="font-size:13px;color:var(--ink-faint)">${val?" kr":""}</span></span><span class="sb" style="color:${val&&val.verdict?val.verdict.col:'var(--ink-faint)'}">${val&&val.verdict?val.verdict.t:(val&&val.mos==null?"Sätt pris":"Ej klar")}</span></div><div class="minigauge"><div class="fill" style="width:${val&&val.mos!=null?Math.max(0,Math.min(100,val.mos)):0}%;background:${val&&val.verdict?val.verdict.col:'var(--line-soft)'}"></div></div></div>`;

  // Hållning
  const sent=[];
  if(val&&val.verdict){
    if(val.verdict.t==="KÖP") sent.push(`Värderingen ger en felmarginal: priset (${val.price} kr) ligger under ditt beräknade värde (cirka ${val.central.toLocaleString("sv-SE",{maximumFractionDigits:1})} kr).`);
    else if(val.verdict.t==="BEVAKA") sent.push(`${name} handlas under ditt beräknade värde men utan tillräcklig felmarginal. Ett bra bolag kan ändå vara fel pris. Bevaka och vänta på ett bättre läge.`);
    else sent.push(`Priset ligger över ditt beräknade värde. Hur god verksamheten än är saknas felmarginal, och då är det inget köp.`);
  } else sent.push(`Sätt aktuellt pris och fyll i värderingsmallen för att avgöra om det finns en felmarginal. Utan en felmarginal är även ett fantastiskt bolag inget köp.`);

  if(q.pct!=null){
    if(q.pct>=60&&(mo.pct==null||mo.pct>=50)) sent.push(`Kvaliteten ser god ut (${q.pct}/100). Det är en verksamhet värd att äga, om priset stämmer.`);
    else if(q.pct<40) sent.push(`Kvaliteten är svag (${q.pct}/100). Var försiktig: en billig svag verksamhet är sällan ett fynd.`);
  }
  if(rs.idx!=null&&rs.idx>=40) sent.push(`Risknivån är ${rb.label.toLowerCase()}. Det betyder mindre position och större krav på felmarginal${rs.flags.length?(", särskilt kring "+rs.flags[0].toLowerCase()):""}.`);
  if(sc.pct!=null&&sc.pct>=60) sent.push(`Som small cap-kandidat ser den lovande ut (${sc.pct}/100), men kom ihåg den offensiva linsen: sådana bolag är oftast prissatta för framgång, de flesta misslyckas, och kanten ligger i asymmetri och att dimensionera litet i en korg, inte i en felmarginal.`);
  if(warn>0) sent.push(`Du har ${warn} obesvarad eller röd punkt i checklistan. Stäng luckorna innan du beslutar.`);

  // Kombinerat ägarbetyg (rubrik över korten)
  const grade = ownerGrade(q, mo, mg, sc, rs, val, warn, done);
  const heroNum = grade.score===null ? "—" : grade.score;
  const hero = `<div class="gradehero">
    <div class="gh-score">
      <div class="gh-num" style="color:${grade.band.col}">${heroNum}${grade.score===null?"":'<small>/100</small>'}</div>
      <div class="gh-band" style="color:${grade.band.col}">${grade.band.t}</div>
    </div>
    <div class="gh-body">
      <p class="gh-reason">${grade.reason}</p>
      <div class="gh-meta">Ägarscore väger samman alla sju steg och grindas av felmarginalen: utan marginal kan inget bolag bli köpvärt. Baserat på ${grade.steps} av 7 steg bedömda.</div>
    </div>
  </div>`;

  panels.summa.innerHTML = `
    <div class="phead"><span class="pn">\u03A3</span><h2>Sammanställning</h2></div>
    <p class="pintro">Hela analysen på ett ställe. Ett köp kräver tre saker samtidigt: en verksamhet värd att äga (eller en genuin small cap-kandidat), en risk du kan leva med, och en felmarginal mot priset.</p>
    ${hero}
    <div class="sgrid">${cards}</div>
    <div class="stance">
      <h3>Sammanvägd hållning för ${name}</h3>
      ${sent.map(s=>`<p>${s}</p>`).join("")}
      <p class="note">Det här är en sammanvägning av din egen analys, inte ett köpråd. Den verkliga kanten är temperament och disciplin: köp bara med felmarginal, dimensionera så att du överlever att ha fel, och låt vinnarna löpa medan tesen håller.</p>
    </div>`;
}
function renderSummaryIfActive(){ if(panels.summa.classList.contains("active")) renderSummary(); }

/* ---------- Tab-styrning ---------- */
function renderTab(key){
  if(key==="checklista") renderChecklist();
  else if(key==="kvalitet") renderScoreTab("kvalitet",QUALITY,"02","Kvalitetspoäng",band);
  else if(key==="smallcap") renderScoreTab("smallcap",SMALLCAP,"03","Small cap-potential",scband);
  else if(key==="moat") renderScoreTab("moat",MOAT,"04","Moat-poäng",band);
  else if(key==="ledning") renderScoreTab("ledning",MGMT,"05","Ledningsanalys",band);
  else if(key==="risk") renderRisk();
  else if(key==="vardering") renderValuation();
  else if(key==="summa") renderSummary();
}
function buildNav(){
  const nav=$("#nav");
  nav.innerHTML=TABS.map((t,i)=>`<button class="tab${i===0?" active":""}" data-go="${t.id}"><span class="n">${t.n}</span>${t.title}</button>`).join("");
  nav.querySelectorAll(".tab").forEach(b=>b.onclick=()=>activate(b.dataset.go));
}
function activate(key){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.go===key));
  Object.keys(panels).forEach(k=>panels[k].classList.toggle("active",k===key));
  renderTab(key);
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ---------- Context-fält ---------- */
function bindContext(){
  $("#cn").value=S.meta.name; $("#ct").value=S.meta.ticker; $("#cp").value=S.meta.price;
  $("#cn").oninput=e=>{S.meta.name=e.target.value;};
  $("#ct").oninput=e=>{S.meta.ticker=e.target.value;};
  $("#cp").oninput=e=>{S.meta.price=e.target.value===""?"":Number(e.target.value); renderSummaryIfActive(); if(panels.vardering.classList.contains("active"))renderValuation();};
}

/* ---------- Export / import / reset ---------- */
function exportJSON(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=((S.meta.ticker||S.meta.name||"analys").toString().replace(/[^\w-]/g,"_"))+"-analys.json";
  a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(ev){
  const file=ev.target.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ const d=JSON.parse(rd.result); S=Object.assign(blank(),d); S.vardering=Object.assign(blank().vardering,d.vardering||{}); bindContext(); const cur=document.querySelector(".tab.active"); activate(cur?cur.dataset.go:"checklista"); }catch(e){ alert("Kunde inte läsa filen. Kontrollera att det är en exporterad analys."); } };
  rd.readAsText(file); ev.target.value="";
}
function resetAll(){
  if(!confirm("Nollställa hela analysen?")) return;
  S=blank(); bindContext(); activate("checklista");
}

/* ---------- Init ---------- */
// Monteras av verktyg.astro pa astro:page-load (funkar bade vid full laddning
// och klient-navigering under ClientRouter). Guard: no-op utanfor verktygssidan.
export function mountVerktyg(){
  if(!document.getElementById("nav")) return;
  refreshPanels(); buildNav(); bindContext(); activate("checklista");
}

// Panelernas inline-onclick + toolbaren refererar dessa som globaler.
Object.assign(window, { setScore, setChk, setRisk, exportJSON, importJSON, resetAll });
