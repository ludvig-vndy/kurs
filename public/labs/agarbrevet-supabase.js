/* ────────────────────────────────────────────────────────────────────────
   Ägarbrevet · delad Supabase-klient för de wirade mockarna
   ------------------------------------------------------------------------
   Laddas deferrat, EFTER supabase-js UMD-bundlen (window.supabase, samma defer).
   Kör alltså efter sidans inline-skript: sidorna rör AB först i händelse-
   hanterare eller på DOMContentLoaded. Exponerar window.AB med de anrop
   sidorna behöver.

   Nyckeln nedan är den PUBLIKA (sb_publishable_...): den är byggd för att
   ligga i klientkod. Allt data skyddas av Row Level Security i databasen,
   så en användare kan bara läsa och skriva sina egna rader. Den hemliga
   nyckeln (sb_secret_...) får ALDRIG hamna här, bara på servern.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var SUPABASE_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WNA6bx4Fvp6sonHWhNADEg_5H3OeqTB";

  /* Huvudboken räknad, snittkostnadsmetoden. Samma uträkning som triggern
     recalc_holding gör i databasen, och den ligger HÄR och inte i sidorna
     eftersom både bolagssidan och Dina bolag behöver den. Två implementationer
     av ett pengabelopp driver isär, och det märks först när de visar olika tal
     för samma innehav.

     Utöver antal och GAV faller det REALISERADE resultatet ut ur samma svep:
     varje säljrad ger antal * (pris - snittet strax före affären).

     saknarBas är skillnaden mellan noll och "vet inte". Säljs det utan att något
     köp finns inlagt vet vi inte vad som betalades, och då är realiserat null och
     aldrig 0. Ytan ska säga vad som fattas, inte visa en nolla. */
  function replayAffarer(affarer) {
    var qty = 0, cost = 0, real = 0, harKop = false, utanBas = false, saltNagot = false;
    var sorterade = (affarer || []).slice().sort(function (a, b) {
      return new Date(a.decided_at) - new Date(b.decided_at);
    });
    for (var i = 0; i < sorterade.length; i++) {
      var t = sorterade[i];
      var q = Number(t.quantity) || 0, p = Number(t.price) || 0;
      if (t.kind === "kop") { harKop = true; qty += q; cost += q * p; }
      else {
        saltNagot = true;
        var avg = qty ? cost / qty : 0;
        if (!harKop || qty <= 0) utanBas = true; else real += q * (p - avg);
        qty -= q; cost -= q * avg;
      }
    }
    qty = Math.max(qty, 0); cost = Math.max(cost, 0);
    return {
      qty: qty, gav: qty ? cost / qty : null, ansk: cost,
      realiserat: (!saltNagot || utanBas) ? null : real,
      saknarBas: saltNagot && utanBas,
      saltNagot: saltNagot
    };
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[AB] supabase-js laddades inte. Kontrollera CDN-taggen ovanför denna fil.");
    // Ren uträkning utan nätverk exponeras ändå: den fungerar på data sidan
    // redan har, och ska inte falla bort för att klienten inte kunde laddas.
    window.AB = { ready: false, replayAffarer: replayAffarer };
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // plockar upp magic-link-token ur URL:en efter klick
      // Magic-länkarna (både signInWithOtp och admin-genererade) landar med
      // token i URL-hashen (#access_token=...), alltså implicit-flödet. Med pkce
      // väntar klienten på ?code och missar hashen -> ingen session. Därför implicit.
      flowType: "implicit"
    }
  });

  // Vart magic-länken skickar tillbaka användaren. window.location.origin gör
  // att den funkar både lokalt (http.server) och på den deployade domänen,
  // förutsatt att båda ligger i Supabase Auth -> URL Configuration -> Redirect URLs.
  function redirectTo(path) {
    return window.location.origin + (path || "/labs/dina-bolag.html");
  }

  // ── Session / användare ────────────────────────────────────────────────
  async function getSession() {
    var res = await sb.auth.getSession();
    return res && res.data ? res.data.session : null;
  }
  async function getUser() {
    var s = await getSession();
    return s ? s.user : null;
  }

  // ── Magic-link-inloggning ──────────────────────────────────────────────
  // Säker som standard: konto skapas ENDAST när anroparen uttryckligen skickar
  // { createUser: true } (inbjudningsflödet, efter verifierad token). Utan det
  // är detta ren inloggning, så en glömd flagga aldrig öppnar registrering.
  // opts.redirectPath valfri.
  async function sendMagicLink(email, opts) {
    opts = opts || {};
    return sb.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo(opts.redirectPath),
        shouldCreateUser: opts.createUser === true
      }
    });
  }

  // Andra vagen in: samma mejl bar en 6-siffrig kod. Nar lanken inte tar dig
  // hela vagen in (oppnas i fel webblasare, branns av en mejlskanner) skriver
  // du koden pa samma flik. type:'email' galler bade signup- och magic-koder.
  async function verifyCode(email, code) {
    return sb.auth.verifyOtp({ email: email, token: String(code).trim(), type: "email" });
  }

  // Lösenordsinloggning: robust väg som inte hänger på mejl eller länkar.
  // Används för testkonton nu; kan bli allmän fallback senare.
  async function signInPassword(email, password) {
    return sb.auth.signInWithPassword({ email: email, password: password });
  }

  async function signOut() {
    return sb.auth.signOut();
  }

  // ── Innehav ────────────────────────────────────────────────────────────
  async function listHoldings() {
    var res = await sb
      .from("holdings")
      .select("id,name,ticker,isin,quantity,gav,relation,source,konto,land,created_at")
      .order("created_at", { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  // rows: [{ name, ticker, isin, quantity, gav, relation:'ager'|'foljer' }]
  // user_id sätts automatiskt av RLS-policyn via with check, men vi skickar
  // med det explicit så insert:en matchar policyn.
  async function insertHoldings(rows) {
    var user = await getUser();
    if (!user) throw new Error("Inte inloggad.");
    var payload = rows.map(function (r) {
      return {
        user_id: user.id,
        name: r.name,
        ticker: r.ticker || null,
        isin: r.isin || null,
        quantity: r.quantity == null ? null : r.quantity,
        gav: r.gav == null ? null : r.gav,
        relation: r.relation === "foljer" ? "foljer" : "ager",
        // Marknaden foljer med sa kursen inte behover gissas fram, och sa att
        // en svensk och en amerikansk ticker med samma bokstaver inte blandas.
        land: r.land || null,
        source: r.source || "csv"
      };
    });
    var res = await sb.from("holdings").insert(payload).select("id");
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function deleteAllHoldings() {
    var user = await getUser();
    if (!user) throw new Error("Inte inloggad.");
    var res = await sb.from("holdings").delete().eq("user_id", user.id);
    if (res.error) throw res.error;
    return true;
  }

  // Ett innehav och dess affärer. decisions.holding_id är "on delete set null",
  // alltså skulle affärerna bli kvar som föräldralösa rader om vi bara raderade
  // innehavet: osynliga i gränssnittet men kvar i tabellen. Tar man bort ett
  // innehav menar man hela posten, så affärerna går först och innehavet sedan.
  // RLS gäller (policyn "egna innehav"/"egna beslut" är for all), så ingen kan
  // radera någon annans rader ens med rätt id.
  async function deleteHolding(id) {
    if (!id) throw new Error("Saknar id.");
    var d = await sb.from("decisions").delete().eq("holding_id", id);
    if (d.error) throw d.error;
    var h = await sb.from("holdings").delete().eq("id", id);
    if (h.error) throw h.error;
    return true;
  }

  /* Kontotypen styr om en realiserad vinst beskattas. Null ar ett giltigt
     varde och betyder "vet inte": da beskattas den inte, och sidan sager att
     den inte vet. RLS galler, sa ingen kan satta kontotyp pa nagon annans rad. */
  async function setKonto(id, konto) {
    if (!id) throw new Error("Saknar id.");
    var v = konto === null || konto === undefined || konto === "" ? null : String(konto).toLowerCase();
    if (v !== null && ["depa", "isk", "kf"].indexOf(v) === -1) throw new Error("Okand kontotyp.");
    var res = await sb.from("holdings").update({ konto: v }).eq("id", id).select("id,konto").single();
    if (res.error) {
      if (saknasTabellen(res.error)) throw new Error("Kontotyp ar inte paslaget an (migrationen ar inte kord).");
      throw res.error;
    }
    return res.data;
  }

  // ── Affärer (decisions som huvudbok) ────────────────────────────────────
  // Ett innehav och dess köp/sälj. Positionen (quantity, gav) räknas om
  // server-side av triggern trg_decisions_recalc, så efter varje skrivning
  // hämtar sidan om innehavet för att visa den uträknade positionen.
  async function getHolding(id) {
    var res = await sb
      .from("holdings")
      .select("id,name,ticker,isin,quantity,gav,relation,source,konto,land,created_at")
      .eq("id", id)
      .single();
    if (res.error) throw res.error;
    return res.data || null;
  }

  // Köp/sälj för ett innehav, äldst först (som huvudboken läses).
  async function listDecisions(holdingId) {
    var res = await sb
      .from("decisions")
      .select("id,kind,quantity,price,reason,decided_at")
      .eq("holding_id", holdingId)
      .in("kind", ["kop", "salj"])
      .order("decided_at", { ascending: true })
      .order("created_at", { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  /* Alla köp och sälj för den inloggade, i ETT anrop. Dina bolag behöver
     huvudboken för varje innehav samtidigt, och ett anrop per rad vore både
     långsamt och onödigt: RLS ("egna beslut") gör att svaret redan bara
     innehåller användarens egna affärer. */
  async function listAllDecisions() {
    var res = await sb
      .from("decisions")
      .select("id,holding_id,kind,quantity,price,decided_at")
      .in("kind", ["kop", "salj"])
      .order("decided_at", { ascending: true })
      .order("created_at", { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  // d: { holding_id, kind:'kop'|'salj', quantity, price, decided_at?, reason? }
  // user_id sätts explicit så insert:en matchar RLS-policyn "egna beslut".
  async function addDecision(d) {
    var user = await getUser();
    if (!user) throw new Error("Inte inloggad.");
    var row = {
      user_id: user.id,
      holding_id: d.holding_id,
      kind: d.kind === "salj" ? "salj" : "kop",
      quantity: d.quantity == null ? null : d.quantity,
      price: d.price == null ? null : d.price,
      reason: d.reason || null
    };
    if (d.decided_at) row.decided_at = d.decided_at; // annars default now()
    var res = await sb.from("decisions").insert(row).select("id").single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function deleteDecision(id) {
    var res = await sb.from("decisions").delete().eq("id", id);
    if (res.error) throw res.error;
    return true;
  }

  // ── Tesen (varför du äger det) ─────────────────────────────────────────
  // Ett fritextfält per innehav, unikt på holding_id. Tabellen skapas av
  // supabase/migrations/20260830150000_tes.sql. Är migrationen inte körd svarar
  // PostgREST med PGRST205 ("table not found"), och det ska inte se ut som att
  // användarens text försvann: getThesis säger ingen tes, saveThesis säger rakt
  // ut att fältet inte är påslaget än.
  function saknasTabellen(err) {
    var m = (err && err.message) || "";
    return !!err && (err.code === "PGRST205" || (/theses/i.test(m) && /not find|does not exist/i.test(m)));
  }

  async function getThesis(holdingId) {
    if (!holdingId) return null;
    var res = await sb.from("theses").select("id,why,updated_at").eq("holding_id", holdingId).maybeSingle();
    if (res.error) {
      if (saknasTabellen(res.error)) return null;
      throw res.error;
    }
    return res.data || null;
  }

  // Tom text raderar raden. Att spara en tom tes och att inte ha någon tes är
  // samma sak för läsaren, och då ska det vara samma sak i databasen också.
  async function saveThesis(holdingId, why) {
    var user = await getUser();
    if (!user) throw new Error("Inte inloggad.");
    var text = String(why == null ? "" : why).trim();
    var res;
    if (!text) {
      res = await sb.from("theses").delete().eq("holding_id", holdingId);
    } else {
      res = await sb.from("theses").upsert({
        holding_id: holdingId,
        user_id: user.id,
        why: text,
        updated_at: new Date().toISOString()
      }, { onConflict: "holding_id" }).select("id,why,updated_at").single();
    }
    if (res.error) {
      if (saknasTabellen(res.error)) throw new Error("Tesfältet är inte påslaget än (migrationen är inte körd).");
      throw res.error;
    }
    return text ? res.data : null;
  }

  // ── Inbjudningar ───────────────────────────────────────────────────────
  async function acceptInvite(token) {
    var user = await getUser();
    if (!user) throw new Error("Inte inloggad.");
    var res = await sb.rpc("accept_invite", { p_token: token, p_user: user.id });
    if (res.error) throw res.error;
    return res.data === true;
  }

  window.AB = {
    ready: true,
    sb: sb,
    getSession: getSession,
    replayAffarer: replayAffarer,
    listAllDecisions: listAllDecisions,
    getUser: getUser,
    sendMagicLink: sendMagicLink,
    verifyCode: verifyCode,
    signInPassword: signInPassword,
    signOut: signOut,
    listHoldings: listHoldings,
    insertHoldings: insertHoldings,
    deleteAllHoldings: deleteAllHoldings,
    deleteHolding: deleteHolding,
    setKonto: setKonto,
    getHolding: getHolding,
    listDecisions: listDecisions,
    addDecision: addDecision,
    deleteDecision: deleteDecision,
    getThesis: getThesis,
    saveThesis: saveThesis,
    acceptInvite: acceptInvite,
    mountUserChip: mountUserChip,
    onAuthChange: function (cb) { return sb.auth.onAuthStateChange(cb); }
  };

  // ── Inloggnings-chip i masthuvudet (visas bara när inloggad) ─────────────
  // Kompakt monogram-avatar uppe i högra hörnet; klick öppnar mejl + Logga ut.
  function monogram(user) {
    var meta = (user && user.user_metadata) || {};
    if (meta.initials) return String(meta.initials).slice(0, 2).toUpperCase();
    var name = (meta.full_name || meta.name || "").trim();
    if (name) {
      var p = name.split(/\s+/);
      var a = p[0].charAt(0);
      var b = p.length > 1 ? p[p.length - 1].charAt(0) : (p[0].charAt(1) || "");
      return (a + b).toUpperCase();
    }
    var local = ((user && user.email) || "?").split("@")[0];
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  function injectChipStyles() {
    if (document.getElementById("ab-chip-css")) return;
    var s = document.createElement("style");
    s.id = "ab-chip-css";
    s.textContent =
      ".mast-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;margin-left:auto}" +
      ".ab-user{position:relative;font-family:var(--mono,Inter),sans-serif}" +
      ".ab-avatar{width:34px;height:34px;border-radius:50%;background:var(--oxblood,#2C5646);color:#fff;display:grid;place-items:center;font-size:12.5px;font-weight:600;letter-spacing:.02em;border:0;cursor:pointer;transition:box-shadow .15s}" +
      ".ab-avatar:hover,.ab-avatar[aria-expanded=true]{box-shadow:0 0 0 3px rgba(44,86,70,.16)}" +
      ".ab-menu{position:absolute;top:44px;right:0;min-width:206px;background:var(--card,#FCFAF4);border:1px solid var(--rule-strong,rgba(33,28,23,.42));border-radius:9px;box-shadow:0 14px 34px rgba(33,28,23,.16);padding:13px 15px;display:none;z-index:60}" +
      ".ab-menu.open{display:block}" +
      ".ab-menu .who{font-size:12.5px;color:var(--ink-soft,#4A4239);word-break:break-all;margin:0 0 11px}" +
      ".ab-menu .who b{display:block;font-size:10.5px;color:var(--muted,#6E6456);font-weight:500;text-transform:uppercase;letter-spacing:.07em;margin:0 0 3px}" +
      ".ab-menu .out{width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--rule,rgba(33,28,23,.16));padding:10px 0 0;color:var(--oxblood,#2C5646);font-family:inherit;font-size:12.5px;cursor:pointer}" +
      ".ab-menu .out:hover{color:var(--bad,#9B3A2E)}" +
      ".ab-login{font-family:var(--mono,Inter),sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft,#4A4239);text-decoration:none;min-height:40px;display:inline-flex;align-items:center}" +
      ".ab-login:hover{color:var(--oxblood,#2C5646)}";
    document.head.appendChild(s);
  }
  var chipBound = false;
  function bindChipDismiss() {
    if (chipBound) return;
    chipBound = true;
    document.addEventListener("click", function (e) {
      var m = document.querySelector(".ab-menu.open");
      if (m && !m.closest(".ab-user").contains(e.target)) {
        m.classList.remove("open");
        var a = m.closest(".ab-user").querySelector(".ab-avatar");
        if (a) a.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var m = document.querySelector(".ab-menu.open");
        if (m) { m.classList.remove("open"); var a = m.closest(".ab-user").querySelector(".ab-avatar"); if (a) a.setAttribute("aria-expanded", "false"); }
      }
    });
  }
  // Slot-montering (Astro-mastheaden): avatar/login i nav-radens .mast-account,
  // utan att flytta edition-raden, sa den inte puttar runt masthuvudet.
  async function mountChipInSlot(slot) {
    var session = await getSession();
    injectChipStyles();
    slot.innerHTML = "";
    if (!session) {
      var la = document.createElement("a");
      la.className = "ab-login"; la.href = "/logga-in"; la.textContent = "Logga in";
      slot.appendChild(la);
      return;
    }
    var user = session.user || {};
    var email = (user.email || "").replace(/[&<>"']/g, "");
    var chip = document.createElement("div");
    chip.className = "ab-user";
    chip.innerHTML =
      '<button class="ab-avatar" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Konto">' + monogram(user) + '</button>' +
      '<div class="ab-menu" role="menu"><div class="who"><b>Inloggad som</b>' + email + '</div><button class="out" type="button" role="menuitem">Logga ut</button></div>';
    slot.appendChild(chip);
    var avatar = chip.querySelector(".ab-avatar"), menu = chip.querySelector(".ab-menu");
    avatar.addEventListener("click", function (e) { e.stopPropagation(); var open = menu.classList.toggle("open"); avatar.setAttribute("aria-expanded", open ? "true" : "false"); });
    chip.querySelector(".out").addEventListener("click", async function () { try { await signOut(); } catch (e) {} location.reload(); });
    bindChipDismiss();
  }
  async function mountUserChip() {
    var slot = document.querySelector(".mast-account");
    if (slot) { await mountChipInSlot(slot); return; }
    var mastTop = document.querySelector(".mast-top");
    if (!mastTop) return;
    var session = await getSession();
    var existing = mastTop.querySelector(".ab-user");
    var loginLink = mastTop.querySelector(".ab-login");
    // Utloggad: visa en tydlig "Logga in"-lank i masthuvudet.
    if (!session) {
      if (existing) existing.remove();
      if (!loginLink) {
        injectChipStyles();
        var ed0 = mastTop.querySelector(".edition");
        var r0 = mastTop.querySelector(".mast-right");
        if (!r0) {
          r0 = document.createElement("div"); r0.className = "mast-right";
          if (ed0) { mastTop.insertBefore(r0, ed0); r0.appendChild(ed0); } else { mastTop.appendChild(r0); }
        }
        var la = document.createElement("a");
        la.className = "ab-login"; la.href = "/logga-in"; la.textContent = "Logga in";
        r0.appendChild(la);
      }
      return;
    }
    if (loginLink) loginLink.remove();
    if (existing) return;
    injectChipStyles();
    var user = session.user || {};
    var email = (user.email || "").replace(/[&<>"']/g, "");
    var edition = mastTop.querySelector(".edition");
    var right = mastTop.querySelector(".mast-right");
    if (!right) {
      right = document.createElement("div");
      right.className = "mast-right";
      if (edition) { mastTop.insertBefore(right, edition); right.appendChild(edition); }
      else { mastTop.appendChild(right); }
    }
    var chip = document.createElement("div");
    chip.className = "ab-user";
    chip.innerHTML =
      '<button class="ab-avatar" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Konto">' + monogram(user) + '</button>' +
      '<div class="ab-menu" role="menu">' +
        '<div class="who"><b>Inloggad som</b>' + email + '</div>' +
        '<button class="out" type="button" role="menuitem">Logga ut</button>' +
      '</div>';
    right.appendChild(chip);
    var avatar = chip.querySelector(".ab-avatar");
    var menu = chip.querySelector(".ab-menu");
    avatar.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("open");
      avatar.setAttribute("aria-expanded", open ? "true" : "false");
    });
    chip.querySelector(".out").addEventListener("click", async function () {
      try { await signOut(); } catch (e) {}
      location.reload();
    });
    bindChipDismiss();
  }
  function whenReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ── Acceptera en väntande inbjudan efter inloggning ──────────────────────
  // Skapa konto-sidan lägger token i localStorage; när sessionen finns
  // (efter magic-link-klicket) konsumerar vi den engångs och länkar inbjudaren.
  var inviteFlushed = false;
  async function flushPendingInvite() {
    if (inviteFlushed) return;
    var session = await getSession();
    if (!session) return;
    var token = null;
    try { token = localStorage.getItem("agarbrevet-pending-invite"); } catch (e) {}
    if (!token) return;
    inviteFlushed = true;
    try { await acceptInvite(token); } catch (e) { /* redan använd/ogiltig */ }
    try { localStorage.removeItem("agarbrevet-pending-invite"); } catch (e) {}
  }

  // Speglar sessionen i en cookie sa serverns kontogrind (_middleware.js) kan
  // verifiera JWT:n. Access-token som varde; utgang styr max-age.
  //
  // "Ingen session har" betyder INTE "utloggad". Klienten kan sakna sin nyckel
  // av skal som inte har med inloggningen att gora: magic-lanken slutfordes av
  // snabbvagen i logga-in.astro, localStorage ar avstangt, det ar ett privat
  // fonster. Raderade vi cookien da tog vi bort den enda halva av inloggningen
  // som faktiskt var giltig, och nasta klick foll ut till /logga-in. Cookien
  // rors darfor bara nar vi har nagot att satta, eller vid ett uttalat utlogg.
  function setSessionCookie(session) {
    try {
      if (session && session.access_token) {
        document.cookie = "da_session=" + session.access_token + "; path=/; max-age=" + (session.expires_in || 3600) + "; SameSite=Lax; Secure";
      }
    } catch (e) {}
  }

  function clearSessionCookie() {
    try { document.cookie = "da_session=; path=/; max-age=0; SameSite=Lax; Secure"; } catch (e) {}
  }

  whenReady(function () { getSession().then(setSessionCookie); mountUserChip(); flushPendingInvite(); });
  // Sessionen dyker ofta upp strax efter load (hashen parsas asynkront) -> kör om.
  // SIGNED_OUT ar det enda som far ta bort cookien: da har nagon sagt ifran.
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT") clearSessionCookie();
    else setSessionCookie(session);
    mountUserChip(); flushPendingInvite();
  });
})();
