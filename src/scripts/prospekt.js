/* src/scripts/prospekt.js  —  klientlogiken för prospektlistan.
 *
 * Skiljer sig från kursens övriga sidor på en punkt: här sparas deltagarens
 * arbete på servern, inte i localStorage. Anledningen är att en lista man
 * ringer igenom över veckor inte får dö med en rensad webbläsare.
 *
 * Företagsdatan är gemensam för alla som köpt listan. Status, värde och
 * anteckning är personliga och skickas rad för rad när de ändras.
 */

const STATUSAR = [
  ['ny', 'Ny'],
  ['forsokt', 'Försökt'],
  ['pratat', 'Pratat'],
  ['intresse', 'Intresse'],
  ['nej', 'Nej'],
];
const ETIKETT = Object.fromEntries(STATUSAR);

/* Band ska läsas lågt till högt, inte i bokstavsordning. Utan det hamnar
   "15 till 50 Mkr" före "5 till 15 Mkr". Dimensioner som saknas här
   sorteras alfabetiskt, vilket är rätt för kommun och verksamhet. */
const ORDNINGAR = {
  st: STATUSAR.map(([v]) => v),
  omsattning_band: ['Under 5 Mkr', '5 till 15 Mkr', '15 till 50 Mkr', 'Över 50 Mkr', 'Okänd'],
  anstallda_band: ['1 till 9', '10 till 49', '50 till 199', '200 eller fler', 'Okänt'],
  koncernlage: ['Fristående', 'Dotterbolag'],
};

const GRUPPER = {
  A: ['Grupp A', 'Ägarlett och nåbart'],
  B: ['Grupp B', 'Nåbart med förbehåll'],
  C: ['Grupp C', 'Beslutet ligger på annan ort'],
};

const TAB = String.fromCharCode(9);
const NL = String.fromCharCode(10);
const SKRAP = new RegExp('[' + String.fromCharCode(9, 10, 13) + ']+', 'g');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kr = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const mkr = (v) =>
  v == null ? null : v >= 100000 ? Math.round(v / 1000) + ' Mkr' : (v / 1000).toFixed(1).replace('.', ',') + ' Mkr';
const telHref = (t) => 'tel:+46' + String(t).replace(/\D/g, '').replace(/^0/, '');

