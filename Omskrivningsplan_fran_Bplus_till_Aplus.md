# Från B+ till A+: omskrivningsplan för kursen i fundamental analys

## Vad det här dokumentet är

En arbetsbar plan för att lyfta kursen från B+ (samlat omdöme 86 av 100) till A+. Det bygger på två oberoende granskningar som konvergerade på samma nivå och samma huvuddiagnos, plus den triangulering vi gjort efteråt. Dokumentet är skrivet för att kunna köras av ett omskrivningsteam (Claude Code med parallella agenter) och stämmas av av en oberoende granskare vid varje milstolpe.

Det viktiga: skillnaden mellan 86 och 93 plus ligger inte i stora fel, utan i fem systematiska mönster och ett antal konkreta, fixbara detaljer. Inget här rivs upp från grunden. Vi skär det som tynger och investerar utrymmet i förankring och djup.

## Princip

Korta genom att skära mallen och dubbletterna, inte ämnena. Återinvestera det utrymmet i riktiga fall och i de tunga innehållsluckorna. Målbild: ungefär 80 lektioner och ungefär 100 000 ord, vassare och mer förankrad än dagens 107 lektioner och 145 000 ord.

## Utgångsläge: vad som ska bevaras och vad som drar ner

### Bevara (rör inte det som fungerar)

- **Matematisk integritet.** Två oberoende granskningar räknade efter varje exempel och hittade inga rena räknefel, inte ens i DCF:en (terminalvärde, diskontering, känslighet stämmer steg för steg). Det är kursens största enskilda tillgång. Varje omskrivning måste bevara den, inte införa nya fel.
- **Den röda tråden.** Pris mot värde, sedan kvalitet, ROIC, moat, värdering, risk, psykologi, process. Logisk och pedagogiskt stark.
- **Greppet "två identiska bolag, en variabel skiljer dem".** Konsekvent effektivt, men ska användas mer selektivt (se Arbetsström 1).
- **Ägarperspektiv och andra ordningens tänkande.** Finns på riktigt: tillväxt som förstör värde när ROIC understiger kapitalkostnaden (9.2), ROE som hävstångsillusion (9.4), utspädning som tyst avkastningsmördare (19.6), prissatt för framgång utan felmarginal (19.8).

### De fem mönster som drar ner betyget

1. **Redundans.** Samma tiostegsmall i varje lektion, och inom varje lektion säger röda flaggor, gröna flaggor, checklista och frågor i praktiken samma sak tre till fyra gånger. Koncept upprepas mellan lektioner. Det här är det som mest får materialet att kännas AI-genererat snarare än premium.
2. **För få verkliga, namngivna bolag.** Genomgående hypotetiska bolag. De minnesvärdaste styckena i hela kursen är just undantagen: skandalerna i 6.4 och moat-fallen i modul 10. Inget enda nordiskt bolag i hela kursen, trots att det är en svensk kurs.
3. **Begreppslig oprecision.** Korrektheten på siffernivå är hög, men ett kluster av tekniska oprecisheter återkommer, den sorten en kräsen läsare hajar till på. Åtgärdas i Arbetsström 0.
4. **Innehållsluckor och strukturoddities.** Saknad teori (diskonteringsränta, sektorundantag), capstonen som räknar upp moduler istället för att väva ihop, synteslektioner som är passiv läsning.
5. **Leverans.** Quiz på 1 av 105 lektioner, trots inbyggd quiz-funktion.

## Steg 0: Synka repot och kontrollera integriteten (gör allra först)

Innan en enda lektion skrivs om: stäm av repot mot den kanoniska källan.

Bakgrunden är konkret. Två filer som rapporterades som saknade, 15.1 (Vad risk faktiskt är) och 18.4 (Kursavslutning), finns och är kompletta i källan. De var artefakter av ett osynkat repo, samma grundorsak som rapporten att 18.3 var trasig. Slutsatsen: skriv inte om filer som redan finns, och laga inte hål som bara beror på att en fil inte laddats upp.

Åtgärd:
- Lägg alla kanoniska filer i repot enligt manifestet (107 lektioner, plus kursstruktur, build-brief och Ägarboken).
- Kör en integritetskoll: alla 107 lektioner på plats, alla korsreferenser upplösta, alla åtta frontmatter-fält i varje fil, ordning stiger monotont, alla slugs ren ASCII.
- Först när repot matchar källan börjar omskrivningen.

