/* BASFRAGOR: det som Borsdata faktiskt bar, och vad de kostar och tar for tid.

   Varfor den finns
   ----------------
   De sex frusna provfragorna i prova-fraga-avancerat.mjs ligger alla pa lager 2
   och 3: segment, justerat mot rapporterat, bolagets egna matt, orsakssamband.
   Ingen datakalla i varlden loser dem, och vi har anda last 0 av 6 som om det
   vore produktens kvalitet. Det har provet mater den andra andan: gruppnivans
   standardiserade tal, alltsa exakt det Borsdata levererar med period, enhet
   och matt fran kallan. Gar de inte igenom ar det vart fel, inte underlagets.

   Vad som ar riktigt har
   ----------------------
     arkivet      laser produktionens KV, samma dokument som en kund far
     nyckeltalen  hamtas live fran Borsdata, samma kod som nattjobbet kor
     modellen     riktiga Anthropic, riktig verktygsloop, riktig granskare
     Supabase     stubbad. Vi behover ingen session for att prova modellen.

   Nyckeltalen hamtas live i stallet for att lasas ur arkiv:nyckeltal, eftersom
   den nyckeln skrivs forst av nasta nattjobb. Bygget ar identiskt med
   natt.mjs, sa det som provas ar den vag chatten kommer att ha.

   INGET SKRIVS. Ingen KV-put, inget brev, inget mejl. Bara lasningar.

   Kostar modellanrop, cirka 25 ore per fraga. Ingar darfor inte i
   `npm run check`. Kors via .github/workflows/prova-fraga.yml (basfragor).
*/

import { execFileSync } from 'node:child_process';
import { onRequestPost } from '../functions/api/fraga.js';
import { byggBorsdata } from '../motor/borsdata.mjs';
import { skapaFaktaregister } from '../functions/api/_faktaregister.js';

const NYCKEL = process.env.ANTHROPIC_API_KEY;
if (!NYCKEL) { console.error('ANTHROPIC_API_KEY saknas.'); process.exit(1); }
if (!process.env.BORSDATA_API) { console.error('BORSDATA_API saknas.'); process.exit(1); }

const NS = '97d78256ff664c54a724878034c8f0fd'; // upptack-data, samma som motor/state-kv.mjs
const ANTAL_BOLAG = Number(process.env.FRAGA_BAS_BOLAG || 2);

/* FRAGA_BAS_TEMP injicerar temperature i varje modellanrop.

   AVFARDAT 2026-09-12, lamnat kvar sa ingen provar igen: bade Haiku 4.5 och
   Sonnet 5 svarar "`temperature` is deprecated for this model" med HTTP 400.
   Samplingen gar alltsa inte att skruva ner, och variationen mellan tva
   korningar av samma fraga maste tas om hand nagon annanstans an i modellen.

   FRAGA_BAS_UPPREPA=3 staller samma fraga tre ganger. Det ar det enda sattet
   att mata om ett utfall ar stabilt eller en slump. */
const TEMP = process.env.FRAGA_BAS_TEMP === '' || process.env.FRAGA_BAS_TEMP === undefined
  ? null : Number(process.env.FRAGA_BAS_TEMP);
if (TEMP !== null && !Number.isFinite(TEMP)) { console.error('FRAGA_BAS_TEMP maste vara ett tal.'); process.exit(1); }
const UPPREPA = Math.max(1, Number(process.env.FRAGA_BAS_UPPREPA || 1));

/* FRAGA_BAS_MODELL=claude-sonnet-5 tvingar svarsgeneratorn till en viss modell.
   Routningen valjer annars Haiku for det mesta, av kostnadsskal.

   Granskaren och redigeraren lamnas ORORDA: provet ska mata vad en starkare
   SVARSMODELL gor med samma underlag och samma grindar, inte byta ut hela
   kedjan. Sonnet kostar exakt 2x Haiku per token, sa fragan ar om den behover
   farre varv och haller kontraktet oftare, alltsa betalar en del av sig sjalv. */
