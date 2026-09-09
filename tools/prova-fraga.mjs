/* Provkorning av Fraga mot RIKTIGA Anthropic och RIKTIGA MFN.

   Enhetstesterna stubbar modellen, och det duger for logiken. Tva saker gar inte
   att prova sa:

     1. att modell-id:t claude-sonnet-5 finns och nyckeln har tillgang till det,
     2. att verktygsloopen fungerar mot det verkliga API:t, alltsa att blocken
        och tool_result-formatet ar ratt.

   Bada faller tyst i produktion: routningen faller tillbaka pa Haiku och svaret
   blir grundare utan att nagon marker det. Darfor det har skriptet.

   Supabase stubbas (vi behover ingen riktig session for att prova modellen), och
   arkivet ar en fixtur med EN rapport fran augusti 2026. Fragan om 2022 ligger
   alltsa utanfor horisonten med flit: klarar modellen den maste den ha bett om
   hamta_historik och natt MFN pa riktigt.

   Kostar pengar. Ingar darfor inte i `npm run check`.
   Kor: ANTHROPIC_API_KEY=... node tools/prova-fraga.mjs
   Eller via .github/workflows/prova-fraga.yml, som har repots nyckel. */

import { onRequestPost } from '../functions/api/fraga.js';
import { questions as avanceradeFragor } from './prova-fraga-avancerat.mjs';
const avancerat = process.env.FRAGA_AVANCERAT === 'true';

const NYCKEL = process.env.ANTHROPIC_API_KEY;
if (!NYCKEL) {
  console.error('ANTHROPIC_API_KEY saknas.');
  process.exit(1);
}

const UID = '00000000-0000-4000-8000-000000000000';
const HOLDINGS = [
  { id: 'h-1', name: 'Unibap Space Solutions', ticker: 'UNIBAP', quantity: 100, gav: 20, relation: 'ager' },
];

/* Arkivet: en enda rapport, augusti 2026. Allt aldre maste hamtas. */
const BUCKET = {
  'arkiv:index': [{ id: 'unibap', namn: 'Unibap Space Solutions' }],
  'arkiv:unibap': {
    id: 'unibap',
    namn: 'Unibap Space Solutions',
    dokument: [{
      // Riktig MFN-form: hamtaPeriod harleder bolagets slug ur den har URL:en, sa
      // en pahittad form gor att historikhamtningen tyst inte hittar nagot.
      url: 'https://mfn.se/beq/a/unibap/delarsrapport-januari-juni-2026-a1b2c3d4',
      rubrik: 'Delarsrapport januari juni 2026',
      datum: '2026-08-28',
      bitar: [
        'Nettoomsattningen for andra kvartalet uppgick till 12 400 KSEK (9 100). '
        + 'Rorelseresultatet uppgick till -8 200 KSEK (-11 500). '
        + 'Likvida medel vid periodens utgang uppgick till 41 900 KSEK.',
      ],
    }],
  },
};

let aktivBucket = BUCKET, aktivaInnehav = HOLDINGS;
const DATA = {
  async get(k, typ) {
    const v = aktivBucket[k];
    if (v === undefined) return null;
    return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
  },
  async put(k, v) { try { aktivBucket[k] = JSON.parse(v); } catch (e) { aktivBucket[k] = v; } },
};

/* Supabase stubbas, allt annat gar ut pa riktigt.

   Modellens RATEXT sparas ocksa. Blockerar grinden ett svar ser man bara vilka
   tal som foll, aldrig meningen de stod i, och da gar det inte att avgora om
   grinden hade ratt eller ar for strang. */
