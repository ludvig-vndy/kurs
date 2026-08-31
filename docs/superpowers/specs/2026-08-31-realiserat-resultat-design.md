# Realiserat resultat: design

**Datum:** 2026-08-31
**Status:** spec, ej byggd.
**Upphov:** Sebastians observation, 2026-08-31: "man får inte översikt över sin utveckling
i verktyget om man säljer av något. Sivers syns inte riktigt i siffrorna."
**Hör ihop med:** `supabase/migrations/20260829120000_transaktioner-harledd-position.sql`
(huvudboken), `src/content/kurs/24-girighet-och-att-sakra-avkastning/` (modul 24),
`docs/specs/verktyg-sakra-eller-stretcha.md` (räknaren som saknar verkliga tal)

---

## 0. Vad mätningen visade

### Sebastian har rätt, och det går att peka på raden

`public/labs/dina-bolag.html:587` filtrerar portföljsumman på
`x.h.quantity != null && x.h.gav != null`. Migrationen sätter `gav = null` när antalet går
till noll. **Ett helt sålt innehav faller därmed ur alla siffror.**

I skarp data finns exakt det fallet: innehavet `3de99510` (Sivers Semiconductors) har
`quantity = 0`, `gav = null`.

### Migrationen ser körd ut

Innehavet har åtta affärsrader och en position som är precis vad `recalc_holding` producerar
för en huvudbok utan köp (`q` klampas till 0, `gav` blir null). Det andra Sivers-innehavet,
utan affärer, ligger orört med sin manuella position, vilket också är migrationens avsedda
beteende.

Det är stark indikation, inte bevis. Definitiv kontroll i SQL-editorn:

```sql
select tgname from pg_trigger where tgrelid = 'decisions'::regclass;
```

`trg_decisions_recalc` ska finnas.

### Blockeraren: det finns ingen anskaffningskostnad

Hela `decisions` i produktion innehåller **8 rader, alla `salj`, alla samma användare, alla
Sivers.** 125 554 aktier sålda i åtta poster. **Noll köp i hela databasen.**

Utan köp finns ingen kostnadsbas, och utan kostnadsbas går realiserat resultat inte att
räkna. Funktionen Sebastian ber om är alltså inte blockerad av kod, den är blockerad av
saknad data, och det gäller just det innehav som utlöste frågan.

`decision_kind` är `('kop','salj','folj')`. Det finns ingen typ för ingående balans, och det
behövs inte: en ingående position **är** ett köp, aggregerat.

---

## 1. Vad funktionen är

Tre tal på portföljsidan i stället för ett:

| Tal | Betyder |
| --- | --- |
| Orealiserat värde | vad du äger i dag, mot GAV |
| Realiserat resultat | vad du redan har tagit hem, per period |
| Summa | de två tillsammans |

Plus att stängda innehav får en egen rad i stället för att försvinna.

Sebastians formulering, "du har xxxx i säkrad avkastning som ingen kan ta ifrån dig i år",
är rätt känsla men fel etikett. Se avsnitt 5.

---

## 2. Varför, och varför nu

Som produkten står i dag visar den bara orealiserat värde. **När du säkrar en vinst blir
ditt tal mindre.** Gränssnittet belönar att hålla och bestraffar att sälja.

Modul 24 heter *Girighet och att säkra avkastning*, och 24.4 heter ordagrant
*scenariojämförelsen: ånger vs säkrad avkastning*. Sebastian använde kursens egen term utan
att veta om det. **Verktyget motsäger just nu sin egen kursplan**, och det är ett tyngre skäl
att bygga det här än att någon efterfrågade det.

Funktionen kräver dessutom ingen extern datakälla, ingen modell och ingen ny beräkningsmetod.
Snittkostnadsmetoden finns redan i `recalc_holding`.

---

## 3. Gaten: ingående position

Utan den här delen är resten meningslös.

**Formen:** en `kop`-rad med `decided_at` = förvärvsdatum eller ett valt startdatum,
`quantity` = antalet du hade då, `price` = ditt snittpris då, och `reason` = "ingående
position".

**Ytan:** på ett innehav som har säljrader men inga köp visas en uppmaning i stället för ett
resultattal. Ungefär: "Du har sålt i det här innehavet, men vi vet inte vad du betalade. Fyll
i vad du ägde och till vilket snittpris när du började, så kan vi visa vad du tagit hem."

**Provenance:** `reason` skiljer en ingående position från en verklig affär. Skillnaden är
verklig: en ingående position är användarens uppskattning, en affär är ett faktum. Ett
resultat som vilar på en uppskattad ingång ska märkas som ungefärligt i ytan.

**Vad som inte får göras:** systemet får aldrig gissa en kostnadsbas. Inte ur kurshistorik,
inte ur ett antaget inköpsdatum, inte ur något. Saknas ingången saknas talet, och ytan säger
varför.

---

## 4. Beräkningen

### Var den bor

Realiserat resultat **lagras per säljrad**, i en ny kolumn `decisions.realiserat`, skriven av
den befintliga triggern.

Skälet: `recalc_holding` replayar redan hela huvudboken vid varje ändring och räknar fram
snittet i loopen, men kastar det. Att i samma pass skriva
`realiserat = quantity * (price - snitt)` på varje säljrad kostar ingenting extra.

Fördelarna mot alternativen:

- **Mot att räkna i webbläsaren:** talet skulle behöva räknas om i motorn också, för brevet,
  och två implementationer av samma pengabelopp driver isär. Det här är pengar, inte pynt.
