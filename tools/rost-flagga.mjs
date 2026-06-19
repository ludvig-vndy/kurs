import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { loadLessons } from './lib/lessons.mjs';

/*
 * rost-flagga.mjs
 *
 * Röst- och de-AI-mätning över kurstexten. Kompletterar check-structure.mjs
 * (struktur/fakta) genom att mäta rösten. Två sorters kontroll, samma
 * uppdelning som resten av kursen:
 *
 *   HÅRD GRIND  : "hen"/"hens"/"henom" måste vara 0. Exit 1 annars.
 *   RÅDGIVANDE  : stilflaggor (antiteser, metaprat, småord, tretal) som
 *                 rankar lektioner så passet riktas mot de värsta först.
 *                 Smaksaker, inte fakta, så de FAILar aldrig.
 *   GRAMMATIK   : smal regex för "verka/känns/te sig + naket substantiv"
 *                 ("verka självmål"). Whack-a-mole som kompletterar den
 *                 oberoende modell-korrekturen och LanguageTool, ersätter
 *                 dem inte.
 *
 * Användning:
 *   node tools/rost-flagga.mjs                 # rapport, top 25
 *   node tools/rost-flagga.mjs --top 40
 *   node tools/rost-flagga.mjs --csv rost.csv  # full rapport till CSV
 */

// --- HÅRD: hen i alla böjningar. Ordgräns båda håll (ej "hennes"/"henrik").
const HEN_RE = /\bhen(s|om)?\b/gi;

// --- Antitesen: "inte X, utan Y" och "det är inte X, det är Y".
// Hålls inom en sats (inga .!?:; emellan) så vi inte spänner satsgränser.
// OBS: JS \b bygger på ASCII \w, så \b funkar inte intill å/ä/ö. Där ordet
// börjar på å/ä/ö (t.ex. "är") används svensk-medveten lookbehind i stället.
const ANTITHESIS_RES = [
  /\binte\b[^.!?:;\n]{1,60}?\butan\b/gi,
  /(?<![a-zåäöA-ZÅÄÖ])(är|var)\s+inte\b[^.!?:;\n]{1,60}?,\s*(det|den|de)\s+(är|var)\b/gi,
  /(^|[.!?]\s+)[Ii]nte\b[^.!?:;\n]{1,40},\s*[a-zåäöA-ZÅÄÖ]/g, // "Inte X, inte Y"
];

// --- Metaprat / signalfraser: texten ramar in sin egen poäng.
const SIGNAL_RES = [
  /det fina (är|med)/gi, /det vackra (är|med)/gi, /det smarta (är|med)/gi,
  /det intressanta (är|med)/gi, /det eleganta/gi, /poängen (är|med|här)/gi,
  /hela poängen/gi, /lägg märke till/gi, /\bmärk att\b/gi, /\bnotera att\b/gi,
  /lärdomen (är|här)/gi, /det leder till/gi, /det är hela (spänningen|poängen)/gi,
  /och det är (det|just det)/gi, /det är (just )?(det|här) som/gi,
  /här är (det|grejen)/gi, /sanningen är/gi, /det är precis (det|här)/gi,
  /det säger (oss )?något/gi, /lärdomen är skarp/gi, /det är kärnan/gi,
  /hela (spelet|tricket|knepet) (är|ligger)/gi, /det är skillnaden mellan/gi,
];

// --- Småord som fyller rytm. Ordgräns så "justera"/"precision" ej träffar.
const FILLER_WORDS = ['genuint', 'faktiskt', 'just', 'själva', 'själv', 'precis', 'verkligen'];

// --- Tretal: "X, Y och Z" i parallell. Tre led, sista bundet med "och/samt".
const TRETAL_RE =
  /[a-zåäöA-ZÅÄÖ][^.,!?:;\n]{1,45},\s+[^.,!?:;\n]{1,45},\s+(?:och|samt)\s+[^.,!?:;\n]{1,45}/gi;

