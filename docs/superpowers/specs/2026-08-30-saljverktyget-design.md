# Säljverktyget: produktdesign

**Datum:** 2026-08-30
**Status:** spec, inget byggt. Namnet är inte bestämt, se avsnitt 13.
**Hör ihop med:** `docs/superpowers/specs/2026-08-22-motparten-saljkurs-design.md` (kursen),
`docs/superpowers/specs/2026-08-29-saljcoachen-design.md` (coachen, byggd och deployad),
`docs/kallor/motparten-kallregister.md` (evidenspolicyn)

---

## 0. Vad det här dokumentet är

Nedskrivning av en designdiskussion 2026-08-30 om att bygga ut Motparten från en säljkurs
till en löpande tjänst. Ingenting här är byggt utom Säljcoachen, som finns men i dag står
frikopplad från allt annat.

Dokumentet är avsiktligt även en lista över vad som inte ska byggas. Flera av de starkaste
besluten är nej.

---

## 1. Vad produkten är, och vad den inte är

Motparten började som en kurs. Med prospektering, ett litet CRM, coachen och ett
morgonbrev är den inte längre en kurs med verktyg bredvid. Den är en loop:

> Kursen lär dig hantverket. Radar ger dig bolagen. Veckan säger vad du ska göra idag.
> Coachen hjälper dig när du kör fast. Affärer minns vad som hände. Utfallet gör allt det
> andra bättre.

Sebastians formulering är den som ska stå i specen: **CRM:et är inte produkten, säljarens
förbättrade prestation är produkten.** Det har en konkret konsekvens. Säljs den in som ett
CRM jämförs den med Pipedrive och HubSpot, och då förlorar den på funktionslistan. Säljs
den in som något annat finns ingen självklar jämförelse alls.

**Testet på varje idé i det här dokumentet:** vad förlorar kunden dagen den säger upp? Är
svaret innehåll, då säger den upp när den gått igenom kursen. Är svaret min pipeline, mina
bolag, min historik, då säger den inte upp. Allt som håller kundens eget arbete är
retention. Allt annat är marknadsföring.

---

## 2. Kunden

Den ensamma säljaren. Konsulten, grundaren som måste sälja, enda säljaren på ett litet
bolag, juniorsäljaren utan mentor. Personen som måste sälja men inte har någon att fråga.

Det är den definitionen som avgör prismodellen: den personen betalar gärna några
hundralappar i månaden och betalar aldrig sextusen i förskott utan att ha provat.

Säljorganisationen är en annan produkt med andra krav och en annan risk. Se avsnitt 12.

---

## 3. Modulerna

| Modul | Jobb |
| --- | --- |
| Profil | vad du säljer, till vem, vilket mål du har |
| Radar | hittar och bevakar marknaden |
| Coach | hjälper dig sälja |
| Affärer | prospekt och pipeline |
| Veckan | vad du bör göra nu |

Namnen är bra och bör behållas. De är tillsammans hela pitchen: Radar hittar dem, Veckan
säger när, Coach hjälper dig genom samtalet, Affärer minns vad som hände. Ett vanligt SaaS
hade kallat dem Prospecting, Assistant, Pipeline och Dashboard och sagt exakt ingenting.

### 3.1 Profil

Vad kunden säljer, till vem, och vilket mål den har. Saknades i den ursprungliga
bygglistan men är en förutsättning för två av de andra modulerna: coachen svarar generiskt
utan den, och Radar kan inte bygga ett urval utan att veta vad ett bra bolag är för just
den här kunden. Den är billig och bör ligga tidigt.

**Profilen är en hypotes, inte ett faktum.** Den ska vara redigerbar och versionerad, och
systemets mest värdefulla användning av den är att motsäga den: "du skrev tillverkande
bolag, men fem av dina sex affärer är grossister, och de tillverkande tar dubbelt så lång
tid att stänga." Det kräver både ett påstående och ett utfall, alltså profil plus Affärer.

### 3.2 Budget som aktivitetstakt

Budget hör till profilen, men bara i en viss form.

