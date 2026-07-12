# Skärmkarta och synergier

*2026-07-10. Komplett inventering av alla byggda ytor, hur de kopplas, var de förstärker varandra (synergier), och var det finns överlapp, luckor och legacy att rensa. Underlag inför "en riktig site".*

---

## 1. Inventering (allt som finns)

### A. Ägarbrevet-tjänsten (gröna mockar, public/labs, `*.html`)
**Dagliga ingången**
- `agarbrevet` (Brevet) · morgonbrevet, dagens tre saker
- `brevet-lagen` · showcase: samma brev som tyst dag / larmdag / rapportdag
- `gratisbrevet` · det fria funnel-brevet i Sebastians röst

**Bevakning och bolag**
- `dina-bolag` · bevakningslistan + ambient Fråga
- `bolagshubb` · hela bolagssidan (Telvio): vad hände, vakter, rapport (+ konsensus), fundamenta, ägare/insyn, blankning/utdelning, kalender, täckningslista
- `tillvaxtlaget` · förhoppningsbolag (Voltcell): runway, casetrappa, avtalsliggare, löftesliggare, emissionshistorik, utspädningsvakt, scenarier

**Analys och upptäckt**
- `rapportkollen` · klistra in rapport (+ konsensus-Pro-block) **+ wirad mot motorn (verklig Lifco-data)**
- `upptack` · en dörr, två lägen: momentum + fundamental screener
- `havstang` · warrantsöket (egen dörr, taktisk publik)

**Fördjupning (Pro / fas 3)**
- `fordjupning` · Pro-navet
- `portfoljrontgen` · kvalitativ korsrisk
- `skattehjalpen` · K4/kvittning
- `veckans-avvikelser` · fakta aldrig signal
- `omvarldsbevakningen` · det som rör dina bolag utan att nämna dem

**Disciplin, konto, onboarding**
- `dagboken` · beteendespåret (beslutsdagbok, tvilling, impulsbroms, teskrossare)
- `lagg-till-bolag` · onboarding (4 steg)
- `forsta-gangen` · tomma tillstånd (ny användare)
- `installningar` · leveranstid, kanal, nivå, notiser, språknivå, GDPR (konto = platshållare)
- `fraga` · grundad Q&A över portfölj + kurs

**Ingångar**
- `agarbrevet-landning` · tjänstens marknadssida (trappan, principerna)
- `demo` · guidad genomgång, syr ihop hela sviten moment för moment

### B. Kursen / Marginalen (riktiga Astro-routes)
- `/` landning · `/hem` navet (dashboard) · `/fokus` översikt · `/fokus/kapitel/[nr]` · `/fokus/[lektion]` spelaren (inkl **Kapitel 0**) · `/oversikt` textkurs-arkivet · `/kurs/*` textlektioner · `/ordlista` · `/repetera` (SRS) · `/verktyg` (analysverktyget)

### C. Motor-data (byggtids-JSON)
- `public/labs/data/rapport-lifco.json` (verklig), `rapport-norlux.json` (fiktiv)

### D. Legacy (finns i /labs, ej del av nuvarande svit)
- `hem-navet` (ersatt av `/hem`) · `agar-ai-v2` (gammal monolit, används som *källa*, ej yta) · `agar-ai-resan` (gammal demo, ersatt av `demo`) · `havstangssok-mock` (mörkt, ersatt av `havstang`) · `agarkollen-karta` (föråldrad funktionskarta)

---

## 2. Kopplingsgrafen (vem länkar vem)

**Ryggraden:** varje grön Ägarbrevet-yta har samma 6-post-nav (Brevet · Dina bolag · Rapportkollen · Dagboken · Fråga · Hävstång | Till kursen -> `/fokus`), wordmark -> `/hem`. Kursens sidor har spegel-navet (Hem · Kursöversikt · Analysverktyg · Ordlista | Till Ägarbrevet -> Brevet). Det är de två världsväxlarna.

**De riktade tvärlänkarna (utöver navet):**
- `dina-bolag` -> `bolagshubb` (Telvio), `tillvaxtlaget` (Voltcell)
- `bolagshubb` / `tillvaxtlaget` -> tillbaka till `dina-bolag`; ambient Fråga; klickbara termer -> `/ordlista`
- `fordjupning` -> `upptack`, `portfoljrontgen`, `skattehjalpen`, `veckans-avvikelser`, `omvarldsbevakningen`
- `upptack`, `veckans-avvikelser`, `omvarldsbevakningen`, `portfoljrontgen` -> `dina-bolag` ("Lägg till i Dina bolag" / "Öppna bolaget")
- `rapportkollen` -> motor-JSON (verklig analys), + fördjupningslänkar till kurskapitel
- `agarbrevet` (Brevet) -> `bolagshubb` (larmrader), `/fokus` (Marginal-anteckning), klickbara termer -> `/ordlista`
- `demo` -> alla 12 moment + "Fler vyer" (`brevet-lagen`, `gratisbrevet`, `forsta-gangen`, `installningar`) + Affären -> `landning`
- `landning` -> `demo` (primär CTA), `agarbrevet`, `/fokus`, Pro-nivån -> `fordjupning`
- `gratisbrevet` -> `landning`, `demo`, `/fokus`
- `forsta-gangen` -> `lagg-till-bolag`, `agarbrevet`, `dagboken`, `upptack`
- `installningar` -> `/fokus` (språknivå)
- Kursen: `/hem` -> `dina-bolag`, `agarbrevet`, `/fokus`, `/verktyg`, textkurs-arkivet `/oversikt`