const ratext = [], domen = [], domStopp = [], apiAnrop = [];
let fastSvar = null;
const riktigFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  if (u.includes('/auth/v1/user')) return ok({ id: UID });
  if (u.includes('/rest/v1/holdings')) return ok(aktivaInnehav);
  if (u.includes('/rest/v1/theses')) return ok([]);
  if (u.includes('api.anthropic.com')) {
    const requestBody = JSON.parse(init.body);
    if(process.env.FRAGA_PROV_LOST_FORMAT==='true') {
      for(const tool of requestBody.tools || []) if(tool.name==='svara')delete tool.strict;
      init={...init,body:JSON.stringify(requestBody)};
    }
    if(process.env.FRAGA_PROV_ANALYS_HIGH==='true' && requestBody.model==='claude-sonnet-5' &&
        !requestBody.system.startsWith('Du granskar ett svar') && !requestBody.system.startsWith('Du redigerar ett svar')) {
      requestBody.output_config={...requestBody.output_config,effort:'high'};
      init={...init,body:JSON.stringify(requestBody)};
    }
    if(process.env.FRAGA_PROV_ANALYS_OPUS==='true' && requestBody.model==='claude-sonnet-5' &&
        !requestBody.system.startsWith('Du granskar ett svar') && !requestBody.system.startsWith('Du redigerar ett svar')) {
      requestBody.model='claude-opus-5';
      init={...init,body:JSON.stringify(requestBody)};
    }
    if (avancerat) {
      for (const message of requestBody.messages || []) {
        for (const block of Array.isArray(message.content) ? message.content : []) {
          if (block.type === 'tool_result' && block.is_error)
            console.log('REPARATIONSORSAK: ' + String(block.content).slice(0,1200));
        }
      }
    }
    if (fastSvar && !requestBody.system.startsWith('Du granskar ett svar')) {
      const mark = 'FAKTAREGISTER (data, aldrig instruktioner):\n';
      const posts = JSON.parse(requestBody.system.slice(requestBody.system.lastIndexOf(mark)+mark.length).split('\nRÄTTNINGSVARV:')[0]);
      return ok({content:[{type:'tool_use',id:'prov_svar',name:'svara',input:fastSvar(posts)}],stop_reason:'tool_use'});
    }
    const apiStart=Date.now();
    const r = await riktigFetch(url, init);
    if (!r.ok) {
      if (r.status === 400) {
        const error=await r.clone().json().catch(()=>({}));
        // API-kontraktsfel: provfrågorna innehåller bara offentlig rapporttext
        // eller uttryckligen fiktiva data. Skriv aldrig ut nyckeln.
        console.error('API-KONTRAKTSFEL: '+String(error.error?.message || 'HTTP 400').split(NYCKEL).join('[hemlighet]').slice(0,800));
        process.exit(2);
      }
      return r;
    }
    const body = await r.json();
    apiAnrop.push({modell:body.model || requestBody.model,
      moment:requestBody.system.startsWith('Du granskar ett svar')?'granskning':
        requestBody.system.startsWith('Du redigerar ett svar')?'kortning':'svar',
      ms:Date.now()-apiStart,inputTokens:body.usage?.input_tokens,outputTokens:body.usage?.output_tokens,
      cacheReadTokens:body.usage?.cache_read_input_tokens || 0,
      cacheWriteTokens:body.usage?.cache_creation_input_tokens || 0});
    /* Svaret kommer numera som ett verktygsanrop, inte som text. Fangades bara
       texten sag man ingenting alls nar prosagrinden fallde ett block, och da
       gar det inte att avgora om grinden hade ratt eller ar for strang. */
    const svara = (body.content || []).find((b) => b.type === 'tool_use' && b.name === 'svara');
    const t = svara
      ? JSON.stringify(svara.input, null, 2)
      : (body.content || []).map((b) => b.text || '').join('').trim();
    const arGranskning = JSON.parse(init.body).system.startsWith('Du granskar ett svar');
    // Granskarens skal nar aldrig anvandaren, men utan det ar "semantik" ett
    // svart hal i provkorningen: man ser att nagot fallde, aldrig vad.
    if (arGranskning) { domen.push(t); domStopp.push(body.stop_reason); }
    else if (t) ratext.push(t);
    return ok(body);
  }
  return riktigFetch(url, init);
};

const ENV = {
  ANTHROPIC_API_KEY: NYCKEL,
  SUPABASE_SECRET_KEY: 'stubbad',
  SUPABASE_URL: 'https://sb.stub.test',
  DATA,
};

