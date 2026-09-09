/* Sluten, deterministisk beräkningskärna. Modellen får bara välja en
   operation och referera till registerposter; tal och metadata kommer alltid
   från serverägda poster. En aritmetiskt giltig beräkning kan fortfarande
   vara irrelevant för frågan, vilket bedöms efteråt. */
import { formateraTal } from './_talformat.js';

const RANG = { illustration: 0, antagande: 1, egen_uppgift: 2, kurs: 3, dokument: 4, rapporterat: 5 };
const MAX_INDATA = 16;
const periodNyckel = p => Number.isInteger(p.ar) && Number.isInteger(p.kvartal) &&
  p.kvartal >= 1 && p.kvartal <= 4 && Number.isInteger(p.langd) && p.langd > 0 && p.langd <= 16
  ? [p.ar, p.kvartal, p.langd] : null;
const varde = p => p?.normaliserat?.varde;
const enhet = p => p?.normaliserat?.enhet;
const andlig = p => Number.isFinite(varde(p));
const kvartalsindex = p => p.ar * 4 + p.kvartal - 1;
const periodstart = p => kvartalsindex(p) - p.langd + 1;
const kvartalFranIndex = i => ({ ar: Math.floor(i / 4), kvartal: i % 4 + 1 });
const etikett = p => p.period || (p.langd === 1 ? `Q${p.kvartal} ${p.ar}` :
  `${p.langd} kvartal till och med Q${p.kvartal} ${p.ar}`);
const tal = formateraTal;
const avslag = skal => ({ ok: false, skal });

export function jamforbara(a, b) {
  if (!a || !b) return false;
  if (!a.slag || !b.slag) throw new TypeError('Jämförbara poster måste ange slag.');
  if (!andlig(a) || !andlig(b)) return false;
  if (!a.bolagId || !b.bolagId || a.bolagId !== b.bolagId) return false;
  if (!a.matt || a.matt !== b.matt || a.slag !== b.slag || !enhet(a) || enhet(a) !== enhet(b)) return false;
  const ap = periodNyckel(a), bp = periodNyckel(b);
  if (!ap || !bp) return false;
  if (a.slag === 'flode' && a.langd !== b.langd) return false;
  return true;
}

function lov(p) {
  if (p.typ !== 'beraknat') return [{ id: p.id, ursprung: p.typ, antaganden: p.antagande ? [p.antagande] : [] }];
  const vp = p.vilar_pa;
  if (!vp || !Array.isArray(vp.poster)) return [];
  return vp.poster.map((id) => ({ id, ursprung: vp.ursprung_per_post?.[id] || vp.ursprung,
    antaganden: vp.antaganden || [] }));
}

function proveniens(indata) {
  const blad = indata.flatMap(lov);
  const ursprung = blad.reduce((svagast, b) =>
    (RANG[b.ursprung] ?? -1) < (RANG[svagast] ?? Infinity) ? b.ursprung : svagast,
  blad[0]?.ursprung || 'antagande');
  return {
    ursprung,
    poster: [...new Set(blad.map(b => b.id).filter(Boolean))],
    antaganden: [...new Set(blad.flatMap(b => b.antaganden).filter(Boolean))],
    ursprung_per_post: Object.fromEntries(blad.filter(b => b.id).map(b => [b.id, b.ursprung])),
  };
}

function bas(indata, operation, resultat, resultatEnhet, extra = {}) {
  const djup = 1 + Math.max(0, ...indata.map(p => p.djup || 0));
  if (djup > 2) return avslag('Beräkningskedjan får vara högst två led djup.');
  if (!Number.isFinite(resultat)) return avslag('Beräkningen gav inget ändligt tal.');
  const vilar_pa = proveniens(indata);
  const ursprung = new Set(indata.flatMap(lov).map(b => b.ursprung));
  if (ursprung.has('illustration') && ursprung.has('rapporterat'))
    return avslag('Illustrativa tal får inte blandas med rapporterade fakta.');
  const kallor = [...new Map(indata.flatMap(p => p.kallor || []).map(k => [JSON.stringify(k), k])).values()];
  const barn = indata.filter(p => p.typ === 'beraknat' && p.formel).map(p => p.formel);
  const post = { typ: 'beraknat', operation, bolagId: indata[0].bolagId, bolag: indata[0].bolag,
    indata: indata.map(p => p.id), kallor, djup, vilar_pa,
    varde: resultat, enhet: resultatEnhet,
    normaliserat: { varde: resultat, enhet: resultatEnhet }, ...extra };
  return { ok: true, post };
}

