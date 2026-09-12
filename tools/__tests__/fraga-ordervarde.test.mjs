/* Ordervardet: ett belopp med ett dokument, inte med ett kvartal.

   Piloten bad om det forst av allt: "AI har specat tva pressreleaser dar det
   star tydligt att Loft har gjort avrop pa 1,39m plus 1,2m euro, sa min fraga
   blir: da ar det alltsa tva avropsorders? [...] borde han bara kunna plussa?"

   Han hade ratt, och boten kunde inte. Extraktionen kande atta matt, alla
   periodmatt ur resultat- och balansrakningen, och ordervarde var inte ett av
   dem. Beloppen fanns bara som text inne i ett dokumentcitat, och
   berakningsverktyget vagrar rakna pa citattext, med ratta.

   DUBBELRAKNINGEN AR HELA RISKEN. Unibaps order om 1,39 MEUR annonseras i
   minst tva pressmeddelanden: forst villkorad av exporttillstand, sedan igen
   nar tillstandet kom. Laggs bada till blir summan for hog och ser lika belagd
   ut som ett sant tal. Tva exakt lika stora belopp avslas darfor. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { berakna, jamforbara } from '../../functions/api/_berakning.js';
import { extraheraNyckeltal } from '../../functions/api/_nyckeltal.js';

const handelse = (varde, enhet, period) => ({
  id: 'p' + varde, typ: 'rapporterat', bolagId: 'unibap', bolag: 'Unibap',
  matt: 'ordervärde', slag: 'handelse', period, varde, enhet, djup: 0,
  normaliserat: { varde, enhet }, kallor: [{ url: 'https://mfn.se/a/unibap/x', rubrik: period, citat: '' }],
});

test('tva annonserade avrop kan laggas ihop', () => {
  const r = berakna('summa', [handelse(1.39, 'MEUR', 'Selected to Supply Loft Orbital'),
    handelse(1.2, 'MEUR', 'Avropsorder från Loft Orbital')]);
  assert.ok(r.ok, 'summan avslogs: ' + r.skal);
  assert.equal(Math.round(r.post.varde * 100) / 100, 2.59);
  assert.equal(r.post.enhet, 'MEUR');
  assert.equal(r.post.slag, 'handelse');
  // Varje del ska sta med sin egen kalla, sa lasaren kan se vad som lagts ihop.
  assert.match(r.post.formel, /1,39 MEUR \(Selected to Supply Loft Orbital\)/);
  assert.match(r.post.formel, /1,2 MEUR \(Avropsorder från Loft Orbital\)/);
  // Summan far inte lata som om den ar fullstandig.
  assert.match(r.post.antagande, /inte nödvändigtvis alla/);
});

test('samma belopp tva ganger ar samma order, inte tva', () => {
  const r = berakna('summa', [handelse(1.39, 'MEUR', 'Selected to Supply Loft Orbital'),
    handelse(1.39, 'MEUR', 'Delårsrapport januari september 2025')]);
  assert.ok(!r.ok, 'dubbelraknade beloppet slapptes igenom med ' + (r.post && r.post.varde));
  assert.match(r.skal, /samma belopp/);
});

test('olika valuta summeras inte', () => {
  const r = berakna('summa', [handelse(1.39, 'MEUR', 'a'), handelse(0.9, 'MUSD', 'b')]);
  assert.ok(!r.ok, 'MEUR och MUSD lades ihop');
});

test('en handelse kan inte blandas med ett periodmatt', () => {
  const flode = { id: 'f1', typ: 'rapporterat', bolagId: 'unibap', bolag: 'Unibap',
    matt: 'ordervärde', slag: 'flode', ar: 2026, kvartal: 1, langd: 1, varde: 5, enhet: 'MEUR',
    normaliserat: { varde: 5, enhet: 'MEUR' }, djup: 0, kallor: [] };
  assert.equal(jamforbara(handelse(1.2, 'MEUR', 'a'), flode), false);
  assert.ok(!berakna('summa', [handelse(1.2, 'MEUR', 'a'), flode]).ok, 'handelse och flode summerades');
});

/* Extraktionen mot arkivets verkliga formuleringar. Bada spraken finns i
   arkivet for samma bolag, sa bada provas. */
const dok = (rubrik, text) => ({ url: 'https://mfn.se/a/unibap/' + encodeURIComponent(rubrik),
  rubrik, datum: '2026-03-16', bitar: [text] });

test('ordervarden lases ur bolagets egna formuleringar', () => {
  const fakta = extraheraNyckeltal([{ id: 'unibap', namn: 'Unibap', dokument: [
    dok('Avropsorder', 'Ordervärdet är 1,2 MEUR avseende iX10-lösningar.'),
    dok('Delårsrapport', 'Ett första avrop om 0,64 MEUR har gjorts, villkorat av exporttillstånd.'),
    dok('Bokslut', 'En order om 1,39 MEUR inom ramavtalet har bekräftats för leverans.'),
  ] }]);
  const order = fakta.filter(f => f.metrik === 'ordervärde');
  assert.deepEqual(order.map(o => o.varde).sort((a, b) => a - b), [0.64, 1.2, 1.39]);
  assert.ok(order.every(o => o.typ === 'handelse'), 'ordervarden fick fel slag');
});

/* KAND LUCKA, medvetet lamnad. Talmonstret kraver decimalkomma, sa den
   engelska formen "1.39 MEUR" lases inte. MFN bar bada spraken for samma
   bolag, sa uppgiften finns oftast anda pa svenska, och att slappa in
   decimalpunkt i talmonstret skulle ocksa gora varje meningsslut till en
   mojlig decimal. Provet finns for att luckan ska vara dokumenterad och inte
   upptackas pa nytt som en bugg. */
test('engelsk decimalpunkt lases INTE, och det ar ett medvetet val', () => {
  const fakta = extraheraNyckeltal([{ id: 'unibap', namn: 'Unibap', dokument: [
    dok('Selected to Supply', 'The first call-off order value is 1.39 MEUR, with delivery in 2025.'),
  ] }]);
  assert.equal(fakta.filter(f => f.metrik === 'ordervärde').length, 0);
});

test('flera avrop i SAMMA dokument faller inte bort som konflikt', () => {
  // Med den vanliga periodnyckeln blev tva belopp i samma rapport motstridiga
  // varden for samma kvartal, och bada foll tyst.
  const fakta = extraheraNyckeltal([{ id: 'unibap', namn: 'Unibap', dokument: [
    dok('Delårsrapport', 'Ett avrop om 1,39 MEUR har gjorts. En order om 0,64 MEUR mottogs från Scanway SA.'),
  ] }]);
  assert.equal(fakta.filter(f => f.metrik === 'ordervärde').length, 2);
});
