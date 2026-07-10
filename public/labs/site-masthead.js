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
    ['brevet',   'Brevet',     '/labs/agarbrevet-i-marginalen.html'],
    ['bolag',    'Dina bolag', '/labs/dina-bolag-i-marginalen.html'],
    ['upptack',  'Upptäck',    '/labs/upptack-i-marginalen.html'],
    ['analysen', 'Analysen',   '/labs/din-portfolj-i-marginalen.html'],
    ['fraga',    'Fråga',      '/labs/fraga-i-marginalen.html'],
    ['havstang', 'Hävstång',   '/labs/havstang-i-marginalen.html']
  ];

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
      '.dm-back:hover{color:var(--oxblood,#2C5646)}';
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
        '<a href="/fokus" class="dm-back">Till kursen ↗</a></nav>';
    }

    this.innerHTML =
      '<header class="dm-mast"><div class="dm-in">' +
      '<div class="dm-rule dm-rule--top"></div>' +
      '<div class="mast-top"><a class="dm-word" href="/labs/agarbrevet-i-marginalen.html">Delägaren</a>' +
      '<div class="edition">' + edition + '</div></div>' +
      (mini ? '<div class="dm-rule"></div>' : nav) +
      '</div></header>';
  };

  if (!customElements.get('site-masthead')) customElements.define('site-masthead', SiteMasthead);
})();