## Arbetsström 0: Korrekthetssvepet (snabbast, högst trovärdighet per timme)

Åtta begreppsfixar. Inga räknefel, men oprecisheter som motsäger ordet "förankrad". Rätt formulering för var och en:

1. **6.3, fritt kassaflöde.** Skilj på FCFF (till hela bolaget, före finansiering) och FCFE (till aktieägarna, efter ränta och amortering). Rörelsekassaflöde minus investeringar är ungefär FCFF. Var konsekvent med vilket mått DCF:en diskonterar, och matcha räntan: FCFF diskonteras med WACC, FCFE med avkastningskravet på eget kapital.
2. **9.1, NOPAT.** Skriv NOPAT som rörelseresultat gånger (1 minus skattesatsen), inte "EBIT minus skatt". Den nuvarande formuleringen riskerar att eleven drar av skattesatsen som ett belopp.
3. **8.3 och 9.1, DuPont.** Blanda inte baser. Skriv ut två separata nedbrytningar: ROE enligt DuPont som nettomarginal gånger kapitalomsättning gånger hävstång (bas: totala tillgångar och eget kapital), och ROIC-nedbrytningen som NOPAT-marginal gånger omsättning på investerat kapital (bas: investerat kapital). Håll dem isär.
4. **8.2, regeln om 40.** Den är tillväxttakt plus lönsamhetsmarginal, där lönsamheten är FCF-marginal eller rörelsemarginal, inte nettovinstmarginal. Skriv den som omsättningstillväxt i procent plus FCF-marginal i procent.
5. **17.3, 17.5, 19.5, LTV.** Använd den churn-baserade, bruttomarginaljusterade och helst diskonterade formen. LTV ungefär lika med (intäkt per kund gånger bruttomarginal) delat på churn för ett stabilt läge, snarare än årligt bidrag gånger ett fast antal år. Om en förenklad version används i undervisningssyfte, säg uttryckligen att den är förenklad och konservativ.
6. **17.5, scenariovärde.** Justera optimistfallets värde för förväntad framtida utspädning, eftersom en del av värdet tillfaller de nya aktieägare som finansierar resan. Jämför per aktie, och var konsekvent med 19.6 och 19.8, som redan hanterar utspädning per aktie.
7. **19.4, operating leverage.** Äkta operating leverage kommer från fasta kostnader (FoU, administration) som inte växer i takt med intäkten. Försäljning och marknadsföring är delvis rörligt, och att den faller som andel av intäkten är skalfördel i kundanskaffning, inte ren operating leverage. Separera de två i förklaringen.
8. **3.4, revisionstermer.** Använd korrekt svensk revisionsterminologi. Skilj på modifierat uttalande (uttalande med reservation) och anmärkning (till exempel mot förvaltningen eller om skatter). Inga engelska revisionstermer i svensk kontext.

**Kanonisk formelbilaga (gör samtidigt).** En sida där NOPAT, FCFF och FCFE, ROIC, ROE enligt DuPont, WACC, LTV och CAC, felmarginal och regeln om 40 definieras en gång. Lektionerna länkar till den. Det löser både korrektheten och en del av redundansen i ett drag.

## Arbetsström 1: Bryt mallen och skär redundansen

Störst effekt per timme, och det gör all annan redigering lättare.

- Ersätt den stela tiostegsmallen med ett magrare, varierat format. Slå ihop vanliga misstag, röda flaggor, gröna flaggor och frågor till färre, vassare avsnitt (till exempel ett avsnitt "vad du letar efter och vad som varnar" plus en checklista och övning).
- Använd "konkret kontrast" selektivt, inte i varje lektion.
- Variera rytmen: korta, vassa lektioner blandat med djupa. Det gör också decket mindre klick-tråkigt, eftersom varje upprepad lista idag blir en egen slide.
- Konsolidera överlappet mellan lektioner och referera i stället för att återförklara:
  - Enhetsekonomi i 2.3, 17.3 och 19.5: lär ut en gång, referera sedan.
  - Serieförvärvare i 8.2, 11.2 och 11.3.
  - Anchoring som nära släkting till sunk cost i 16.6 och 16.7.
  - Risk i modul 15 och 17.
  - Modul 17:s försvarsmekanik refereras från 19.6 och 19.8, inte återförklaras.

