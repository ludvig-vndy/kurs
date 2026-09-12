/* Motpartens egen kommunikation, och varfor den bar en egen etikett.

   Arkivet innehaller bara de bevakade bolagens egna pressmeddelanden fran MFN.
   Piloten fragade om Unibaps koppling till ett avtal Loft Orbital slot med
   Frankrike, och fick "det dokumentet saknas i det tillgangliga underlaget".
   Nyheten kom fran Loft Orbital och Orbitworks, inte fran Unibap, sa den kunde
   aldrig finnas dar oavsett hur mycket som skrevs om den.

   Svaret han bad om var inte en gissning:

     "Den kan anda presentera att Unibap har ett avtal med Loft, Loft fick nu
      ett avtal med Frankrike vart 1 miljard dollar. Sa far man gora slutsatsen
      sjalv i stallet for att AI gor slutsatsen."

   Tva belagda uppgifter bredvid varandra, ingen tolkning som binder ihop dem.
   Svarsformatet gor redan den uppdelningen; det som saknades var den andra
   kallan.

   NIVA 2, INTE NIVA 1, och det ar hela risken med tillskottet. Ett onoterat
   bolags nyhetsrum ar marknadsforing. Sager de sjalva att ett avtal ar vart en
   miljard dollar ar det deras uppgift, inte en reviderad siffra. Etiketten
   maste saga det i svaret, inte i en kalla man kan klicka pa. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';
import { lasFaktasvar } from '../../functions/api/_faktasvar.js';
import { berakna } from '../../functions/api/_berakning.js';
import { bitar, textUrHtml, lasLista, byggMotparter } from '../../motor/bygg-motparter.mjs';

const MOTPART = {
  bolag: 'Unibap Space Solutions', motpart: 'Loft Orbital',
  dokument: [{ url: 'https://www.loftorbital.com/newsroom', rubrik: 'Loft Orbital, egen kommunikation',
    bitar: ['Loft Orbital today announced a landmark agreement with France.'] }],
};

const register = (motparter = [MOTPART]) => {
  const r = skapaFaktaregister();
  r.synka({ question: 'Har Unibap kopplingar till Loft Orbitals avtal med Frankrike?',
    holdings: [{ name: 'Unibap Space Solutions', quantity: 1, gav: 1 }],
    arkiv: [], utdrag: [], motparter });
  return r;
};

test('motpartens text kommer in som en EGEN posttyp', () => {
  const p = register().poster().filter(x => x.typ === 'motpart');
  assert.equal(p.length, 1, 'motpartsposten kom inte in');
  assert.match(p[0].text, /landmark agreement with France/);
  assert.equal(p[0].bolag, 'Loft Orbital', 'posten skrevs pa fel bolag');
  assert.equal(p[0].kallor[0].url, 'https://www.loftorbital.com/newsroom');
});

test('etiketten sager i svaret att det inte ar reglerad information', () => {
  const r = register();
  const post = r.poster().find(x => x.typ === 'motpart');
  const svar = lasFaktasvar({ version: 1, block: [{ typ: 'post', id: post.id }] }, r);
  assert.ok(svar.ok, svar.klagan);
  assert.match(svar.answer, /motpartens egen kommunikation/i);
  assert.match(svar.answer, /inte reglerad information/i);
});

test('motparten rankas under vart eget arkiv i en berakningskedja', () => {
  // proveniens valjer det SVAGASTE ursprunget. En berakning som vilar pa
  // motpartens uppgift far darfor inte se lika belagd ut som en pa rapporten.
  const tal = (typ, varde) => ({ id: 'p' + typ, typ, bolagId: 'u', bolag: 'U', matt: 'x',
    slag: 'balans', ar: 2026, kvartal: 1, langd: 1, varde, enhet: 'MSEK', djup: 0,
    normaliserat: { varde, enhet: 'MSEK' }, kallor: [] });
  const r = berakna('differens', [tal('rapporterat', 10), tal('motpart', 4)]);
  assert.ok(r.ok, r.skal);
  assert.equal(r.post.vilar_pa.ursprung, 'motpart', 'kedjan pastod starkare ursprung an den svagaste delen');
});

test('utan motparter ar registret oforandrat', () => {
  assert.equal(register([]).poster().filter(x => x.typ === 'motpart').length, 0);
});

/* Hamtaren. Ingen extern trafik i provet: hamtningen skickas in. */
test('html blir lasbar text utan script och style', () => {
  const html = '<html><head><style>.a{color:red}</style><script>var x=1;</script></head>'
    + '<body><h1>Loft Orbital</h1><p>Announced an agreement with France.</p></body></html>';
  const t = textUrHtml(html);
  assert.ok(!/color:red|var x/.test(t), 'script eller style blev till text');
  assert.match(t, /Loft Orbital/);
  assert.match(t, /agreement with France/);
});

test('bitarna har ett tak, ett nyhetsrum ar inte ett arkiv', () => {
  const lang = 'Detta är en mening som fyller på texten. '.repeat(400);
  assert.ok(bitar(lang).length <= 6, 'taket pa antal bitar holl inte');
});

test('bara https-adresser i listan godtas', async () => {
  const hamtad = [];
  const bok = await byggMotparter([
    { bolag: 'U', motpart: 'Bra', urler: ['https://exempel.test/news'] },
    { bolag: 'U', motpart: 'Osaker', urler: ['http://exempel.test/news'] },
  ].filter(m => m.urler.every(u => /^https:\/\//.test(u))),
  async url => { hamtad.push(url); return { text: 'En nyhet från motparten. Den är kort.' }; });
  assert.deepEqual(hamtad, ['https://exempel.test/news']);
  assert.equal(bok.motparter.length, 1);
  assert.equal(bok.niva, 2, 'boken sager inte vilken kallniva den bar');
});

test('en sida som inte svarar tar inte ner de andra', async () => {
  const bok = await byggMotparter(
    [{ bolag: 'U', motpart: 'M', urler: ['https://a.test/x', 'https://b.test/y'] }],
    async url => url.includes('a.test') ? { av: 'HTTP 503' } : { text: 'En nyhet. Kort och tydlig.' });
  assert.equal(bok.motparter[0].dokument.length, 1);
  assert.equal(bok.motparter[0].dokument[0].url, 'https://b.test/y');
});

test('den incheckade listan ar giltig', () => {
  const lista = lasLista();
  assert.ok(lista.length, 'motparter.json gav ingen giltig rad');
  for (const m of lista) {
    assert.ok(m.bolag && m.motpart, 'rad utan bolag eller motpart');
    assert.ok(m.urler.every(u => /^https:\/\//.test(u)), 'rad med annat an https');
  }
});