**Naven:** `demo` (samlar allt), `dina-bolag` (bolags-hubben), `fordjupning` (Pro-verktygen), `/hem` (kurs-navet), `/fokus` (kursen).

---

## 3. Synergierna (de förstärkande looparna)

1. **Kurs -> tjänst-flywheelet.** Kursens skäl-övning blir onboarding-data; klickbara termer i brev/bolag -> `/ordlista` -> lektion (Förklara-läget); ett larm kan följas av rätt lektion; tyst dag i brevet ger en Marginal-anteckning ur kursen. Kursen är samtidigt funnel, svarsmotor och språk-nivåväljare. **Ingen konkurrent äger både skolan och tjänsten.**
2. **Upptäck -> äg -> vakta.** `upptack` (momentum + screener) hittar -> "Lägg till i Dina bolag" -> `bolagshubb`/`tillvaxtlaget` granskar och vaktar -> `agarbrevet` sammanfattar. Hela kedjan från idé till bevakat innehav.
3. **En motor, många ytor.** Samma grundnings-motor + citat-arkitektur bakom `rapportkollen`, `bolagshubb` (rapport), `tillvaxtlaget` (utspädning/avtal) och Fråga bolaget. Bygg motorn en gång, återanvänd överallt. (Nu bevisat: verklig Lifco-data i `rapportkollen`.)
4. **Morgonbrevet som fördelare.** `brevet-lagen` visar det: tyst dag -> `/fokus`, larmdag -> `bolagshubb`, rapportdag -> `rapportkollen`. Brevet är den dagliga ingången som skickar dig till rätt detaljyta.
5. **Beteendedata-vallgraven.** `dagboken` (beslutsdagbok, impulsbroms, disciplinerad tvilling) matas av köp-historik + skäl, som kommer från onboarding/kurs. Byggs från dag ett, kan ingen kopiera.
6. **Fråga = ambient bindväv.** Fråga finns kontextmedvetet på `dina-bolag`/`bolagshubb`/`tillvaxtlaget`, som egen yta (`fraga`), och som Förklara-läget i texten. Enda ytan som använder båda husen (kurs + data) i ett svar.
7. **Ett hus, två världar.** Marginalen (oxblod, kurs) och Ägarbrevet (grön, tjänst) delar broadsheet-typografi och speglar varandra med symmetriska världsväxlar. Samma varumärke, olika register.

---

## 4. Överlapp och dubbletter (medvetna vs att bevaka)

- **Rapportkollen (fristående) vs Bolagshubbens "Senaste rapporten".** Båda visar rapportanalys + konsensus-block. Medvetet enligt planen (Rapportkollen = smakprov, blir ett *flöde* i bolagssidan), men konsensus-blocket är nu byggt på två ställen. När det blir riktigt: en delad komponent, inte två.
- **Brevet vs Brevets lägen.** `brevet-lagen` är en meta-vy av `agarbrevet`s varianter. Bra som showcase, men det är samma yta i tre lägen, inte tre ytor.
- **Landning vs demo.** Två ingångar, men kedjade (landning -> demo), så det är en tratt, inte en dubblett.
- **Gratisbrevet vs Brevet.** Fri vs personlig: medveten funnel-split, inte överlapp.

## 5. Luckor (att täppa till)

- **Föräldralösa nyttoytor.** `installningar` och `forsta-gangen` (och delvis `brevet-lagen`, `gratisbrevet`) nås bara via demons "Fler vyer". De saknar en riktig hemvist. **Fix:** en profil/kugghjuls-meny i mastheaden (kommer naturligt med konto-designpasset).
- **Landningen är halvt föräldralös.** Inget i kurs-världen länkar till `landning` (världsväxeln går till Brevet, inte till marknadssidan). Ok för en extern marknadssida, men värt ett medvetet val.
- **Fråga Marginalen (coachen) saknas som yta.** Ambient Fråga + Förklara-läget finns, men "coachen över hela kursen" är inte en egen yta än.
- **Konto/auth finns inte.** Medvetet uppskjutet (eget designpass). Blockerar on-demand och personalisering.
- **On-demand rapport (godtycklig PDF).** Bara byggtids-JSON i dag (kurerad lista). Se kopplingsplanen; noterat som produktens svagaste bit.

## 6. Legacy att pensionera eller arkivera
`hem-navet`, `agar-ai-resan`, `havstangssok-mock`, `agarkollen-karta` är ersatta och bör antingen flyttas till en `/labs/arkiv/`-mapp eller tas bort ur `public/labs` så sviten inte innehåller döda parallellversioner. `agar-ai-v2` behålls som **källa** (UX-facit), men är inte en levande yta.

---

## 7. Rekommendationer, prioriterade
1. **Pensionera legacy** (fyra filer) så kartan är sann. Billigt, minskar förvirring.
2. **Ge `installningar` + `forsta-gangen` en hemvist** via en profil-meny (faller ut av konto-designpasset).
3. **Slå ihop konsensus-blocket** till en delad komponent när Rapportkollen blir ett flöde i bolagssidan.
4. **Bestäm landningens roll** i kurs-världens nav (länka den, eller lämna den som ren extern ingång).
5. Först därefter: konto-designpasset och on-demand-motorn (de två stora återstående spåren).

*Byggd karta, inte gissad: kopplingarna ovan speglar de faktiska länkarna i sviten per 2026-07-10.*
