# Modul 24: Girighet och att säkra avkastning, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skriv en ny modul 24 (6 lektioner) om girighet, önsketänkande och att säkra avkastning, plus en källfil för Sivers-caset och en spec för en "Säkra eller stretcha"-kalkylator.

**Architecture:** Sex markdown-lektioner i `src/content/kurs/24-girighet-och-att-sakra-avkastning/`, egen del, gejtas och trädbyggs automatiskt av `src/lib/course.ts` ur frontmatter. Sivers-tal samlas först i en verifierad, daterad källfil (mönster: `docs/case-sources/fall-lifco-2025.md`). Verktyget levereras som spec-dokument, ingen kod.

**Tech Stack:** Astro content collections (Zod-schema i `src/content.config.ts`), grindar i `tools/` (`check-structure.mjs`, `check-refs.mjs`, `check-all.mjs`), Node.

**Verifieringsmodell (innehåll, ej TDD-kod):** Acceptanskriteriet per standardlektion är strukturgrinden: de sex H2-sektionerna (Varför det spelar roll / Så fungerar det / Hur en erfaren investerare tänker / Exempel / Vad du letar efter och vad som varnar / Checklista och övning), 700 till 1600 ord i brödtexten, quiz med minst 3 frågor, inga em-dash eller en-dash, och alla korsreferenser (t.ex. 16.4) pekar på existerande lektioner. Kör grinden på modulmappen efter varje lektion, hela `npm run check` i slutet.

**Referens för ton och form:** `src/content/kurs/18-din-egen-investeringsprocess/18.3-bevaka-omprova-och-salja.md` är den närmaste förlagan (samma nivå, samma sektionsmall, samma prosa-ton). Läs den innan du skriver.

**Hårda regler (från CLAUDE.md):** Uppfinn aldrig finansiella tal för ett namngivet verkligt bolag; Sivers-tal endast från källfilen i Task 1. Inga em-dash (—) eller en-dash (–) någonstans. Redigera aldrig `dist/`. Commit-trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Task 1: Verifierad källfil för Sivers + citerad forskning

**Files:**
- Create: `docs/case-sources/sivers-2026.md`

Detta är fundamentet för 24.3 och 24.5. Inga Sivers-tal får skrivas i lektionerna utan att stå daterade och källhänvisade här först.

- [ ] **Step 1: Research och verifiera Sivers-tal**

Använd WebSearch/WebFetch. Fastställ och notera med datum + URL för var och en:
- Framflyttad Q2-rapport (från 6 aug till 27 aug 2026) och att det öppnar insynssäljfönster 16 juli när lock-up (riktad emission april 2026) löper ut. Källor: Placera, EFN, Affärsvärlden (2026-07-06).
- Aktuell kurs och nivån på uppgången (kurs kring 39 SEK vid screenshot; toppnivå och börsvärde kring maj till juni 2026). Verifiera mot EN tydlig källa; de första svepen var motstridiga (t.ex. topp 55 till 59 SEK vs ATH 110 SEK). Skriv bara tal du kan belägga; hellre färre säkra tal.
- Verksamhetens svaghet: kassa, nettoförlust och kassaflöde för 2025. Källa: Dagens PS m.fl.

- [ ] **Step 2: Research och verifiera citerad forskning**

Fastställ 2 till 4 riktiga, citerbara källor (titel, författare, år, var den finns):
- Mean reversion / dålig avkastning efter extrema momentum- eller paraboliska rörelser (t.ex. akademisk momentum-crash-litteratur, Daniel & Moskowitz "Momentum Crashes" 2016, eller motsvarande).
- Dispositionseffekten (Shefrin & Statman 1985, Odean 1998, "Are Investors Reluctant to Realize Their Losses?").
Notera för varje: vad den faktiskt visar, och den exakta meningen vi vågar påstå. Där evidensen är svag, notera "mekanism, ej siffra".

- [ ] **Step 3: Skriv källfilen**

Skriv `docs/case-sources/sivers-2026.md` med två avsnitt: "Sivers, daterade tal" (varje tal med datum + källa-URL) och "Citerad forskning" (varje källa med fullständig referens och den mening vi får bygga på). Inga em-dash eller en-dash. Markera uttryckligen vilka tal som är verifierade och vilka som lämnas ute som osäkra.

- [ ] **Step 4: Verifiera dashfrihet**

