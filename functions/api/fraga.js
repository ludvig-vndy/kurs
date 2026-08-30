/* functions/api/fraga.js  -  Fraga-assistenten, server-side.

   Nyckeln (ANTHROPIC_API_KEY) lever bara har pa edgen, aldrig i klienten.

   Flode, tva steg som i Saljcoachen:
   1. Routning, utan modellanrop: vilka av ANVANDARENS EGNA bolag namns i fragan.
      Innehaven ar hogst ett tiotal, sa en namnmatch racker och kostar noll. Namns
      inget bolag svarar vi pa innehavslistan och kursens metod, utan dokument.
   2. Svar ur utdrag: bolagens dokument ligger i KV (arkiv:<id>, skrivet av
      motor/bygg-arkiv.mjs), och modellen far bara de mest relevanta bitarna.

   Sist KALLGRINDEN, portad ur motor/fraga.mjs: varje tal i svaret maste finnas i
   utdragen modellen fick. Ett svar med ett tal modellen raknat fram sjalv visas
   inte. Det ar hela skillnaden mellan en assistent och en gissningsmaskin nar
   fragan galler nagons pengar.

   Faller stangt: utan ANTHROPIC_API_KEY 501, utan giltig session 401, utan
   matchande Origin 403. */

import { secureJson as json } from "./_lib.js";
import { ogrundadeTal, hamtaUtdrag, bolagIFragan } from "./_kallgrind.js";
import { nyckeltalsUnderlag } from "./_nyckeltal.js";

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";
// Haiku pa fragan: kort interaktivt Q&A dar underlaget redan ar utvalt. Sonnet
// sparas till den tunga dokumentanalysen.
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT = 30000;
const MAX_FRAGA = 1000;
const MAX_UTDRAG = 6;

// Strypning per identitet, inte per IP. En IP byts pa en sekund och straffar
// dessutom alla bakom samma nat. Plus ett globalt dygnstak for dagen da nagot
// gatt fel och alla fragar samtidigt.
const TAK_MINUT = 8;
const TAK_DYGN = 60;
const TAK_GLOBALT = 400;

const SYSTEM_BAS =
  "Du ar Delagarens assistent, en lugn och saklig hjalp for en privatinvesterare i en kurs om fundamental aktieanalys.\n\n" +
  "Regler:\n" +
  "- Svara pa svenska, kortfattat och konkret.\n" +
  "- Svara BARA pa fragor om anvandarens egna innehav och om kursens innehall (fundamental aktieanalys). Avboj vanligt annat.\n" +
  "- Ge ALDRIG finansiell radgivning eller kop/salj-rekommendationer. Forklara mekanik och vad anvandaren sjalv kan titta pa. Besluten ar anvandarens.\n" +
  "- Inga tankstreck. Anvand komma, kolon eller punkt.\n";

// Nar vi har dokument: harda regler om tal, for kallgrinden nedan slapper anda
// inte igenom ett svar som bryter mot dem. Battre att modellen vet det i forvag
// an att svaret blockeras och anvandaren far ett fel.
const SYSTEM_DOKUMENT =
  "\nDu har fatt utdrag ur bolagens egna dokument, och ibland ett NYCKELTAL- och HARLETT-block. Om dem galler:\n" +
  "- Anvand bara tal som ORDAGRANT star i underlaget. Utfor ALDRIG egna berakningar: ingen addition, subtraktion, procentandel eller summering. Du ar munnen, aldrig raknaren.\n" +
  "- HARLETT-blocket ar redan utraknat i kod. Behovs en forandring, en takt eller en burn rate: las den darifran, ordagrant. Star den inte dar finns den inte, och da sager du det.\n" +
  "- Var noga med perioder. Ett tal i parentes efter ett annat ar samma period FORRA aret, inte forra kvartalet. Jamfor dem aldrig som om de foljde pa varandra.\n" +
  "- Racker underlaget inte for att svara: sag att det inte framgar av de dokument du har. Gissa aldrig, och rakna aldrig fram ett tal som saknas.\n" +
  "- Namn kallan i klartext efter pastaendet, med dokumentets rubrik.\n" +
  "- Skriv 2 till 5 meningar.\n";

