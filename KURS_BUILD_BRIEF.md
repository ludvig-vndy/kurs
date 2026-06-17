# Build-brief: Kursplattform för fundamental analys

Det här är en brief för att scaffolda kurssajten. Innehållet (lektionerna) skrivs separat som markdown. Du bygger skalet som renderar dem.

## Mål

En statisk kurssajt, hostad på Cloudflare Pages. Allt innehåll är markdown, en fil per lektion. Sidebar och navigering ska **genereras automatiskt från innehållet**, så att man lägger till en lektion bara genom att lägga en ny markdown-fil i rätt mapp. Inget manuellt arbete per lektion i UI:t.

## Rekommenderad stack

Astro med content collections och static output, deploy till Cloudflare Pages.

Skäl: content collections mappar en markdown-mapp till sidor automatiskt, validerar frontmatter mot ett schema, och låter sidebaren byggas genom att querya kollektionen. Det är precis det här use caset. Pre-renderat, så inga CORS-problem med att hämta markdown klientsidan, och snabb på Cloudflare.

Byt gärna om du ser en bättre fit, men håll det enkelt och utan tung runtime. Ingen databas, ingen CMS.

## Mappstruktur

```
src/content/kurs/
  01-investeringsfilosofi/
    1.1-vad-det-innebar-att-aga-en-aktie.md
    1.2-pris-vs-varde.md
    ...
  02-affarsmodeller/
    ...
  16-investeringspsykologi/
    ...
```

Modulmapparna är numrerade för sortering. Lektionsfilerna namnges efter lektionsnummer och slug.

## Lektionskonvention (frontmatter)

Varje lektion har den här frontmattern. Definiera ett content collection-schema som validerar den:

```yaml
---
del: "Grunden"                 # vilken av de sex delarna
modul: 1                        # modulnummer (int)
modulTitel: "Investeringsfilosofi och tankesätt"
lektion: "1.1"                  # string, för visning
titel: "Vad det innebär att äga en aktie"
niva: "Nybörjare"               # Nybörjare | Mellan | Avancerad
ordning: 101                    # int, för sortering (modul*100 + lektionsindex)
fardighet: "Du kan formulera vad du faktiskt köper när du köper en aktie."
---
```

Body är ren markdown med H2-rubriker (`##`) som sektioner. Sektionsuppsättningen kan variera något mellan lektioner, så rendera bara markdownen som den är. Lås inte sektionerna i koden.

## UI-krav

**Sidebar (genererad från kollektionen):**
- Grupperad hierarkiskt: Del → Modul → Lektion.
- Hopfällbara moduler.
- Markerar aktuell lektion.
- Visar en liten "klar"-indikator per lektion (se progress nedan).

**Lektionsvy:**
- Titel överst, med en liten badge för nivå.
- En framträdande ruta högst upp med `fardighet`: "Det här kan du efter lektionen: ..."
- Sedan den renderade markdownen.
- Prev/Next-navigering längst ned (föregående och nästa lektion i ordningen).

**Progress:**
- En "Markera som klar"-knapp per lektion.
- Sparas i localStorage (bockstatus per lektion-slug).
- Speglas i sidebaren som bock.
- Detta funkar live först när sajten är hostad eller körs via dev-server, inte vid statisk filöppning. Det är okej.

**Responsivt:**
- Sidebar fällbar på mobil (hamburgmeny).

## Design

Premium och lugnt. Det här är en seriös investeringskurs, inte en blogg. Prioritera läsbarhet för långläsning:

- Generös radhöjd, begränsad radlängd (runt 65 till 75 tecken i brödtext).
- Bra typografi, tydlig rubrikhierarki.
- Stramt och distraktionsfritt. Få accentfärger.
- Ljust läge räcker att börja med. Lägg gärna in en mörkt-läge-toggle om det är billigt.

## Hosting

Cloudflare Pages. Sätt upp build command och output directory för stacken du väljer, och dokumentera dem kort i en README så deploy är reproducerbar.

## Vad du INTE ska göra

- Skriv inget lektionsinnehåll. Det kommer som markdown-filer.
- Lås inte sektionsrubriker i koden.
- Bygg inget inloggnings- eller betalningsflöde. Det här är en innehållssajt.

## Första filen att testa mot

Det finns en färdig lektion (`1.1-vad-det-innebar-att-aga-en-aktie.md`) som följer konventionen ovan. Lägg den i `src/content/kurs/01-investeringsfilosofi/` och bygg skalet runt den. När den renderar snyggt med sidebar, fardighet-ruta och prev/next är grunden klar.