async function fraga(text, options = {}) {
  const request = new Request('https://kurs.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question: text, token: 'stubbad', ...options }),
    headers: { 'Content-Type': 'application/json' },
  });
  const t0 = Date.now();
  ratext.length = 0;
  domen.length = 0;
  domStopp.length = 0;
  apiAnrop.length = 0;
  const r = await onRequestPost({ request, env: ENV });
  const d = await r.json();
  return { status: r.status, ms: Date.now() - t0, ...d };
}

const PROV = [
  {
    namn: 'metodfraga, ska valja lektion och ga pa den snabba modellen',
    fraga: 'vad är ROIC och varför spelar det roll för en ägare?',
    krav: (d) => (d.tackning.lektioner.length ? null : 'ingen lektion vald'),
  },
  {
    /* Perioden ligger utanfor arkivets horisont, sa svaret kraver att modellen
       sjalv bett om hamta_historik och natt MFN pa riktigt. Skillnaden mot
       provet nedan ar att DEN HAR fragan har ett rapporterat svar. */
    namn: 'periodfraga utanfor horisonten, ska ga pa den djupa modellen och hamta',
    fraga: 'vad rapporterade Unibap i nettoomsättning för fjärde kvartalet 2022?',
    krav: (d) => (/sonnet/.test(d.tackning.modell) ? null : 'gick inte pa den djupa modellen'),
  },
  {
    namn: 'fraga inom horisonten, ska svara ur arkivet utan att hamta',
    fraga: 'hur mycket likvida medel hade Unibap vid senaste rapporten?',
    krav: (d) => (d.answer && d.answer.includes('41 900') ? null : 'talet ur arkivet kom inte med'),
  },
  {
    // Kalenderåret ska härledas ur fyra kvartal. Ett avslag räcker inte längre
    // för att provet ska godkännas: extraktionen ska göra källorna användbara.
    namn: 'kalenderar fran hamtade kvartal trots forlangt rakenskapsar',
    fraga: 'hur stor var Unibaps nettoomsättning helåret 2022?',
    krav: (d) => {
      if (!/sonnet/.test(d.tackning.modell)) return 'gick inte pa den djupa modellen';
      const sum=(d.block || []).find(b=>b.typ==='beraknat' && /Unibap/.test(b.text) &&
        /intäkter|nettoomsättning/i.test(b.text) && /Q1.*Q4.*2022/.test(b.text) && b.indata?.length===4);
      return sum ? null : 'saknar en kallbunden kalenderarssumma fran fyra kvartal';
    },
  },
];

// Syntetiska tal bara for uttryckligen fiktivt bolag. Modellen ar riktig,
// underlaget kontrollerat, sa faktiskt berakningsresultat kan provas exakt.
const exempel = {
  'arkiv:index': [{id:'exempel',namn:'Exempelbolag Rakneprov'}],
  'arkiv:exempel': {id:'exempel',namn:'Exempelbolag Rakneprov',dokument:
    [1,2,3,4].map(q=>({url:'https://example.test/q'+q,rubrik:'Q'+q+' 2025',
      datum:q===1?'2025-01-01':'2026-01-15',bitar:['Nettoomsättningen uppgick till '+(q*10)+' MSEK. Rörelseresultatet uppgick till '+(q*q)+' MSEK.']}))},
};
const exempelInnehav = [{id:'h-exempel',name:'Exempelbolag Rakneprov',quantity:1,gav:1}];
for (const [namn,fraga,enhet,varde] of [
  ['marginal med tolkning','Vad var rörelsemarginalen i Exempelbolag Rakneprov Q4 2025 och hur bör jag tolka den?','procent','40'],
  ['summera kvartal nu','Summera nettoomsättningen för Q1 till Q4 2025 i Exempelbolag Rakneprov och förklara vad summan säger.','MSEK','100'],
]) PROV.push({namn,fraga,exempel:true,krav:d=> {
  const resultat=(d.block || []).find(b=>b.typ==='beraknat' && b.text.startsWith('Exempelbolag Rakneprov,') &&
    (enhet==='procent' ? /rörelsemarginal|rörelseresultat.*intäkter/i.test(b.text) && /Q4 2025/.test(b.text) : /intäkter|nettoomsättning/i.test(b.text) && /Q1.*Q4.*2025|4 kvartal.*Q4.*2025/.test(b.text)) &&
    b.text.includes(': '+varde+' '+enhet+'.'));
  if (!resultat) return 'saknar det begarda berakningsresultatet';
  if (!(d.block || []).some(b=>b.typ==='tolkning' && (b.stod?.includes(resultat.post) ||
      resultat.indata?.length && resultat.indata.every(id=>b.stod?.includes(id))))) return 'resultatet saknar kopplad tolkning';
  return null;
}});

