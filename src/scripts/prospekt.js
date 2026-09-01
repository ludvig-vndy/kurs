/* src/scripts/prospekt.js  —  klientlogiken för prospektlistan.
 *
 * Skiljer sig från kursens övriga sidor på en punkt: här sparas deltagarens
 * arbete på servern, inte i localStorage. Anledningen är att en lista man
 * ringer igenom över veckor inte får dö med en rensad webbläsare.
 *
 * Företagsdatan är gemensam för alla som köpt listan. Status, värde och
 * anteckning är personliga och skickas fält för fält när de ändras.
 *
 * Prospektenheten är BOLAGET. Arbetsställena visas som barn till bolaget och
 * blir aldrig egna rader. Skälet är mätt: ett gymuttag gav 1 285 rader men
 * bara 524 bolag, och fem kedjor ägde 726 av raderna. Samma VD och samma
 * växelnummer upprepades på varje anläggning.
 *
 * Raden bär sex saker och inget mer. Allt annat bor i kortet, för en lista
 * man betar av måste gå att skanna.
 */

const STATUSAR = [
  ['ny', 'Ny'], ['forsokt', 'Försökt'], ['pratat', 'Pratat'],
  ['intresse', 'Intresse'], ['nej', 'Nej'],
];
const ETIKETT = Object.fromEntries(STATUSAR);

/* Följdfrågan beror på statusen. Att visa alla dimensioner samtidigt gör
   fälten icke-ortogonala: "Pratat" plus "Nådde inte fram" är ett tillstånd
   som inte ska gå att uttrycka. */
const FOLJDFRAGA = {
  forsokt: ['kontaktresultat', 'Utfall', [
    ['', '–'], ['inget_svar', 'Inget svar'], ['fel_nummer', 'Fel nummer'],
    ['fel_person', 'Fel person'], ['ombedd_aterkomma', 'Ombedd återkomma']]],
  pratat: ['kontaktresultat', 'Utfall', [
    ['', '–'], ['natt_fram', 'Nådde fram'], ['fel_person', 'Fel person'],
    ['ombedd_aterkomma', 'Ombedd återkomma']]],
  intresse: ['kontaktresultat', 'Utfall', [
    ['', '–'], ['natt_fram', 'Nådde fram'], ['ombedd_aterkomma', 'Ombedd återkomma']]],
  nej: ['orsak', 'Orsak', [
    ['', '–'], ['har_leverantor', 'Har leverantör'], ['inget_behov', 'Inget behov'],
    ['for_dyrt', 'För dyrt'], ['fel_tajming', 'Fel tajming'],
    ['ingen_beslutsratt', 'Ingen beslutsrätt'], ['annat', 'Annat']]],
};
const LISTFEL = [
  ['', 'Ingen'], ['fel_bransch', 'Fel bransch'], ['fel_storlek', 'Fel storlek'],
  ['fel_geografi', 'Fel geografi'], ['ar_kedja', 'Är kedja'],
  ['nedlagt', 'Nedlagt'], ['dubblett', 'Dubblett'],
];

/* Kontaktad, inte "bearbetad". Att öppna ett kort är inte att ha försökt. */
const KONTAKTAD = new Set(['forsokt', 'pratat', 'intresse', 'nej']);