Run: `node tools/strip-emdash.mjs docs/case-sources/sivers-2026.md && node tools/strip-endash.mjs docs/case-sources/sivers-2026.md`
Expected: inga ändringar (0 ersättningar). Om skriptet vill ändra något, rätta manuellt till komma/kolon/"till" och kör igen.

- [ ] **Step 5: Commit**

```bash
git add docs/case-sources/sivers-2026.md
git commit -m "docs(case): verifierade Sivers-tal och citerad forskning for modul 24

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Modulmapp + lektion 24.1 (Girigheten och varför den kostar)

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.1-girigheten-och-varfor-den-kostar.md`

- [ ] **Step 1: Läs förlagan**

Läs `src/content/kurs/18-din-egen-investeringsprocess/18.3-bevaka-omprova-och-salja.md` för ton, sektionsform och referensstil.

- [ ] **Step 2: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.1"
titel: "Girigheten och varför den kostar"
niva: "Avancerad"
ordning: 2401
fardighet: "Du känner igen girigheten i dig själv och förstår varför den, obehandlad, äter avkastning."
quiz:
  - fraga: "Vad menas med att girigheten är rädslans tvilling?"
    svar:
      - "Båda är känslor som kapar ett förbestämt beslut i stunden, den ena driver att jaga mer, den andra att fly"
      - "Båda får dig att sälja för tidigt i en nedgång"
      - "De uppträder aldrig hos samma investerare"
    ratt: 0
    forklaring: "Rädsla och girighet är samma mekanism åt två håll: en känsla i stunden som tränger undan den plan du bestämt i förväg. Rädslan får dig att fly, girigheten att jaga mer."
  - fraga: "Vilket av följande är ett uttryck för girighet i förvaltningen?"
    svar:
      - "Att fylla på en vinnare långt förbi den tes som en gång motiverade köpet"
      - "Att sälja hela positionen när ett falsifieringsvillkor utlösts"
      - "Att trimma en position som sprungit långt förbi ditt värde"
    ratt: 0
    forklaring: "Att öka i en vinnare enbart för att den stigit, utan att tesen bär den nya vikten, är girighet. Att sälja på brusten tes eller trimma på övervärdering är disciplin."
  - fraga: "Vad betyder tesen 'there is no good in greed' i lektionen?"
    svar:
      - "Girigheten lovar mer avkastning men levererar sämre beslut, den vill alltid ha sista kronan"
      - "Att man aldrig bör äga aktier som stigit kraftigt"
      - "Att all vinst är moraliskt tvivelaktig"
    ratt: 0
    forklaring: "Poängen är beslutskvalitet, inte moral. Girigheten som jagar sista kronan försämrar systematiskt dina beslut, den ger dig sämre utfall, inte bättre."
---
```

- [ ] **Step 3: Skriv brödtexten (700 till 1600 ord, sex H2-sektioner)**

Sektioner och beats:
- `## Varför det spelar roll`: Det mesta av den känslomässiga skadan sker efter köpet. Modul 16 handlade om rädslan; den här modulen om dess tvilling, girigheten. Girigheten kostar tyst, inte i krascher utan i beslut du inte märker att du fattar.
- `## Så fungerar det`: Definiera girigheten som en känsla i stunden som kapar en förbestämd plan. Tre konkreta yttringar: hålla för toppen (vägra säkra medan priset är över värdet), fylla på en vinnare förbi tesen, jaga tillbaka en missad rörelse. Koppla till att den alltid vill ha sista kronan.
- `## Hur en erfaren investerare tänker`: Den erfarne respekterar girigheten som han respekterar rädslan, med ett system, inte med viljestyrka. Han vet att känslan känns som insikt ("den här fortsätter ju"). Pekar mot scenariojämförelsen (24.4) som motgiftet.
- `## Exempel`: Ett tydligt märkt illustrativt fall: en position som gått från köp till klart över värde, där två investerare gör olika: den ene säkrar en del, den andre håller allt "för att den fortsätter". Visa att girigheten är den tysta rösten som säger håll.
- `## Vad du letar efter och vad som varnar`: Tecken på att girigheten styr: du kan inte formulera vad som skulle få dig att säkra, ditt skäl att hålla är kursens riktning, du räknar orealiserad vinst som redan din. Sunt: du har en förbestämd regel för när du säkrar.
- `## Checklista och övning`: 5 till 6 kryssrutor. Övning: skriv ned tre gånger du senast höll för länge eller jagade en rörelse, och namnge känslan.