export async function startaProspekt() {
  const rot = document.querySelector('[data-prospekt]');
  if (!rot) return;

  const $ = (namn) => rot.querySelector('[data-' + namn + ']');
  const lader = $('lader');
  const felRuta = $('fel');
  const innehall = $('innehall');

  const slug = new URLSearchParams(location.search).get('lista') || 'el-vvs-vastra-gotaland';

  let svar;
  try {
    const r = await fetch('/api/prospekt/lista?slug=' + encodeURIComponent(slug), {
      headers: { Accept: 'application/json' },
    });
    svar = await r.json();
    if (!r.ok) throw new Error(svar && svar.error);
  } catch (e) {
    lader.hidden = true;
    felRuta.hidden = false;
    $('felText').textContent =
      String(e.message) === 'ej inloggad'
        ? 'Du behöver vara inloggad på Motparten för att se din lista.'
        : 'Vi hittade ingen lista kopplad till ditt konto. Har du köpt den och ändå ser det här, hör av dig.';
    return;
  }

  const { lista, rader, arbete } = svar;
  lader.hidden = true;
  innehall.hidden = false;

  // Arbetet läggs på raderna, så filter och facetter kan behandla status som
  // vilken dimension som helst. Nyckeln är cfar, arbetsställets stabila id
  // hos SCB, inte radens uuid som byts när uttaget körs om.
  const arbeteFor = (cfar) => arbete[cfar] || {};
  for (const r of rader) {
    const a = arbeteFor(r.cfar);
    r.st = a.status || 'ny';
    r.varde = a.varde || 0;
    r.anteckning = a.anteckning || '';
  }

  /* ---------- huvud ---------- */
  $('eyebrow').textContent = [lista.segment, lista.geografi].filter(Boolean).join(' · ');
  $('namn').textContent = lista.namn;
  $('ingress').textContent = lista.ingress || '';
  $('meta').innerHTML = [
    rader.length + ' bolag',
    'Grupp A ' + rader.filter((r) => r.prio === 'A').length,
    lista.population ? 'Länet totalt ' + kr(lista.population) : null,
    lista.uttag_datum ? 'Uttag ' + lista.uttag_datum : null,
  ].filter(Boolean).map((t) => '<span>' + esc(t) + '</span>').join('');
  $('kalla').textContent = lista.kallhanvisning || '';
  $('urval').textContent = lista.urval || '';

  /* ---------- rendera ---------- */
  const list = $('list');
  const radEl = new Map();

  for (const nyckel of ['A', 'B', 'C']) {
    const poster = rader.filter((r) => r.prio === nyckel);
    if (!poster.length) continue;
    const sek = document.createElement('section');
    sek.className = 'group';
    const g = GRUPPER[nyckel];
    sek.innerHTML =
      '<div class="group-head"><span class="group-key">' + esc(g[0]) +
      '</span><h2 class="group-name">' + esc(g[1]) + '</h2><span class="group-line"></span></div>';

    for (const r of poster) {
      const satt = r.st !== 'ny' || r.varde;
      const begransad = r.kanaler && r.kanaler.indexOf('EJ') !== -1;
      const fakta = [
        r.anstallda_bolag != null ? '<b>' + r.anstallda_bolag + ' anställda</b>' : null,
        mkr(r.omsattning_tkr),
        esc(r.kommun),
        esc(r.verksamhet),
        esc(r.koncernlage),
      ].filter(Boolean).map((x) => '<span>' + x + '</span>').join('');

      const lankar = [];
      if (r.telefon) lankar.push('<a href="' + esc(telHref(r.telefon)) + '">' + esc(r.telefon) + '</a>');
      if (r.epost) lankar.push('<a href="mailto:' + esc(r.epost) + '">' + esc(r.epost) + '</a>');

      const val = STATUSAR.map(([v, t]) =>
        '<option value="' + v + '"' + (r.st === v ? ' selected' : '') + '>' + esc(t) + '</option>').join('');

      const art = document.createElement('article');
      art.className = 'row' + (r.st === 'nej' ? ' avfard' : '');
      art.dataset.id = r.id;
      art.innerHTML =
        '<span class="dot" data-s="' + esc(r.st) + '" aria-hidden="true"></span>' +
        '<div class="num">' + String(r.nr).padStart(3, '0') + '</div>' +
        '<div><h3 class="namn">' + esc(r.foretag) + '</h3>' +
        '<div class="facts">' + fakta + '</div>' +
        (r.notering ? '<p class="note">' + esc(r.notering) + '</p>' : '') +
        '<textarea class="jot" rows="1" placeholder="Anteckning" aria-label="Anteckning om ' +
          esc(r.foretag) + '">' + esc(r.anteckning) + '</textarea>' +
        '</div>' +
        '<div class="contact">' +
        '<div class="rowtools' + (satt ? ' aktiv' : '') + '">' +
          '<select class="status-sel" data-set="' + (r.st !== 'ny' ? '1' : '0') +
            '" aria-label="Status för ' + esc(r.foretag) + '">' + val + '</select>' +
          '<input class="amount" type="text" inputmode="numeric" placeholder="Värde kr" data-set="' +
            (r.varde ? '1' : '0') + '" aria-label="Värde för ' + esc(r.foretag) + '" value="' +
            (r.varde ? esc(kr(r.varde)) : '') + '">' +
        '</div>' +
        (r.vd ? '<p class="vd">' + esc(r.vd) + '<span>Verkställande direktör</span></p>' : '') +
        lankar.join('') +
        (begransad ? '<span class="kanal">' + esc(r.kanaler) + '</span>' : '') +
        (r.adress ? '<span class="addr">' + esc(r.adress) + '<br>' + esc(r.postnr || '') + ' ' +
          esc(r.ort || '') + '</span>' : '') +
        '</div>';
      sek.appendChild(art);
      radEl.set(r.id, art);
    }
    list.appendChild(sek);
  }

  for (const ta of list.querySelectorAll('.jot')) if (ta.value) passa(ta);

  /* ---------- filter ---------- */
  const DIMS = [...rot.querySelectorAll('.controls select[data-dim]')].map((el) => ({
    dim: el.dataset.dim,
    el,
    ordning: ORDNINGAR[el.dataset.dim] || null,
  }));
  const prioBtns = [...rot.querySelectorAll('.chip-btn[data-prio]')];
  const q = $('q');
  const countEl = $('count');
  const emptyEl = $('empty');

  for (const d of DIMS) {
    // Fasta ordningar filtreras mot vad listan faktiskt innehåller, utom för
    // status där alla lägen ska gå att välja även innan någon rad har dem.
    const varden = d.ordning
      ? d.ordning.filter((v) => d.dim === 'st' || rader.some((r) => r[d.dim] === v))
      : [...new Set(rader.map((r) => r[d.dim]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
    for (const v of varden) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = d.dim === 'st' ? ETIKETT[v] : v;
      d.el.appendChild(o);
    }
    d.el.addEventListener('change', tillampa);
  }

  function matchar(r, hoppaOver) {
    const term = q.value.trim().toLowerCase();
    if (term) {
      const hö = (r.foretag + ' ' + (r.kommun || '') + ' ' + (r.ort || '') + ' ' + (r.vd || '')).toLowerCase();
      if (hö.indexOf(term) === -1) return false;
    }
    const prios = prioBtns.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.prio);
    if (hoppaOver !== 'p' && prios.length && prios.indexOf(r.prio) === -1) return false;
    for (const d of DIMS) {
      if (d.dim === hoppaOver) continue;
      if (d.el.value && String(r[d.dim]) !== d.el.value) return false;
    }
    return true;
  }

  function framsteg() {
    const pabörjade = rader.filter((r) => r.st !== 'ny').length;
    $('progFill').style.transform = 'scaleX(' + (rader.length ? pabörjade / rader.length : 0) + ')';
    $('progLabel').textContent = pabörjade + ' / ' + rader.length + ' påbörjade';

    const bitar = [];
    let oppet = 0;
    for (const [v, t] of STATUSAR) {
      if (v === 'ny') continue;
      const träff = rader.filter((r) => r.st === v);
      if (!träff.length) continue;
      const summa = träff.reduce((a, r) => a + (r.varde || 0), 0);
      if (v !== 'nej') oppet += summa;
      bitar.push('<span>' + esc(t) + ' <b>' + träff.length + '</b>' + (summa ? ' · ' + kr(summa) + ' kr' : '') + '</span>');
    }
    if (oppet) bitar.push('<span>Öppet värde <b>' + kr(oppet) + ' kr</b></span>');
    $('progBreak').innerHTML = bitar.join('');
  }

  function tillampa() {
    let visade = 0;
    for (const r of rader) {
      const ok = matchar(r, null);
      radEl.get(r.id).hidden = !ok;
      if (ok) visade++;
    }
    for (const sek of list.querySelectorAll('.group')) {
      sek.hidden = ![...sek.querySelectorAll('.row')].some((el) => !el.hidden);
    }
    for (const d of DIMS) {
      const pool = rader.filter((r) => matchar(r, d.dim));
      const antal = new Map();
      for (const r of pool) antal.set(String(r[d.dim]), (antal.get(String(r[d.dim])) || 0) + 1);
      for (const opt of d.el.options) {
        if (!opt.value) continue;
        const c = antal.get(opt.value) || 0;
        const namn = d.dim === 'st' ? ETIKETT[opt.value] : opt.value;
        opt.textContent = namn + ' (' + c + ')';
        opt.disabled = c === 0 && d.el.value !== opt.value;
      }
    }
    for (const b of prioBtns) {
      const c = rader.filter((r) => r.prio === b.dataset.prio && matchar(r, 'p')).length;
      b.textContent = 'Grupp ' + b.dataset.prio + ' (' + c + ')';
    }
    countEl.textContent = visade === rader.length ? rader.length + ' bolag' : visade + ' av ' + rader.length + ' bolag';
    emptyEl.hidden = visade > 0;
    framsteg();
  }

  /* ---------- spara ---------- */
  const sparStatus = $('sparstatus');
  const koer = new Map();

  function visaSpar(text) {
    sparStatus.textContent = text;
    if (text === 'Sparat') setTimeout(() => { if (sparStatus.textContent === 'Sparat') sparStatus.textContent = ''; }, 1500);
  }

  function spara(r) {
    clearTimeout(koer.get(r.id));
    koer.set(r.id, setTimeout(async () => {
      visaSpar('Sparar…');
      try {
        const res = await fetch('/api/prospekt/arbete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cfar: r.cfar,
            status: r.st,
            varde: r.varde || null,
            anteckning: r.anteckning || null,
          }),
        });
        visaSpar(res.ok ? 'Sparat' : 'Kunde inte spara');
      } catch (e) {
        visaSpar('Kunde inte spara');
      }
    }, 500));
  }

  function passa(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  const radFor = (el) => rader.find((r) => r.id === el.closest('.row').dataset.id);

  list.addEventListener('change', (e) => {
    const sel = e.target.closest('.status-sel');
    if (!sel) return;
    const r = radFor(sel);
    r.st = sel.value;
    const el = radEl.get(r.id);
    el.querySelector('.dot').dataset.s = r.st;
    el.classList.toggle('avfard', r.st === 'nej');
    sel.dataset.set = r.st === 'ny' ? '0' : '1';
    sel.closest('.rowtools').classList.toggle('aktiv', r.st !== 'ny' || Boolean(r.varde));
    spara(r);
    tillampa();
  });

  list.addEventListener('input', (e) => {
    const ta = e.target.closest('.jot');
    if (ta) {
      const r = radFor(ta);
      r.anteckning = ta.value;
      passa(ta);
      spara(r);
      return;
    }
    const amt = e.target.closest('.amount');
    if (amt) {
      const r = radFor(amt);
      const siffror = amt.value.replace(/\D/g, '');
      r.varde = siffror ? parseInt(siffror, 10) : 0;
      amt.dataset.set = r.varde ? '1' : '0';
      amt.closest('.rowtools').classList.toggle('aktiv', r.st !== 'ny' || Boolean(r.varde));
      spara(r);
      framsteg();
    }
  });

  list.addEventListener('blur', (e) => {
    const amt = e.target.closest && e.target.closest('.amount');
    if (!amt) return;
    const r = radFor(amt);
    amt.value = r.varde ? kr(r.varde) : '';
  }, true);

  /* ---------- export ---------- */
  const KOLUMNER = [
    ['Nr', (r) => r.nr], ['Grupp', (r) => r.prio], ['Företag', (r) => r.foretag],
    ['Orgnr', (r) => r.orgnr], ['Kommun', (r) => r.kommun], ['Verksamhet', (r) => r.verksamhet],
    ['Anställda', (r) => r.anstallda_bolag], ['Omsättning tkr', (r) => r.omsattning_tkr],
    ['Koncernläge', (r) => r.koncernlage], ['Moderbolag', (r) => r.moderbolag],
    ['VD', (r) => r.vd], ['Telefon', (r) => r.telefon], ['E-post', (r) => r.epost],
    ['Tillåtna kanaler', (r) => r.kanaler], ['Adress', (r) => r.adress],
    ['Postnr', (r) => r.postnr], ['Ort', (r) => r.ort], ['Notering', (r) => r.notering],
    ['Status', (r) => ETIKETT[r.st]], ['Värde', (r) => r.varde || ''], ['Anteckning', (r) => r.anteckning],
  ];

  $('export').addEventListener('click', async function () {
    const valda = rader.filter((r) => !radEl.get(r.id).hidden);
    if (!valda.length) return;
    const rensa = (v) => String(v == null ? '' : v).replace(SKRAP, ' ').trim();
    const ut = [KOLUMNER.map((c) => c[0]).join(TAB)];
    for (const r of valda) ut.push(KOLUMNER.map((c) => rensa(c[1](r))).join(TAB));
    const text = ut.join(NL);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    const etikett = this.textContent;
    this.textContent = ok ? valda.length + ' rader kopierade' : 'Kunde inte kopiera';
    setTimeout(() => { this.textContent = etikett; }, 1800);
  });

  for (const b of prioBtns) {
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      tillampa();
    });
  }
  $('reset').addEventListener('click', () => {
    q.value = '';
    for (const d of DIMS) d.el.value = '';
    for (const b of prioBtns) b.setAttribute('aria-pressed', 'false');
    tillampa();
  });
  q.addEventListener('input', tillampa);

  tillampa();
}
