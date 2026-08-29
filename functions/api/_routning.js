/* Rena hjalpare for coachens routning och svarsvalidering. Ligger separat sa de gar att
   testa med node --test utan att nagot modellanrop sker. */

const MAX_LEKTIONER = 5;

/* En saljare skriver siffror hela tiden, och "vi lag pa 3.2 miljoner" innehaller ett
   giltigt lektionsnummer. Svenska skriver decimaler med komma, sa det vanliga fallet ar
   ofarligt, men punkten forekommer. Darfor tre nivaer, se specen avsnitt 3. */
const ENHETSORD = /^\s*(miljon(er)?|mkr|kr|tkr|procent|%|gånger|timmar|dagar|veckor|månader|personer)\b/i;
const REFERENSORD = /(lektion|kapitel|avsnitt)\s*$/i;

/** Lektionsnummer i klartext, delade i starka och svaga referenser. */
export function extraheraReferenser(text, giltiga) {
  const stark = [];
  const svag = [];
  const re = /\b(\d{1,2}\.\d{1,2})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    if (!giltiga.has(id)) continue;
    if (ENHETSORD.test(text.slice(m.index + m[0].length))) continue;
    const fore = text.slice(Math.max(0, m.index - 40), m.index);
    const arStark = REFERENSORD.test(fore.trimEnd()) || /\bmellan\b/i.test(fore);
    (arStark ? stark : svag).push(id);
  }
  return { stark: [...new Set(stark)], svag: [...new Set(svag)] };
}

/** Starka referenser forst och de kan aldrig kastas ut, sedan modellen, sist svaga. */
export function slaIhopKandidater({ stark = [], svag = [], modell = [] }, giltiga, max = MAX_LEKTIONER) {
  const ut = [];
  const lagg = (id) => {
    if (typeof id !== 'string') return;
    if (!giltiga.has(id) || ut.includes(id) || ut.length >= max) return;
    ut.push(id);
  };
  stark.forEach(lagg);
  modell.forEach(lagg);
  svag.forEach(lagg);
  return ut;
}

/** Forsta JSON-objektet i en modelltext, som objekt. null om det inte gar att lasa.
    Modeller lagger garna en artighetsfras runt sin JSON, darav slice mellan yttersta
    klammer i stallet for JSON.parse pa hela strangen. */
export function forstaJsonObjekt(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const slut = text.lastIndexOf('}');
  if (start === -1 || slut <= start) return null;
  try {
    return JSON.parse(text.slice(start, slut + 1));
  } catch {
    return null;
  }
}

/** Routningssvaret, normaliserat. null om det inte gar att lasa. */
export function tolkaRoutning(text) {
  const o = forstaJsonObjekt(text);
  if (!o || typeof o !== 'object') return null;
  return {
    lektioner: Array.isArray(o.lektioner) ? o.lektioner.filter((x) => typeof x === 'string') : [],
    saknarUnderlag: o.saknar_underlag === true,
  };
}

const FORMER = new Set(['diagnos', 'kursfraga', 'behover_mer', 'inget_underlag']);
const LEKTIONSNUMMER = /\b\d{1,2}\.\d{1,2}\b/;

/* Modellen far returnera lektioner bara som id i ett falt, aldrig i loptext. Skalet:
   den kan annars skriva "det har behandlas i 7.4" om en lektion den aldrig sett, och
   svaret ser da mer grundat ut an det ar. Provenance ags av servern, som ocksa renderar
   titlarna ur TITLAR. */
export function validieraSvar(rad, tillatna) {
  if (!rad || typeof rad !== 'object') return { ok: false, fel: 'svaret var inte ett objekt' };
  if (!FORMER.has(rad.form)) return { ok: false, fel: `okand form: ${rad.form}` };

  for (const falt of ['svar', 'nasta_gang', 'folifraga']) {
    const t = rad[falt];
    if (typeof t === 'string' && LEKTIONSNUMMER.test(t)) {
      return { ok: false, fel: `lektionsnummer i loptext (${falt})` };
    }
  }

  const kravs = {
    diagnos: ['svar', 'nasta_gang'],
    kursfraga: ['svar'],
    behover_mer: ['folifraga'],
    inget_underlag: ['svar'],
  }[rad.form];
  for (const falt of kravs) {
    if (typeof rad[falt] !== 'string' || !rad[falt].trim()) {
      return { ok: false, fel: `${rad.form} saknar ${falt}` };
    }
  }

  const lektioner = (Array.isArray(rad.lektioner) ? rad.lektioner : [])
    .filter((id) => tillatna.includes(id));

  return {
    ok: true,
    svar: {
      form: rad.form,
      svar: rad.form === 'behover_mer' ? null : rad.svar,
      nasta_gang: rad.form === 'diagnos' ? rad.nasta_gang : null,
      folifraga: rad.form === 'behover_mer' ? rad.folifraga : null,
      lektioner,
    },
  };
}