Länka minst till 16.2 (rädsla), 18.3 (sälja) och framåt till 24.4. Inga em-dash/en-dash.

- [ ] **Step 4: Verifiera struktur och dashfrihet**

Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK` (inga avvik för 24.1).
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.1-girigheten-och-varfor-den-kostar.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.1-girigheten-och-varfor-den-kostar.md`
Expected: 0 ersättningar.

- [ ] **Step 5: Commit**

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.1-girigheten-och-varfor-den-kostar.md
git commit -m "feat(kurs): modul 24.1, girigheten och varfor den kostar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Lektion 24.2 (Önsketänkande: när tesen blir luft)

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.2-onsketankande-nar-tesen-blir-luft.md`

- [ ] **Step 1: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.2"
titel: "Önsketänkande: när tesen blir luft"
niva: "Avancerad"
ordning: 2402
fardighet: "Du kan upptäcka när din tes tyst har bytts ut mot hopp."
quiz:
  - fraga: "Vilket är det tydligaste tecknet på att en tes blivit önsketänkande?"
    svar:
      - "Du kan inte längre formulera vad som skulle få dig att sälja"
      - "Kursen har stigit sedan du köpte"
      - "Andra investerare är också positiva"
    ratt: 0
    forklaring: "En tes har ett falsifieringsvillkor (18.2). När du inte längre kan säga vad som skulle få dig att ändra dig äger du hopp, inte en tes. Kursuppgång och andras åsikter avgör inget."
  - fraga: "Vad menas med att 'värdet motiveras bara av priset'?"
    svar:
      - "Din motivering för att hålla har blivit att kursen stiger, inte att verksamheten är värd mer"
      - "Du har räknat ett värde med DCF"
      - "Marknaden är effektiv och priset är alltid rätt"
    ratt: 0
    forklaring: "När enda skälet du kan ge för att äga är att priset går upp har analysen ersatts av momentum. Värdet ska komma från verksamheten (12.3), inte från kursens riktning."
  - fraga: "Hur skiljer lektionen övertygelse från hopp?"
    svar:
      - "Övertygelse vilar på en falsifierbar tes med siffror, hopp vilar på ett narrativ som lever på priset"
      - "Övertygelse betyder att man är säker, hopp att man tvekar"
      - "Det finns ingen skillnad i praktiken"
    ratt: 0
    forklaring: "Skillnaden är inte hur säker du känner dig, utan vad tron vilar på. Övertygelse kan falsifieras och pekar på siffror (16.4, 16.5); hopp pekar på trenden och tål ingen prövning."
---
```

- [ ] **Step 2: Skriv brödtexten (700 till 1600 ord, sex H2-sektioner)**

Beats:
- `## Varför det spelar roll`: Girigheten arbetar genom önsketänkande. Den byter tyst ut din tes mot ett hopp utan att du märker det, och då slutar dina varningssystem fungera.
- `## Så fungerar det`: Tre tecken att tesen blivit luft: (1) du kan inte formulera falsifieringsvillkoret längre, (2) värdet motiveras bara av priset, (3) du citerar trenden och inte siffrorna. Definiera övertygelse (falsifierbar, sifferförankrad) mot hopp (narrativ, prisförankrat).
- `## Hur en erfaren investerare tänker`: Ställer regelbundet frågan "vad skulle få mig att sälja?" Om svaret krympt eller försvunnit vet han att hoppet krupit in. Han litar på skrivna antaganden, inte på hur övertygad han känner sig.
- `## Exempel`: Illustrativt fall där en ursprungligen sund tes (t.ex. växande återkommande intäkt) gradvis ersätts av "marknaden är enorm och vi är tidiga". Visa hur falsifieringsvillkoret tyst faller bort.
- `## Vad du letar efter och vad som varnar`: Varnar: motiveringar som bara pekar framåt och uppåt, oförmåga att säga vad som vore ett dåligt tecken, irritation vid motargument (16.3). Sunt: en levande, daterad lista över vad som skulle bryta tesen.
- `## Checklista och övning`: Övning: ta ett aktuellt innehav och skriv i en mening vad som skulle få dig att sälja. Om du inte kan, är det en varningssignal.

Länka 16.3 (confirmation bias), 16.4 (story investing), 16.5 (potential vs sannolikhet), 18.2 (falsifieringsvillkor), 12.3. Inga em-dash/en-dash.