Daglig budgetuppföljning är fel av tre skäl. Tonen: "du ligger fjorton procent efter" varje
morgon är vad en säljchef skriver på en whiteboard, och det är motsatsen till en kompis.
Upplösningen: stänger du tolv affärer om året är 250 av årets dagar en dag utan avslut,
så daglig uppföljning mäter brus. Och riktningen: budget är chefens siffra, och bygger man
den kommer teamvyn att efterfrågas.

**Den användbara formen är att räkna om målet till en aktivitetstakt.** Siffran i sig gör
ingenting, uträkningen gör allt: för att nå 1,2 miljoner behöver du ungefär arton affärer,
du har sju, och med din vinstandel och snittaffär betyder det fyrtio kvalificerade samtal
till. Du gjorde sex förra veckan.

Det kräver ett enda inmatat fält, årsmålet. Snittaffär, vinstandel och antal affärer räknar
systemet fram ur Affärer så fort det finns data. Visa gapet, led inte med det.

### 3.3 Affärer, och fältdisciplinen

Ha bara fält som antingen användaren behöver för att göra jobbet eller analysen behöver
senare. Allt annat blir en kyrkogård. Vanliga CRM har sextio fält varav sex är ifyllda, och
de tomma fyrtiofyra är det som får folk att sluta använda systemet.

Tre fält bär hela systemet:

1. **Nästa steg med datum.** Frånvaron av det är definitionen av en affär som håller på att
   dö, och det är fältet Veckan läser.
2. **Anledningen vid förlust, i klartext.** Se avsnitt 4.
3. **Hur många personer du pratat med hos kunden.** Ett av materialets tydligaste mönster,
   och ett bra exempel på principen: fälten ska följa av vad ni lär ut, inte av vad
   Salesforce har.

### 3.4 Offerter

Värdet ligger inte i dokumentet, det ligger i händelsen. När offerten går iväg startar en
klocka, och det är där affärerna dör. Skickad tisdag, tyst i nio dagar, och det är exakt
ditt vanligaste dödsmönster. Det kräver ingen produktkatalog, bara att systemet vet att en
offert gick ut, när, och på hur mycket.

En mall som producerar en fil systemet inget vet om är en tjänst man gör åt kunden. En mall
som skapar en rad i Affärer är en del av loopen.

**Katalogen byggs progressivt, aldrig i förväg.** Första offerten skriver kunden raderna
själv. Andra gången föreslår systemet det den skrev förra gången. Efter fem offerter finns
en katalog ingen byggde. Genväg för den som vill: ladda upp de tre senaste offerterna,
plocka ut återkommande rader, visa förslaget.

**Gränsen, uttalad och tidig:** produkten gör offerter, följer dem och lär sig av dem. Den
gör inte avtal, e-signering, order eller fakturering. Det är ERP-gravitation och det är så
ett lätt CRM blir ett tungt. Vill kunden ha signering integreras Oneflow eller Scrive.

Offertdatan betalar tillbaka med fyra fält: datum, belopp, rader, utfall. Ur det faller
vilka rader som finns i vunna mot förlorade offerter, rabattens verkliga effekt, och tiden
från möte till offert ställd mot utfall.

---

## 4. Datamotorn

Produkten blir bättre ju längre kunden stannar. Det är den enda formen av inlåsning som
inte känns som inlåsning, och det är vallgraven. Prospektlistan går att köpa, kursen går
att kopiera, men det systemet vet om just den här säljaren kan ingen konkurrent ta fram.

### 4.1 n-problemet

200 rader i CRM:et är inte 200 datapunkter. Blev tolv affär, och delas de på storlek,
kommun och bransch, sitter man på tre per ruta. En bot som då säger "små bolag i den här
kommunen funkar bra för dig" hittar mönster i brus, vilket är exakt det kursen säger åt
folk att sluta göra, fast med kundens egna siffror.

**Evidenspolicyn ska därför gälla inåt.** Samma disciplin som mot kursens innehåll, fast
med underlaget som grund: "det här bygger på sex affärer, det räcker inte för ett mönster,
men det är värt att pröva medvetet i tio till." Den formuleringen är inte en brasklapp, den
är varumärket. Ingen annan säljprodukt säger det.

### 4.2 Vad som går att säga ärligt vid tunn data