// --- Grammatik lager 3: kopulaverb + naket substantiv (utan som/vara emellan).
// Fångar "verka självmål", "känns överkurs". Följeordet får inte vara ett
// funktionsord/adjektiv (då är konstruktionen troligen korrekt).
const GRAMMAR_RE = /\b(verkar|verkade|verka|känns|kändes|kännas|ter sig|te sig)\s+([a-zåäö]+)/gi;
const GRAMMAR_STOP = new Set([
  'som', 'vara', 'att', 'en', 'ett', 'så', 'mer', 'mindre', 'lika', 'väl',
  'rätt', 'fel', 'bra', 'dåligt', 'bättre', 'sämre', 'för', 'ganska',
  'väldigt', 'extra', 'mycket', 'lite', 'helt', 'ju', 'inte', 'redan',
  'ännu', 'ofta', 'alltid', 'aldrig', 'ha', 'haft', 'kunna', 'bli',
  'blivit', 'nog', 'kanske', 'snarare', 'och', 'eller', 'men', 'mest',
  'minst', 'ologisk', 'orimligt', 'rimligt', 'logiskt', 'vettigt', 'klokt',
  'dumt', 'självklart', 'uppenbart', 'omöjligt', 'möjligt', 'svårt',
  'enkelt', 'stabil', 'stabilt', 'rimlig', 'orimlig', 'troligt', 'sannolikt',
  'dyrt', 'billigt', 'starkt', 'svagt', 'sunt', 'osunt', 'attraktivt',
]);

// H2-mallrubriken: rådgivande flagga. OBS att check-structure.mjs KRÄVER en
// sektion som matchar /erfaren investerare/i, så rubriken får inte tas bort.
// Mallen bryts i prosan (hen + "frågar inte X utan Y"), rubriken står kvar.
const TEMPLATE_H2_RE = /erfaren investerare/i;

function stripCode(body) {
  return body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

// Räkna distinkta (icke-överlappande) träffar över flera regexar. Samlar alla
// [start,end]-spann, slår ihop överlappande, returnerar antal sammanhängande.
function countDistinctSpans(text, regexes) {
  const spans = [];
  for (const re of regexes) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(r)) spans.push([m.index, m.index + m[0].length]);
  }
  if (!spans.length) return 0;
  spans.sort((a, b) => a[0] - b[0]);
  let count = 1, end = spans[0][1];
  for (let i = 1; i < spans.length; i++) {
    if (spans[i][0] >= end) { count++; end = spans[i][1]; }
    else end = Math.max(end, spans[i][1]);
  }
  return count;
}

function measure(lesson) {
  const body = stripCode(lesson.body);
  const words = Math.max(1, body.trim().split(/\s+/).filter(Boolean).length);

  const hen = countMatches(body, HEN_RE);
  // Antiteser: slå ihop överlappande träffar så samma mening ("Inte X, utan Y")
  // inte dubbelräknas av flera mönster.
  const antithesis = countDistinctSpans(body, ANTITHESIS_RES);

  const signalHits = [];
  for (const re of SIGNAL_RES) {
    const m = body.match(re);
    if (m) signalHits.push(...m.map((s) => s.trim().toLowerCase()));
  }
  const signal = signalHits.length;

  const filler = {};
  for (const w of FILLER_WORDS) {
    const n = countMatches(body, new RegExp(`\\b${w}\\b`, 'gi'));
    if (n) filler[w] = n;
  }
  const fillerTotal = Object.values(filler).reduce((a, b) => a + b, 0);

  const tretal = countMatches(body, TRETAL_RE);

  const grammar = [];
  for (const m of body.matchAll(GRAMMAR_RE)) {
    if (!GRAMMAR_STOP.has(m[2].toLowerCase())) grammar.push(m[0].trim());
  }

  const templateH2 = lesson.sections.some((s) => TEMPLATE_H2_RE.test(s));

  // Vägd AI-täthet per 1000 ord. Vikter följer briefens fallande vikt:
  // antites tyngst, sedan metaprat, sedan tretal, sedan småord.
  const weighted = antithesis * 3 + signal * 3 + tretal * 1.5 + fillerTotal * 0.5;
  const density = (weighted / words) * 1000;

  return {
    lesson: lesson.lektion, path: lesson.path, words, hen, antithesis,
    signal, signalHits, filler, fillerTotal, tretal, grammar, templateH2, density,
  };
}