- [ ] **Step 3: Verifiera struktur och dashfrihet**

Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK`.
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.2-onsketankande-nar-tesen-blir-luft.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.2-onsketankande-nar-tesen-blir-luft.md`
Expected: 0 ersättningar.

- [ ] **Step 4: Commit**

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.2-onsketankande-nar-tesen-blir-luft.md
git commit -m "feat(kurs): modul 24.2, onsketankande nar tesen blir luft

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Lektion 24.3 (Den paraboliska uppgången: mönstret och varningsklockorna)

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.3-den-paraboliska-uppgangen.md`
- Read: `docs/case-sources/sivers-2026.md` (för alla tal)

Detta är den enda lektionen med ett namngivet verkligt bolag. Varje Sivers-tal MÅSTE komma från källfilen och skrivas med sin datering. Om ett tal inte står verifierat i källfilen, använd det inte.

- [ ] **Step 1: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.3"
titel: "Den paraboliska uppgången: mönstret och varningsklockorna"
niva: "Avancerad"
ordning: 2403
fardighet: "Du känner igen den paraboliska rörelsens mönster och dess varningsklockor."
quiz:
  - fraga: "Vad kännetecknar en parabolisk uppgång i lektionens mening?"
    svar:
      - "Kursen stiger kraftigt på en obevisad trend medan börsvärdet lösgör sig från verksamheten"
      - "Kursen stiger stadigt i takt med stigande vinster"
      - "Kursen faller snabbt efter en vinstvarning"
    ratt: 0
    forklaring: "Det paraboliska är att priset drivs av en berättelse om framtiden bolaget ännu inte bevisat att det kan kapitalisera på, så att värderingen tappar kontakt med de faktiska räkenskaperna."
  - fraga: "Varför är en framflyttad rapport som öppnar ett insynssäljfönster en varningsklocka?"
    svar:
      - "Den kan låta insynspersoner sälja innan marknaden får se siffrorna"
      - "Den betyder alltid att bolaget begått ett brott"
      - "Den påverkar aldrig aktiekursen"
    ratt: 0
    forklaring: "När rapporten skjuts fram så att en lock-up löper ut först kan de som vet mest sälja innan de sämre siffrorna blir offentliga. Det är en signal om informationsövertag, inte ett bevis, men värt att väga tungt."
  - fraga: "Vad säger forskningen om avkastning efter extrema paraboliska rörelser?"
    svar:
      - "Extrema momentumrörelser tenderar att följas av bakslag (mean reversion), särskilt utan vinstunderlag"
      - "De fortsätter i genomsnitt uppåt i flera år"
      - "Det finns ingen forskning om detta"
    ratt: 0
    forklaring: "Momentum kan bära länge, men de mest extrema rörelserna utan fundamentalt stöd är också de mest utsatta för kraftiga bakslag. (Se citerad källa i lektionen.)"
  - fraga: "Vilken kombination av signaler ska få varningsklockorna att ringa samtidigt?"
    svar:
      - "Kraftig uppgång på obevisad trend, framflyttad rapport, utspädande emission och kassabrist"
      - "Stabil vinsttillväxt, stark kassa och oförändrat rapportdatum"
      - "Sjunkande kurs och stigande utdelning"
    ratt: 0
    forklaring: "Ingen signal räcker ensam, men när flera samlas (obevisad trend, försenad rapport, utspädning, tunn kassa) ritar de tillsammans en tydlig riskbild."
---
```

- [ ] **Step 2: Skriv brödtexten (700 till 1600 ord, sex H2-sektioner)**

Beats (alla Sivers-tal från källfilen, med datering):
- `## Varför det spelar roll`: Girigheten trivs som bäst i en parabolisk uppgång. Att kunna läsa mönstret och dess varningsklockor är skillnaden mellan att säkra i tid och att åka med hela vägen ned.
- `## Så fungerar det`: Beskriv mönstret: kraftig uppgång på en trend bolaget inte bevisat att det kan kapitalisera på, börsvärde löst från verksamheten. Lista varningsklockorna: framflyttad rapport som öppnar insynssäljfönster, riktad emission och utspädning (19.6), kassabrist och burn (17.4). Väv in den citerade mean-reversion-forskningen som mekanism.
- `## Hur en erfaren investerare tänker`: Han låter sig inte imponeras av kursen utan frågar vad som faktiskt bevisats. Han väger insynsbeteende och finansieringsbehov tungt. Han vet att "den här gången är annorlunda" är girighetens favoritmening.
- `## Exempel`: **Sivers Semiconductors**, namngivet, med daterade tal ur källfilen: den paraboliska uppgången kring 2026, den framflyttade Q2-rapporten (6 aug till 27 aug) och insynssäljfönstret 16 juli, den svaga verksamheten under (kassa, förlust). Dra ut sensmoralen: mönstret och klockorna, inte en dom över bolagets framtid. Ange att talen är daterade och källhänvisade.
- `## Vad du letar efter och vad som varnar`: Varnar: värdering utan vinstunderlag, försenade rapporter runt lock-up, upprepade emissioner, insynsförsäljning. Sunt: uppgång som följs av stigande, bevisade räkenskaper.
- `## Checklista och övning`: Övning: ta en aktie som stigit kraftigt senaste året och pricka av varningsklockorna en för en.

