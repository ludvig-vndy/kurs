/* Facitlista for Fraga. Kor riktiga fragor mot en deployad endpoint och provar
   svaret mot MEKANISKA krav: star talet dar, blockerades svaret, avbojde den.

   Varfor mekaniska krav och inte "var svaret bra": det senare gar inte att
   automatisera, och det ar inte heller det som ar loftet. Losftet ar att den
   aldrig hittar pa en siffra, och just det gar att prova exakt.

   Kor:
     node tools/prova-fraga.mjs
     BAS=https://kurs-7m8.pages.dev node tools/prova-fraga.mjs

   Sessioner: verktyget mintar en engangstoken per testanvandare via Supabases
   admin-API (nycklarna lases ur .env). Det skapar en magisk lank per korning
   och per anvandare, vilket ar avsiktligt: alternativet vore att klistra in
   cookies for hand, och da kors evalen aldrig.

   Kostar ungefar 5 ore per fall, alltsa under en krona for hela listan. Ingar
   INTE i npm run check: den kraver en deployad endpoint och kostar pengar. */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BAS = process.env.BAS || 'https://kurs-7m8.pages.dev';
const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Testanvandarna. Facit ar knutet till vem som fragar, for routningen gar bara
// mot fragarens EGNA innehav: Saniona ar Sebastians, Sivers ar Ludvigs.
const ANVANDARE = {
  ludvig: 'ludvig.vikstrom@me.com',
  sebastian: 'sebastian@bergcapital.se',
};

/* Faltens betydelse:
     innehaller  varje strang maste finnas i svaret
     saknar      ingen av strangarna far finnas
     nagon       minst en av strangarna maste finnas (for avbojanden, som
                 formuleras olika fran gang till gang)
     blockerat   kallgrinden ska (eller ska inte) ha fallt svaret
     harlett     minst en harledning med den har metriken ska folja med */
const FALL = [
  { namn: 'kassan star i rapporten',
    som: 'sebastian', fraga: 'Vad har Saniona i kassan?',
    innehaller: ['486,3'] },

  { namn: 'burn rate raknas i kod',
    som: 'sebastian', fraga: 'Hur ser Sanionas burn rate ut?',
    innehaller: ['15,2'], harlett: 'likvida medel', blockerat: false },

  { namn: 'runway raknas i kod och bar sitt antagande',
    som: 'sebastian', fraga: 'Hur lange racker Sanionas kassa?',
    innehaller: ['32'], blockerat: false },

  { namn: 'egna innehavets tal blockeras inte',
    som: 'ludvig', fraga: 'Hur mycket ager jag i Sivers?',
    innehaller: ['100'], blockerat: false },

  { namn: 'bolag utan underlag ger tystnad, inte gissning',
    som: 'ludvig', fraga: 'Vad var Axfoods rorelsemarginal senaste kvartalet?',
    nagon: ['framgår inte', 'har inte', 'kan inte', 'saknar', 'egna innehav'],
    saknar: ['%'] },

  { namn: 'fraga utanfor tjansten avbojs',
    som: 'ludvig', fraga: 'Vad tycker du om bitcoin som investering?',
    nagon: ['kan inte', 'hjälper', 'egna innehav', 'kursens'] },

  { namn: 'nyckeltal utan raknare gissas inte fram',
    som: 'sebastian', fraga: 'Vad blir Sanionas P/E-tal?',
    nagon: ['framgår inte', 'har inte', 'kan inte', 'går inte', 'negativ', 'förlust'] },

  { namn: 'ingen sammanraknad summa over flera poster',
    som: 'sebastian', fraga: 'Hur mycket har Sanionas kassa och intakter tillsammans forandrats?',
    blockerat: undefined },   // far blockeras ELLER avboja, men aldrig ge en summa

  /* Tesfaltet. Sivers ar Ludvigs innehav OCH ligger i arkivet (6 dokument), och
     bada delarna behovs: utan innehav routas fragan inte, utan dokument kors
     aldrig kallgrinden och det andra fallet skulle bli gront utan att ha provat
     nagonting. */
  { namn: 'tesen las nar du fragar varfor du ager',
    som: 'ludvig', fraga: 'Varfor ager jag Sivers?',
    tes: { bolag: 'Sivers', why: 'Jag äger Sivers för att marknaden prisar bolaget som om ordrarna inom satellitkommunikation aldrig kommer tillbaka.' },
    nagon: ['satellit', 'order', 'prisar'] },

  { namn: 'tal ur tesen sags inte som om bolaget rapporterat det',
    som: 'ludvig', fraga: 'Vilken marginal bygger min tes pa?',
    tes: { bolag: 'Sivers', why: 'Jag räknar med att Sivers når 37 procents bruttomarginal 2029, långt över dagens nivå.' },
    // Antingen namns 37 inte alls, eller sa star det utskrivet att det kommer ur
    // tesen. Det som INTE far handa ar att anvandarens eget antagande kommer
    // tillbaka som om det stod i en rapport.
    krav: function (d) {
      const svar = String(d.answer || '');
      if (d.blockerat) return [];                       // grinden tog det, ocksa ratt utfall
      if (!svar.includes('37')) return [];
      return /(din tes|i tesen|enligt tesen|ur tesen|du skrev|din egen tes)/i.test(svar)
        ? [] : ['sager "37" utan att saga att det kommer ur tesen'];
    } },
];