- **Mot ett totalt saldo på `holdings`:** ett lagrat totalbelopp kan inte skivas per period.
  Med resultatet på säljraden är "i år" en vanlig `sum` med ett datumfilter, och "förra året"
  och "sedan start" är samma fråga med annat filter.

Läggs ett köp till i efterhand ändras alla senare säljrader. Triggern replayar redan allt vid
varje ändring, så den skriver om samtliga i samma pass. Ingen särskild logik behövs.

### Metoden

Samma snittkostnadsmetod som redan gäller, oförändrad. Säljraden sänker antalet men inte
snittet. Realiserat på raden är `antal * (pris - snittet strax före affären)`.

Har innehavet säljrader men inget köp skrivs `realiserat = null`, inte noll. **Noll och
"vet inte" är olika saker**, och ytan måste kunna skilja dem åt.

### Talens ursprung

Allt är användarens egna affärer, räknat i SQL. Ingen modell är inblandad. Nämns talet i
morgonbrevet är det ett kodräknat tal som vitlistas på samma sätt som härledningarna i
`functions/api/_nyckeltal.js`, aldrig något modellen får räkna fram.

---

## 5. Språket och de två gränserna

### Etiketten

**"Realiserat resultat", inte "säkrad avkastning som ingen kan ta ifrån dig".**

Realiserad vinst är skattepliktig, och en ISK beskattas på ett helt annat sätt än en depå.
Kursens sifferpolicy säger att skatteregler ges som mekanism, aldrig som fryst tal. Ytan får
alltså inte antyda att talet är efter skatt, och ska inte räkna på skatt alls.

Formuleringen "ingen kan ta ifrån dig" får finnas som förklarande text intill, aldrig som
etikett på talet.

### Det får inte bli en poängtavla

Ett tal som växer när du säljer kan lära ut att sälja vinnare för tidigt. Det är
dispositionseffekten, och det är ett lika dyrt fel som girigheten modul 24 varnar för.

Därför: **det realiserade talet står alltid bredvid det orealiserade, aldrig i stället för.**
Två tal som tillsammans säger vad du äger och vad du redan tagit hem. Ingen rangordning,
ingen målsättning, ingen jämförelse mot index, och ingen formulering som gör talet till
något att maximera.

---

## 6. Ytan

**Portföljsidan.** Tre tal enligt avsnitt 1. Sålda innehav i en egen sektion, "Stängda
innehav", med namn, realiserat resultat och när det stängdes.

**Bolagssidan.** Realiserat resultat för det innehavet, under positionsbandet, intill tesen.
Ett stängt innehav behåller sin sida, sin tes och sin historik. Att du sålt betyder inte att
du ska glömma vad du trodde.

**Fixen i `dina-bolag.html:587`.** Filtret får inte längre kasta rader med `gav = null`.
Summan av orealiserat värde ska fortfarande hoppa över dem, men raden ska finnas.

---

## 7. Datakvalitet som måste lösas först

Skarp data har dubbletter som gör varje totalsumma fel:

- Två `Sivers Semiconductors AB (publ)`: en stängd med huvudbok, en med 100 aktier och GAV
  2,12 utan huvudbok.
- Två `Unibap Space Solutions`: en med 101 233 aktier, en helt tom (`quantity` och `gav`
  båda null).

`bevakningslista.mjs` deduplicerar på namn för motorns skull, men portföljsumman gör det
inte. Innan tre tal visas måste det vara avgjort vad som är ett innehav. Antingen en
unikhetsregel per användare och bolag, eller en sammanslagningsyta. Det är inte specat här,
men det blockerar avsnitt 6.

---

## 8. Byggordning

1. **Kolumnen och triggern.** `decisions.realiserat`, `recalc_holding` skriver den, `null`
   när kostnadsbas saknas. Migration som användaren kör.
2. **Ingående position.** Ytan för att fylla i den, och märkningen av ett resultat som vilar
   på en uppskattad ingång.
3. **Dubbletterna.** Avgörs och städas innan några totaler visas.
4. **Portföljsidan.** Tre tal, stängda innehav i egen sektion, filtret i `dina-bolag.html`.
5. **Bolagssidan.** Realiserat per innehav intill tesen.

Steg 1 är meningslöst att verifiera i produktion förrän steg 2 finns, eftersom den enda
huvudboken som existerar saknar köp och därför ger `null`. Testa steg 1 mot fixturer.

---

## 9. Testning

**Beräkningen**
- Köp, köp, delförsäljning: realiserat räknas mot snittet, inte mot första köpet.
- Full försäljning: positionen stängs, realiserat är summan av säljradernas resultat.
- Säljrader utan köp: `realiserat = null` på varje rad, aldrig 0.
- Ett köp läggs till i efterhand: alla senare säljraders realiserat skrivs om.
- En affär raderas: samma sak.
- Köp efter full försäljning: nytt snitt, tidigare realiserat orört.
- Sälj mer än man äger: klampningen gäller och resultatet blir inte negativt av misstag.

**Perioder**
- "I år" summerar bara säljrader med `decided_at` i innevarande år.
- En affär daterad förra året påverkar inte årets tal men väl totalen.
- En rad med `realiserat = null` ingår inte i någon summa och gör inte summan till null.

**Ytan**
- Ett stängt innehav syns i "Stängda innehav" och försvinner inte ur sidan.
- Ett stängt innehav räknas inte in i orealiserat värde.
- Ett innehav utan kostnadsbas visar uppmaningen, inte ett tal och inte en nolla.
- Ett resultat som vilar på en ingående position är märkt som ungefärligt.
- Ingen yta räknar eller nämner skatt.
