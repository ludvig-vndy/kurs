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

test('dubbelt kodade svenska bokstaver aterstalls fore samma prosagrind', () => {
  const r=setup();
  const dom=lasFaktasvar(svar({typ:'metod',text:String.raw`J\u00e4mf\u00f6r motsvarande perioder \u00f6ver flera \u00e5r.`}),r);
  assert.equal(dom.ok,true,dom.klagan);
  assert.equal(dom.block[0].text,'Jämför motsvarande perioder över flera år.');
  for (const text of [String.raw`Kassan \u00e4r \u0033 miljarder kronor.`,String.raw`Kassan \u00e4r tvåhundra miljoner kronor.`,String.raw`Kassan \u00e4r 777 MSEK.`])
    assert.equal(lasFaktasvar(svar({typ:'metod',text}),r).ok,false,text);
});

test('reparation namnger saknat stod och ber modellen valja verkliga referenser', () => {
  const r=setup();
  const dom=lasFaktasvar(svar({typ:'tolkning',text:'Det kan tyda pa en svagare utveckling.'}),r);
  assert.equal(dom.ok,false);
  assert.match(dom.klagan,/saknar.*stod/);
  assert.match(dom.klagan,/FAKTAREGISTER/);
});

test('kvartalsnamn utan upprepat artal ar perioder men ger inget frikort for belopp', () => {
  for (const t of ['Utvecklingen under 2025, fran Q1 till Q4.', 'Jamfor med Q4 for aret innan.']) {
    assert.equal(otillatenProsa(t),false,t);
  }
  for (const t of ['Marginalen ar 4 procent.','Kassan ar Q4 MSEK.','Kassan ar 2026.']) {
    assert.equal(otillatenProsa(t),true,t);
  }
});

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

/* DATUM AR INTE PENGAR, och den lardomen fick tas tva ganger.
   Den gamla kallgrinden blockerade ett sant svar for att 12 och 31 ur
   "2022-12-31" lastes som ogrundade tal. Prosagrinden gjorde om samma sak:
   modellen forklarade korrekt att Unibap haft ett forlangt rakenskapsar och
   namngav perioden, och fylldes for datumen i sin egen forklaring. */
test('perioder far namnges i fri text', () => {
  for (const t of [
    'Rapporten avser 2021-07-01 till 2022-12-31.',
    'Kalenderåret 2022 saknas som egen post.',
    'Perioden juli 2021 till december 2022 rapporteras samlat.',
    'Siffran gäller Q3 2022.',
  ]) assert.equal(otillatenProsa(t), false, 'stoppades: ' + t);
});

/* Halva poangen. Ett artal som foljs av en enhet ar inget datum utan ett
   belopp, och just "2026 MSEK" var ett av hålen granskningen pekade ut. */
test('ett artal med enhet efter ar ett belopp, inte ett datum', () => {
  for (const t of [
    'Kassan var 2026 MSEK.',
    'Kassan var 2026 miljoner kronor.',
    'Bolaget hade 2022 kronor i kassan.',
  ]) assert.equal(otillatenProsa(t), true, 'slapptes igenom: ' + t);
});

/* Tidslangder ar inga datum. Kassans rackvidd raknas i kod och har en egen
   post, sa den far aldrig uppsta i fri text. */
test('tidslangder far inte skrivas i fri text', () => {
  assert.equal(otillatenProsa('Perioden omfattar 18 månader.'), true);
  assert.equal(otillatenProsa('Kassan räcker i 14 månader.'), true);
});

/* LEKTIONSNUMMER GAR ATT PROVA, till skillnad fran ett belopp.
   Forbudet fanns for att modellen forr hittade pa lektionsnummer nar den inte
   hade en enda lektion i kontexten. Nu ligger lektionen i registret, sa numret
   kan provas mot det, och "las mer i 5.1" ar en av de nyttigaste sakerna
   assistenten kan saga. Provkorningen blockerade ett helt korrekt ROIC-svar
   for orden "Lektionen 5.1". */
test('ett lektionsnummer ur registret far namnges', () => {
  assert.equal(otillatenProsa('Lektionen 5.1 går djupare in på detta.', ['5.1']), false);
  assert.equal(otillatenProsa('Läs 0.2 och 5.1 för metoden.', ['5.1', '0.2']), false);
});

test('ett lektionsnummer som inte finns i registret ar ett tal som andra', () => {
  assert.equal(otillatenProsa('Lektionen 9.9 förklarar det.', ['5.1']), true);
  assert.equal(otillatenProsa('Lektionen 5.1 förklarar det.', []), true);
});

/* Och ett belopp som rakar se ut som ett lektionsnummer ar fortfarande ett
   belopp. Skillnaden ar ordet efter. */
test('ett tal med enhet efter ar inget lektionsnummer', () => {
  assert.equal(otillatenProsa('Marginalen var 5.1 procent.', ['5.1']), true);
  assert.equal(otillatenProsa('Bolaget hade 5.1 miljoner kronor.', ['5.1']), true);
});

/* GRANSKNINGEN 2026-09-09. Fyra pastaenden som gick rakt igenom grinden aven
   sedan dataposterna infordes. Alla fyra har samma form: ett undantag som
   fanns av ett gott skal var skrivet bredare an skalet kravde. */
test('ett artal utan periodsammanhang ar ett tal, inte en period', () => {
  assert.equal(otillatenProsa('Kassan i SEK är 2026.'), true);
  assert.equal(otillatenProsa('Kassan uppgick till 2026.'), true);
  assert.equal(otillatenProsa('Bolaget grundades 1998.'), true);
});

test('artal i ett periodsammanhang far fortfarande namnas', () => {
  assert.equal(otillatenProsa('Räkenskapsåret 2022 var förlängt.'), false);
  assert.equal(otillatenProsa('Under 2022 ändrades redovisningen.'), false);
  assert.equal(otillatenProsa('Perioden april till juni 2022 redovisas separat.'), false);
  assert.equal(otillatenProsa('Bolaget rapporterade mellan 2019 och 2022.'), false);
});

test('ett lektionsnummer utanfor en hanvisning ar ett tal', () => {
  assert.equal(otillatenProsa('Marginalen var 5.1 %.', ['5.1']), true);
  assert.equal(otillatenProsa('Marginalen låg på 5.1 och steg sedan.', ['5.1']), true);
});

test('en tidslangd i ord ar ett varde', () => {
  assert.equal(otillatenProsa('Kassan räcker i tre månader.'), true);
  assert.equal(otillatenProsa('Bolaget har gått med vinst i fem år.'), true);
  // ... men en hanvisning till kanda perioder ar det inte.
  assert.equal(otillatenProsa('De fyra kvartalen täcker kalenderåret.'), false);
});

test('en krona ar ett belopp overallt utom i idiomet', () => {
  assert.equal(otillatenProsa('Bolaget delade ut en krona per aktie.'), true);
  assert.equal(otillatenProsa('Utdelningen höjdes med en krona.'), true);
  assert.equal(otillatenProsa('Hur lite kapital som krävs för att tjäna en krona.'), false);
  assert.equal(otillatenProsa('Avkastning per investerad krona är måttet.'), false);
});