**Obalanser i stället för samband.** "Du lägger sextio procent av din tid på bolag över
hundra anställda, men alla fem affärer du stängt är under tjugofem." Det är ingen
korrelation, det är en skillnad mellan var tiden går och var utfallet ligger, och den
håller även vid små tal.

**Beskrivningar av allt, inte av urvalet.** Var tiden går, hur långa cyklerna är, var
affärerna dör. Det använder alla rader, inte bara de som blev något.

**Framför allt förlusterna.** Nästan all säljlärdom byggs på vinsterna, som är den lilla
högen. De 188 förlorade är den stora datamängden och det är där mönstren är statistiskt
läsbara. "Dina affärer dör oftast efter andra mötet, och i sju av tio fall hade du bara
pratat med en person" är både mer användbart och bättre grundat än vad som vinner.

### 4.3 Designkonsekvenser

Ingen loggar förluster, alla loggar vinster. Om det inte är löjligt enkelt att stänga ett
bolag som förlorat med en anledning byggs hela analysen på överlevare och blir
systematiskt fel. Därför:

- **Förlustloggning är röstförst från dag ett.** Se 5.2.
- **Nej-orsaken är fritext, kategorin sätts av modellen i efterhand och visas aldrig som en
  väljare.** Fritext är rikt men går inte att räkna på, en fast lista går att räkna på men
  trycker in folk i närmsta ruta och dödar nyansen. Gör båda, be kunden om en sak.
- Skissa analysen först och fälten sedan, aldrig tvärtom.

---

## 5. Den frågande boten

Coachen svarar i dag. Den ska också fråga. Det är skillnaden mellan ett verktyg och en
kompis: verktyget väntar på att bli använt, kompisen hör av sig och undrar hur det gick.

Det löser också n-problemet elegantare än statistik gör. **Datan behöver inte veta varför,
den behöver bara veta var man ska fråga.** Sex förlorade affärer räcker inte för en
slutsats men räcker utmärkt för att peka ut vilken fråga som är värd att ställa. Botten
gissar inte orsaken ur siffrorna, den frågar personen som satt i rummet.

Mekaniken finns redan. Säljcoachen svarar `behover_mer` med en följdfråga när underlaget
saknas, och klienten håller en runda. Det som behöver byggas är omvänt initiativ, inte en
ny förmåga.

### 5.1 Två ögonblick

**Vid förlusten, direkt.** Kunden markerar ett bolag som förlorat, botten svarar med en
rad: vad var det som gjorde att det inte gick? En mening räcker. Billigt, minnet är färskt,
personen är redan i systemet.

**Över mönstret, sällan.** En gång i veckan, i morgonbrevet, en enda fråga om det som
sticker ut. "Dina affärer dör efter andra mötet, hur brukar de samtalen gå?"

### 5.2 Röstanteckningen

Du kommer ut från mötet, sätter dig i bilen, håller in en knapp och pratar i sextio
sekunder. Det blir en strukturerad rad i Affärer plus en reaktion från Coach.

Det här är den viktigaste enskilda funktionen efter grunden, för den löser det som gör alla
CRM tomma: ingen orkar skriva. Och den fångar materialet i den enda stund det är färskt och
personen är motiverad. Utan den bygger analysen i månad åtta på ingenting.

### 5.3 Reglerna som skiljer kompis från chef

- En fråga i taget. Två frågor är en pipeline-genomgång.
- Fråga aldrig något den kunde ha vetat. Finns datumet i systemet är det respektlöst att
  fråga efter det.
- Ge alltid något tillbaka i samma andetag. Samlar den bara in är den extraherande.
- Det ska gå att svara "vet inte", och den ska aldrig fråga om samma sak igen.

### 5.4 Minnet är inte evidens

Folk minns fel om varför affärer dog, och de minns systematiskt fel på ett sätt som
smickrar dem. Botten kan samla svaren, se att sju av tio säger prisrelaterade saker, och
ändå behöva säga att det är vad du upplevde, inte nödvändigtvis vad som hände. Samma
disciplin som resten av kursen, tillämpad på kunden själv.

---

## 6. Radars datakällor

Radar gör två olika jobb med olika källor. **Urvalet:** bolag i Sverige filtrerbara på
storlek, bransch, geografi. **Bevakningen:** att veta när något händer med dem.