Länka 17.4 (kassa/burn), 19.6 (emissionsrisk), 16.1 (FOMO). Inga em-dash/en-dash. Markera Sivers-talen som daterade/källhänvisade.

- [ ] **Step 3: Verifiera struktur, dashfrihet och att talen finns i källfilen**

Bekräfta manuellt att varje Sivers-tal i lektionen står i `docs/case-sources/sivers-2026.md` med datum och källa.
Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK`.
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.3-den-paraboliska-uppgangen.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.3-den-paraboliska-uppgangen.md`
Expected: 0 ersättningar.

- [ ] **Step 4: Commit**

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.3-den-paraboliska-uppgangen.md
git commit -m "feat(kurs): modul 24.3, den paraboliska uppgangen (Sivers-case)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Lektion 24.4 (Scenariojämförelsen) + verktygsspec

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.4-scenariojamforelsen-anger-vs-sakrad-avkastning.md`
- Create: `docs/specs/verktyg-sakra-eller-stretcha.md`

- [ ] **Step 1: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.4"
titel: "Scenariojämförelsen: ånger vs säkrad avkastning"
niva: "Avancerad"
ordning: 2404
fardighet: "Du kan ställa ångern över missad uppsida mot tryggheten i säkrad avkastning och fatta beslut på vägningen."
quiz:
  - fraga: "Vilka två sorters ånger tvingar scenariojämförelsen fram?"
    svar:
      - "Ångern om du säljer och den fortsätter upp, och ångern om du håller och den kollapsar"
      - "Ångern över att ha köpt, och ångern över att inte ha köpt mer"
      - "Ångern över skatt, och ångern över courtage"
    ratt: 0
    forklaring: "Girigheten ser bara den första ångern, den över såld uppsida. Ramen ställer den bredvid den andra, ångern över hållen kollaps, så att beslutet blir en vägning i stället för en enkelriktad känsla."
  - fraga: "Vad ska beslutet vägas mot, enligt ramen?"
    svar:
      - "Ditt beräknade värde, inte den högsta kurs du sett"
      - "Ditt inköpspris"
      - "Den senaste toppkursen"
    ratt: 0
    forklaring: "Ankaret är värdet (modul 12 till 14). Att väga mot toppen är ankring (16.6); att väga mot inköpspriset är sunk cost (16.7). Frågan är: skulle jag köpa till dagens pris nu?"
  - fraga: "Varför dominerar ofta en delförsäljning när priset sprungit förbi värdet?"
    svar:
      - "Den gör dig immun mot bådas värsta utfall: du har säkrat något om den faller och äger något om den stiger"
      - "Den ger alltid högst förväntad avkastning"
      - "Den undviker skatt helt"
    ratt: 0
    forklaring: "När båda ångrarna är stora är kompromissen ofta bäst: en trim säkrar en del av vinsten och behåller en del av uppsidan, så att inget av de två scenarierna blir outhärdligt."
  - fraga: "Vad är rätt sätt att uppskatta de tre utfallen (upp, platå, tillbaka)?"
    svar:
      - "Ärliga grovtal och en storleksordning, utan att låtsas om exakt precision"
      - "Exakta sannolikheter till två decimaler"
      - "Enbart det mest optimistiska utfallet"
    ratt: 0
    forklaring: "Poängen är inte falsk precision utan att tvinga fram alla tre utfallen och deras ungefärliga vikt, så att nedsidan får plats bredvid uppsidan i beslutet."
---
```

- [ ] **Step 2: Skriv brödtexten (700 till 1600 ord, sex H2-sektioner)**

