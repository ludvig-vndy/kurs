// Schemalagd Worker: hämtar FI:s insynsregister dagligen och skriver till KV.
// Ersätter GitHub-jobbet "Daglig insynsdata" (som byggde+deployade hela sajten
// bara för att uppdatera en datafil). Här uppdateras bara KV-nyckeln; Upptäck-
// sidan läser den via Pages-funktionen /api/upptack-insyn. Ingen ombyggnad.
//
// Cron: se wrangler.toml ([triggers] crons). Manuell körning:
//   GET https://<worker>.workers.dev/?refresh=<REFRESH_TOKEN>
// Utan token returnerar fetch-handlern bara den senaste datan (läsning).

const KV_KEY = "upptack-insyn";
const DAGAR = 30;

const tal = (s) => {
  const v = parseFloat(String(s || "").replace(/\s/g, "").replace(",", "."));
  return isFinite(v) ? v : null;
};
const d = (x) => x.toISOString().slice(0, 10);

async function haemtaInsyn() {
  const from = d(new Date(Date.now() - DAGAR * 864e5));
  const to = d(new Date());
  const url =
    "https://marknadssok.fi.se/publiceringsklient/sv-SE/Search/Search" +
    "?SearchFunctionType=Insyn&Transaktionsdatum.From=" + from +
    "&Transaktionsdatum.To=" + to + "&button=export";

  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (delagaren)" } });
  if (!res.ok) throw new Error("FI insyn: HTTP " + res.status);

  // FI:s export är UTF-16LE med BOM. Workers saknar Buffer -> TextDecoder.
  const text = new TextDecoder("utf-16le").decode(await res.arrayBuffer()).replace(/^﻿/, "");
  const rader = text.split(/\r?\n/).filter((r) => r.trim());
  const kol = rader[0].split(";").map((k) => k.trim());
  const ix = (n) => kol.findIndex((k) => k.toLowerCase().startsWith(n));
  const I = {
    emittent: ix("emittent"), person: ix("person i ledande"), befattning: ix("befattning"),
    karaktar: ix("karakt"), instrument: ix("instrumenttyp"), transdatum: ix("transaktionsdatum"),
    volym: ix("volym"), pris: ix("pris"), status: ix("status"), korr: ix("korrigering"),
  };

  const perBolag = new Map();
  let kop = 0;
  for (const rad of rader.slice(1)) {
    const c = rad.split(";");
    if (c.length < kol.length - 2) continue;
    if ((c[I.korr] || "").trim().toLowerCase() === "ja") continue;
    const status = (c[I.status] || "").trim().toLowerCase();
    if (status && status !== "aktuell") continue;
    if (!/förvärv/i.test((c[I.karaktar] || "").trim())) continue; // bara köp
    if (!/aktie/i.test((c[I.instrument] || "").trim())) continue;  // aktier, ej optioner
    const co = (c[I.emittent] || "").trim();
    if (!co) continue;
    const volym = tal(c[I.volym]), pris = tal(c[I.pris]);
    const belopp = volym != null && pris != null ? Math.round(volym * pris) : 0;
    const td = (c[I.transdatum] || "").trim().slice(0, 10);
    kop++;
    if (!perBolag.has(co)) perBolag.set(co, { co, belopp: 0, kop: 0, personer: new Set(), sista: "", tx: [] });
    const b = perBolag.get(co);
    b.belopp += belopp; b.kop++;
    b.personer.add((c[I.person] || "").trim());
    if (td > b.sista) b.sista = td;
    b.tx.push({ person: (c[I.person] || "").trim(), befattning: (c[I.befattning] || "").trim(), datum: td, belopp });
  }

  const bolag = [...perBolag.values()]
    .map((b) => ({
      co: b.co, belopp: b.belopp, kop: b.kop, personer: b.personer.size, sista: b.sista,
      tx: b.tx.sort((a, z) => z.datum.localeCompare(a.datum)).slice(0, 4),
    }))
    .sort((a, z) => (z.personer - a.personer) || (z.belopp - a.belopp))
    .slice(0, 12);

  return {
    out: { kalla: "Finansinspektionens insynsregister", hamtad: d(new Date()), period: { from, to, dagar: DAGAR }, bolag },
    kop,
    transaktioner: rader.length - 1,
  };
}

async function refresh(env) {
  const { out, kop, transaktioner } = await haemtaInsyn();
  await env.DATA.put(KV_KEY, JSON.stringify(out));
  return { bolag: out.bolag.length, kop, transaktioner, hamtad: out.hamtad };
}

export default {
  // Dagligt cron-anrop.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env).then(
      (r) => console.log("Upptäck-insyn uppdaterad:", JSON.stringify(r)),
      (e) => console.error("Upptäck-insyn misslyckades:", e && e.message)
    ));
  },

  // Manuell körning (med token) eller läsning av senaste datan.
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = url.searchParams.get("refresh");
    const H = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" };

    if (token) {
      if (!env.REFRESH_TOKEN || token !== env.REFRESH_TOKEN) {
        return new Response(JSON.stringify({ fel: "Ogiltig token." }), { status: 403, headers: H });
      }
      try {
        const r = await refresh(env);
        return new Response(JSON.stringify({ ok: true, ...r }), { headers: H });
      } catch (e) {
        return new Response(JSON.stringify({ fel: String(e && e.message) }), { status: 502, headers: H });
      }
    }

    const cur = await env.DATA.get(KV_KEY);
    if (!cur) return new Response(JSON.stringify({ fel: "Ingen data i KV än." }), { status: 404, headers: H });
    return new Response(cur, { headers: H });
  },
};