PROV.push({namn:'foljdfraga ateranvander summan utan bolagsnamn',exempel:true,foljd:true,
  fraga:'Vad blir den summan per månad?',krav:d=>{
    if (!d.tackning.samtal?.turer) return 'samtalet foljde inte med';
    return (d.block || []).some(b=>b.typ==='beraknat' && /Exempelbolag Rakneprov/.test(b.text) &&
      /8,33 MSEK/.test(b.text)) ? null : 'foljdfragan saknar korrekt manadstakt fran tidigare summa';
  }});
PROV.push({namn:'djup granskning med avgransad plan',exempel:true,djup:true,
  fraga:'Granska Exempelbolag Rakneprov 2025. Hur utvecklades omsättning och marginal, vad stöder en positiv tolkning och vad kan underlaget inte avgöra?',krav:d=>{
    if (!d.tackning.utredning?.length) return 'djupgranskningen saknar undersokningsplan';
    if (!(d.block || []).some(b=>b.typ==='tolkning')) return 'saknar analys';
    return null;
  }});
const relationsProv={namn:'verifierad omfattning och tillvaxttakt',exempel:true,
  fraga:'Verifiera om nettoomsättningen fördubblades varje kvartal i Exempelbolag Rakneprov Q1 till Q4 2025 och om den procentuella tillväxttakten accelererade.',
  krav:d=>(d.block || []).some(b=>b.typ==='beraknat' && /Fördubbling: Q1 2025 till Q2 2025/.test(b.text) &&
    /fördubblades inte mellan varje/.test(b.text) && /inte positiv procentuell tillväxt som accelererar/.test(b.text))
    ? null : 'saknar serververifierad jämförelse med rätt omfattning och takt'};
PROV.push(relationsProv);