const MODELL = process.env.FRAGA_BAS_MODELL || '';

/* Prislista, USD per miljon token. Lokal konstant, ingen API-uppgift: andras
   priserna blir siffran nedan fel utan att nagot larmar. Cache-lasning kostar
   0,1x och cache-skrivning 1,25x av inpriset. */
const PRIS = {
  'claude-sonnet-5': { in: 2, ut: 10 },
  'claude-haiku-4-5-20251001': { in: 1, ut: 5 },
};
const USD_SEK = 10.5; // ungefarlig kurs, for att gora talen lasbara i kronor

/* Modellbytet sker i fetch-lagret, men fraga.js loggar den modell den SJALV
   valde, innan dess. Forsta jamforelsen prissatte darfor en Sonnet-korning som
   Haiku, alltsa halva notan. Overskrivningen galler exakt momentet "svar", som
   ar det enda som byts, sa prissattningen foljer samma regel. */
function kostnad(anrop) {
  const p = PRIS[MODELL && anrop.moment === 'svar' ? MODELL : anrop.modell];
  if (!p) return null;
  return ((anrop.inputTokens || 0) * p.in
    + (anrop.cacheSkrivet || 0) * p.in * 1.25
    + (anrop.cacheLast || 0) * p.in * 0.1
    + (anrop.outputTokens || 0) * p.ut) / 1e6;
}

/* ---- produktionens arkiv, last ur KV ---- */

function kv(nyckel) {
  const ut = execFileSync('npx', ['--yes', 'wrangler@4', 'kv', 'key', 'get',
    '--namespace-id=' + NS, nyckel, '--remote'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    shell: process.platform === 'win32',
  });
  // Wrangler skriver vardet ratt ut, men en banner kan smita med fore det.
  const start = [ut.indexOf('{'), ut.indexOf('[')].filter(i => i >= 0).sort((a, b) => a - b)[0];
  if (start === undefined) return null;
  try { return JSON.parse(ut.slice(start)); } catch { return null; }
}

console.log('Laser produktionens arkivindex ur KV.');
const index = kv('arkiv:index') || [];
if (!index.length) { console.error('arkiv:index ar tomt eller gick inte att lasa.'); process.exit(1); }
console.log(`  ${index.length} bolag i indexet.`);

/* Valj de forsta bolagen som BADE har dokument i arkivet OCH traff hos
   Borsdata. Bada kraven ar produktionens: utan dokument slapps bolaget innan
   nyckeltalen ens lases, sa ett bolag med bara Borsdata-tal ger inget svar.

   FRAGA_BAS_BOLAG_NAMN=Unibap pekar ut bolag i stallet for att ta de forsta.
   Behovs for fragor som handlar om ett visst bolag, till exempel en relation
   till en motpart som bara namns i det bolagets egen kommunikation. */
const onskade = (process.env.FRAGA_BAS_BOLAG_NAMN || '').split(',').map(s => s.trim()).filter(Boolean);
const ordning = onskade.length
  ? index.filter(p => onskade.some(o => (p.namn || p.id || '').toLowerCase().includes(o.toLowerCase())))
  : index;
if (onskade.length && !ordning.length) { console.error('FRAGA_BAS_BOLAG_NAMN matchade inget bolag i arkivindexet.'); process.exit(1); }
const kandidater = [];
for (const post of ordning) {
  if (kandidater.length >= ANTAL_BOLAG * 3) break;
  const a = kv('arkiv:' + post.id);
  if (a && (a.dokument || []).length) kandidater.push({ id: post.id, namn: a.namn || post.namn, arkiv: a });
}
console.log(`  ${kandidater.length} av dem har dokument i arkivet.`);

console.log('\nHamtar nyckeltal och kvartalsrakenskaper fran Borsdata.');
const borsdata = await byggBorsdata(kandidater.map(k => k.namn));
if (borsdata.av) { console.error('Borsdata av: ' + borsdata.av); process.exit(1); }