async function getUser(base, secret, token) {
  if (!token) return null;
  try {
    const r = await fetch(base + "/auth/v1/user", {
      headers: { apikey: secret, Authorization: "Bearer " + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

async function getHoldings(base, secret, uid) {
  try {
    const r = await fetch(
      base + "/rest/v1/holdings?user_id=eq." + encodeURIComponent(uid) +
      "&select=name,ticker,quantity,gav,relation",
      { headers: { apikey: secret, Authorization: "Bearer " + secret } }
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) { return []; }
}

/* Innehavets namn -> arkivets bolagsid. Arkivet indexeras pa motorns slug och
   innehavet bar anvandarens stavning, sa matchningen ar los at bada hall:
   "Saniona AB (publ)" ska hitta arkivets "Saniona AB (publ)" men ocksa
   "Unibap Space Solutions" arkivets "unibap". */
function arkivIdFor(holding, index) {
  const rensa = (s) => String(s || "").toLowerCase()
    .replace(/\s+ab\b.*$/, "").replace(/\s*\(publ\.?\)\s*$/, "").trim();
  const namn = rensa(holding.name);
  if (!namn) return null;
  let bast = null;
  for (const rad of index) {
    const kandidat = rensa(rad.namn);
    if (!kandidat) continue;
    if (kandidat === namn) return rad.id;
    if (namn.startsWith(kandidat) || kandidat.startsWith(namn)) {
      if (!bast || kandidat.length > bast.langd) bast = { id: rad.id, langd: kandidat.length };
    }
  }
  return bast ? bast.id : null;
}

async function stryp(kv, id) {
  if (!kv) return null; // utan bindning: slapp igenom, limitern far inte falla svaret
  const nu = Date.now();
  const fonster = [
    { nyckel: `fraga:m:${id}:${Math.floor(nu / 60e3)}`, tak: TAK_MINUT, ttl: 120,
      fel: "Manga fragor pa kort tid. Vanta en minut, sa oppnar det igen." },
    { nyckel: `fraga:d:${id}:${Math.floor(nu / 864e5)}`, tak: TAK_DYGN, ttl: 90000,
      fel: "Du har natt dagens grans for fragor. Den aterstalls i morgon." },
    { nyckel: `fraga:global:${Math.floor(nu / 864e5)}`, tak: TAK_GLOBALT, ttl: 90000,
      fel: "Fraga ar overbelastad just nu. Forsok igen i morgon." },
  ];
  for (const f of fonster) {
    let n = 0;
    try { n = parseInt((await kv.get(f.nyckel)) || "0", 10) || 0; } catch (e) { return null; }
    if (n >= f.tak) return f.fel;
    try { await kv.put(f.nyckel, String(n + 1), { expirationTtl: f.ttl }); } catch (e) { /* ok */ }
  }
  return null;
}

/* Returnerar { text } eller { fel, status, meddelande }.
   Skilj pa felen. Forsta versionen svalde allt till null och rapporterade
   "svarade inte i tid", vilket ledde fel i ett halvtimmes felsokande: modellen
   svarade pa 276 ms, med att kontot var slut pa krediter. Ett fel som pekar at
   fel hall ar samre an inget fel alls. */
async function anropa(apiKey, kropp) {
  const ctrl = new AbortController();
  const klocka = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kropp),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      const m = (d && d.error && d.error.message) || "";
      // Slut pa krediter ar ett driftfel hos oss, inte ett fel anvandaren gjort.
      // Sag det rakt ut i stallet for att lata det se ut som strul hos modellen.
      if (/credit balance|billing|quota/i.test(m)) {
        return { fel: "kredit", status: 503, meddelande: "Fraga ar tillfalligt av: kontot hos modelleverantoren behover fyllas pa." };
      }
      if (r.status === 429) {
        return { fel: "modell-429", status: 429, meddelande: "Modellen ar overbelastad just nu. Forsok igen om en stund." };
      }
      return { fel: "http", status: 502, meddelande: "Modellen svarade med ett fel (" + r.status + ")." };
    }
    const d = await r.json();
    return { text: (d.content || []).map((b) => b.text || "").join("").trim() };
  } catch (e) {
    const avbruten = e && e.name === "AbortError";
    return avbruten
      ? { fel: "timeout", status: 504, meddelande: "Det tog for lang tid. Skicka fragan igen." }
      : { fel: "nat", status: 502, meddelande: "Kunde inte na modellen." };
  } finally {
    clearTimeout(klocka);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;

  if (!apiKey) return json({ error: "AI ej konfigurerad (saknar ANTHROPIC_API_KEY)." }, 501);

  // Ursprung: cookien ar SameSite=Lax, men kontraktet ska sta har och inte antas.
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Fel ursprung." }, 403);

  let question = "", token = "";
  try {
    const body = await request.json();
    question = String(body.question || "").trim();
    token = String(body.token || "").trim();
  } catch (e) { /* tom */ }
  if (!question) return json({ error: "Tom fraga." }, 400);
  if (question.length > MAX_FRAGA) return json({ error: "For lang fraga." }, 400);

  // Anvandaren + innehav. RLS-oberoende: vi filtrerar sjalva pa uid, sa ingen
  // kan fraga om nagon annans portfolj ens med en giltig token.
  let holdings = [], user = null;
  if (secret && token) {
    user = await getUser(base, secret, token);
    if (user) holdings = await getHoldings(base, secret, user.id);
  }

  const stopp = await stryp(env.RL, user ? user.id : (request.headers.get("CF-Connecting-IP") || "okand"));
  if (stopp) return json({ error: stopp }, 429);

  const holdingsText = holdings.length
    ? holdings.map(function (h) {
        return "- " + (h.name || "?") + (h.ticker ? " (" + h.ticker + ")" : "") +
          ", antal " + (h.quantity != null ? h.quantity : "?") +
          ", GAV " + (h.gav != null ? h.gav : "?") +
          ", relation " + (h.relation || "ager");
      }).join("\n")
    : "Inga innehav uppladdade an.";

  // Steg 1: vilka av anvandarens bolag handlar fragan om. Ingen modell behovs.
  let utdrag = [];
  let nyckeltal = { text: "", tillatnaTal: [], harledda: [] };
  if (env.DATA && holdings.length) {
    const traffar = bolagIFragan(question, holdings);
    if (traffar) {
      const index = (await env.DATA.get("arkiv:index", "json")) || [];
      const arkiv = [];
      for (const h of traffar.slice(0, 2)) {   // hogst tva bolag per fraga
        const id = arkivIdFor(h, index);
        if (!id) continue;
        const a = await env.DATA.get("arkiv:" + id, "json");
        if (a) arkiv.push(a);
      }
      // Steg 2: de mest relevanta bitarna ur de bolagens dokument, plus
      // nyckeltalen per period och det som gar att harleda ur dem i kod.
      if (arkiv.length) {
        utdrag = hamtaUtdrag(question, arkiv, MAX_UTDRAG);
        nyckeltal = nyckeltalsUnderlag(arkiv);
      }
    }
  }

  const system = SYSTEM_BAS +
    (utdrag.length ? SYSTEM_DOKUMENT : "\n- Anvand innehavet nedan nar fragan galler portfoljen. Hitta ALDRIG pa siffror som inte finns i datan. Saknas data, sag det rakt ut.\n") +
    "\nAnvandarens innehav:\n" + holdingsText +
    (nyckeltal.text ? "\n\n" + nyckeltal.text : "") +
    (utdrag.length
      ? "\n\nUtdrag ur bolagens egna dokument:\n\n" + utdrag.map(function (u) {
          return "[" + u.bolag + " · " + u.rubrik + " · " + u.datum + "]\n" + u.text;
        }).join("\n\n---\n\n")
      : "");

  const svar = await anropa(apiKey, {
    model: MODEL,
    max_tokens: 1024,
    system: system,
    messages: [{ role: "user", content: question }],
  });
  if (svar.fel) return json({ error: svar.meddelande }, svar.status);
  const answer = svar.text;
  if (!answer) return json({ answer: "Jag har inget bra svar pa det just nu." });

  // Kallgrinden. Bara nar svaret bygger pa dokument: utan utdrag finns inget
  // underlag att grinda mot, och da ar innehavets egna tal (antal, GAV) sanningen.
  if (utdrag.length) {
    // Anvandarens egna tal ar ocksa underlag: antal och GAV star i innehavet,
    // inte i nagot pressmeddelande, och ett svar om dem far inte blockeras.
    const egnaTal = [];
    for (const h of holdings) {
      if (h.quantity != null) egnaTal.push(Number(h.quantity));
      if (h.gav != null) egnaTal.push(Number(h.gav));
      if (h.quantity != null && h.gav != null) egnaTal.push(Number(h.quantity) * Number(h.gav));
    }
    // Harledda tal ar raknade i kod och ar darfor lika giltigt underlag som ett
    // tal ur ett dokument. Det ar hela poangen med att rakna dem har i stallet.
    const ogrundade = ogrundadeTal(answer, utdrag, question, egnaTal.concat(nyckeltal.tillatnaTal));
    if (ogrundade.length) {
      return json({
        answer: "Jag hittade ett svar, men det innehöll tal som inte står i dokumenten jag har (" +
          ogrundade.map(function (t) { return t.rå; }).join(", ") +
          "). Då visar jag det inte. Fråga gärna om en enskild siffra i stället, så svarar jag ur källan.",
        blockerat: true,
        kallor: utdrag.map(function (u) { return { rubrik: u.rubrik, url: u.url }; }),
      });
    }
  }

  return json({
    answer: answer,
    kallor: utdrag.map(function (u) { return { rubrik: u.rubrik, url: u.url, datum: u.datum }; }),
    // Uträkningarna med, sa sidan kan visa HUR ett harlett tal uppstod. Ett tal
    // som inte star i nagon rapport ska aldrig presenteras utan sin rakning.
    harlett: nyckeltal.harledda,
  });
}
