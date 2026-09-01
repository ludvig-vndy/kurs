/* Delad masthead for produktvarlden (labs). EN kalla for headern, sa den inte
   langre kan driva isar mellan sidorna. Anvandning:

     <head> ... <script src="/labs/site-masthead.js"></script> </head>
     <body> <site-masthead active="bolag"></site-masthead> ...

   Scriptet ligger i <head> (blockande) sa elementet ar definierat innan body
   parsas -> connectedCallback kor synkront under parsning, ingen flash.
   Ljus-DOM sa sidans egna tokens (--oxblood gron, --ink, --muted ...) galler.

   Attribut:
     active   nav-nyckel som markeras (brevet|bolag|upptack|analysen|fraga|havstang), valfri
     edition  overstyr edition-radens text (annars: "<Yta><br>Din del av bolaget")
     mini     wordmark + edition, ingen nav (floden) */
(function () {
  var NAV = [
    ['brevet',   'Brevet',     '/labs/agarbrevet.html'],
    ['bolag',    'Dina bolag', '/labs/dina-bolag.html'],
    ['upptack',  'Upptäck',    '/labs/upptack.html'],
    ['analysen', 'Analysen',   '/labs/din-portfolj.html'],
    ['fraga',    'Fråga',      '/labs/fraga.html'],
    ['havstang', 'Hävstång',   '/labs/havstang.html']
  ];

  var SB_KEY = 'sb-xpxghvxrckpzbbkjmtcw-auth-token';

  // Varumärke: DEFAULT = Marginalen. Dev-växel ?brand=delagaren flippar till
  // Delägaren (sparas). Bara synlig text. Se public/brand-switch.js.
  try {
    var _bq = new URLSearchParams(location.search).get('brand');
    if (_bq) { if (_bq.toLowerCase() === 'delagaren') localStorage.setItem('da-brand', 'delagaren'); else localStorage.removeItem('da-brand'); }
  } catch (e) {}
  function brandWord() { try { return localStorage.getItem('da-brand') === 'delagaren' ? 'Delägaren' : 'Marginalen'; } catch (e) { return 'Marginalen'; } }

  // Inloggningsgrind: produktytorna kraver ett Delagaren-konto. Kors i <head>,
  // fore innehallet renderas (ingen flash). Undantar magic-link-retur
  // (#access_token i hashen) sa inloggningen kan slutforas.
  // Klientens egen grind ar en bekvamlighet, inte skyddet: skyddet ar
  // JWT-verifieringen i functions/_middleware.js, som redan skickat hit dig om
  // cookien inte hall. Darfor far den har kollen aldrig vara STRANGARE an
  // servern. da_session satts fran JS och gar alltsa att lasa harifran, sa finns
  // den racker det. Utan det villkoret kastades den ut som slutfort sin
  // inloggning via snabbvagen i logga-in.astro, alltsa med giltig cookie men
  // utan att supabase-js hunnit skriva sin nyckel, och inloggningen sag ut att
  // inte fastna.
  try {
    var harCookie = (document.cookie || '').split(';').some(function (bit) {
      var i = bit.indexOf('=');
      return i > 0 && bit.slice(0, i).trim() === 'da_session' && bit.slice(i + 1).trim() !== '';
    });
    if (!localStorage.getItem(SB_KEY) && !harCookie && location.hash.indexOf('access_token') === -1) {
      location.replace('/logga-in');
      return;
    }
  } catch (e) {}

  // Spegla sessionen i da_session-cookien sa serverns kontogrind kan verifiera
  // JWT:n aven pa labbar som inte laddar supabase-js.
  try {
    var _raw = localStorage.getItem(SB_KEY);
    if (_raw) {
      var _o = JSON.parse(_raw);
      var _t = _o.access_token || (_o.currentSession && _o.currentSession.access_token);
      if (_t) document.cookie = 'da_session=' + _t + '; path=/; max-age=3600; SameSite=Lax; Secure';
    }
  } catch (e) {}

  function readSession() {
    try {
      var raw = localStorage.getItem(SB_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      var tok = o && (o.access_token || (o.currentSession && o.currentSession.access_token));
      if (!tok) return { email: '', initials: '', name: '' };
      var seg = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      seg += '==='.slice((seg.length + 3) % 4);
      var p = JSON.parse(decodeURIComponent(escape(atob(seg))));
      var m = p.user_metadata || {};
      return { email: p.email || '', initials: m.initials || '', name: m.full_name || m.name || '' };
    } catch (e) { return { email: '', initials: '', name: '' }; }
  }
  function monogram(s) {
    if (s.initials) return String(s.initials).slice(0, 2).toUpperCase();
    var name = (s.name || '').trim();
    if (name) { var q = name.split(/\s+/); return ((q[0].charAt(0) || '') + (q.length > 1 ? q[q.length - 1].charAt(0) : (q[0].charAt(1) || ''))).toUpperCase(); }
    var local = (s.email || '?').split('@')[0];
    return (local.slice(0, 2) || '?').toUpperCase();
  }
  var accBound = false;
  function renderAccount(el) {
    var s = readSession();
    if (!s) { el.innerHTML = '<a class="dm-login" href="/logga-in">Logga in</a>'; return; }
    el.innerHTML =
      '<button class="dm-avatar" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Konto">' + esc(monogram(s)) + '</button>' +
      '<div class="dm-menu" role="menu"><div class="who"><b>Inloggad som</b>' + esc(s.email || 'Ditt konto') + '</div>' +
      '<button class="out" type="button" role="menuitem">Logga ut</button></div>';
    var av = el.querySelector('.dm-avatar'), menu = el.querySelector('.dm-menu');
    av.addEventListener('click', function (e) { e.stopPropagation(); var o = menu.classList.toggle('open'); av.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    el.querySelector('.out').addEventListener('click', function () {
      try { localStorage.removeItem(SB_KEY); } catch (e) {}
      try { document.cookie = 'da_session=; path=/; max-age=0; SameSite=Lax; Secure'; } catch (e) {}
      location.replace('/logga-in');
    });
    if (!accBound) {
      accBound = true;
      document.addEventListener('click', function (e) {
        var m = document.querySelector('.dm-menu.open');
        if (m && !m.closest('.mast-account').contains(e.target)) { m.classList.remove('open'); }
      });
    }
  }

  if (!document.getElementById('dm-mast-css')) {
    var st = document.createElement('style');
    st.id = 'dm-mast-css';
    st.textContent =
      '.dm-mast{padding:30px 0 0}' +
      '.dm-in{width:100%;max-width:1080px;margin:0 auto;padding:0 clamp(20px,5vw,52px)}' +
      '.dm-rule{height:2px;background:var(--rule-strong,rgba(33,28,23,.42))}' +
      '.dm-rule--top{height:1px;margin-bottom:15px;background:var(--rule-strong,rgba(33,28,23,.42))}' +
      /* .mast-top och .edition behaller sina namn sa den supabase-injicerade */
      /* anvandar-chipen (som soker .mast-top/.edition) fortsatter fungera; */
      /* scopat under .dm-mast sa det vinner over ev. kvarvarande per-fil-CSS. */
      '.dm-mast .mast-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;padding-bottom:14px;min-height:44px}' +
      '.dm-word{font-family:"Zilla Slab",Georgia,serif;font-weight:700;font-size:clamp(24px,3.2vw,36px);letter-spacing:.03em;text-transform:uppercase;line-height:.9;color:var(--oxblood,#2C5646);text-decoration:none}' +
      '.dm-mast .edition{font-family:var(--mono,"Inter",system-ui,sans-serif);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#6E6456);text-align:right;line-height:1.7}' +
      '.dm-nav{display:flex;flex-wrap:wrap;gap:2px 24px;padding:2px 0;font-family:var(--mono,"Inter",system-ui,sans-serif);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase}' +
      '.dm-nav a{display:inline-flex;align-items:center;min-height:40px;color:var(--muted,#6E6456);text-decoration:none}' +
      '.dm-nav a:hover{color:var(--ink,#211C17)}' +
      '.dm-nav a.here{color:var(--oxblood,#2C5646)}' +
      '.dm-div{width:1px;height:14px;background:var(--rule-strong,rgba(33,28,23,.42));align-self:center}' +
      '.dm-back{color:var(--muted,#6E6456)}' +
      '.dm-back:hover{color:var(--oxblood,#2C5646)}' +
      '.mast-account{margin-left:auto;display:inline-flex;align-items:center;position:relative}' +
      '.dm-login{font-family:var(--mono,Inter),sans-serif;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#6E6456);text-decoration:none;min-height:40px;display:inline-flex;align-items:center}' +
      '.dm-login:hover{color:var(--oxblood,#2C5646)}' +
      '.dm-avatar{width:32px;height:32px;border-radius:50%;background:var(--oxblood,#2C5646);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:600;border:0;cursor:pointer}' +
      '.dm-menu{position:absolute;top:40px;right:0;min-width:200px;background:var(--card,#FCFAF4);border:1px solid var(--rule-strong,rgba(33,28,23,.42));border-radius:9px;box-shadow:0 14px 34px rgba(33,28,23,.16);padding:12px 14px;display:none;z-index:60}' +
      '.dm-menu.open{display:block}' +
      '.dm-menu .who{font-size:12px;color:var(--ink-soft,#4A4239);word-break:break-all;margin:0 0 10px}' +
      '.dm-menu .who b{display:block;font-size:10px;color:var(--muted,#6E6456);text-transform:uppercase;letter-spacing:.07em;margin:0 0 3px}' +
      '.dm-menu .out{width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--rule,rgba(33,28,23,.16));padding:9px 0 0;color:var(--oxblood,#2C5646);font-family:inherit;font-size:12px;cursor:pointer}';
    document.head.appendChild(st);
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function SiteMasthead() { return Reflect.construct(HTMLElement, [], SiteMasthead); }
  SiteMasthead.prototype = Object.create(HTMLElement.prototype);
  SiteMasthead.prototype.constructor = SiteMasthead;
  SiteMasthead.prototype.connectedCallback = function () {
    var active = this.getAttribute('active') || '';
    var mini = this.hasAttribute('mini');
    var label = '';
    for (var i = 0; i < NAV.length; i++) if (NAV[i][0] === active) label = NAV[i][1];
    var edition = this.getAttribute('edition');
    if (edition == null) edition = 'Din del av bolaget' + (label ? '<br>' + esc(label) : '');

    var nav = '';
    if (!mini) {
      var links = NAV.map(function (n) {
        var here = n[0] === active ? ' class="here" aria-current="page"' : '';
        return '<a href="' + n[2] + '"' + here + '>' + n[1] + '</a>';
      }).join('');
      nav = '<div class="dm-rule"></div><nav class="dm-nav">' + links +
        '<span class="dm-div" aria-hidden="true"></span>' +
        '<a href="/fokus" class="dm-back">Till kursen ↗</a>' +
        '<span class="mast-account" aria-live="polite"></span></nav>';
    }

    this.innerHTML =
      '<header class="dm-mast"><div class="dm-in">' +
      '<div class="dm-rule dm-rule--top"></div>' +
      '<div class="mast-top"><a class="dm-word" href="/labs/agarbrevet.html">' + brandWord() + '</a>' +
      '<div class="edition">' + edition + '</div></div>' +
      (mini ? '<div class="dm-rule"></div>' : nav) +
      '</div></header>';
    var acc = this.querySelector('.mast-account');
    if (acc) renderAccount(acc);
  };

  if (!customElements.get('site-masthead')) customElements.define('site-masthead', SiteMasthead);
})();