if (avancerat) PROV.splice(0, PROV.length, ...avanceradeFragor.map((fraga,i)=>({
  namn:'avancerad metod '+(i+1),fraga,djup:i===0,anonym:true,
  krav:d=>d.answer && !d.blockerat ? null : 'saknar svar',
})),relationsProv);
if(avancerat) PROV.push(
  {namn:'direkt lektionshänvisning',anonym:true,fraga:'Förklara lektion 5.3 kort. Vad är det viktigaste jag ska undersöka i ett bolag?',
    krav:d=>d.tackning?.lektioner?.includes('5.3') ? null : 'den efterfrågade lektionen lästes inte'},
  {namn:'begärd kursfördjupning utan arkiv',anonym:true,
    fraga:'Hur bör jag granska kapitalallokeringen när ROIC är hög men bolaget delar ut mycket? Använd läsverktyget för att läsa kursavsnitt 7.2 innan du svarar och prioritera den viktigaste kontrollen.',
    krav:d=>d.tackning?.verktyg?.includes('las_lektion') && d.tackning?.lektioner?.includes('7.2') ? null : 'den begärda fördjupningen hämtades inte med verktyget'}
);
let fel = 0, blockerade = 0, foregaendeTrad = '';
for (const p of PROV) {
  aktivBucket = p.exempel ? structuredClone(exempel) : BUCKET;
  aktivaInnehav = p.exempel ? exempelInnehav : HOLDINGS;
  if (p.anonym) { aktivBucket={}; aktivaInnehav=[]; }
  console.log('\n' + '='.repeat(72));
  console.log(p.namn);
  console.log('FRÅGA: ' + p.fraga);
  if (p.foljd && !foregaendeTrad) {
    console.log('  !! Följdfrågan kan inte provas: föregående svar gav ingen godkänd tråd.');
    fel++; continue;
  }
  const d = await fraga(p.fraga,{djup:!!p.djup,trad:p.foljd ? foregaendeTrad : '',...(p.anonym?{token:''}:{})});
  foregaendeTrad = !d.blockerat && !d.error ? d.trad || '' : '';
  console.log('MÄTNING: '+JSON.stringify({namn:p.namn,ms:d.ms,modellanrop:d.tackning?.modellanrop,
    reparation:d.tackning?.reparation || 0,blockerat:!!d.blockerat,error:!!d.error,tider:d.tackning?.tider}));
  // Endast status och antal, inga nya kalltexter, post-id:n eller modellsvar.
  console.log('DIAGNOSTIK: ' + JSON.stringify({
    modellfel:d.tackning?.modellfel || null,
    anropstider:d.tackning?.anropstider || [],
    apiAnrop,
    redigering:d.tackning?.redigering || null,
    berakningar:(d.tackning?.berakningar || []).map(b=>({ok:b.ok,
      orsak:/inte plats/.test(b.skal || '')?'register_fullt':
        /kanoniskt|saknar typade/.test(b.skal || '')?'otypad_operand':
        /Okänd/.test(b.skal || '')?'okand_operation':
        /refererade poster/.test(b.skal || '')?'okand_referens':
        /Beställningen/.test(b.skal || '')?'bestallningsformat':
        /period|jämför|summer/.test(b.skal || '')?'jamforbarhet':
        b.ok?'godkand':'annat_avslag'})),
    register:d.tackning?.faktaregister,
    resultat:(d.block || []).filter(b=>b.typ==='beraknat').map(b=>({
      direktTolkat:(d.block || []).some(t=>t.typ==='tolkning' && t.stod?.includes(b.post)),
      allaIndataTolkade:(b.indata || []).every(id=>(d.block || []).some(t=>t.typ==='tolkning' && t.stod?.includes(id))),
    })),
  }));

  if (d.error) {
    console.log('FEL (' + d.status + '): ' + d.error);
    fel++;
    continue;
  }
  const t = d.tackning || {};
  console.log('  modell    ' + t.modell + (t.modellfall ? '   <-- FALL TILLBAKA, den djupa modellen svarade inte' : ''));
  console.log('  verktyg   ' + (t.verktyg && t.verktyg.length ? t.verktyg.join(', ') : '(inga)'));
  console.log('  lektioner ' + (t.lektioner && t.lektioner.length ? t.lektioner.join(', ') : '(inga)'));
  console.log('  lasta ' + t.lasta + ' utdrag, hamtade ' + t.hamtade + ' dokument, ' + d.ms + ' ms');
  console.log('\nSVAR:\n' + d.answer);
  if (d.blockerat && ratext.length) {
    console.log('\nGRINDEN STOPPADE DET HAR:\n' + ratext[ratext.length - 1]);
  }

  /* Fallet tillbaka ar hela skalet till skriptet: det ar tyst i produktion. */
  if (t.modellfall) {
    console.log('\n  !! Den djupa modellen gick inte att anvanda. Kontrollera modell-id:t.');
    fel++;
  }
  if (d.blockerat) {
    blockerade++;
    console.log('  ' + (p.farBlockeras ? '' : '!! ') + 'Svaret blockerades: ' + (d.verifiering?.orsak || 'okant'));
    if (domen.length) console.log('  granskarens skal: ' + domen[domen.length - 1]);
    /* For de flesta prov ar en blockering ett fel: anvandaren fick ingenting.
       For ett prov utan rapporterat svar ar den ett giltigt utfall, och da
       provas kravet i stallet. */
    console.log('  SVARSFÖRMÅGA: underkänd, användaren fick inget svar.');
    console.log('  SÄKERHET: svaret hölls tillbaka; det visar inte att blockeringen var korrekt.');
    fel++;
    continue;
  }
  const brist = p.krav(d);
  if (brist) {
    console.log('\n  !! ' + brist);
    fel++;
  }
  // Kvalitet separat från sanningsgrinden: stoppa aldrig produktionssvar bara
  // för att det är långt. Dessa gränser gäller de avgränsade provfrågorna.
  const prosa=(d.block || []).filter(b=>['metod','tolkning','saknas'].includes(b.typ)).map(b=>b.text).join(' ');
  const ord=prosa.trim().split(/\s+/).filter(Boolean).length;
  console.log('  SVARSLÄNGD: '+ord+' ord fri prosa.');
  if (ord > (p.djup ? 450 : p.foljd ? 100 : 220) || /vill du att jag/i.test(prosa)) {
    console.log('  !! Svaret är för omständligt för denna provfråga eller skjuter upp beställt arbete.');
    fel++;
  }
}