Beats:
- `## Varför det spelar roll`: Girigheten är stark för att den bara visar dig en sorts ånger. Scenariojämförelsen är motgiftet: den gör en känslostorm till en vägning du kan se på papper.
- `## Så fungerar det`: Ramen i fyra steg: (1) rita de tre utfallen från dagens pris (upp, platå, tillbaka) med ärliga grovtal; (2) prissätt ångern åt båda håll; (3) väg mot värdet, inte toppen (16.6), med frågan "skulle jag köpa till dagens pris nu?" (16.7); (4) välj handtag: säkra, stretcha eller dela.
- `## Hur en erfaren investerare tänker`: Han räknar aldrig bara uppsidan. Han frågar hur det känns i båda scenarierna och väljer det drag han kan leva med oavsett vilket som inträffar. Delförsäljning är hans vanligaste svar när priset sprungit förbi värdet.
- `## Exempel`: En tydligt märkt **illustrativ** förväntat-värde-räkning: en position klart över värde, tre utfall med grovodds och grov målkurs, och en jämförelse av förväntat värde för håll allt / säkra allt / dela. Visa varför dela ofta dominerar. Understryk att talen är konstruerade för att visa logiken.
- `## Vad du letar efter och vad som varnar`: Varnar: du väger bara uppsidan, du ankrar i toppen, du kallar orealiserad vinst "gratis". Sunt: du har båda ångrarna nedskrivna och ett medvetet valt handtag.
- `## Checklista och övning`: Övning: gör scenariojämförelsen för ett eget innehav som stigit, med båda ångrarna och ett valt handtag.

Länka 16.6 (ankring), 16.7 (sunk cost), 12.3, 15.4 (tänka i sannolikheter). Peka på verktyget (24.4-räknaren) som en körbar version. Inga em-dash/en-dash.

- [ ] **Step 3: Verifiera struktur och dashfrihet (lektion)**

Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK`.
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.4-scenariojamforelsen-anger-vs-sakrad-avkastning.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.4-scenariojamforelsen-anger-vs-sakrad-avkastning.md`
Expected: 0 ersättningar.

- [ ] **Step 4: Skriv verktygsspecen**

Skriv `docs/specs/verktyg-sakra-eller-stretcha.md` med: syfte (gör 24.4:s ram körbar i `/verktyg`), input (dagens pris, värdeintervall låg till hög, positionsvikt, grovodds för tre utfall med målkurs per utfall), output (förväntat värde för håll/säkra/dela, de två ångertalen sida vid sida, föreslagen trim-nivå), avgränsning (ren räknare på användarens antaganden, inga marknadsdata, ingen fabricerad statistik). Notera den öppna frågan: tydlig rekommendation ("trimma X procent") vs bara tal. Inga em-dash/en-dash.

- [ ] **Step 5: Verifiera dashfrihet (spec) och commit**

Run: `node tools/strip-emdash.mjs docs/specs/verktyg-sakra-eller-stretcha.md && node tools/strip-endash.mjs docs/specs/verktyg-sakra-eller-stretcha.md`
Expected: 0 ersättningar.

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.4-scenariojamforelsen-anger-vs-sakrad-avkastning.md docs/specs/verktyg-sakra-eller-stretcha.md
git commit -m "feat(kurs): modul 24.4, scenariojamforelsen + verktygsspec

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Lektion 24.5 (Att säkra eller stretcha: beslutsregeln)

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.5-att-sakra-eller-stretcha.md`
- Read: `docs/case-sources/sivers-2026.md` (dispositionseffekt-källa)

- [ ] **Step 1: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.5"
titel: "Att säkra eller stretcha: beslutsregeln"
niva: "Avancerad"
ordning: 2405
fardighet: "Du väljer medvetet mellan att säkra, stretcha och dela, styrt av pris mot värde."
quiz:
  - fraga: "Vad styr valet mellan att säkra och att stretcha?"
    svar:
      - "Förhållandet mellan pris och ditt beräknade värde, plus om tesen håller"
      - "Hur mycket kursen rört sig den senaste veckan"
      - "Om du ligger på plus eller minus mot inköpspriset"
    ratt: 0
    forklaring: "Så länge priset är under värdet och tesen håller kan du stretcha (låta löpa). När priset sprungit förbi värdet lutar det mot att säkra. Kursens korta rörelse och ditt inköpspris ska inte styra."
  - fraga: "Vad är 'house money'-villan?"
    svar:
      - "Tanken att en orealiserad vinst är gratis pengar man kan riskera vårdslöst"
      - "Att man alltid ska återinvestera utdelningar"
      - "Att kasinon ger bättre odds än börsen"
    ratt: 0
    forklaring: "En orealiserad vinst är lika verklig som insatt kapital; att kalla den 'husets pengar' är ett mentalt trick girigheten använder för att motivera att hålla för länge."
  - fraga: "Vad säger dispositionseffekten, och var gäller den inte fullt ut?"
    svar:
      - "Investerare tenderar att sälja vinnare för tidigt och hålla förlorare för länge; parabeln på luft är undantaget där det ändå är rätt att säkra"
      - "Investerare säljer alltid för sent"
      - "Effekten gäller bara professionella förvaltare"
    ratt: 0
    forklaring: "Dispositionseffekten (att realisera vinster för tidigt) varnar generellt för att sälja vinnare. Men en parabolisk uppgång utan vinstunderlag (24.3) är just det fall där disciplinen säger säkra ändå, tesen bär inte priset."
  - fraga: "Varför är en trim-trappa ofta ett bra svar?"
    svar:
      - "Den låter dig säkra stegvis medan priset stiger, utan att behöva pricka toppen"
      - "Den garanterar att du säljer på högsta kursen"
      - "Den eliminerar all risk i positionen"
    ratt: 0
    forklaring: "Att trimma i steg vid förutbestämda nivåer tar bort behovet av att träffa toppen och håller girigheten borta från beslutet, du följer en regel i stället för en känsla."
---
```