## Arbetsström 2: Förankra i verkligheten (störst trovärdighetslyft)

Det här är den enskilt största premiumhöjaren, och exakt det de ursprungliga instruktionerna efterfrågade.

### Princip för verkliga bolag

Riktiga bolag används som undervisningsfall som illustrerar tidlösa mönster, aldrig som tips. Alla aktuella siffror märks ungefär och daterade, och verifieras vid skrivtillfället. Kursen ger inga köp- eller säljråd.

### En till två fullständiga fallstudier

Ta ett riktigt svenskt bolag hela vägen genom en verklig årsredovisning, från idé till beslut, med Ägarboken. Välj efter vilka begrepp som ska visas:
- För kvalitet och kapitalallokering: en stabil sammansättare med ren rapport.
- För tillväxt och operating leverage: ett bolag där hävstången syns i siffrorna över tid.
Verifiera varje tal i den valda årsredovisningen.

### Föreslagen kartläggning av namngivna fall per modul

Förslagen nedan är kandidater. Var och en illustrerar ett mönster som varit stabilt under lång tid, men aktuella siffror måste kontrolleras vid skrivtillfället.

- **Modul 1, pris mot värde och filosofi:** ägarperspektivet via en långsiktig nordisk ägare som Investor eller Latour.
- **Modul 8 och 9, kvalitet och ROIC:** kvalitetssammansättare som Atlas Copco, Assa Abloy eller Hexagon, kontrasterade mot en kapitaltung cyklisk som SSAB.
- **Serieförvärvare (8.2, 11.2, 11.3):** den svenska serieförvärvarskolan, Lifco, Indutrade, Lagercrantz, Addtech, som är förstklassigt undervisningsmaterial för disciplinerad förvärvstillväxt.
- **Modul 10, moats:** Evolution för skal- och nätverksfördelar, ett varumärkesfall som Hermès eller LVMH, ett betalnätverk som Visa eller Mastercard, dagligvaruhandelns skalfördel via Axfood eller ICA, och Kodak som en moat som brast.
- **Modul 11, kapitalallokering:** långsiktiga allokerare som Investor, Latour och Lundbergs.
- **Modul 13.4, cykliska bolag och normaliserad vinst:** SSAB och Boliden.
- **Modul 16, psykologi:** verkliga manier (dot-com, 2021 års spekulation) och ett namngivet haveri.
- **Modul 17 och 19, tillväxt och olönsamhet:** ett bolag där operating leverage spelat ut över tid, ett som illustrerar skalning, och ett varnande exempel på en kapitalförbrännare som spätt ut sina tidiga ägare.
- **Redovisningens röda flaggor (4.4, 4.5, 6.4):** behåll WorldCom, Wirecard, Enron och Carillion, och lägg till ett nordiskt fall.

### En lektion om riktiga källor

Var i en årsredovisning man läser vad, hur man använder Börsdata och screeners, och var svenska rapporter skiljer sig.

## Arbetsström 3: Täpp de tunga luckorna (gör "avancerad" sann)

- **Diskonteringsräntan, nyckelstenen som saknas.** WACC som vägd kostnad av eget kapital och skuld, avkastningskravet på eget kapital via CAPM (riskfri ränta plus beta gånger marknadens riskpremie), riskfri ränta förankrad i den svenska tioåringen, riskpremie runt fyra till fem procent, och hur man landar i ungefär nio procent. Utan den här lektionen är värderingsdelen inte avancerad.
- **Sektormodul.** Bank (räntenetto, kapitaltäckning, pris mot eget kapital snarare än P/E, kreditförluster), försäkring (combined ratio, float), fastighet (substansvärde, EPRA, belåningsgrad, direktavkastning) och råvaror (normaliserad vinst över cykeln, position på kostnadskurvan). De bryter standardramverken, och modulen passar ihop med 17.1.
- **Svenskt praktiklager.** ISK och schablonbeskattning, när ISK, kapitalförsäkring eller depå passar, First North och Spotlight (lättare notering, högre risk), rapportkadens, och var svensk redovisning skiljer sig.
- **Valbar djupare redovisning.** Leasing enligt IFRS 16, pensioner, uppskjuten skatt, aktiverade utvecklingskostnader.

