import test from 'node:test';
import assert from 'node:assert/strict';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';
import { lasFaktasvar, otillatenProsa } from '../../functions/api/_faktasvar.js';

const dokument = {
  url: 'https://example.test/alfa/q2', rubrik: 'Q2 2026', datum: '2026-08-01',
  bitar: ['Rörelseresultatet uppgick till -85 MSEK. Nettoomsättningen uppgick till 100 MSEK.'],
};
function setup() {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Exempelbolag Alfa', dokument: [dokument] }],
    utdrag: [{ bolag: 'Exempelbolag Alfa', text: dokument.bitar[0], ...dokument }],
    holdings: [{ id: 'h1', name: 'Exempelbolag Alfa', quantity: 777, gav: 20 }],
    teser: [{ namn: 'Exempelbolag Alfa', why: 'Jag tror kassan blir 777 MSEK.' }],
    question: 'Har Alfa rapporterat 777 MSEK?', lektioner: [],
  });
  return r;
}
const svar = (...block) => JSON.stringify({ version: 1, block });
const faktum = (r) => r.poster().find(p => p.typ === 'rapporterat' && p.matt === 'rörelseresultat');

test('servern skriver hela faktauppgiften med minus, enhet, bolag och period', () => {
  const r = setup(), p = faktum(r);
  const s = lasFaktasvar(svar({ typ: 'post', id: p.id }), r);
  assert.equal(s.ok, true);
  assert.match(s.answer, /Exempelbolag Alfa.*rörelseresultat.*Q2 2026.*-85 MSEK/s);
  assert.equal(s.block[0].kallor[0].url, dokument.url);
  assert.match(s.block[0].kallor[0].citat, /-85 MSEK/);
});

for (const [falt, varde] of Object.entries({ bolag: 'Beta', matt: 'kassa', period: 'Q1 2025', varde: 85, enhet: 'miljarder', text: 'Kassan är' })) {
  test('modellen far inte skriva over postens ' + falt, () => {
    const r = setup();
    assert.equal(lasFaktasvar(svar({ typ: 'post', id: faktum(r).id, [falt]: varde }), r).ok, false);
  });
}

for (const text of [
  'Kassan är 3 miljarder kronor.', 'Kassan är 2026 MSEK.', 'Resultatet är 85 MSEK.',
  'Kassan är tvåhundra miljoner kronor.', 'Kassan är femtio miljoner.',
  'Kassan är tre kronor.', 'Kassan är en miljard.', 'Kassan är noll.',
  'Cash is fifty million dollars.', 'Kassan är ２ miljoner.', 'Kassan är ½ miljard.',
  'Kassan är t\u200bvåhundra miljoner.', 'Kassan är &#51; kronor.',
  'Kassan är tjugofem kronor.', 'Marginalen är trettiofem procent.',
  'Kassan är en krona.', 'Resultatet är minus ett öre.',
  'Kassan är två komma fem kronor.', 'Kassan är tjugofemkronor.',
  'Kassan är tjugoen kronor.', 'Kassan är tjugoett kronor.', 'Kassan är nittioen euro.',
]) {
  test('fri prosa kan inte smuggla ett belopp: ' + text, () => {
    for (const typ of ['metod', 'saknas', 'tolkning']) {
      const r = setup();
      const b = { typ, text, ...(typ === 'tolkning' ? { stod: [faktum(r).id] } : {}) };
      assert.equal(lasFaktasvar(svar(b), r).ok, false);
    }
  });
}

test('fragetal och teser kan bara aterges som anvandaruppgifter', () => {
  const r = setup();
  for (const typ of ['egen_uppgift', 'antagande']) {
    const p = r.poster().find(p => p.typ === typ);
    const s = lasFaktasvar(svar({ typ: 'post', id: p.id }), r);
    assert.equal(s.ok, true);
    assert.equal(s.block[0].typ, typ);
    assert.doesNotMatch(s.answer, /^Rapporterat:/);
  }
  assert.equal(r.poster().some(p => p.typ === 'rapporterat' && p.varde === 777), false);
});

test('illustrationer och kursmaterial kan inte byta ursprung till rapporterade fakta', () => {
  const r = skapaFaktaregister();
  r.synka({ illustrationer: [{ text: 'Illustrativt exempel: Exempelbolaget har 100 kronor.' }],
    lektioner: [{ id: '5.1', titel: 'Marginaler', text: 'Ett illustrativt räkneexempel med 100 kronor.' }] });
  for (const p of r.poster()) {
    const d = lasFaktasvar(svar({ typ: 'post', id: p.id }), r);
    assert.equal(d.ok, true);
    assert.ok(['kurs', 'illustration'].includes(d.block[0].typ));
    assert.equal(lasFaktasvar(svar({ typ: 'post', id: p.id, ursprung: 'rapporterat' }), r).ok, false);
  }
});

