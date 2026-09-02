import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lasFlode, farskGrans, delaUppFlodet } from '../../motor/mfn-flode.mjs';

/* Ett utdrag ur MFN:s riktiga entitetsflöde. Datumet ligger i en egen span
   strax före länken, inte i något attribut på länken själv. */
const post = (datum, tid, href) => `
  <div class="short-item-wrapper">
    <div class="short-item compressible" onclick="goToNewsItem(event, '${href}')">
      <span class="item"><div class="title">
        <span class="compressed-date">${datum}</span>
        <span class="compressed-time">${tid}</span>
        <span class="compressed-title">
          <a class="title-link item-link" href="${href}" title="rubrik">rubrik</a>
        </span>
      </div></span>
    </div>
  </div>`;

const FLODE = post('2026-09-01', '08:00:00', '/a/saniona/saniona-starker-ledningsteamet')
  + post('2025-11-27', '07:30:00', '/a/saniona/saniona-publishes-its-interim-report-for-the-third-quarter-of-2025');

test('lasFlode: varje artikel bar sitt eget datum, inte korningens', () => {
  const p = lasFlode(FLODE);
  assert.equal(p.length, 2);
  assert.equal(p[0].url, 'https://mfn.se/a/saniona/saniona-starker-ledningsteamet');
  assert.equal(p[0].datum, '2026-09-01');
  assert.equal(p[0].publicerad, '2026-09-01T08:00:00');
  assert.equal(p[1].datum, '2025-11-27');
});

test('lasFlode: absolut href, wire-prefix och dubblett', () => {
  const h = post('2026-09-01', '08:00:00', 'https://mfn.se/nir/a/ferroamp/kommunike')
    + post('2026-09-01', '09:00:00', '/nir/a/ferroamp/kommunike');
  const p = lasFlode(h);
  assert.equal(p.length, 1);
  assert.equal(p[0].url, 'https://mfn.se/nir/a/ferroamp/kommunike');
});

/* Om MFN byter markup ska en artikel inte tystna. Ett okänt datum är ett
   "vet inte", och ett vet-inte ska rapporteras, inte sopas undan: baslinjen
   nedan är det som skyddar mot backloggen, inte datumet. */
test('lasFlode: lank utan datum ger null, inte ett pahittat datum', () => {
  const p = lasFlode('<a class="title-link item-link" href="/a/x/utan-datum">x</a>');
  assert.equal(p.length, 1);
  assert.equal(p[0].datum, null);
  assert.equal(p[0].publicerad, null);
});

/* Gränsen jämförs mot MFN:s tider, som är svensk lokaltid, så den räknas om
   dit. Utan omräkningen uppstår ett par timmars blint fönster strax efter
   förra körningen där färska pressmeddelanden faller bort. */
test('farskGrans: utan kand foregaende korning racker tva dygn bakat', () => {
  assert.equal(farskGrans('2026-09-02T05:00:00Z', null), '2026-08-31T07:00:00');
});

test('farskGrans: med kand foregaende korning ar det den som galler', () => {
  assert.equal(farskGrans('2026-09-02T05:00:00Z', '2026-09-01T09:36:28.997Z'), '2026-09-01T11:36:28');
});

/* En lång paus i jobbet får inte tömma en hel månads flöde i ett brev. */
test('farskGrans: en gammal korning golvas vid sju dygn', () => {
  assert.equal(farskGrans('2026-09-02T05:00:00Z', '2026-06-01T00:00:00Z'), '2026-08-26T07:00:00');
});

const GRANS = '2026-09-01T00:00:00';

test('delaUppFlodet: forsta gangen ett bolag ses rapporteras ingenting', () => {
  const p = lasFlode(FLODE);
  const r = delaUppFlodet(p, {}, GRANS);
  assert.equal(r.forstaGangen, true);
  assert.deepEqual(r.rapportera, []);
  assert.equal(r.baraArkivera.length, 2);
});

test('delaUppFlodet: en gammal artikel arkiveras men hamnar inte i brevet', () => {
  const p = lasFlode(FLODE);
  const r = delaUppFlodet(p, { 'https://mfn.se/a/saniona/redan-sedd': '2026-08-30' }, GRANS);
  assert.equal(r.forstaGangen, false);
  assert.deepEqual(r.rapportera.map(x => x.datum), ['2026-09-01']);
  assert.deepEqual(r.baraArkivera.map(x => x.datum), ['2025-11-27']);
});

test('delaUppFlodet: en redan sedd artikel ror ingenting', () => {
  const p = lasFlode(FLODE);
  const sedda = { 'https://mfn.se/a/saniona/saniona-starker-ledningsteamet': '2026-09-01' };
  const r = delaUppFlodet(p, sedda, GRANS);
  assert.deepEqual(r.rapportera, []);
  assert.deepEqual(r.baraArkivera.map(x => x.datum), ['2025-11-27']);
});

test('delaUppFlodet: okant datum rapporteras hellre an tystas', () => {
  const p = lasFlode('<a class="title-link item-link" href="/a/x/utan-datum">x</a>');
  const r = delaUppFlodet(p, { 'https://mfn.se/a/x/nagot-sett': '2026-08-30' }, GRANS);
  assert.equal(r.rapportera.length, 1);
});

/* Taket gäller det vi hämtar hem, inte det vi arkiverar. Annars betar ett nytt
   bolag av sin backlog sex per natt, vilket är precis felet vi rättar. */
test('delaUppFlodet: taket begransar hamtningen, allt ovrigt arkiveras anda', () => {
  const manga = Array.from({ length: 9 }, (_, i) =>
    post('2026-09-01', '08:00:00', '/a/x/artikel-' + i)).join('');
  const r = delaUppFlodet(lasFlode(manga), { 'https://mfn.se/a/x/sedd': '1' }, GRANS, { tak: 6 });
  assert.equal(r.rapportera.length, 6);
  assert.equal(r.baraArkivera.length, 3);
});
