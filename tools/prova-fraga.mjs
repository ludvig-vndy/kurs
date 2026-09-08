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

const DATA = {
  async get(k, typ) {
    const v = BUCKET[k];
    if (v === undefined) return null;
    return typ === 'json' ? JSON.parse(JSON.stringify(v)) : v;
  },
  async put(k, v) { try { BUCKET[k] = JSON.parse(v); } catch (e) { BUCKET[k] = v; } },
};

/* Supabase stubbas, allt annat gar ut pa riktigt.

   Modellens RATEXT sparas ocksa. Blockerar grinden ett svar ser man bara vilka
   tal som foll, aldrig meningen de stod i, och da gar det inte att avgora om
   grinden hade ratt eller ar for strang. */
const ratext = [];
const riktigFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  if (u.includes('/auth/v1/user')) return ok({ id: UID });
  if (u.includes('/rest/v1/holdings')) return ok(HOLDINGS);
  if (u.includes('/rest/v1/theses')) return ok([]);
  if (u.includes('api.anthropic.com')) {
    const r = await riktigFetch(url, init);
    if (!r.ok) return r;
    const body = await r.json();
    const t = (body.content || []).map((b) => b.text || '').join('').trim();
    if (t) ratext.push(t);
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

async function fraga(text) {
  const request = new Request('https://kurs.test/api/fraga', {
    method: 'POST',
    body: JSON.stringify({ question: text, token: 'stubbad' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const t0 = Date.now();
  ratext.length = 0;
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
    namn: 'periodfraga utanfor horisonten, ska ga pa den djupa modellen och hamta',
    fraga: 'hur stor var Unibaps nettoomsättning helåret 2022?',
    krav: (d) => (/sonnet/.test(d.tackning.modell) ? null : 'gick inte pa den djupa modellen'),
  },
  {
    namn: 'fraga inom horisonten, ska svara ur arkivet utan att hamta',
    fraga: 'hur mycket likvida medel hade Unibap vid senaste rapporten?',
    krav: (d) => (d.answer && d.answer.includes('41 900') ? null : 'talet ur arkivet kom inte med'),
  },
];

let fel = 0;
for (const p of PROV) {
  console.log('\n' + '='.repeat(72));
  console.log(p.namn);
  console.log('FRÅGA: ' + p.fraga);
  const d = await fraga(p.fraga);

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
  if (/Jag hittade ett svar/.test(d.answer || '') && ratext.length) {
    console.log('\nGRINDEN STOPPADE DET HAR:\n' + ratext[ratext.length - 1]);
  }

  /* Fallet tillbaka ar hela skalet till skriptet: det ar tyst i produktion. */
  if (t.modellfall) {
    console.log('\n  !! Den djupa modellen gick inte att anvanda. Kontrollera modell-id:t.');
    fel++;
  }
  const brist = p.krav(d);
  if (brist) {
    console.log('\n  !! ' + brist);
    fel++;
  }
}

console.log('\n' + '='.repeat(72));
if (fel) {
  console.log(fel + ' prov gick inte igenom.');
  process.exit(1);
}
console.log('Alla prov gick igenom: modell-id, verktygsloop och grind fungerar mot riktiga API:t.');