test('beraknade poster har referenser till indata, regel och kallstallen', () => {
  const r = setup(), p = r.poster().find(p => p.typ === 'beraknat');
  assert.equal(p.varde, -85);
  assert.equal(p.enhet, 'procent');
  assert.equal(p.indata.length, 2);
  assert.equal(r.get(p.indata[0]).matt, 'rörelseresultat');
  assert.equal(r.get(p.indata[1]).matt, 'intäkter');
  assert.match(p.formel, /-85.*100/);
});

test('nya dokument lagger till poster utan att flytta gamla id:n', () => {
  const r = setup(), fore = structuredClone(faktum(r));
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Exempelbolag Alfa', dokument: [{
    ...dokument, rubrik: 'Q1 2026', url: 'https://example.test/alfa/q1',
    bitar: ['Rörelseresultatet uppgick till -50 MSEK.'],
  }, dokument] }] });
  assert.deepEqual(r.get(fore.id), fore);
  assert.ok(r.poster().some(p => p.typ === 'rapporterat' && p.varde === -50));
});

test('okanda referenser, fel ursprung och gammalt fritextformat stoppas', () => {
  const r = setup();
  for (const raw of [svar({ typ: 'post', id: '__proto__' }), 'Kassan är 777 MSEK.',
    svar({ typ: 'rapporterat', id: faktum(r).id }), '{"version":1,"block":[',
    svar({ typ: 'post', id: 'foregaende-samtals-id' }),
    svar({ typ: 'tolkning', text: 'Det kan behöva undersökas.', stod: ['okand'] })]) {
    assert.equal(lasFaktasvar(raw, r).ok, false);
  }
});

test('metodtext och belagd tolkning behalls for separat granskning', () => {
  const r = setup();
  const s = lasFaktasvar(svar({ typ: 'metod', text: 'Läs även noterna.' },
    { typ: 'tolkning', text: 'Det kan vara värt att undersöka engångsposter.', stod: [faktum(r).id] }), r);
  assert.equal(s.ok, true);
  assert.equal(s.prosa.length, 2);
  assert.match(s.answer, /Tolkning:/);
});

test('PDF-fakta utan kallcitat ger ingen verifierad faktapost eller berakning', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{ ...dokument,
    bitar: [], fakta: { kassa: { nu: 777, enhet: 'MSEK' } },
  }] }] });
  assert.equal(r.poster().filter(p => p.typ === 'rapporterat').length, 0);
});

test('ett PDF-varde utan matchande tecken i kallcitatet far inte bli faktapost', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{ ...dokument,
    bitar: [], fakta: { kassa: { nu: 777, enhet: 'MSEK' } },
    kallor: { kassa: { citat: 'Likvida medel -777 MSEK', sida: 10 } },
  }] }] });
  assert.equal(r.poster().filter(p => p.typ === 'rapporterat').length, 0);
});

test('en annan enhet pa annan plats i PDF-citatet far inte godkanna fel skala', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{ ...dokument,
    bitar: [], fakta: { kassa: { nu: 777, enhet: 'MSEK' } },
    kallor: { kassa: { citat: 'Likvida medel 777 KSEK. Intäkter 100 MSEK.', sida: 10 } },
  }] }] });
  assert.equal(r.poster().filter(p => p.typ === 'rapporterat').length, 0);
});

test('registren ar requestlokala och delar inte privata uppgifter', () => {
  const a = setup(), b = skapaFaktaregister();
  assert.equal(b.get(faktum(a).id), undefined);
  assert.equal(b.poster().length, 0);
});

test('PDF-citatet behaller beloppet aven nar det star sent i kalltexten', () => {
  const r = skapaFaktaregister();
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: [{ ...dokument,
    bitar: [], fakta: { kassa: { nu: 777, enhet: 'MSEK' } },
    kallor: { kassa: { citat: 'Bakgrund. '.repeat(170) + 'Likvida medel 777 MSEK.', sida: 10 } },
  }] }] });
  const p = r.poster().find(p => p.typ === 'rapporterat');
  assert.match(p.kallor[0].citat, /777 MSEK/);
});