const bolagen = kandidater
  .map(k => ({ ...k, rad: borsdata.rader.find(r => r.bolag === k.namn) }))
  .filter(k => k.rad && ((k.rad.vardering?.nyckeltal || []).length || (k.rad.rakenskaper || []).length))
  .slice(0, ANTAL_BOLAG);

if (!bolagen.length) { console.error('Inget bolag har bade arkivdokument och Borsdata-tal.'); process.exit(1); }
for (const b of bolagen) {
  console.log(`  ${b.namn}: ${b.arkiv.dokument.length} dokument, `
    + `${(b.rad.vardering?.nyckeltal || []).length} nyckeltal, `
    + `${(b.rad.rakenskaper || []).length} kvartalsposter, valuta ${b.rad.valuta || 'okand'}`);
}

/* Samma form som natt.mjs skriver till arkiv:nyckeltal. */
const NYCKELTALSBOK = {
  uppdaterad: new Date().toISOString(),
  kalla: 'borsdata',
  bolag: bolagen.map(b => ({
    bolagId: b.id, bolag: b.namn, valuta: b.rad.valuta || null,
    nyckeltal: b.rad.vardering?.nyckeltal || [],
    rakenskaper: b.rad.rakenskaper || [],
  })),
};

const BUCKET = {
  'arkiv:index': index,
  'arkiv:nyckeltal': NYCKELTALSBOK,
  ...Object.fromEntries(bolagen.map(b => ['arkiv:' + b.id, b.arkiv])),
};

/* ---- stubbad omgivning, riktig modell ---- */

const UID = '00000000-0000-4000-8000-000000000000';
const HOLDINGS = bolagen.map((b, i) => ({
  id: 'h-' + i, name: b.namn, quantity: 100, gav: 100, relation: 'ager',
}));

/* ---- ryms posterna over huvud taget? ----

   Faktaregistret har ett tak pa 40 kB och halverar det under starten, sa
   Borsdatas poster far cirka 20 kB. Slar det i taket faller resten bort TYST:
   modellen ser aldrig att de funnits, och loggen sa det inte heller. Utan den
   har listan gar det inte att skilja "modellen skrev fel" fran "talet fanns
   aldrig att referera till". Ingen modell, inga pengar. */
function registeranalys(bok, fragetext) {
  const r = skapaFaktaregister();
  r.synka({ question: fragetext, holdings: HOLDINGS, arkiv: [], utdrag: [], nyckeltal: bok.bolag });
  const poster = r.poster().filter(p => (p.kallor || []).some(k => k.typ === 'borsdata'));
  const erbjudna = bok.bolag.reduce((sum, b) => sum
    + (b.nyckeltal || []).reduce((a, t) => a + 1 + (t.historik || []).length + (t.median ? 1 : 0), 0)
    + (b.rakenskaper || []).length, 0);
  return { poster, erbjudna, status: r.status(),
    kvartal: poster.filter(p => Number.isInteger(p.kvartal)),
    matt: [...new Set(poster.map(p => p.matt))] };
}

console.log('\nRYMS BORSDATA-POSTERNA I FAKTAREGISTRET?');
{
  const a = registeranalys(NYCKELTALSBOK, 'Hur har rorelsemarginalen utvecklats?');
  console.log(`  ${a.erbjudna} poster erbjudna, ${a.poster.length} kom in, varav `
    + `${a.kvartal.length} kvartalsposter. Registret: ${a.status.bytes} byte`
    + (a.status.begransat ? '  <-- TAKET SLOG I' : ''));
  console.log('  matt som overlevde: ' + (a.matt.join(', ') || '(inga)'));
  const perBolag = {};
  for (const p of a.poster) (perBolag[p.bolag] ||= []).push(p.matt);
  for (const [b, m] of Object.entries(perBolag))
    console.log(`    ${b}: ${m.length} poster, ${new Set(m).size} olika matt`);
}