function numKey(l) {
  const [a, b] = String(l).split('.').map(Number);
  return a * 100 + (b || 0);
}

export async function rostFlagga(base = 'src/content/kurs') {
  const lessons = await loadLessons(base);
  return lessons.map(measure);
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const top = Number(args[args.indexOf('--top') + 1]) || 25;
  const csvI = args.indexOf('--csv');
  const csvPath = csvI >= 0 ? args[csvI + 1] : null;

  const rows = await rostFlagga();
  const totalHen = rows.reduce((n, r) => n + r.hen, 0);
  const henRows = rows.filter((r) => r.hen);

  const line = '='.repeat(78);
  console.log(line);
  console.log(`ROST-FLAGGA  (${rows.length} lektioner)`);
  console.log(line);

  // --- HÅRD GRIND ---
  console.log();
  if (totalHen === 0) {
    console.log('[OK]   HÅRD GRIND  hen = 0 i hela kursen');
  } else {
    console.log(`[FAIL] HÅRD GRIND  hen = ${totalHen} kvar i ${henRows.length} lektioner`);
    for (const r of henRows.sort((a, b) => b.hen - a.hen || numKey(a.lesson) - numKey(b.lesson))) {
      console.log(`        ${pad(r.lesson, 5)}  hen x ${r.hen}   ${r.path.split('/').pop()}`);
    }
  }

  // --- RÅDGIVANDE rankning ---
  console.log('\n' + '-'.repeat(78));
  console.log(`RÅDGIVANDE  värsta ${top} efter AI-täthet (vägt per 1000 ord)`);
  console.log('  täthet | antites | metaprat | tretal | småord | hen | mall-H2');
  console.log('-'.repeat(78));
  const ranked = [...rows].sort((a, b) => b.density - a.density);
  for (const r of ranked.slice(0, top)) {
    const mall = r.templateH2 ? 'JA' : ' .';
    console.log(
      `  ${pad(r.lesson, 5)}  ${pad(r.density.toFixed(1), 5)} | ${pad(r.antithesis, 2)} | ` +
      `${pad(r.signal, 3)} | ${pad(r.tretal, 2)} | ${pad(r.fillerTotal, 2)} | ${pad(r.hen, 2)} | ` +
      `${mall}   ${r.path.split('/').pop()}`
    );
  }

  // --- GRAMMATIK lager 3 ---
  console.log('\n' + '-'.repeat(78));
  console.log("GRAMMATIK (smal regex: kopula + naket substantiv, t.ex. 'verka självmål')");
  console.log('-'.repeat(78));
  const gram = rows.filter((r) => r.grammar.length).sort((a, b) => numKey(a.lesson) - numKey(b.lesson));
  if (!gram.length) {
    console.log('  inga träffar (regex-lagret; modell-korrektur + LanguageTool krävs ändå separat)');
  } else {
    for (const r of gram) console.log(`  ${pad(r.lesson, 5)}  ${r.grammar.map((g) => `"${g}"`).join(', ')}`);
  }

  // --- totaler ---
  console.log('\n' + '-'.repeat(78));
  const tot = (k) => rows.reduce((n, r) => n + r[k], 0);
  console.log(
    `TOTALT:  antiteser ${tot('antithesis')},  metaprat ${tot('signal')},  ` +
    `tretal ${tot('tretal')},  småord ${tot('fillerTotal')},  hen ${totalHen}`
  );
  console.log(`         mall-H2 i ${rows.filter((r) => r.templateH2).length} lektioner`);

  if (csvPath) {
    const head = 'lektion;ord;tathet;hen;antites;metaprat;tretal;smaord;mall_h2;grammatik\n';
    const body = [...rows]
      .sort((a, b) => numKey(a.lesson) - numKey(b.lesson))
      .map((r) =>
        [r.lesson, r.words, r.density.toFixed(1), r.hen, r.antithesis, r.signal,
         r.tretal, r.fillerTotal, r.templateH2 ? 1 : 0, r.grammar.join(' | ')].join(';')
      )
      .join('\n');
    await writeFile(csvPath, head + body + '\n', 'utf8');
    console.log(`\nFull rapport skriven till ${csvPath}`);
  }

  console.log(line);
  process.exit(totalHen ? 1 : 0);
}