## Arbetsström 4: Intellektuell hederlighet (indexfond-lektionen)

En lektion tidigt i kursen som möter frågan rakt: borde du ens plocka enskilda aktier? Forskningen visar att de flesta privatsparare och de flesta aktivt förvaltade fonder presterar sämre än en billig indexfond efter avgifter. Lektionen förklarar varför, vem kursen är för (den som vill göra jobbet och accepterar oddsen), och gör den hederliga grundrekommendationen att indexfonden är default för de flesta. Återbesök frågan på slutet.

Det här är det enskilt mest differentierande och förtroendebyggande tillägget. Det förvandlar kursen från en "bli rik på aktier"-kurs till en hederlig kurs.

## Arbetsström 5: Bygg om capstonen och säkra 15.1

Capstonen (modul 18) är den mätbart svagaste delen (74 av 100). Den ska integrera, inte räkna upp.

- Lägg in en faktisk ifyllbar case-mall, inte bara prosa.
- En master-checklista på ett ark.
- Kör ett enda bolag, helst ett olönsamt tillväxtbolag från modul 17 eller 19, genom hela tratten från idé till beslut.
- Visa hur DCF-antaganden blir falsifieringsvillkor.
- Lös ordningen mellan modul 18 och 19: antingen flytta 19 före capstonen, eller låt capstonen referera framåt till den.

15.1 finns redan i källan. Säkra bara att den ligger i repot och att referenserna går ihop. Skriv inte om den.

## Arbetsström 6: Röst, polish, verktyg och quiz

- Korrektur som lyfter prosan mot mentor-tonen i 19.9. Bryt 80-ordsmeningarna (särskilt modul 18 och 19). Rensa svengelskan "moatad" och "moats".
- Kalibrera om Ägarboken så poängen ramas som tankehjälp, inte som dom. Lägg en notis om att poängen speglar dina egna bedömningar på skalan noll till fyra.
- Generera quiz på alla innehållslektioner. Mallen finns i 1.1, och det är till stor del automatiserbart.

## Rekommenderad sekvens

Steg 0 (synka), sedan Arbetsström 0 (korrekthet och formelbilaga), sedan 1 (bryt mallen), sedan 2 (verklighet) tillsammans med 4 (index), sedan 3 (luckor), sedan 5 (capstonen), och sist 6 (polish och quiz).

Logiken: korrektheten är snabb och oberoende, mallen gör all annan redigering lättare, verklighet och indexhederlighet ger störst trovärdighet, luckorna gör "avancerad" sann, capstonen knyter ihop, och polish och quiz ligger sist när innehållet är stabilt.

## Arbetsfördelning och kvalitetsloop

- **Claude Code kör omskrivningen i skala.** Den bor i repot, kör parallella agenter modul för modul, bygger och committar. Det är rätt verktyg för ett jobb som rör 100 plus lektioner.
- **En oberoende granskare gör en färsk helhetsgranskning vid varje milstolpe** på en uppladdad ögonblicksbild: integritet, siffror, begreppslig precision, konsekvens och röst. Poängen är oberoendet, samma instans bör inte både skriva och rätta sin egen läxa. Kostnaden är en uppladdning per milstolpe, och granskningen kan paketeras som ett återanvändbart skript så att varje omkörning går på sekunder.

## Så ser A+ ut: acceptanskriterier

Kursen är A+ när allt nedan stämmer.

- Varje tal är verifierat, och varje formel och definition är lärobokskorrekt. De åtta begreppsfixarna är gjorda, och formelbilagan finns.
- Inga döda referenser, alla lektioner på plats, capstonen integrerar med en ifyllbar mall och ett genomarbetat fall på ett riktigt bolag.
- Minst ett till två verkliga, gärna nordiska, bolag per relevant modul, framställda som undervisningsfall, med daterade och verifierade siffror.
- Lektioner om diskonteringsräntan, sektorundantag, svensk praktik och indexhederlighet finns.
- Mallen är varierad, redundansen skuren, ungefär 80 lektioner och 100 000 ord, ingen svengelska, läsbara meningar.
- Quiz på alla innehållslektioner.
- Rösten är lyft mot mentor-tonen.
- Den oberoende granskaren godkänner vid sista milstolpen.