const skrivningar = [];
const DATA = {
  async get(k, typ) {
    const v = BUCKET[k];
    if (v === undefined) return null;
    return typ === 'json' ? structuredClone(v) : v;
  },
  // Provet skriver inte till produktionens KV. Put fangas och raknas.
  async put(k, v) { skrivningar.push(k); try { BUCKET[k] = JSON.parse(v); } catch { BUCKET[k] = v; } },
};

/* Modellens RATEXT och granskarens SKAL, och reparationsbeskedet den fick.

   Forsta korningen sa att sex fragor blockerades men inte varfor. Ett
   blockerat svar visar bara etiketten, aldrig meningen som fallde, och da gar
   det inte att avgora om det var ett formatfel eller en verklig lucka i
   underlaget. Ratexten lamnar aldrig provet. */
const ratext = [], domen = [], reparationsbesked = [];
/* Bevis att modellbytet faktiskt skedde. Utan raknaren gick det inte att skilja
   "Sonnet svarade" fran "overskrivningen tog aldrig", och i forsta jamforelsen
   sa loggen "haiku" i bada korningarna. */
let bytta = 0;
const riktigFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const ok = body => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  if (u.includes('/auth/v1/user')) return ok({ id: UID });
  if (u.includes('/rest/v1/holdings')) return ok(HOLDINGS);
  if (u.includes('/rest/v1/theses')) return ok([]);
  if (u.includes('api.anthropic.com')) {
    const begaran = JSON.parse(init.body);
    const systemtext = typeof begaran.system === 'string' ? begaran.system
      : (begaran.system || []).map(b => b?.text || '').join('');
    const granskar = systemtext.startsWith('Du granskar ett svar');
    const redigerar = systemtext.startsWith('Du redigerar ett svar');
    // Bara svarsgeneratorn byts. Granskaren valjer redan modell efter vad den
    // ska bedoma, och att rora den hade gjort jamforelsen omojlig att tolka.
    if (MODELL && !granskar && !redigerar && begaran.model !== MODELL) {
      init = { ...init, body: JSON.stringify({ ...begaran, model: MODELL }) };
      bytta++;
    }
    /* EXPERIMENT: temperature.

       functions/api/fraga.js satter ingen temperature alls, sa varje anrop gar
       pa leverantorens standard 1,0: generatorn, reparationsvarvet OCH
       granskaren. motor/llm.mjs, som skriver nattbrevet, kor temperatur 0.
       Skillnaden ar oavsiktlig, och den ar den troliga orsaken till att samma
       fraga med samma underlag blockerades i ena korningen och svarade i
       nasta. Provet injicerar vardet har i stallet for i produktionskoden, sa
       ingenting andras skarpt forran matningen sagt nagot. */
    if (TEMP !== null) init = { ...init, body: JSON.stringify({ ...begaran, temperature: TEMP }) };
    // Serverns eget nej till modellen kommer tillbaka som ett tool_result med
    // is_error. Det ar exakt beskedet modellen fick chansen att rata sig pa.
    for (const m of begaran.messages || [])
      for (const b of Array.isArray(m.content) ? m.content : [])
        if (b.type === 'tool_result' && b.is_error) reparationsbesked.push(String(b.content).slice(0, 400));
    const r = await riktigFetch(url, init);
    if (!r.ok) {
      if (r.status === 400) {
        const fel = await r.clone().json().catch(() => ({}));
        // Skriv aldrig ut nyckeln, aven om leverantoren speglar tillbaka den.
        console.error('API-KONTRAKTSFEL: ' + String(fel.error?.message || 'HTTP 400').split(NYCKEL).join('[hemlighet]').slice(0, 800));
        process.exit(2);
      }
      return r;
    }
    const kropp = await r.json();
    const svara = (kropp.content || []).find(b => b.type === 'tool_use' && b.name === 'svara');
    const text = svara ? JSON.stringify(svara.input) : (kropp.content || []).map(b => b.text || '').join('').trim();
    if (granskar) domen.push(text); else if (text) ratext.push(text);
    return ok(kropp);
  }
  return riktigFetch(url, init);
};

