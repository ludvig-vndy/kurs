// Serverägda budgetar och undersökningsstatus. En sökning är inte en slutsats.
const VANLIG = Object.freeze({modellanrop:10,gravvarv:2,berakningar:6,verktyg:8,ms:90000});
const DJUP = Object.freeze({modellanrop:14,gravvarv:4,berakningar:8,verktyg:12,ms:120000});
export const budgetFor = djup => djup === true ? DJUP : VANLIG;
const OMRADEN = Object.freeze({resultat:'Resultat och marginaler',kassaflode:'Kassaflöde',
  finansiering:'Finansiering',tes:'Möjligheter och risker',perioder:'Jämförbarhet mellan perioder',metod:'Analysmetod'});
export const PLANVERKTYG = {
  name:'planera', description:'Planera först en djupgranskning med högst fyra undersökningsfrågor. Ingen intern tankegång eller slutsats. Planen sätts en gång. Koppla sedan verktygen till del-id d1, d2 osv.',
  input_schema:{type:'object',additionalProperties:false,required:['delar'],properties:{delar:{
    type:'array',minItems:1,maxItems:4,items:{type:'object',additionalProperties:false,
      required:['omrade','fraga'],properties:{omrade:{type:'string',enum:Object.keys(OMRADEN)},
        fraga:{type:'string',minLength:1,maxLength:200}}}}}},
};
export const SYSTEM_DJUP = '\nDJUPGRANSKNING: Börja med planera för att dela frågan i relevanta undersökningsfrågor. Koppla sökningar och beräkningar till deras del-id. Undersök belägg både för och emot möjliga förklaringar när det behövs. En sökning utan nya träffar visar inte att bolaget saknar uppgiften. Besvara de delar underlaget räcker till och förklara kvarvarande luckor; visa inte intern tankegång. Samma källkrav gäller.\n';

export function skapaUndersokning() {
  let delar = [];
  return {
    planera(input) {
      if (delar.length || !input || Object.keys(input).join(',') !== 'delar' ||
          !Array.isArray(input.delar) || !input.delar.length || input.delar.length > 4 ||
          input.delar.some(d => !d || Object.keys(d).sort().join(',') !== 'fraga,omrade' ||
            !Object.hasOwn(OMRADEN,d.omrade) || typeof d.fraga !== 'string' ||
            !d.fraga.trim() || d.fraga.length > 200)) return {ok:false,skal:'Planen kräver högst fyra giltiga undersökningsfrågor och kan bara sättas en gång.'};
      delar = input.delar.map((d,i)=>({id:'d'+(i+1),omrade:d.omrade,rubrik:OMRADEN[d.omrade],
        fraga:d.fraga.trim(),anrop:0,nyaPoster:0}));
      return {ok:true,delar:delar.map(({id,fraga})=>({id,fraga}))};
    },
    har: id => delar.some(d=>d.id===id),
    notera(id, verktyg, nyaPoster) {
      const d = delar.find(d=>d.id===id);
      if (!d || !['las_mer','hamta_historik','las_lektion','berakna'].includes(verktyg)) return false;
      d.anrop++; d.nyaPoster += Math.max(0, Number(nyaPoster)||0);
      return true;
    },
    // Modellens fria plantext visas aldrig som en verifierad uppgift i ytan.
    status: () => delar.map(({id,omrade,rubrik,anrop,nyaPoster})=>({id,omrade,rubrik,
      status:anrop?'undersokt':'ej_undersokt',anrop,nyaPoster})),
  };
}

export function giltigPeriod(p) {
  const datum = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10) === s;
  return !!p && datum(p.fran) && datum(p.till) && p.fran <= p.till;
}