test('stora arkiv begransas och verktygen skickar bara nya poster', () => {
  const r = skapaFaktaregister();
  const dokumenten = Array.from({ length: 100 }, (_, i) => ({
    ...dokument, url: 'https://example.test/' + i, rubrik: 'Q2 ' + (2000 + i),
    bitar: ['Bakgrund. '.repeat(150) + 'Nettoomsättningen uppgick till 100 MSEK. Rörelseresultatet uppgick till -85 MSEK.'],
  }));
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: dokumenten }] });
  assert.ok(new TextEncoder().encode(r.prompt()).length < 81000);
  assert.equal(r.status().begransat, true);
  assert.equal(r.prompt(true), '');
  r.synka({ question: 'En ny fråga.' });
  const delta = r.prompt(true);
  assert.match(delta, /En ny fråga/);
  assert.doesNotMatch(delta, /rörelseresultat/);
});

test('ett prioriterat utdrag far inte bryta berakningarnas kronologi', () => {
  const r = skapaFaktaregister();
  const dokumenten = [90, 80, 70].map((v, i) => ({
    ...dokument, url: 'https://example.test/q' + i, rubrik: 'Q' + (i + 1) + ' 2026',
    bitar: ['Likvida medel uppgick till ' + v + ' MSEK.'],
  }));
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: dokumenten }],
    utdrag: [{ url: dokumenten[1].url, text: dokumenten[1].bitar[0], bolag: 'Alfa' }] });
  const p = r.poster().find(p => p.regel === 'kassa_delat_med_nettominskning');
  assert.equal(p?.varde, 21);
});

test('stora arkiv far inte tranga undan indata, berakningar, egna uppgifter och lektioner', () => {
  const r = skapaFaktaregister();
  const dokumenten = Array.from({ length: 80 }, (_, i) => ({
    ...dokument, url: 'https://example.test/rapport' + i, rubrik: 'Q2 ' + (2000 + i),
  }));
  r.synka({ arkiv: [{ id: 'alfa', namn: 'Alfa', dokument: dokumenten }],
    question: 'Hur ser det ut?', holdings: [{ id: 'h', name: 'Alfa', quantity: 5 }],
    lektioner: [{ id: '5.1', titel: 'Marginaler', text: 'Kurstext. '.repeat(300) }],
    utdrag: [{ url: 'https://example.test/avtal', bolag: 'Alfa', text: 'Ett nytt avtal har tecknats.' }],
  });
  for (const typ of ['beraknat', 'egen_uppgift', 'kurs', 'dokument']) {
    assert.ok(r.poster().some(p => p.typ === typ), typ + ' forsvann');
  }
  for (const p of r.poster().filter(p => p.typ === 'beraknat')) {
    assert.ok(p.indata.every(id => r.get(id)?.typ === 'rapporterat'));
  }
});

/* SMA RAKNEORD FAR STA ENSAMMA.
   Hittat skarpt. Prosagrinden fallde varje rakneord, ocksa "de fyra kvartalen
   tacker kalenderaret", alltsa vanlig svenska helt utan pastaende om pengar.
   Provkorningen mot riktiga API:t foll pa exakt den meningen: modellen hade
   upptackt att bolaget haft ett forlangt rakenskapsar och forklarade det
   korrekt, och blockerades for ordet "fyra".

   Halva poangen med testerna nedan ar den andra halvan: ett BELOPP kraver en
   enhet eller ett storleksord, och ingetdera slapps igenom. */
test('rakneord far racka antal', () => {
  assert.equal(otillatenProsa('De fyra kvartalen tillsammans täcker kalenderåret.'), false);
  assert.equal(otillatenProsa('Jag har två rapporter från bolaget.'), false);
  assert.equal(otillatenProsa('Tre av bolagen saknar underlag för perioden.'), false);
});

test('rakneord far aldrig bara en enhet', () => {
  for (const t of [
    'Marginalen var fem procent.',
    'Bolaget delade ut tre kronor.',
    'Aktien steg tre gånger.',
    'Resultatet forbattrades med två öre.',
  ]) assert.equal(otillatenProsa(t), true, 'slapptes igenom: ' + t);
});

test('storleksord och sammansatta rakneord stoppas som forut', () => {
  for (const t of [
    'Kassan uppgick till tre miljarder.',
    'Kassan var tvåhundra miljoner kronor.',
    'Vinsten steg med tjugofem procent.',
    'Marginalen låg kring trettio.',
    'Bolaget har en miljard i kassan.',
  ]) assert.equal(otillatenProsa(t), true, 'slapptes igenom: ' + t);
});

/* Ett rakneord som inte racker nagot ar inte ett antal, det ar ett varde. */
test('ett rakneord sist i satsen ar ett belopp, inte ett antal', () => {
  for (const t of ['Kassan är noll.', 'Kassan är fem.', 'Antalet rapporter jag har är tre.']) {
    assert.equal(otillatenProsa(t), true, 'slapptes igenom: ' + t);
  }
});
