// Historik pa begaran: att lasa MFN:s flode, valja ratt dokument pa rubrik
// enbart, och aldrig kasta nar kallan strular.
//
// Ingen nattrafik har. Markupen i fixturen ar MFN:s riktiga form, kapad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entitetsFeed, lasIndex, tillText, bitar, valjDokument, hamtaPeriod }
  from '../../functions/api/_mfn.js';

const kort = (datum, slug, titel) => `
 <div class="short-item compressible" id="x">
  <span class="item"><div class="title">
   <span class="compressed-date">${datum}</span>
   <span class="compressed-time">08:00:00</span>
   <span class="compressed-title">
    <a class="title-link item-link" href="/beq/a/unibap/${slug}" title="${titel}">${titel}</a>
   </span>
  </div></span>
 </div>`;

const FLODE = '<div id="entity-feed-body">' + [
  kort('2026-08-26', 'unibap-order-fran-esa-aaaaaa11', 'Unibap: order från ESA'),
  kort('2023-02-09', 'bokslutskommunike-juli-2021-december-2022-bbbbbb22', 'Bokslutskommuniké juli 2021 - december 2022'),
  kort('2022-11-10', 'delarsrapport-juli-2021-september-2022-cccccc33', 'Delårsrapport juli 2021 - september 2022'),
  kort('2022-10-01', 'inbjudan-till-presentation-av-q3-dddddd44', 'Inbjudan till presentation av Q3'),
  kort('2022-08-31', 'delarsrapport-juli-2021-juni-2022-eeeeee55', 'Delårsrapport juli 2021 - juni 2022'),
].join('') + '</div>';

test('entitetsFeed harleds ur ett dokuments URL', () => {
  assert.equal(entitetsFeed('https://mfn.se/beq/a/unibap/nagot-abc123'),
    'https://mfn.se/all/a/unibap');
  assert.equal(entitetsFeed('https://mfn.se/cis/a/axfood/nagot-abc123'),
    'https://mfn.se/all/a/axfood');
  assert.equal(entitetsFeed('https://example.com/a/b/c'), null);
  assert.equal(entitetsFeed(''), null);
});

test('lasIndex parar datum med ratt lank', () => {
  const i = lasIndex(FLODE);
  assert.equal(i.length, 5);
  assert.equal(i[0].datum, '2026-08-26');
  assert.equal(i[4].datum, '2022-08-31');
  assert.ok(i[4].url.startsWith('https://mfn.se/beq/a/unibap/'));
  assert.equal(i[1].rubrik, 'Bokslutskommuniké juli 2021 - december 2022');
});

test('lasIndex pa skrap ger tom lista i stallet for att kasta', () => {
  assert.deepEqual(lasIndex(''), []);
  assert.deepEqual(lasIndex('<html><body>inget</body></html>'), []);
});

test('tillText skalar bort taggar och skript', () => {
  const t = tillText('<div><script>var x=1</script><p>Kassan &amp; resten uppgick till 12,4 MSEK.</p></div>');
  assert.equal(t, 'Kassan & resten uppgick till 12,4 MSEK.');
});

/* MFN:s kurswidget bar egna tal ("Antal aktier 2 526"). Slapps de in i
   underlaget godkanner kallgrinden dem, for den fragar bara om talet star i
   utdraget, inte vem som skrev det. Da kan assistenten citera en widget som om
   det vore bolagets redovisning. Artikeln, och inget annat. */
test('tillText tar bara artikeln, sa sidans egna tal inte blir underlag', () => {
  const sida = '<body><div class="menu">MFN.se &gt; Unibap &gt; Pressmeddelanden</div>' +
    '<div class="widget">mcap 0,01% | Antal aktier 2 526</div>' +
    '<article id="x"><p>Nettoomsattningen uppgick till 6 969 KSEK (4 268).</p></article>' +
    '<div class="footer">Analysera bolaget i Borsdata</div></body>';
  const t = tillText(sida);
  assert.equal(t, 'Nettoomsattningen uppgick till 6 969 KSEK (4 268).');
  assert.ok(!t.includes('2 526'), 'widgetens tal far inte bli underlag');
  assert.ok(!t.includes('Borsdata'), 'sidfoten ska inte med');
});

test('tillText faller tillbaka pa hela sidan utan article-element', () => {
  assert.equal(tillText('<div><p>Bara en sida.</p></div>'), 'Bara en sida.');
});