### 6.1 Gratis och lagligt, och det räcker långt

Arbetsförmedlingens JobTech Dev har öppna API:er för platsannonser. JobSearch för sökning,
**JobStream för realtidsförändringar** i alla annonser i Platsbanken, alltså publiceringar,
ändringar och avpubliceringar, så en egen kopia kan hållas. Gratis, öppet, ingen
avtalsförhandling.

Platsannonser är dessutom den signal som säger mest om ett köpbehov. Ett bolag som söker
säljchef, lagerpersonal, en controller eller fem utvecklare berättar var det växer och vad
det saknar. Det är en bättre köpsignal än de flesta betalda intent-produkter.

Utöver det: bolagens egna sajter och nyhetsrum, RSS, pressmeddelanden. Egen crawl av de
bolag kunden själv bevakar är billigt så länge robots.txt respekteras.

### 6.2 Det som kostar

Bolagsverkets API för företagsinformation är transaktionsprissatt. **Aviseringar om
ändringar är kostnadsfria för kunder som tar 3 000 transaktioner i månaden eller mer**,
vilket betyder att bevakningsdelen kan bli gratis om urvalsdelen ändå ligger över den
volymen. Det ändrar kalkylen vid några hundra användare.

De kommersiella aggregatorerna, Roaring, Bisnode och Dun & Bradstreet bakom allabolag,
Ratsit, säljer urval, bokslut, koncernträd och bevakning i ett paket. Bekvämt, och det är
den vägen som kan kosta hundratusen om året.

### 6.3 Det som inte ska byggas på

LinkedIn är den rikaste källan för "ny säljchef på plats" och skrapning av LinkedIn bryter
mot deras villkor, och de driver processer om det. Skrapning av allabolag är samma sak i
mindre skala. Inget av det är ett fundament för ett bolag.

### 6.4 GDPR-linjen

Går mellan bolag och person. Uppgifter om ett aktiebolag är inte personuppgifter. En
namngiven kontaktperson med jobbmejl är det, och där krävs en intresseavvägning, ett sätt
att invända och en informationsplikt. Det är ett beslut att fatta medvetet, inte en
teknikalitet i implementationen.

Notera att "färdiga, kvalitetssäkrade prospekt med rätt beslutsfattare och kontaktuppgifter"
är den del av produkten som är minst särskiljande och dyrast, och som ligger mitt i den här
frågan. Den gör produkten säljbar dag ett. Den är inte vallgraven. Vallgraven är avsnitt 4.

### 6.5 Kopplingen till credits

Motsvarar en credit ett betalt anrop mot en extern källa är prissättningen ärlig mätning av
något som kostar pengar. Är källan gratis är credits ren ransonering, alltså konstgjord
knapphet. Båda kan fungera men de kräver olika argument, och det bör vara känt vilket som
förs.

### 6.6 Rekommendation för v1

Bygg Radar på JobTech plus egen bevakning av bolag kunden själv lagt till. Gratis, lagligt,
ingen förhandling, starkaste signalen från dag ett. Handla upp en betald källa först när
förbrukningen är mätt, så förhandlingen sker med siffror i handen.

---

## 7. Prismodellen

Modellen bytte karaktär när Radar, Affärer och Veckan kom in. Det är inte en kurs med
verktyg bredvid, det är en löpande tjänst, och då är abonnemang inte en betalningsform utan
vad produkten är. Engångs för innehållet och löpande för tjänsten är ärligt här, eftersom
kursen saknar marginalkostnad och tjänsterna har en.

| | Månadsvägen | Direktvägen |
| --- | --- | --- |
| Pris | 599 kr/mån, allt ingår | 5 990 kr en gång |
| Kursen | din efter 12 månader | din direkt |
| Efter 12 månader | 349 kr/mån eller 3 490 kr/år | 3 490 kr/år |
| Credits | 100/mån ingår | 100/mån ingår |
| Extra credits | 100 för 290 kr, 300 för 690 kr | samma |

