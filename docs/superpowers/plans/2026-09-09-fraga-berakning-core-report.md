# Rapport: beräkningskärna och faktaregister

## Genomfört

- Ny ren beräkningsmodul med `summa`, `differens`, `tillvaxt`, `andel` och
  `per_manad`. Alla operationer räknar på `normaliserat` och returnerar ett
  läsbart avslag i stället för att skapa en ogiltig post.
- Fullständigt delat jämförbarhetskontrakt för bolags-id, mått, slag,
  kanonisk enhet, periodlängd och ändliga värden. `harled()` använder en
  uttrycklig adapter; namn används bara som fallback för äldre fixturer som
  saknar `bolagId`.
- Faktaregistrets rapporterade poster bär nu `slag`, `ar`, `kvartal`, `langd`
  och `djup`. Äldre härledda poster har fått kanoniskt värde med full precision
  beräknat direkt från lövposterna.
- Skalbyten mellan SEK, tusental, miljoner och miljarder bevarar decimalerna.
  Även legacy-härledningarnas förändring, marginal, månadstakt och runway
  räknas utan mellanavrundning. Formeltexten tar endast bort binära
  flyttalsartefakter för läsbarhet.
- `laggBeraknad({ operation, indata: [id] })` accepterar endast exakt denna
  form och endast id:n från samma request. Okända fält, litteraler, okända id:n,
  fel operandantal, fler än 16 operander, nollnämnare och icke ändliga resultat
  avslås.
- Beräknade poster kan kedjas till djup två. Formelrader, källunion,
  löv-id:n, varje lövs ursprung och samlade antaganden följer hela kedjan.
  Blandning av illustration och rapportdata upptäcks även genom mellanled.
- Summa kräver angränsande, icke överlappande flödesperioder. Halvår och andra
  flerperiodsposter får rätt startkvartal i resultatets etikett. Differenser får
  inga maskinläsbara periodfält, eftersom två ändpunkter inte är ett nytt
  rapporterat flödesintervall.

## Fynd

- Verktygskontraktets ordning är `differens/tillvaxt: [senare, tidigare]` och
  `andel: [taljare, namnare]`; kärnan och testerna följer den ordningen.
- Det räcker inte att spara bara kedjans svagaste ursprung. Då kan ett mellanled
  dölja ett rapporterat löv. `ursprung_per_post` bevarar därför den platta
  lövmängdens verkliga ursprung vid sidan av sammanfattningen `ursprung`.
- Befintliga burn-rate- och runway-poster hade antagandet endast på posten.
  Antagandet ligger nu också i `vilar_pa.antaganden`, så det överlever kedjning.
- Kvoter och takter kan vara numeriskt jämförbara men får enligt kontraktet inte
  användas som differensoperander.

## Verifiering

- TDD-röd körning: kärntestet misslyckades först på saknad modul. Senare
  riktade röda tester fångade fel halvårsetikett, tillåten kvotdifferens och
  saknade legacy-antaganden innan respektive rättning.
- `node --test tools/__tests__/berakning.test.mjs tools/__tests__/nyckeltal*.test.mjs tools/__tests__/faktaproveniens.test.mjs tools/__tests__/faktasvar.test.mjs tools/__tests__/fraga-berakning.test.mjs`:
  126 av 126 tester godkända.

## Begränsning

Reglerna fastställer datamässig jämförbarhet. Om en tillåten beräkning är
relevant för användarens fråga bedöms fortfarande av svarslagret och dess
granskare.