const TAB = String.fromCharCode(9);
const NL = String.fromCharCode(10);
const SKRAP = new RegExp('[' + String.fromCharCode(9, 10, 13) + ']+', 'g');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kr = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const mkr = (v) => v == null ? '–'
  : (v / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' Mkr';
const telHref = (t) => 'tel:+46' + String(t).replace(/\D/g, '').replace(/^0/, '');
const val = (lista, valt) => lista.map(([v, t]) =>
  '<option value="' + v + '"' + (String(valt || '') === v ? ' selected' : '') + '>' +
  esc(t) + '</option>').join('');

/* Koncernnyckeln är dedupe-nivån ovanför bolaget. Unikt organisationsnummer
   är inte ett unikt säljtillfälle: i ett uttag av 100 hotellbolag sorterat på
   omsättning ligger 46 i en koncern med fler träffar, och Choice Hotels
   ensamt är 12 av de 100. Utan den här nyckeln ringer deltagaren samma
   inköpsorganisation tolv gånger. */
const koncern = (b) => b.koncern_nyckel || b.moderbolag_orgnr || b.orgnr;

const IDAG = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
function dagarTill(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : Math.round((d - IDAG) / 86400000);
}
function nastaVisning(a) {
  const d = dagarTill(a && a.nastaDatum);
  if (d === null) return { text: '', klass: '' };
  const text = new Date(String(a.nastaDatum).slice(0, 10) + 'T00:00:00')
    .toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  return { text, klass: d < 0 ? 'forbi' : d <= 7 ? 'snart' : '' };
}

export async function startaProspekt() {
  const rot = document.querySelector('[data-prospekt]');
  if (!rot) return;
  const $ = (n) => rot.querySelector('[data-' + n + ']');
  const slug = new URL(location.href).searchParams.get('lista') ||
    rot.dataset.slug || 'el-vvs-vastra-gotaland';

  let data;
  try {
    const r = await fetch('/api/prospekt/lista?slug=' + encodeURIComponent(slug), {
      headers: { Accept: 'application/json' },
    });
    data = await r.json();
    if (!r.ok) throw new Error(data && data.error);
  } catch (e) {
    $('lader').hidden = true;
    $('fel').hidden = false;
    $('felText').textContent =
      'Kontrollera att du är inloggad och att listan ingår i ditt köp.';
    return;
  }

  const lista = data.lista;
  const bolag = (data.bolag || []).map((b) => ({ ...b, stallen: b.stallen || [] }));
  const mitt = data.arbete || {};
  const arb = (b) => (mitt[b.orgnr] = mitt[b.orgnr] || { status: 'ny' });

  $('lader').hidden = true;
  $('innehall').hidden = false;

  /* ---------- huvud ---------- */
  const koncerner = new Set(bolag.map(koncern)).size;
  const stallenAntal = bolag.reduce((a, b) => a + Math.max(1, b.stallen.length), 0);
  $('namn').textContent = lista.namn;
  $('eyebrow').textContent = 'Motparten · prospektlista';
  $('ingress').innerHTML =
    '<b>' + bolag.length + ' av ' + (lista.population || bolag.length) + ' bolag</b> ' +
    'som matchar din marknad ligger i din arbetsyta. ' +
    'De är ' + stallenAntal + ' arbetsställen och <b>' + koncerner + ' koncerner</b>.';
  $('meta').innerHTML = [
    lista.segment ? '<span>Marknad <b>' + esc(lista.segment) + '</b></span>' : '',
    lista.geografi ? '<span>Geografi <b>' + esc(lista.geografi) + '</b></span>' : '',
    '<span>Uttag <b>' + esc(lista.uttag_datum) + '</b></span>',
  ].filter(Boolean).join('');
  $('kalla').textContent = lista.kallhanvisning || '';
  $('urval').textContent = lista.urval || '';

  /* ---------- filter ---------- */
  const orter = [...new Set(bolag.flatMap((b) => b.stallen.map((s) => s.ort).filter(Boolean)))]
    .sort((a, b) => a.localeCompare(b, 'sv'));
  $('fOrt').insertAdjacentHTML('beforeend',
    orter.map((o) => '<option value="' + esc(o) + '">' + esc(o) + '</option>').join(''));

  let vald = null;
  let synliga = [];

  function filtrera() {
    const q = $('q').value.trim().toLowerCase();
    const fs = $('fStatus').value;
    const fo = $('fOrt').value;
    const prio = [...rot.querySelectorAll('[data-prio][aria-pressed="true"]')]
      .map((b) => b.dataset.prio);
    const enPerKoncern = $('cKoncern').getAttribute('aria-pressed') === 'true';
    const attGora = $('cAtt').getAttribute('aria-pressed') === 'true';

    const sedda = new Set();
    return bolag.filter((b) => {
      const a = arb(b);
      if (prio.length && !prio.includes(b.prio)) return false;
      if (fs && a.status !== fs) return false;
      if (fo && !b.stallen.some((s) => s.ort === fo)) return false;
      if (attGora) {
        const d = dagarTill(a.nastaDatum);
        if (d === null || d > 7) return false;
      }
      if (q) {
        const h = [b.foretag, b.kontakt_namn, b.orgnr, b.verksamhet,
          ...b.stallen.map((s) => [s.ort, s.adress, s.kommun].join(' '))]
          .join(' ').toLowerCase();
        if (!h.includes(q)) return false;
      }
      if (enPerKoncern) {
        const k = koncern(b);
        if (sedda.has(k)) return false;
        sedda.add(k);
      }
      return true;
    });
  }

  /* ---------- listan ---------- */
  function ritaLista() {
    synliga = filtrera();
    const iKoncern = {};
    for (const b of bolag) iKoncern[koncern(b)] = (iKoncern[koncern(b)] || 0) + 1;

    $('lista').innerHTML = synliga.map((b) => {
      const a = arb(b);
      const n = Math.max(1, b.stallen.length);
      const nx = nastaVisning(a);
      const syskon = iKoncern[koncern(b)] || 1;
      const begransad = b.kanaler && b.kanaler.indexOf('EJ') !== -1;
      const forsta = b.stallen[0] || {};
      return '<button class="rad" data-org="' + esc(b.orgnr) + '"' +
        ' data-status="' + esc(a.status) + '"' +
        ' aria-current="' + (vald === b.orgnr) + '">' +
        '<span class="dot" data-s="' + esc(a.status) + '"></span>' +
        '<span class="nr">' + String(b.nr).padStart(3, '0') + '</span>' +
        '<span><span class="namn">' + esc(b.foretag) + '</span>' +
        '<span class="sub">' +
          '<span>' + esc(forsta.ort || '') + (n > 1 ? ' m.fl.' : '') + '</span>' +
          (syskon > 1 && b.moderbolag
            ? '<span class="tagg gold">' + syskon + ' i ' +
              esc(String(b.moderbolag).split(' ')[0]) + '</span>'
            : '<span>' + esc(b.koncernlage || '') + '</span>') +
          (begransad ? '<span class="tagg stop">Ej brev/mejl</span>' : '') +
        '</span></span>' +
        '<span class="nasta ' + nx.klass + '">' + (esc(nx.text) || '–') + '</span>' +
        '<span class="oms">' + mkr(b.omsattning_tkr) + '</span>' +
        '<span class="stallen-c">' +
          (n > 1 ? '<span class="tagg blue">' + n + ' ställen</span>' : '1') +
        '</span></button>';
    }).join('');

    $('tomt').hidden = synliga.length > 0;
    const synligaKoncerner = new Set(synliga.map(koncern)).size;
    $('count').textContent = synliga.length + ' bolag · ' + synligaKoncerner + ' koncerner';
    const k = bolag.filter((b) => KONTAKTAD.has(arb(b).status)).length;
    $('progLabel').textContent = k + ' kontaktade · ' + (bolag.length - k) + ' kvar';
    $('progFill').style.transform = 'scaleX(' + (bolag.length ? k / bolag.length : 0) + ')';
  }

  /* ---------- kortet ---------- */
  function ritaKort() {
    const panel = $('panel');
    if (!vald) {
      panel.innerHTML = '<div class="kort-tom">Välj ett bolag i listan.<br>' +
        '<span>Piltangenterna flyttar, Esc stänger.</span></div>';
      return;
    }
    const b = bolag.find((x) => x.orgnr === vald);
    if (!b) { vald = null; return ritaKort(); }
    const a = arb(b);
    const f = FOLJDFRAGA[a.status];
    const nx = nastaVisning(a);
    const syskon = bolag.filter((x) => koncern(x) === koncern(b) && x.orgnr !== b.orgnr);
    const begransad = b.kanaler && b.kanaler.indexOf('EJ') !== -1;

    panel.innerHTML =
      '<div class="k-head"><p class="eyebrow">' +
        '<span>Nr ' + String(b.nr).padStart(3, '0') + ' · Grupp ' + esc(b.prio) + '</span>' +
        '<button class="stang" data-stang>Stäng</button></p>' +
        '<h2>' + esc(b.foretag) + '</h2>' +
        '<p class="orgnr">' + esc(b.orgnr) + ' · ' + esc(b.koncernlage || '') +
        (b.moderbolag ? ' till ' + esc(b.moderbolag) : '') + '</p></div>' +

      (syskon.length
        ? '<div class="blk"><div class="hist"><b>' + syskon.length +
          ' andra bolag i din lista</b> tillhör ' + esc(b.moderbolag || 'samma koncern') +
          '. Inköpet kan ligga centralt.<br><span class="dim">' +
          syskon.slice(0, 6).map((x) => esc(x.foretag)).join(' · ') +
          (syskon.length > 6 ? ' m.fl.' : '') + '</span></div></div>'
        : '') +

      '<div class="blk viktig"><p class="lbl">Nästa steg</p><div class="tva">' +
        '<label><span class="lbl">Vad</span>' +
        '<input class="txt" data-falt="nasta" value="' + esc(a.nasta || '') +
        '" placeholder="t.ex. Ring igen"></label>' +
        '<label><span class="lbl">När</span>' +
        '<input class="txt" type="date" data-falt="nastaDatum" value="' +
        esc(String(a.nastaDatum || '').slice(0, 10)) + '"></label></div>' +
        (nx.klass === 'forbi' ? '<p class="varning stop">Datumet har passerat.</p>' : '') +
      '</div>' +

      '<div class="blk"><p class="lbl">Kontaktperson</p>' +
        (b.kontakt_namn
          ? '<div class="person"><span class="n">' + esc(b.kontakt_namn) + '</span>' +
            '<span class="r">' + esc(b.kontakt_roll || '') + '</span></div>' +
            '<p class="kalla">Registrerad hos Bolagsverket' +
            (b.kontakt_kalla ? ' · ' + esc(b.kontakt_kalla) : '') + '</p>'
          : '<div class="tomrad">Ingen registrerad kontaktperson.</div>') +
        (a.verifierad && a.verifierad.namn
          ? '<div class="varning"><b>Verifierad beslutsfattare</b><br>' +
            esc(a.verifierad.namn) +
            (a.verifierad.titel ? ' · ' + esc(a.verifierad.titel) : '') +
            (a.verifierad.kalla
              ? '<br><span class="dim">Hittad på ' + esc(a.verifierad.kalla) + '</span>' : '') +
            '</div>'
          : '<div class="tomrad mt">Ingen verifierad beslutsfattare än. Registrerad VD ' +
            'säger vem som företräder bolaget juridiskt, inte vem som köper det du säljer.</div>') +
      '</div>' +

      '<div class="blk"><p class="lbl">Kontaktvägar</p>' +
        (b.telefon
          ? '<div class="faltrad"><span class="k">Bolagets växel</span>' +
            '<a href="' + esc(telHref(b.telefon)) + '">' + esc(b.telefon) + '</a></div>' +
            '<p class="kalla">' + esc(b.telefon_kalla || 'registret') +
            ' · inte ett direktnummer</p>'
          : '<div class="tomrad">Inget nummer i registret.</div>') +
        (b.epost
          ? '<div class="faltrad"><span class="k">Mejl</span>' +
            '<a href="mailto:' + esc(b.epost) + '">' + esc(b.epost) + '</a></div>' : '') +
        (b.hemsida
          ? '<div class="faltrad"><span class="k">Webbplats</span>' +
            '<a href="' + esc(b.hemsida) + '" target="_blank" rel="noopener">' +
            esc(String(b.hemsida).replace(/^https?:\/\//, '')) + '</a></div>' : '') +
        (begransad
          ? '<p class="varning stop">' + esc(b.kanaler) + ' · reklamspärr hos SCB</p>' : '') +
      '</div>' +

      '<div class="blk"><p class="lbl">' +
        (b.stallen.length > 1 ? b.stallen.length + ' arbetsställen' : 'Arbetsställe') +
        '</p><ul class="stallen">' +
        (b.stallen.length
          ? b.stallen.map((s) => '<li><span>' + esc(s.adress || '') +
              '<span class="ort">' + esc([s.postnr, s.ort].filter(Boolean).join(' ')) + '</span>' +
              '</span>' + (s.huvudkontor ? '<span class="tagg gold">Huvudkontor</span>' : '') +
              '</li>').join('')
          : '<li><span class="dim">Ingen adress i uttaget</span></li>') +
      '</ul></div>' +

      '<div class="blk"><p class="lbl">Bolaget</p><div class="matchar">' +
        (b.verksamhet ? '<span>' + esc(b.verksamhet) + '</span>' : '') +
        (b.anstallda != null ? '<span>' + b.anstallda + ' anställda</span>' : '') +
        (b.omsattning_tkr != null
          ? '<span>' + mkr(b.omsattning_tkr) +
            (b.omsattning_ar ? ' (' + b.omsattning_ar + ')' : '') + '</span>' : '') +
      '</div>' + (b.notering ? '<p class="notering">' + esc(b.notering) + '</p>' : '') + '</div>' +

      '<div class="blk"><p class="lbl">Ditt arbete</p><div class="tva">' +
        '<label><span class="lbl">Status</span>' +
        '<select data-falt="status">' + val(STATUSAR, a.status) + '</select></label>' +
        (f
          ? '<label><span class="lbl">' + esc(f[1]) + '</span>' +
            '<select data-falt="' + f[0] + '">' + val(f[2], a[f[0]]) + '</select></label>'
          : '<label><span class="lbl">Värde</span>' +
            '<input class="txt" data-falt="varde" placeholder="Värde kr" value="' +
            (a.varde ? esc(kr(a.varde)) : '') + '"></label>') +
        '</div>' +
        '<label class="enfalt"><span class="lbl">Fel i listan</span>' +
        '<select data-falt="listfel">' + val(LISTFEL, a.listfel) + '</select></label>' +
        '<textarea class="jot" data-falt="anteckning" placeholder="Anteckning">' +
        esc(a.anteckning || '') + '</textarea>' +
      '</div>';

    panel.querySelector('[data-stang]').addEventListener('click', () => {
      vald = null; ritaLista(); ritaKort();
    });
    for (const el of panel.querySelectorAll('[data-falt]')) {
      el.addEventListener('change', () => andra(b, el));
      if (el.matches('textarea, input.txt')) {
        el.addEventListener('input', () => andra(b, el, true));
      }
    }
  }

  /* ---------- ändra och spara ---------- */
  function andra(b, el, mjuk) {
    const a = arb(b);
    const falt = el.dataset.falt;
    let v = el.value;
    if (falt === 'varde') v = v.replace(/\D/g, '');
    a[falt] = v === '' ? null : v;
    if (falt === 'status') {
      // Följdfrågan hör till statusen. Byts statusen faller den gamla koden.
      a.kontaktresultat = null;
      a.orsak = null;
      ritaLista(); ritaKort();
    } else if (!mjuk) {
      ritaLista();
    }
    spara(b);
  }

  const koer = new Map();
  function visaSpar(text) {
    $('sparstatus').textContent = text;
    if (text === 'Sparat') {
      setTimeout(() => {
        if ($('sparstatus').textContent === 'Sparat') $('sparstatus').textContent = '';
      }, 1500);
    }
  }
  function spara(b) {
    const a = arb(b);
    clearTimeout(koer.get(b.orgnr));
    koer.set(b.orgnr, setTimeout(async () => {
      visaSpar('Sparar…');
      try {
        const res = await fetch('/api/prospekt/arbete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgnr: b.orgnr,
            status: a.status || 'ny',
            varde: a.varde || null,
            anteckning: a.anteckning || null,
            nasta: a.nasta || null,
            nastaDatum: a.nastaDatum || null,
            kontaktresultat: a.kontaktresultat || null,
            orsak: a.orsak || null,
            listfel: a.listfel || null,
          }),
        });
        visaSpar(res.ok ? 'Sparat' : 'Kunde inte spara');
      } catch (e) {
        visaSpar('Kunde inte spara');
      }
    }, 500));
  }

  /* ---------- interaktion ---------- */
  $('lista').addEventListener('click', (e) => {
    const r = e.target.closest('.rad');
    if (!r) return;
    vald = r.dataset.org;
    ritaLista(); ritaKort();
    if (window.matchMedia('(max-width: 1119px)').matches) {
      $('panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  for (const n of ['q', 'fStatus', 'fOrt']) $(n).addEventListener('input', ritaLista);
  for (const el of rot.querySelectorAll('.controls [aria-pressed]')) {
    el.addEventListener('click', () => {
      el.setAttribute('aria-pressed',
        el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      ritaLista();
    });
  }
  $('reset').addEventListener('click', () => {
    $('q').value = '';
    $('fStatus').value = '';
    $('fOrt').value = '';
    for (const el of rot.querySelectorAll('.controls [aria-pressed]')) {
      el.setAttribute('aria-pressed', 'false');
    }
    ritaLista();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { vald = null; ritaLista(); ritaKort(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (e.target.matches('input, textarea, select')) return;
    e.preventDefault();
    const i = synliga.findIndex((b) => b.orgnr === vald);
    const n = e.key === 'ArrowDown'
      ? Math.min(i + 1, synliga.length - 1)
      : Math.max(i - 1, 0);
    if (synliga[n]) { vald = synliga[n].orgnr; ritaLista(); ritaKort(); }
  });

  /* ---------- export ---------- */
  const KOLUMNER = [
    ['Nr', (b) => b.nr], ['Grupp', (b) => b.prio], ['Företag', (b) => b.foretag],
    ['Orgnr', (b) => b.orgnr], ['Verksamhet', (b) => b.verksamhet],
    ['Anställda', (b) => b.anstallda], ['Omsättning tkr', (b) => b.omsattning_tkr],
    ['Koncernläge', (b) => b.koncernlage], ['Moderbolag', (b) => b.moderbolag],
    ['Arbetsställen', (b) => Math.max(1, b.stallen.length)],
    ['Huvudkontor', (b) => {
      const hk = b.stallen.find((s) => s.huvudkontor) || b.stallen[0] || {};
      return [hk.adress, hk.postnr, hk.ort].filter(Boolean).join(', ');
    }],
    ['Kontaktperson', (b) => b.kontakt_namn], ['Roll', (b) => b.kontakt_roll],
    ['Telefon', (b) => b.telefon], ['E-post', (b) => b.epost], ['Hemsida', (b) => b.hemsida],
    ['Tillåtna kanaler', (b) => b.kanaler], ['Notering', (b) => b.notering],
    ['Status', (b) => ETIKETT[arb(b).status]], ['Nästa steg', (b) => arb(b).nasta],
    ['Nästa datum', (b) => arb(b).nastaDatum],
    ['Värde', (b) => arb(b).varde || ''], ['Anteckning', (b) => arb(b).anteckning],
  ];
  $('export').addEventListener('click', async function () {
    if (!synliga.length) return;
    const rensa = (v) => String(v == null ? '' : v).replace(SKRAP, ' ').trim();
    const ut = [KOLUMNER.map((c) => c[0]).join(TAB)];
    for (const b of synliga) ut.push(KOLUMNER.map((c) => rensa(c[1](b))).join(TAB));
    let ok = false;
    try { await navigator.clipboard.writeText(ut.join(NL)); ok = true; } catch (e) { ok = false; }
    const etikett = this.textContent;
    this.textContent = ok ? synliga.length + ' bolag kopierade' : 'Kunde inte kopiera';
    setTimeout(() => { this.textContent = etikett; }, 1800);
  });

  ritaLista();
  ritaKort();
}