test('bitar styckar och tappar ingenting', () => {
  const b = bitar('En mening. En till. Och en tredje.');
  assert.equal(b.length, 1);
  assert.ok(b[0].includes('tredje'));
  assert.deepEqual(bitar(''), []);
});

/* Urvalet ar hela besparingen: 341 rubriker kostar ett anrop, och bara de
   handfull som kan bara svaret hamtas hem. */
test('valjDokument tar rapporterna i perioden, inte det farskaste', () => {
  const p = { fran: '2022-01-01', till: '2022-12-31' };
  const v = valjDokument(lasIndex(FLODE), p, ['omsattning'], 4);
  const datum = v.map((x) => x.datum);
  assert.ok(!datum.includes('2026-08-26'), 'dokument utanfor perioden ska inte med');
  assert.ok(datum.includes('2022-08-31'));
  assert.ok(datum.includes('2022-11-10'));
});

/* Bokslutet for 2022 kommer i februari 2023 och maste med, annars missar en
   fraga om 2022 bolagets egen sammanfattning av just 2022. */
test('valjDokument tar med bokslutet som publicerades efter arsskiftet', () => {
  const v = valjDokument(lasIndex(FLODE), { fran: '2022-01-01', till: '2022-12-31' }, [], 4);
  assert.ok(v.some((x) => x.datum === '2023-02-09'), 'bokslutet for 2022 saknas');
});

test('valjDokument hoppar over inbjudan till presentation', () => {
  const v = valjDokument(lasIndex(FLODE), { fran: '2022-01-01', till: '2022-12-31' }, [], 10);
  assert.ok(!v.some((x) => /inbjudan/.test(x.url)), 'logistikdokument ska inte hamtas');
});

test('valjDokument hoppar over det arkivet redan har', () => {
  const idx = lasIndex(FLODE);
  const kanda = new Set([idx[4].url]);
  const v = valjDokument(idx, { fran: '2022-01-01', till: '2022-12-31' }, [], 10, kanda);
  assert.ok(!v.some((x) => x.url === idx[4].url));
});

/* Fejkad fetch: ett anrop for flodet, ett per valt dokument. */
function fejk(karta) {
  return async (url) => {
    const kropp = Object.keys(karta).find((k) => url.includes(k));
    if (!kropp) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => karta[kropp] };
  };
}

test('hamtaPeriod plockar hem dokumenten i arkivets form', async () => {
  const brodtext = '<p>' + 'Nettoomsattningen uppgick till 6 969 KSEK (4 268). '.repeat(8) + '</p>';
  const r = await hamtaPeriod({
    dokumentUrl: 'https://mfn.se/beq/a/unibap/nagot-abc123',
    period: { fran: '2022-01-01', till: '2022-12-31' },
    termer: ['omsattning'], max: 2,
    hamta: fejk({ '/all/a/unibap?limit=': FLODE, 'delarsrapport': brodtext, 'bokslutskommunike': brodtext }),
  });
  assert.equal(r.av, null);
  assert.ok(r.dokument.length >= 1);
  const d = r.dokument[0];
  assert.deepEqual(Object.keys(d).sort(), ['bitar', 'datum', 'rubrik', 'typ', 'url']);
  assert.ok(d.bitar.length >= 1);
  assert.equal(r.index.length, 5);
});

test('hamtaPeriod kastar aldrig nar floedet dor', async () => {
  const r = await hamtaPeriod({
    dokumentUrl: 'https://mfn.se/beq/a/unibap/nagot-abc123',
    period: { fran: '2022-01-01', till: '2022-12-31' }, termer: [],
    hamta: async () => { throw new Error('natverket dog'); },
  });
  assert.deepEqual(r.dokument, []);
  assert.match(r.av, /gick inte att na/);
});

test('hamtaPeriod utan harledbar feed sager varfor', async () => {
  const r = await hamtaPeriod({ dokumentUrl: 'https://example.com/x', period: null, termer: [] });
  assert.deepEqual(r.dokument, []);
  assert.match(r.av, /ingen feed/);
});

test('hamtaPeriod sager till nar perioden ar tom', async () => {
  const r = await hamtaPeriod({
    dokumentUrl: 'https://mfn.se/beq/a/unibap/nagot-abc123',
    period: { fran: '2009-01-01', till: '2009-12-31' }, termer: [],
    hamta: fejk({ '/all/a/unibap?limit=': FLODE }),
  });
  assert.deepEqual(r.dokument, []);
  assert.match(r.av, /inga dokument i perioden/);
});