- [ ] **Step 2: Skriv brödtexten (700 till 1600 ord, sex H2-sektioner)**

Beats:
- `## Varför det spelar roll`: Scenariojämförelsen (24.4) gav dig vägningen; nu behöver du en beslutsregel du kan följa utan att förhandla med dig själv i stunden.
- `## Så fungerar det`: Regeln: pris mot värde styr. Under värdet med intakt tes: stretcha (låt löpa). Klart över värdet: säkra, ofta genom att trimma. Introducera trim-trappan (säkra stegvis vid förutbestämda nivåer). Förklara house money-villan. Väv in dispositionseffekten som citerad forskning, med nyansen mot parabelfallet (24.3).
- `## Hur en erfaren investerare tänker`: Han bestämmer regeln i förväg och följer den. Han vet att viljan att pricka toppen är girighet förklädd till skicklighet. Han föredrar en trappa som gör honom immun mot att behöva ha rätt om timingen.
- `## Exempel`: Illustrativt fall: en position över värde där investeraren lägger en trim-trappa (säkra en tredjedel vid nivå A, en till vid nivå B) och jämför utfallet mot att hålla allt och mot att sälja allt. Visa att trappan är robust mot flera scenarier.
- `## Vad du letar efter och vad som varnar`: Varnar: du skjuter upp att säkra för att "pricka toppen", du kallar vinsten gratis, du håller en parabel på luft. Sunt: en förbestämd trim-regel, säkring styrd av pris mot värde.
- `## Checklista och övning`: Övning: skriv en trim-trappa för ett innehav (nivåer och andelar), och en mening om när du i stället skulle stretcha.

Länka 18.3 (trimma vs sälja hela), 16.6, 16.7, 24.3, 24.4. Inga em-dash/en-dash.

- [ ] **Step 3: Verifiera struktur och dashfrihet**

Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK`.
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.5-att-sakra-eller-stretcha.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.5-att-sakra-eller-stretcha.md`
Expected: 0 ersättningar.

- [ ] **Step 4: Commit**

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.5-att-sakra-eller-stretcha.md
git commit -m "feat(kurs): modul 24.5, att sakra eller stretcha

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Lektion 24.6 (Syntes: så håller du girigheten i schack)

**Files:**
- Create: `src/content/kurs/24-girighet-och-att-sakra-avkastning/24.6-syntes-sa-haller-du-girigheten-i-schack.md`

Format `syntes`: undantas struktur- och quizgrinden, men följ formen hos en befintlig syntes (läs `src/content/kurs/16-investeringspsykologi/16.10-syntes-sa-hanger-del-5-ihop.md`). Ingen quiz krävs.

- [ ] **Step 1: Läs en befintlig syntes**

Läs `src/content/kurs/16-investeringspsykologi/16.10-syntes-sa-hanger-del-5-ihop.md` för formen.