function direktFormel(indata, text) {
  const barn = indata.filter(p => p.typ === 'beraknat' && p.formel).map(p => p.formel);
  return [...barn, text].join('\n');
}

export function berakna(operation, indata) {
  if (!Array.isArray(indata) || !indata.length || indata.length > MAX_INDATA || indata.some(p => !p || typeof p !== 'object'))
    return avslag('Indata måste vara en begränsad lista med registerposter.');
  if (indata.some(p => !andlig(p) || !p.id)) return avslag('De valda posterna saknar typade tal med verifierad enhet och period. Dokumentcitat kan innehålla siffror men kan inte användas direkt som operander. Välj faktaposter med normaliserat värde, eller förklara att uppgifterna ännu inte kan kopplas säkert till beräkningen. Detta är ett avslag på underlaget, inte ett tekniskt verktygsfel.');
  if (operation === 'utveckling') {
    if (indata.length < 2 || indata.some(p=>varde(p)<=0 || !['flode','balans'].includes(p.slag)))
      return avslag('Utveckling kräver minst två positiva flödes- eller balansposter.');
    try { if (indata.slice(1).some(p=>!jamforbara(indata[0],p) || p.langd!==indata[0].langd))
      return avslag('Utveckling kräver samma bolag, mått, slag, enhet och periodlängd.'); }
    catch(e) { return avslag(e.message); }
    const ps=[...indata].sort((a,b)=>kvartalsindex(a)-kvartalsindex(b));
    if (ps.slice(1).some((p,i)=>kvartalsindex(p)-kvartalsindex(ps[i])!==p.langd))
      return avslag('Serien måste bestå av angränsande perioder utan luckor eller överlapp.');
    const jamforelser=ps.slice(1).map((p,i)=>({
      fran:etikett(ps[i]),till:etikett(p),tillvaxt:(varde(p)/varde(ps[i])-1)*100,
      // Beslut tas på kanoniska värden, inte avrundad procent i gränssnittet.
      fordubbling:varde(p)===varde(ps[i])*2,halvering:varde(p)*2===varde(ps[i]),
    }));
    if (jamforelser.some(p=>!Number.isFinite(p.tillvaxt))) return avslag('Jämförelsen gav inget ändligt resultat.');
    const acceleration=jamforelser.length<2 ? null : jamforelser.every(p=>p.tillvaxt>0) &&
      jamforelser.slice(1).every((p,i)=>p.tillvaxt>jamforelser[i].tillvaxt);
    const dubbla=jamforelser.filter(p=>p.fordubbling), halva=jamforelser.filter(p=>p.halvering);
    const utsagor=[];
    if(dubbla.length) utsagor.push('Fördubbling: '+dubbla.map(p=>p.fran+' till '+p.till).join('; ')+'.');
    if(halva.length) utsagor.push('Halvering: '+halva.map(p=>p.fran+' till '+p.till).join('; ')+'.');
    if(jamforelser.length>1 && dubbla.length!==jamforelser.length) utsagor.push('Värdet fördubblades inte mellan varje angränsande period i serien.');
    if(acceleration!==null) utsagor.push(acceleration
      ? 'Positiv procentuell tillväxt accelererar i varje jämförelse i serien.'
      : 'Serien visar inte positiv procentuell tillväxt som accelererar i varje jämförelse.');
    const total=(varde(ps.at(-1))/varde(ps[0])-1)*100;
    return bas(ps,operation,total,'procent',{
      matt:'Förändring i '+ps[0].matt,slag:'kvot',period:etikett(ps[0])+' till '+etikett(ps.at(-1)),
      jamforelser,acceleration,utsaga:utsagor.join(' '),
      formel:direktFormel(ps,jamforelser.map((p,i)=>`${p.fran} till ${p.till}: (${tal(varde(ps[i+1]))} / ${tal(varde(ps[i]))} - 1) × 100 = ${tal(p.tillvaxt)} procent`).join('\n')),
    });
  }
  if (operation === 'summa') {
    if (indata.length < 2) return avslag('Summa kräver minst två operander.');
    if (indata.some(p => p.slag !== 'flode')) return avslag('Bara flödesposter kan summeras över perioder.');
    try { if (indata.slice(1).some(p => !jamforbara(indata[0], p))) return avslag('Poster med olika bolag, mått, slag, enhet eller periodlängd kan inte summeras.'); }
    catch (e) { return avslag(e.message); }
    const ordnade = [...indata].sort((a, b) => periodstart(a) - periodstart(b));
    for (let i = 1; i < ordnade.length; i++) {
      if (periodstart(ordnade[i]) !== kvartalsindex(ordnade[i - 1]) + 1)
        return avslag('Perioderna måste vara angränsande och får inte överlappa.');
    }
    const forsta = ordnade[0], sista = ordnade.at(-1);
    const start = kvartalFranIndex(periodstart(forsta));
    const langd = ordnade.reduce((s, p) => s + p.langd, 0);
    const summa = ordnade.reduce((s, p) => s + varde(p), 0);
    const formel = `${ordnade.map(p => `${tal(varde(p))} ${enhet(p)} (${etikett(p)})`).join(' + ')} = ${tal(summa)} ${enhet(forsta)}`;
    return bas(ordnade, operation, summa, enhet(forsta), { matt: forsta.matt, slag: 'flode',
      ar: sista.ar, kvartal: sista.kvartal, langd,
      period: `Q${start.kvartal} ${start.ar} till Q${sista.kvartal} ${sista.ar}`,
      formel: direktFormel(ordnade, formel) });
  }
  if (operation === 'differens' || operation === 'tillvaxt') {
    if (indata.length !== 2) return avslag(`${operation} kräver två operander.`);
    try { if (!jamforbara(indata[0], indata[1])) return avslag('Poster med olika bolag, mått, slag, enhet eller period kan inte jämföras.'); }
    catch (e) { return avslag(e.message); }
    const [efter, fore] = indata;
    if (operation === 'differens' && !['balans', 'flode'].includes(fore.slag))
      return avslag('Kvoter och takter kan inte användas i en differens.');
    if (operation === 'tillvaxt' && varde(fore) <= 0) return avslag('Tillväxt kräver en positiv nämnare.');
    const resultat = operation === 'differens' ? varde(efter) - varde(fore) : (varde(efter) / varde(fore) - 1) * 100;
    const resEnhet = operation === 'differens' ? enhet(fore) : 'procent';
    const formel = operation === 'differens'
      ? `${tal(varde(efter))} minus ${tal(varde(fore))} ${enhet(fore)} = ${tal(resultat)} ${resEnhet}`
      : `(${tal(varde(efter))} delat på ${tal(varde(fore))} minus 1) gånger 100 = ${tal(resultat)} procent`;
    // En ändpunktsdifferens är inte ett rapporterat flödesintervall och får
    // därför inga maskinläsbara periodfält som kan göra den jämförbar igen.
    return bas(indata, operation, resultat, resEnhet, { matt: operation === 'differens' ? fore.matt : `Tillväxt i ${fore.matt}`,
      slag: operation === 'differens' ? fore.slag : 'kvot', period: `${etikett(fore)} till ${etikett(efter)}`,
      formel: direktFormel(indata, formel) });
  }
  if (operation === 'andel') {
    if (indata.length !== 2) return avslag('Andel kräver två operander.');
    const [taljare, namnare] = indata;
    const a = periodNyckel(taljare), b = periodNyckel(namnare);
    if (!a || !b || taljare.bolagId !== namnare.bolagId || taljare.slag !== namnare.slag ||
        enhet(taljare) !== enhet(namnare) || a.some((x, i) => x !== b[i]))
      return avslag('Andel kräver samma bolag, period, enhet och slag.');
    if (varde(namnare) === 0) return avslag('Andel kan inte beräknas med noll som nämnare.');
    const resultat = varde(taljare) / varde(namnare) * 100;
    return bas(indata, operation, resultat, 'procent', { matt: `${taljare.matt} som andel av ${namnare.matt}`,
      slag: 'kvot', ar: taljare.ar, kvartal: taljare.kvartal, langd: taljare.langd, period: etikett(taljare),
      formel: direktFormel(indata, `${tal(varde(taljare))} delat på ${tal(varde(namnare))} gånger 100 = ${tal(resultat)} procent`) });
  }
  if (operation === 'per_manad') {
    if (indata.length !== 1) return avslag('Per månad kräver en operand.');
    const p = indata[0];
    if (p.slag !== 'flode' || !periodNyckel(p)) return avslag('Per månad kräver ett flöde med känd periodlängd.');
    const resultat = varde(p) / (p.langd * 3), resEnhet = `${enhet(p)} per månad`;
    return bas(indata, operation, resultat, resEnhet, { matt: `${p.matt} per månad`, slag: 'takt',
      ar: p.ar, kvartal: p.kvartal, langd: p.langd, period: etikett(p),
      formel: direktFormel(indata, `${tal(varde(p))} ${enhet(p)} delat på ${p.langd * 3} månader = ${tal(resultat)} ${resEnhet}`) });
  }
  return avslag('Okänd beräkningsoperation.');
}