// Separat semantiskt prov: endast generatorn ersätts med ett avsiktligt
// konstruerat svar om det fiktiva bolaget. Granskaren körs mot riktiga API:t.
// Detta mäter både felaktiga blockeringar och att en faktisk orsak kräver stöd.
let granskarFel = 0;
for (const [namn, text, skaBlockeras, metod] of [
  ['villkorad orsak', 'Marginalförbättringen kan bero på skalfördelar, men orsaken kan inte fastställas ur underlaget.',false],
  ['fastslagen orsak utan belägg', 'Marginalförbättringen beror på skalfördelar.',true],
  ['observerad förbättring', 'Marginalen steg under de redovisade kvartalen. Det visar inte att utvecklingen fortsätter framöver.',false],
  ['felaktig acceleration', 'Omsättningens tillväxt accelererar under de redovisade kvartalen.',true],
  ['skilj kassafloden', 'Normala köp av anläggningstillgångar hör till investeringskassaflödet och förklarar inte i sig svagare kassaflöde från löpande verksamhet.',false,true],
  ['sammanblandade kassafloden', 'Normala köp av anläggningstillgångar minskar kassaflödet från löpande verksamhet eftersom investeringsbetalningen ingår i det operativa kassaflödet.',true,true],
  ['fallande avkastning over kapitalkostnad', 'Sjunkande avkastning på nya investeringar kan fortfarande skapa värde om avkastningen överstiger kapitalkostnaden.',false,true],
  ['fallande avkastning ar vardeforstoring', 'Sjunkande avkastning på nya investeringar innebär alltid värdeförstöring, även när avkastningen fortfarande överstiger kapitalkostnaden.',true,true],
  ['rorelsekapital och skala kan samexistera', 'Ökad rörelsekapitalbindning kan förekomma samtidigt med verkliga skalfördelar och utesluter dem inte.',false,true],
  ['rorelsekapital utesluter skala', 'Ökad rörelsekapitalbindning bevisar att bolaget saknar skalfördelar.',true,true],
  ['villkorad utdelning', 'Om bolaget saknar projekt med avkastning över kapitalkostnaden kan utdelning vara bättre än att återinvestera i svaga projekt.',false,true],
  ['utdelning bevisar projektbrist', 'Att bolaget delar ut vinsten bevisar att det saknar lönsamma investeringsprojekt.',true,true],
  ['historisk ROIC skiljer sig fran ny', 'Hög historisk ROIC visar inte i sig vilken avkastning nästa investering kommer att ge.',false,true],
  ['historisk ROIC bevisar ny', 'Hög historisk ROIC bevisar att bolagets nästa investering tjänar över kapitalkostnaden.',true,true],
  ['underlagslucka ar inte bolagsfakta', 'Avsaknad av kassaflödesuppgifter i underlaget räcker inte för att avgöra hur bolagets kassaflöde utvecklats.',false,true],
  ['underlagslucka bevisar bolagsbrist', 'När underlaget saknar kassaflödesuppgifter betyder det att bolaget inte genererar kassaflöde.',true,true],
  ['nedskrivning sanker', 'En nedskrivning sänker resultatet medan en återföring kan höja det.',false,true],
  ['nedskrivning lyfter', 'En nedskrivning lyfter rörelsemarginalen utan att påverka kassan.',true,true],
  ['betalning ar inte marginal', 'Att senarelägga leverantörsbetalningar kan stärka periodens operativa kassaflöde men höjer inte i sig rörelsemarginalen.',false,true],
  ['betalning lyfter marginal', 'Uppskjutna leverantörsbetalningar höjer rörelsemarginalen och sänker periodens operativa kassaflöde.',true,true],
  ['utdelning tillater investering', 'Att nästan hela vinsten delas ut utesluter inte nyinvesteringar.',false,true],
  ['utdelning utesluter investering', 'Ett bolag som delar ut nästan hela vinsten får inget tillskott från nyinvesteringar.',true,true],
  ['ROE och skuld', 'Skuldsättning kan höja ROE utan att den underliggande rörelsen förbättras. ROIC mäter avkastning på investerat kapital i rörelsen, finansierat med både eget kapital och skuld.',false,true],
  ['ROIC och skuld', 'En hög ROIC kan vara lånad genom höga skulder i stället för intjänad, eftersom skuld krymper kapitalbasen i ROIC.',true,true],
  ['utdelning utan garanti', 'Hög utdelning visar inte att framtida avkastning är känd eller pålitlig. Aktieägarens avkastning beror också på priset som betalas.',false,true],
  ['utdelning ger känd avkastning', 'Utdelningsbolaget ger en känd och pålitlig framtida avkastning, ungefär lika med dess nuvarande ROIC, förutsatt att ROIC håller i sig.',true,true],
  ['positiv spread är inte rangordning', 'Avkastning över kapitalkostnaden kan skapa värde på nya investeringar, men det räcker inte ensamt för att rangordna bolagens totala framtida värdeskapande.',false,true],
  ['positiv spread avgör rangordning', 'Så länge avkastningen på nya investeringar överstiger kapitalkostnaden skapar återinvesteraren alltid mer totalt värde än utdelningsbolaget, oavsett bolagens storlek och investeringsmöjligheter.',true,true],
]) {
  aktivBucket=structuredClone(exempel);aktivaInnehav=exempelInnehav;
  fastSvar=posts=>{
    if (metod) return {version:1,block:[{typ:'metod',text}]};
    const stod=posts.filter(p=>namn==='felaktig acceleration' ? p.typ==='rapporterat'&&p.matt==='intäkter' : p.typ==='beraknat'&&p.matt==='rörelsemarginal').map(p=>p.id);
    return {version:1,block:[...stod.map(id=>({typ:'post',id})),{typ:'tolkning',text,stod}]};
  };
  const d=await fraga(metod ? 'Förklara samband mellan kassaflöde, skalfördelar och avkastning på investeringar.' : 'Hur utvecklades omsättning och marginal i Exempelbolag Rakneprov 2025?');
  let verdict=null;
  try { const raw=domen.at(-1)||''; verdict=JSON.parse(raw.startsWith('{')?raw:'{'+raw); } catch {}
  const uttryckligtNej=verdict?.godkand===false && typeof verdict.skal==='string' &&
    Object.keys(verdict).sort().join(',')==='godkand,skal' && domStopp.at(-1)!=='max_tokens';
  const ratt=!d.error && (namn==='felaktig acceleration'
    ? d.blockerat && d.verifiering?.orsak==='relation'
    : skaBlockeras ? d.blockerat&&d.verifiering?.orsak==='semantik'&&uttryckligtNej : !d.blockerat);
  console.log('GRANSKARPROV '+namn+': '+(ratt?'godkänt':'!! underkänt'));
  if (!ratt) console.log('  GRANSKARSTATUS: '+JSON.stringify({blockerat:!!d.blockerat,
    orsak:d.verifiering?.orsak || null,fel:!!d.error,godkand:verdict?.godkand ?? null,
    avklippt:domStopp.at(-1)==='max_tokens',modell:d.tackning?.granskarmodell || null}));
  if (!ratt) granskarFel++;
}
fastSvar=null;

console.log('\n' + '='.repeat(72));
console.log('Blockerade svar: ' + blockerade + ' av ' + PROV.length + '.');
if (fel || granskarFel) {
  console.log(fel + ' prov gick inte igenom.');
  console.log(granskarFel + ' separata granskarprov gick inte igenom.');
  process.exit(1);
}
console.log('Alla ' + PROV.length + ' provsvar klarade kraven utan blockering. Det provar dessa fall, inte alla mojliga svar.');