const ENV = {
  ANTHROPIC_API_KEY: NYCKEL,
  SUPABASE_SECRET_KEY: 'stubbad',
  SUPABASE_URL: 'https://sb.stub.test',
  DATA,
};

async function fraga(text) {
  const request = new Request('https://kurs.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question: text, token: 'stubbad' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const t0 = Date.now();
  ratext.length = 0; domen.length = 0; reparationsbesked.length = 0; bytta = 0;
  const r = await onRequestPost({ request, env: ENV });
  const d = await r.json();
  return { status: r.status, ms: Date.now() - t0, ...d };
}

/* ---- fragorna ----

   Var och en ar en LAGER 1-fraga: svaret star i Borsdatas standardiserade tal
   for hela koncernen, med period och enhet fran kallan. Ingen av dem kraver
   segment, justerade matt eller orsaksforklaring. Gar de inte igenom ar det
   var brist.

   {b} ar forsta bolaget, {b2} det andra. Ar bara ett bolag valt hoppas de
   fragor over som behover tva. */
const MALLAR = [
  ['marginalserie',     'Hur har rörelsemarginalen i {b} utvecklats de senaste åren?'],
  ['halvarssumma',      'Vad blev {b}:s nettoomsättning under första halvåret det senaste hela året, och hur räknade du fram den?'],
  ['kvartalsforandring','Hur stor var {b}:s nettoomsättning det senaste rapporterade kvartalet, och hur mycket ändrades den mot kvartalet före?'],
  ['vardering',         'Vad ligger {b} på för P/E i dag jämfört med sin egen historiska median?'],
  ['kassaflode',        'Hur mycket fritt kassaflöde genererade {b} under de fyra senaste kvartalen?'],
  ['aktier',            'Hur många aktier har {b}, och har antalet förändrats under de kvartal du har underlag för?'],
  ['skuldsattning',     'Hur stor är {b}:s nettoskuld, och hur ser den ut i förhållande till eget kapital?'],
  ['roic',              'Hur har {b}:s ROIC och soliditet utvecklats de senaste åren?'],
  ['jamforelse',        'Jämför rörelsemarginalen i {b} och {b2} för det senaste hela året. Vilken skillnad är det, i procentenheter?', 2],
  /* RELATIONSFRAGAN, och den ar inte en sifferfraga alls.

     Sebastian bad om att fa se kopplingar mellan tva bolag och foreslog
     LinkedIn. Svaret star i stallet i bolagets egen reglerade kommunikation:
     nio av fyrtio Unibap-dokument i vart arkiv namner Loft Orbital. Fragan
     provar om boten hittar dit med las_mer och sokord, utan att rakna pa
     nagot. Motparten satts med FRAGA_BAS_MOTPART. */
  /* DEN TYNGRE FRAGAN, i Sebastians anda.

     Kravet ar inte att hitta en uppgift utan att lagga ihop flera dokument
     till en rod trad, OCH att sjalv namna var traden slutar. Den har inget
     facit i en tabell: den provar omdome, och den provar om modellen kan skilja
     det bolaget faktiskt skrivit fran det som later rimligt.

     Darfor ar den ocksa ratt fraga att jamfora Haiku och Sonnet pa. En starkare
     modell borde synas har, inte pa "vad blev omsattningen". */
  ['beroende',          'Hur beroende är {b} av ' + (process.env.FRAGA_BAS_MOTPART || 'Loft Orbital') +
    ' som kund? Gå igenom vad bolagets egen kommunikation faktiskt säger, och var tydlig med ' +
    'vad som inte går att avgöra ur underlaget.'],
  /* TESSTARKANDE SLUTLEDNING, piloten bad om den uttryckligen:
     "vore trevligt om AI lagger ihop 1+1 utifran det som har kommunicerats.
     Inte med for mycket positiv tolkning men bara utifran det som ar
     kommunicerat."

     Det ar precis vad ett tolkningsblock ar till for: ett resonemang med stod
     i namngivna poster. Fragan provar om boten VAGAR dra slutsatsen alls, och
     om granskaren later den sta nar den ar villkorad. */
  ['tesstarkande',      'Kunden säger sig se fram emot att använda {b}:s produkter i kommande ' +
    'konstellationer. Vad talar i bolagets egen kommunikation för fortsatta affärer med ' +
    (process.env.FRAGA_BAS_MOTPART || 'Loft Orbital') + ', och vad är fortfarande bara en avsiktsförklaring?'],
  ['koppling',          'Finns det några kopplingar mellan {b} och ' +
    (process.env.FRAGA_BAS_MOTPART || 'Loft Orbital') +
    '? Sök i bolagets egen kommunikation och visa vad som faktiskt står där.'],
];

const b1 = bolagen[0].namn, b2 = bolagen[1]?.namn;
/* FRAGA_BAS_URVAL=marginalserie,roic kor bara de namngivna. Finns for att en
   uppfoljning pa de blockerade fragorna inte ska behova betala for de som
   redan svarat. Tomt varde kor allihop. */
const urval = (process.env.FRAGA_BAS_URVAL || '').split(',').map(s => s.trim()).filter(Boolean);
const PROV = MALLAR
  .filter(m => (m[2] || 1) <= bolagen.length)
  .filter(m => !urval.length || urval.includes(m[0]))
  .map(([namn, mall]) => ({ namn, fraga: mall.split('{b2}').join(b2 || '').split('{b}').join(b1) }));
if (!PROV.length) { console.error('FRAGA_BAS_URVAL matchade ingen fraga.'); process.exit(1); }

/* ---- korningen ---- */

console.log('\nTEMPERATURE: ' + (TEMP === null ? 'orord, leverantorens standard (som i produktion)' : TEMP)
  + '.  UPPREPNINGAR: ' + UPPREPA + ' per fraga.'
  + (MODELL ? '\nSVARSMODELL TVINGAD TILL: ' + MODELL + ' (granskare och redigerare oforandrade).' : ''));

const utfall = [];
const korningar = PROV.flatMap(p => Array.from({ length: UPPREPA }, (_, i) => ({ ...p, varv: i + 1 })));
for (const p of korningar) {
  console.log('\n' + '='.repeat(74));
  console.log(p.namn.toUpperCase() + (UPPREPA > 1 ? '  (varv ' + p.varv + ' av ' + UPPREPA + ')' : ''));
  console.log('FRÅGA: ' + p.fraga);
  const d = await fraga(p.fraga);
  const t = d.tackning || {};
  const anrop = t.anropstider || [];
  const usd = anrop.reduce((s, a) => s + (kostnad(a) || 0), 0);
  const okand = anrop.filter(a => kostnad(a) === null).map(a => a.modell);

  if (d.error) {
    console.log('FEL (' + d.status + '): ' + d.error);
    utfall.push({ ...p, fel: true, ms: d.ms, usd });
    continue;
  }

  console.log('\nSVAR:\n' + (d.answer || '(inget svar)'));
  if (d.blockerat) {
    console.log('\n!! BLOCKERAT: ' + (d.verifiering?.orsak || 'okant'));
    // Serverns nej, granskarens skal och modellens ratext. Etiketten ensam gor
    // det omojligt att skilja ett formatfel fran en verklig lucka i underlaget.
    for (const besked of reparationsbesked)
      console.log('   SERVERNS NEJ TILL MODELLEN: ' + besked);
    if (domen.length) console.log('   GRANSKARENS SKAL: ' + domen.at(-1).slice(0, 600));
    if (ratext.length) console.log('   MODELLENS STOPPADE SVAR: ' + ratext.at(-1).slice(0, 1600));
  }

  console.log('\nVAG:  modell ' + t.modell + (t.modellfall ? '  <-- FALL TILLBAKA' : '')
    + ', ' + (t.modellanrop || 0) + ' modellanrop, ' + (t.gravvarv || 0) + ' gravvarv'
    + ', ' + (t.reparation || 0) + ' reparationer');
  console.log('      verktyg   ' + (t.verktyg?.length ? t.verktyg.join(', ') : '(inga)'));
  console.log('      nyckeltal ' + (t.nyckeltal?.length ? t.nyckeltal.join(' | ') : '(inga, Börsdata nådde inte fram)'));
  console.log('      beräkningar ' + (t.berakningar || []).filter(x => x.ok).length + ' godkända, '
    + (t.berakningar || []).filter(x => !x.ok).length + ' avslagna');
  /* Avgorande, och den var osynlig i forsta korningen: registret har ett tak
     pa 40 kB och halverar det under starten. Slar det i taket faller poster
     bort TYST, och modellen ser aldrig att de funnits. */
  const reg = t.faktaregister || {};
  console.log('      register  ' + (reg.poster ?? '?') + ' poster, ' + (reg.bytes ?? '?') + ' byte'
    + (reg.begransat ? '   <-- TAKET SLOG I, poster foll bort' : ''));
  for (const b of (t.berakningar || []).filter(x => !x.ok))
    console.log('        avslag: ' + String(b.skal || '').slice(0, 140));

  const moment = Object.entries(t.tider?.moment || {}).sort((a, b) => b[1] - a[1]);
  console.log('\nTID:  ' + d.ms + ' ms totalt');
  for (const [m, ms] of moment)
    console.log('      ' + m.padEnd(14) + String(ms).padStart(6) + ' ms   ' + Math.round(ms / d.ms * 100) + ' %');
  console.log('      varav modellanrop: ' + anrop.map(a => a.moment + ' ' + a.ms + 'ms').join(', '));

  if (MODELL) console.log('      modellbyten ' + bytta + ' av '
    + anrop.filter(a => a.moment === 'svar').length + ' svarsanrop gick till ' + MODELL);
  console.log('\nKOST: ' + usd.toFixed(4) + ' USD, ' + (usd * USD_SEK).toFixed(2) + ' kr'
    + (okand.length ? '  (okänd prislista för ' + [...new Set(okand)].join(', ') + ')' : ''));
  for (const [m, v] of Object.entries(t.tokens || {}))
    console.log('      ' + m.padEnd(12) + v.anrop + ' anrop, in ' + v.in + ', ut ' + v.ut
      + ', cache läst ' + v.cacheLast + ', cache skrivet ' + v.cacheSkrivet);
  const cacheLast = anrop.reduce((s, a) => s + (a.cacheLast || 0), 0);
  const cacheBas = cacheLast + anrop.reduce((s, a) => s + (a.inputTokens || 0) + (a.cacheSkrivet || 0), 0);
  console.log('      cacheträff: ' + (cacheBas ? Math.round(cacheLast / cacheBas * 100) : 0) + ' % av all input');

  utfall.push({ ...p, ms: d.ms, usd, blockerat: !!d.blockerat, modell: t.modell,
    modellanrop: t.modellanrop, cache: cacheBas ? cacheLast / cacheBas : 0,
    nyckeltal: !!t.nyckeltal?.length, moment });
}

/* ---- sammanfattning ---- */

console.log('\n' + '='.repeat(74));
console.log('BASFRÅGOR, SAMMANFATTNING\n');
console.log('fråga'.padEnd(20) + 'modell'.padEnd(10) + 'anrop'.padEnd(7)
  + 'ms'.padStart(7) + 'kr'.padStart(8) + 'cache'.padStart(8) + '  utfall');
for (const u of utfall) {
  console.log((u.namn + (UPPREPA > 1 ? ' #' + u.varv : '')).padEnd(20)
    + String(u.modell || '-').replace('claude-', '').replace('-4-5-20251001', '').replace('-5', '').padEnd(10)
    + String(u.modellanrop ?? '-').padEnd(7)
    + String(u.ms).padStart(7)
    + (u.usd * USD_SEK).toFixed(2).padStart(8)
    + (Math.round((u.cache || 0) * 100) + '%').padStart(8)
    + '  ' + (u.fel ? 'FEL' : u.blockerat ? 'BLOCKERAT' : 'svar'));
}
const total = utfall.reduce((s, u) => s + u.usd, 0);
const medel = utfall.length ? total / utfall.length : 0;
console.log('\nTotalt ' + total.toFixed(3) + ' USD, ' + (total * USD_SEK).toFixed(2) + ' kr för '
  + utfall.length + ' frågor. Medel ' + (medel * USD_SEK).toFixed(2) + ' kr per fråga.');
console.log('Blockerade: ' + utfall.filter(u => u.blockerat).length + '. Fel: ' + utfall.filter(u => u.fel).length + '.');
console.log('Med Börsdata-tal i registret: ' + utfall.filter(u => u.nyckeltal).length + ' av ' + utfall.length + '.');

/* STABILITETEN, och den ar hela poangen med upprepningen.

   Ett blockerat svar sager ingenting om fragan om samma fraga svarar nasta
   gang. Vaxlar utfallet mellan varven ar det inte underlaget som avgor om
   anvandaren far ett svar, utan slumpen i samplingen, och det ar ett annat
   och varre problem an en datalucka. */
if (UPPREPA > 1) {
  console.log('\nSTABILITET (temperature ' + (TEMP === null ? 'orord' : TEMP) + '):');
  console.log('fråga'.padEnd(20) + 'blockerade'.padEnd(13) + 'kr, lägst till högst'.padEnd(24) + 'ms, lägst till högst');
  for (const p of PROV) {
    const v = utfall.filter(u => u.namn === p.namn);
    const kr = v.map(u => u.usd * USD_SEK), ms = v.map(u => u.ms);
    const blockerade = v.filter(u => u.blockerat).length;
    console.log(p.namn.padEnd(20)
      + (blockerade + ' av ' + v.length).padEnd(13)
      + (Math.min(...kr).toFixed(2) + ' till ' + Math.max(...kr).toFixed(2)).padEnd(24)
      + Math.min(...ms) + ' till ' + Math.max(...ms)
      + (blockerade && blockerade < v.length ? '   <-- VÄXLAR' : ''));
  }
  const vaxlande = PROV.filter(p => {
    const v = utfall.filter(u => u.namn === p.namn).filter(u => !u.fel);
    return v.some(u => u.blockerat) && v.some(u => !u.blockerat);
  });
  console.log('\nFrågor som växlar mellan blockerat och svar: ' + vaxlande.length + ' av ' + PROV.length
    + (vaxlande.length ? ' (' + vaxlande.map(p => p.namn).join(', ') + ')' : '') + '.');
}

/* Vad som tog tid, sammanraknat over alla fragor. Det ar den siffran som sager
   var en optimering skulle gora nytta, inte enskilda utslag. */
const summerat = {};
for (const u of utfall) for (const [m, ms] of u.moment || []) summerat[m] = (summerat[m] || 0) + ms;
const totalMs = Object.values(summerat).reduce((a, b) => a + b, 0);
console.log('\nTid per moment, alla frågor:');
for (const [m, ms] of Object.entries(summerat).sort((a, b) => b[1] - a[1]))
  console.log('  ' + m.padEnd(14) + String(ms).padStart(7) + ' ms   ' + Math.round(ms / totalMs * 100) + ' %');

if (skrivningar.length) console.log('\nKV-skrivningar fångades (aldrig skickade): ' + skrivningar.join(', '));
console.log('\nDetta provar dessa frågor mot dessa bolag, inte alla möjliga svar.');