**Nyckeln är att månadsbetalningarna leder till ägande.** Tolv månader månadsvis är 7 188,
direkt är 5 990, så den som betalar upfront sparar tolvhundra och den som betalar månadsvis
köper flexibilitet. Båda hamnar på samma ställe efter år ett. Ingen väg är dominerad och
ingen behöver räkna för att förstå det.

### 7.1 Credits

**Påfyllning varje månad, inte en startpott.** Den som ser en pott sjunka slutar utforska,
och de första veckorna är precis när produkten ska klicka. Låt dem rulla över upp till
ungefär tre månaders potter i stället för att brinna inne. Credits som förfaller känns som
en bestraffning och genererar sura mejl.

**Den skarpa gränsen: credits gäller bara det användaren själv startar.** Allt produkten gör
av sig själv, Radars bevakning och morgonbrevet först och främst, ingår alltid. Äter brevet
av potten slutar folk öppna det, och då har kärnvärdet mätts bort.

---

## 8. Enhetsekonomi

För ARR-syfte delas 5 990 i **2 500 kurs (engång)** och **3 490 tjänsteår (återkommande)**.
Det går jämnt ut, och år ett kostar därmed exakt lika mycket för tjänsten som
förnyelseåret. Ingen rabattlogik att förklara.

ARR per aktiv kund: 3 490 plus cirka 345 i credits, alltså **cirka 3 800 kr**.
Creditsiffran antar att var fjärde kund köper två 300-packar per år och är en gissning
tills förbrukning är mätt.

### 8.1 Vid 500 aktiva kunder

Antagande: 250 nya, 250 förnyande.

| Intäktskälla | Antal | À | Summa |
| --- | --- | --- | --- |
| Nya, direktvägen | 250 | 5 990 | 1 497 500 |
| Förnyelser | 250 | 3 490 | 872 500 |
| Credits, försiktigt | 500 | 345 | 172 500 |
| Kassa totalt | | | 2 542 500 |

Med en realistisk svans, där 300 kunder aldrig köper extra, 125 köper två pack, 50 köper
fyra och 25 köper tio, blir creditintäkten 483 000 i stället för 172 500, alltså 966 kr per
kund i snitt.

| | Försiktigt | Med svans |
| --- | --- | --- |
| Kassa | 2 542 500 | 2 853 000 |
| ARR | 1 917 500 | 2 228 000 |
| varav engång (kurs) | 625 000 | 625 000 |

Samma 500 kunder med mogen mix, 100 nya och 400 förnyande, ger 2 167 500 i kassan och
oförändrad ARR. Kassan faller med 375 000, ARR står still. Det är därför engångsdelen är
förrädisk att styra på: den ser ut som tillväxt men är bara en funktion av hur många nya som
togs in det året.

### 8.2 Livstidsvärde

| Förnyelsegrad | LTV |
| --- | --- |
| 50 % | ca 10 200 kr |
| 70 % | ca 15 300 kr |
| 80 % | ca 21 700 kr |

Förnyelsegraden är den överlägset största spaken, större än priset. Tio procentenheter där
är värda mer än en tusenlapp på prislappen. Det är hela argumentet för Radar och
förändringssignalerna: de är det enda som producerar värde under kundens tysta månader.

Vid 70 procent tål modellen en kundanskaffningskostnad på 3 000 till 5 000 kr.

### 8.3 Kostnadssidan

Modellanrop för coach, Veckan och diktering landar runt 275 kr per kund och år även med
generös användning, alltså cirka 140 000 vid 500 kunder. Hosting är försumbart.
Bruttomarginalen på allt som byggts hittills ligger norr om 90 procent.

**Den enda posten som kan ändra bilden är datakällan bakom Radar.** En licensierad feed med
fast årsavgift på ett par hundratusen äter en tiondel av intäkten vid 500 kunder men är
olönsam vid 100. Sätt ett tak för den innan Radar byggs, inte efter.

---

## 9. Byggordningen

Sebastians sekvens, som är väl ordnad: varje steg gör nästa möjligt, och den samlar data
innan den bygger analysen som behöver datan.

1. Nästa aktivitet plus datum
2. Aktivitetshistorik plus nej-orsaker
3. Diktering till strukturerad aktivitet
4. Veckan / Idag
5. Radar som sparad och bevakad marknad
6. Förändringssignaler

### 9.1 Justeringar

