/* src/scripts/bestallningar.js — intern orderbok.
 *
 * Varje order visar också det färdiga kommandot för scraper-repot, så steget
 * mellan "deltagaren har beställt" och "listan finns" är en kopiering och
 * inte ett letande efter rätt SNI-koder.
 */

const STATUSAR = [
  ['ny', 'Ny'],
  ['arbetas', 'Arbetas'],
  ['klar', 'Klar'],
  ['avvisad', 'Avvisad'],
];
const ETIKETT = Object.fromEntries(STATUSAR);

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const slugga = (s) =>
  String(s || '').toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);

function kommando(b) {
  const sni = (b.sni_koder || []).join(',');
  const lan = (b.lan_koder || []).join(',');
  const stl = (b.storlek_koder || []).join(',') || '3,4,5';
  const namn = b.saljer ? `Prospekt för ${b.bestallare_namn || b.bestallare_epost}` : 'Prospektlista';
  const slug = slugga(namn) || 'lista-' + String(b.id).slice(0, 8);
  return [
    'uv run python scripts/bygg_prospektlista.py \\',
    `  --sni ${sni} --lan ${lan || '14'} --storlek ${stl} \\`,
    `  --namn "${namn}" --ut data/prospekt/${slug}.json`,
    '',
    '# sedan, i kurs-repot:',
    `node tools/importera-prospektlista.mjs \\`,
    `  --fil ../VNDY/scraper/vndy-scraper/data/prospekt/${slug}.json \\`,
    `  --slug ${slug} --publicera --kop ${b.bestallare_epost}`,
  ].join('\n');
}

export async function startaOrderbok() {
  const rot = document.querySelector('[data-order]');
  if (!rot) return;
  const $ = (n) => rot.querySelector('[data-' + n + ']');

  async function hamta() {
    const r = await fetch('/api/prospekt/bestallningar', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok) throw new Error(j && j.error);
    return j;
  }

  let data;
  try {
    data = await hamta();
  } catch (e) {
    $('lader').hidden = true;
    $('fel').hidden = false;
    $('felText').textContent =
      String(e.message) === 'ingen atkomst'
        ? 'Orderboken är intern. Ditt konto har inte åtkomst.'
        : 'Kunde inte hämta orderboken.';
    return;
  }

  $('lader').hidden = true;
  $('innehall').hidden = false;

  function rita(j) {
    const listor = Object.fromEntries((j.listor || []).map((l) => [l.id, l]));
    const rader = j.bestallningar || [];
    $('antal').textContent = rader.length ? '(' + rader.length + ')' : '';
    $('tom').hidden = rader.length > 0;

    $('rader').innerHTML = rader.map((b) => {
      const l = b.lista_id ? listor[b.lista_id] : null;
      const spec = [
        b.sni_koder && b.sni_koder.length ? '<b>SNI ' + esc(b.sni_koder.join(', ')) + '</b>' : null,
        b.lan_koder && b.lan_koder.length ? 'Län ' + esc(b.lan_koder.join(', ')) : null,
        b.storlek_koder && b.storlek_koder.length ? 'Storlek ' + esc(b.storlek_koder.join(',')) : null,
        b.antal_onskat ? esc(b.antal_onskat) + ' rader önskat' : null,
        esc(String(b.created_at || '').slice(0, 10)),
      ].filter(Boolean).map((x) => '<span>' + x + '</span>').join('');

      const intag = [
        b.saljer ? 'Säljer: ' + esc(b.saljer) : null,
        b.malgrupp ? 'Målgrupp: ' + esc(b.malgrupp) : null,
        b.diskvalificerar
          ? 'Diskvalificerar: ' + esc(b.diskvalificerar)
          : '<em>Diskvalificerar: inte ifyllt, fråga innan du kör</em>',
        b.notering ? 'Notering: ' + esc(b.notering) : null,
      ].filter(Boolean).join('<br>');

      const val = STATUSAR.map(([v, t]) =>
        '<option value="' + v + '"' + (b.status === v ? ' selected' : '') + '>' + t + '</option>').join('');

      return '<article class="orad" data-id="' + esc(b.id) + '">' +
        '<div><h3 class="obestallare">' + esc(b.bestallare_namn || b.bestallare_epost) + '</h3>' +
        '<div class="ospec">' + spec + '</div>' +
        '<p class="ointag">' + intag + '</p>' +
        '<pre class="okommando" title="Klicka för att kopiera">' + esc(kommando(b)) + '</pre>' +
        '</div>' +
        '<div class="osida">' +
        '<span class="obricka" data-s="' + esc(b.status) + '">' + esc(ETIKETT[b.status] || b.status) + '</span>' +
        '<select class="ostatus-sel" aria-label="Status">' + val + '</select>' +
        (l ? '<a class="olank" href="/motparten/prospekt?lista=' + encodeURIComponent(l.slug) + '">' +
             esc(l.namn) + (l.publicerad ? '' : ' (opublicerad)') + '</a>'
           : '<span class="ohint">Ingen lista kopplad än</span>') +
        '</div></article>';
    }).join('');
  }

  rita(data);

  // Kopiera kommandot: hela steget mellan order och lista är en klistring.
  $('rader').addEventListener('click', async (e) => {
    const pre = e.target.closest('.okommando');
    if (!pre) return;
    try {
      await navigator.clipboard.writeText(pre.textContent);
      const gammal = pre.style.borderColor;
      pre.style.borderColor = 'var(--mp-ok, #5c6b4a)';
      setTimeout(() => { pre.style.borderColor = gammal; }, 1200);
    } catch (err) { /* urklipp nekat, texten går att markera ändå */ }
  });

  $('rader').addEventListener('change', async (e) => {
    const sel = e.target.closest('.ostatus-sel');
    if (!sel) return;
    const id = sel.closest('.orad').dataset.id;
    const bricka = sel.closest('.osida').querySelector('.obricka');
    try {
      const r = await fetch('/api/prospekt/bestallningar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: sel.value }),
      });
      if (!r.ok) throw new Error();
      bricka.dataset.s = sel.value;
      bricka.textContent = ETIKETT[sel.value];
    } catch (err) {
      bricka.textContent = 'Kunde inte spara';
    }
  });

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const status = $('formstatus');
    status.textContent = 'Sparar…';
    const kropp = Object.fromEntries(new FormData(f).entries());
    try {
      const r = await fetch('/api/prospekt/bestallningar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kropp),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j && j.error) || 'fel');
      f.reset();
      f.querySelector('[name="storlek_koder"]').value = '3,4,5';
      status.textContent = 'Sparad';
      rita(await hamta());
      setTimeout(() => { status.textContent = ''; }, 1800);
    } catch (err) {
      status.textContent = 'Kunde inte spara: ' + err.message;
    }
  });
}
