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

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[AB] supabase-js laddades inte. Kontrollera CDN-taggen ovanför denna fil.");
    window.AB = { ready: false };
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
      .select("id,name,ticker,isin,quantity,gav,relation,source,created_at")
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
    getUser: getUser,
    sendMagicLink: sendMagicLink,
    verifyCode: verifyCode,
    signInPassword: signInPassword,
    signOut: signOut,
    listHoldings: listHoldings,
    insertHoldings: insertHoldings,
    deleteAllHoldings: deleteAllHoldings,
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
  function setSessionCookie(session) {
    try {
      if (session && session.access_token) {
        document.cookie = "da_session=" + session.access_token + "; path=/; max-age=" + (session.expires_in || 3600) + "; SameSite=Lax; Secure";
      } else {
        document.cookie = "da_session=; path=/; max-age=0; SameSite=Lax; Secure";
      }
    } catch (e) {}
  }

  whenReady(function () { getSession().then(setSessionCookie); mountUserChip(); flushPendingInvite(); });
  // Sessionen dyker ofta upp strax efter load (hashen parsas asynkront) -> kör om.
  sb.auth.onAuthStateChange(function (_event, session) { setSessionCookie(session); mountUserChip(); flushPendingInvite(); });
})();