**Profilen (3.1) saknas och bör in tidigt**, senast före steg 5, eftersom Radar inte kan
bygga ett urval utan den.

**Döm inte steg 2 innan steg 3 finns.** Diktering är inte en förbättring ovanpå
aktivitetshistoriken, det är hur historiken och nej-orsakerna hamnar där. Släpps 2 ensamt
blir det tre veckors plikttrogen inmatning och sedan tomma fält, och då dras fel slutsats:
att folk inte vill logga förluster. De vill, de vill bara inte skriva.

**Dela steg 4.** Den dumma versionen av Veckan, en sorterad lista över det som är försenat
och det som ska göras idag, faller ut nästan gratis ur steg 1 och ändrar produktens
personlighet direkt, från lagring till någon som säger något. Den smarta Veckan hör hemma
där den ligger.

**Coachen saknas i listan** trots att den är byggd. Den står i dag som en chattruta vid
sidan av allt, vilket är dess svagaste form. Väv in den vid steg 2 och 3: coachen som
reagerar på en loggad förlust är något helt annat än coachen som väntar på att tillfrågas.

**Dra fram en tunn skiva av 5 och 6.** Steg 1 till 4 kräver alla att kunden dyker upp.
Steg 5 och 6 är de enda som producerar värde när kunden försvinner, och kunder försvinner.
Uppsägningar sker inte när folk är missnöjda, de sker efter sex tysta veckor. Den tunna
versionen behöver inte vara mer än bolag kunden själv lagt till, bevakade mot JobTech.

### 9.2 Kallstarten

Steg 1 till 4 ger en bra personlig säljplattform men ger kunden en finare behållare för
sådant den redan har. Det som får en främling att betala i månad ett är Radar. Fram till
steg 5 finns lite att demonstrera.

Det är lösbart och lösningen är redan bestämd: **kursen är dag-ett-värdet.** Den bär månad
ett till sex medan motorn fylls, loopen behåller kunden från månad sex. Men det måste vara
medvetet, och marknadsföringen under första året säljer kursen med verktyg som växer, inte
en plattform som ännu inte kan visa vad den går för.

---

## 10. Att bevisa att metoden fungerar

Ambitionen att bevisa att metoden ökar konvertering och intäkt per säljare är den största
idén i projektet och den farligaste. **Den röda listan bannlyser leverantörsdata som
presenteras som forskning.** Publiceras "vår metod ökar konverteringen med 34 procent"
baserat på egna kunder har vi blivit det vi kritiserar, och någon kommer att påpeka det.

Det gör det inte omöjligt, det gör det till en designfråga som måste lösas tidigt, för ett
kontrollgruppsupplägg går inte att retrofitta.

**Stegvis utrullning.** Alla kunder får coachinglagret, men vissa i månad ett och vissa i
månad fyra, slumpmässigt. Jämför under glappet. Alla får produkten till slut, så det är
etiskt oproblematiskt, det är trivialt med feature flags, och det ger något som ärligt kan
kallas ett orsakssamband.

**Förregistrera måtten.** Bestäm vad som ska mätas innan datan betraktas. Det är den enda
skillnaden mellan mätning och marknadsföring.

**Välj processmått som primära.** Konvertering är det alla vill höra och samtidigt det
bullrigaste och långsammaste, särskilt hos en säljare med tolv affärer om året. Mät i
stället det som faktiskt lärs ut, där det finns många händelser:

- andel affärer med nästa steg satt
- andel affärer som går tysta över fjorton dagar
- antal personer per affär
- tid från möte till offert

De rör sig på veckor i stället för år och är de mekanismer kursen påstår sig påverka.
Intäkt per säljare rapporteras som eftersläpande indikator med förbehåll.

Görs det så blir det här den enda produkten i kategorin med ett påstående som håller.

---

## 11. Vad vi säger nej till

**Pitchgenerering.** Redan förbjudet i coachens systemprompt. Den goda formen är motsatsen:
kunden skriver utkastet, coachen säger vad materialet säger om det. Den skillnaden är hela
varumärket, och den lär kunden något i stället för att låta den outsourca sitt omdöme.