- [ ] **Step 2: Skriv frontmatter**

```yaml
---
del: "Girighet och att säkra avkastning"
modul: 24
modulTitel: "Girighet och att säkra avkastning"
lektion: "24.6"
titel: "Syntes: så håller du girigheten i schack"
niva: "Avancerad"
ordning: 2406
fardighet: "Du har en förbestämd rutin som håller girigheten utanför säljbeslutet."
format: "syntes"
---
```

- [ ] **Step 3: Skriv brödtexten**

Följ syntesformen (fri, ingen tvingad sektionsmall). Knyt ihop modulen: girigheten som rädslans tvilling (24.1), önsketänkandet som dess arbetssätt (24.2), det paraboliska mönstret och klockorna (24.3), scenariojämförelsen som motgift (24.4) och beslutsregeln säkra/stretcha/dela (24.5). Koppla utåt till 18.3 (bevaka, ompröva, sälja) och modul 16 (systemet). Avsluta med en kort, förbestämd rutin läsaren kan följa. Inga em-dash/en-dash.

- [ ] **Step 4: Verifiera dashfrihet och att grinden accepterar syntes**

Run: `node tools/check-structure.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning`
Expected: `✓ struktur OK` (syntesen undantas, övriga fem fortsatt gröna).
Run: `node tools/strip-emdash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.6-syntes-sa-haller-du-girigheten-i-schack.md && node tools/strip-endash.mjs src/content/kurs/24-girighet-och-att-sakra-avkastning/24.6-syntes-sa-haller-du-girigheten-i-schack.md`
Expected: 0 ersättningar.

- [ ] **Step 5: Commit**

```bash
git add src/content/kurs/24-girighet-och-att-sakra-avkastning/24.6-syntes-sa-haller-du-girigheten-i-schack.md
git commit -m "feat(kurs): modul 24.6, syntes sa haller du girigheten i schack

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Fullständig grindkörning, statusnotis och slutcommit

**Files:**
- Modify: `CLAUDE.md` (statusavsnitt: notera modul 24 tillagd, Fokus-transform kvarstår)

- [ ] **Step 1: Kör alla grindar**

Run: `npm run check`
Expected: alla grindar gröna (integritet, referenser, struktur, dedup). Åtgärda eventuella referens- eller strukturavvik i lektionerna tills grönt.
Run: `npm run test:tools`
Expected: alla tester gröna.

- [ ] **Step 2: Bygg för att fånga schema- eller renderingsfel**

Run: `npm run build`
Expected: bygget lyckas, modul 24 och dess del dyker upp i trädet utan fel. (Redigera aldrig `dist/`.)

- [ ] **Step 3: Uppdatera statusnotis i CLAUDE.md**

Lägg till i innehållsstatusavsnittet en rad om att modul 24 ("Girighet och att säkra avkastning", 6 lektioner) tillagts 2026-07-08, med Sivers-case (källa `docs/case-sources/sivers-2026.md`) och verktygsspec (`docs/specs/verktyg-sakra-eller-stretcha.md`). Notera under "Att notera" att modul 24 ännu inte transformerats till Fokus-JSON. Uppdatera lektions/modulräkningen (nu 127 lektioner / 24 moduler). Inga em-dash/en-dash.

- [ ] **Step 4: Slutcommit**

```bash
git add CLAUDE.md
git commit -m "docs(status): modul 24 tillagd, Fokus-transform kvarstar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (ifylld)

**Spec-täckning:** Alla sex lektioner i specen har en task (2 till 7). Sivers-källfil (Task 1), flaggskeppsram + verktygsspec (Task 5), grindar + statusnotis + Fokus-notering (Task 8). Citerad forskning fångas i Task 1 och används i 24.3/24.5. Alla specavsnitt täckta.

**Placeholder-scan:** Inga TBD/TODO i tasksen. Sektionsbeats och quizfrågor är konkreta. Sivers-tal medvetet delegerade till Task 1 (får inte skrivas overifierat), vilket är en regel, inte en platshållare.

**Typkonsistens:** `del` och `modulTitel` identiska i alla sex frontmatter. `ordning` 2401 till 2406 i följd. Filnamn matchar `lektion`-numren. Sökvägar konsekventa. Grindkommandon pekar på rätt modulmapp. Öppna frågor (verktygsrekommendation, exakt Sivers-set, modultitel) korrigeras efter utkast enligt användarens "kör så korrigerar vi sen".