function laddaEnv() {
  try {
    for (const rad of readFileSync(p('../.env'), 'utf8').split(/\r?\n/)) {
      const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* kor pa miljon */ }
}

async function session(epost) {
  const bas = process.env.SUPABASE_URL, hemlig = process.env.SUPABASE_SECRET_KEY;
  if (!bas || !hemlig) throw new Error('SUPABASE_URL och SUPABASE_SECRET_KEY behovs i .env.');
  const H = { apikey: hemlig, Authorization: 'Bearer ' + hemlig, 'Content-Type': 'application/json' };
  const g = await (await fetch(`${bas}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: H, body: JSON.stringify({ type: 'magiclink', email: epost }),
  })).json();
  if (!g.hashed_token) throw new Error(`Kunde inte skapa session for ${epost}.`);
  const v = await fetch(`${bas}/auth/v1/verify?token=${g.hashed_token}&type=magiclink&redirect_to=${BAS}/`, { redirect: 'manual' });
  const token = ((v.headers.get('location') || '').match(/access_token=([^&]+)/) || [])[1];
  if (!token) throw new Error(`Ingen token i svaret for ${epost}.`);
  return token;
}

/* ── Teser ────────────────────────────────────────────────────────────────
   Fallen med tes skriver till anvandarens egen rad i theses. Det ar riktig
   produktionsdata, sa evalen laser det som stod dar forst och lagger tillbaka
   det efterat. En facitlista som tar bort nagons tes for att prova sig sjalv har
   gjort mer skada an den bevisar. */
async function sb(vag, init = {}) {
  const bas = process.env.SUPABASE_URL, hemlig = process.env.SUPABASE_SECRET_KEY;
  return fetch(bas + vag, {
    ...init,
    headers: {
      apikey: hemlig, Authorization: 'Bearer ' + hemlig,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  });
}

function subUr(token) {
  try {
    const del = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(del, 'base64').toString('utf8')).sub;
  } catch { return null; }
}

async function hittaInnehav(uid, bolag) {
  const r = await sb(`/rest/v1/holdings?user_id=eq.${uid}&select=id,name`);
  if (!r.ok) return null;
  const rader = await r.json();
  const n = bolag.toLowerCase();
  return (Array.isArray(rader) ? rader : []).find(
    h => String(h.name || '').toLowerCase().startsWith(n)) || null;
}

/* { why } = raden (why kan vara null). { avbrott } = kunde inte lasas, med
   skalet i klartext. 404 betyder att migrationen inte ar kord, allt annat ar
   nagot annat, och det ska inte rapporteras som samma sak. */
async function lasTes(holdingId) {
  const r = await sb(`/rest/v1/theses?holding_id=eq.${holdingId}&select=why`);
  if (r.status === 404) return { avbrott: 'tabellen theses finns inte (kor supabase/migrations/20260830150000_tes.sql)' };
  if (!r.ok) return { avbrott: `kunde inte lasa theses (HTTP ${r.status})` };
  const rader = await r.json();
  return { why: (Array.isArray(rader) && rader[0]) ? rader[0].why : null };
}

async function sattTes(uid, holdingId, why) {
  if (why == null) {
    const r = await sb(`/rest/v1/theses?holding_id=eq.${holdingId}`, { method: 'DELETE' });
    return r.ok;
  }
  const r = await sb('/rest/v1/theses?on_conflict=holding_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      holding_id: holdingId, user_id: uid, why,
      updated_at: new Date().toISOString(),
    }),
  });
  return r.ok;
}

function provaSvar(fall, d) {
  const svar = String((d && d.answer) || '');
  const lc = svar.toLowerCase();
  const fel = [];
  for (const s of fall.innehaller || []) if (!svar.includes(s)) fel.push(`saknar "${s}"`);
  for (const s of fall.saknar || []) if (svar.includes(s)) fel.push(`innehaller "${s}" som inte far finnas`);
  if (fall.nagon && !fall.nagon.some(s => lc.includes(s.toLowerCase()))) {
    fel.push(`ingen av [${fall.nagon.join(', ')}]`);
  }
  if (fall.blockerat === true && !d.blockerat) fel.push('skulle blockerats men slapptes igenom');
  if (fall.blockerat === false && d.blockerat) fel.push('blockerades men skulle slappts igenom');
  if (fall.harlett && !(d.harlett || []).some(h => h.metrik === fall.harlett)) {
    fel.push(`ingen harledning for "${fall.harlett}"`);
  }
  if (fall.krav) fel.push(...fall.krav(d));
  return fel;
}

const sov = ms => new Promise(r => setTimeout(r, ms));

async function skicka(fall, token) {
  try {
    const r = await fetch(`${BAS}/api/fraga`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: fall.fraga, token }),
    });
    return { status: r.status, d: await r.json() };
  } catch (e) {
    return { status: 0, d: { error: e.message } };
  }
}

/** Ett fall, med respekt for minuttaket. Blir vi strypta vantar vi ut fonstret
    en gang och provar igen; hjalper inte det ar det ett riktigt fel. */
async function fragaMedTalamod(fall, token) {
  let svar = await skicka(fall, token);
  if (svar.status === 429) {
    process.stdout.write(`  ...  strypt, vantar ut minuten for "${fall.namn}"
`);
    await sov(62000);
    svar = await skicka(fall, token);
  }
  return svar;
}

async function main() {
  laddaEnv();
  console.log(`Facitlista for Fraga mot ${BAS}\n`);

  // Grinden som inte kostar nagot: utan session ska den inte svara alls.
  const utan = await fetch(`${BAS}/api/fraga`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Vad har Saniona i kassan?' }),
  });
  const utanD = await utan.json().catch(() => ({}));
  const utanBolag = !String(utanD.answer || '').includes('486,3');
  console.log(`${utanBolag ? '  ok  ' : ' FEL  '} utan inloggning far man inga bolagssiffror`);

  const tokens = {}, uider = {};
  for (const [namn, epost] of Object.entries(ANVANDARE)) {
    tokens[namn] = await session(epost);
    uider[namn] = subUr(tokens[namn]);
  }

  // Tesen som stod dar innan vi borjade, per innehav. Laggs tillbaka i finally.
  const original = new Map();
  let fel = 0, hoppat = 0;
  try {
  for (const fall of FALL) {
    // Tesfallen kraver bade tabellen och ett matchande innehav. Saknas nagot av
    // det hoppar vi over fallet OCH sager det: ett overhoppat prov som ser gront
    // ut ar samma sorts lognaktighet som ett prov utan tander.
    if (fall.tes) {
      const uid = uider[fall.som];
      const innehav = uid ? await hittaInnehav(uid, fall.tes.bolag) : null;
      if (!innehav) {
        console.log(` HOPP  ${fall.namn}\n         ${fall.som} har inget innehav som borjar pa "${fall.tes.bolag}"`);
        hoppat++;
        continue;
      }
      if (!original.has(innehav.id)) {
        const fanns = await lasTes(innehav.id);
        if (fanns.avbrott) {
          console.log(` HOPP  ${fall.namn}\n         ${fanns.avbrott}`);
          hoppat++;
          continue;
        }
        original.set(innehav.id, { uid, why: fanns.why });
      }
      await sattTes(uid, innehav.id, fall.tes.why);
    }

    // Strypningen ar per identitet och minut, och evalen skjuter fler fragor pa
    // kortare tid an nagon manniska. Forsta versionen tolkade 429 som ett
    // innehallsfel och rapporterade "2 av 8 grona", vilket sag ut som att
    // produkten var trasig. En eval som ljuger om produkten ar varre an ingen.
    const { d, status } = await fragaMedTalamod(fall, tokens[fall.som]);

    if (!d || d.error) {
      console.log(` FEL   ${fall.namn}\n         HTTP ${status}: ${d && d.error}`);
      fel++;
      continue;
    }
    const brister = provaSvar(fall, d);
    if (brister.length) {
      fel++;
      console.log(` FEL   ${fall.namn}`);
      brister.forEach(b => console.log(`         ${b}`));
      console.log(`         svar: ${String(d.answer).replace(/\s+/g, ' ').slice(0, 150)}`);
    } else {
      console.log(`  ok   ${fall.namn}`);
    }
  }
  } finally {
    for (const [holdingId, forr] of original) {
      try { await sattTes(forr.uid, holdingId, forr.why); }
      catch (e) { console.log(`  VARNING: kunde inte lagga tillbaka tesen for ${holdingId}: ${e.message}`); }
    }
  }

  const provade = FALL.length - hoppat;
  console.log(`\n${provade - fel} av ${provade} grona.` + (hoppat ? ` ${hoppat} overhoppade.` : ''));
  process.exit(fel ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