**Tonanalys och avläsning av kundens känsloläge.** Kommer att föreslås av alla ni pratar
med. Det är exakt det den röda listan underkänner, Mehrabian och avläsning av känsloläge.
Att säga nej är inte att avstå en funktion, det är att bevisa att listan är på riktigt.

**Automatiskt genererade utskickssekvenser.** Råvara som finns gratis överallt, gör kunden
sämre på sitt jobb, och river ner skillnaden mot alla andra.

**Avtal, e-signering, order och fakturering.** Se 3.4.

Sebastians observation om att AI ökar konkurrensen för säljare gör de här nejen till en
marknadsanalys i stället för självpåtagna inskränkningar: när alla kan generera utskick
blir genererade utskick värdelösa, och det som återstår är omdöme och relation. Den ramen
bör flyttas upp från fotnot till berättelse.

---

## 12. Öppna beslut

**Teampriser.** Aldrig tagna i land i den nya modellen.

**Säljchefsvyn.** Den största intäktsexpansionen som finns och den kan döda produkten. I
samma sekund som chefen kan läsa vad du frågat coachen slutar du fråga ärligt, och då blir
inmatningen tillrättalagd och analysen värdelös. Går vi mot team måste det vara en hård,
uttalad regel att coachsamtalen är privata och att chefen bara ser det säljaren själv
publicerar. Skriv regeln innan den första chefen ber om motsatsen.

**Förhållandet till vndycrm.** Vi är på väg att bygga ett litet CRM samtidigt som vi redan
äger ett. Antingen är Affärer vndycrm i en mindre kavaj, eller så underhålls två CRM med
två datamodeller och en av dem ruttnar. Avgör innan en tabell är skriven.

**Internationellt.** Metoden och motorn flyttar, datalagret gör det inte. Kursen är svensk,
korpusen är svensk, Radar står på JobTech och Bolagsverket. Varje nytt land är en ny
datakälla och en översatt korpus, alltså ett projekt per land.

**Betalväg och rättigheter.** Motparten har ingen betalväg alls, rättigheter per kurs är
inte byggt, och pilotinloggningen ska bort före lansering. Se `LAUNCH.md`.

---

## 13. Namnet

Inte bestämt. Utvärderade kandidater och varför de föll:

| Kandidat | Utfall |
| --- | --- |
| Medvind | Visma Enterprise driver Medvind WFM, stort svenskt B2B-system. medvind.se tagen sedan 1995 |
| Momentum | Momentum Group AB noterat på Nasdaq Stockholm, plus krock med aktiekursens vokabulär |
| Salescale / Scalesale | SellScale finns redan i exakt samma kategori. Svårt att säga i telefon |
| Försprång | Bäst av utfallsorden, men forsprang.se och forspranget.se tagna, konsultklyscha, och å:et är ett domänproblem |
| Övertag | overtag.se ledig, men ordet pekar på kunden som den man har övertag över, vilket motsäger materialet |

**Mönstret:** fyra av fem förslag lovar ett utfall, lätthet, fördel eller volym. Ett namn
bör klara tre saker: inte krocka med någon i samma bransch, gå att säga i telefon, och inte
motsäga vad vi säger om oss själva. Ett namn som lovar volym på en produkt vars tes är att
volym slutade fungera faller på det tredje.

**Kvarstående kandidater**, alla samma bild i olika språkdräkt, personen i passagerarsätet
som ser vad som kommer och säger det i tid:

- **Bisittaren** (bisittaren.se ledig). Rallyts kartläsare. Svenskt.
- **Ridealong** (ridealonghq.com ledig). Branschens eget ord för när säljchefen åker med.
- **Pacenote** (pacenotehq.com ledig). Kartläsarens uppläsning av vad som kommer.

Notera att .com för i stort sett varje ordboksord och tvåordskombination är tagen. Välj
namnet först och TLD sedan.

**Ta motparten.se och saljkollegan.se oavsett utfall.** Båda lediga, tillsammans under
trehundra kronor. Motparten fungerar dessutom bra som namn på kursen inuti tjänsten, även
om tjänsten heter något annat: namnet pekar på köparen, vilket är rätt för en kurs om att
förstå den som sitter på andra sidan bordet och fel för kompisen som går bredvid.
