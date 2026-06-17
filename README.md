# Kursplattform — Fundamental aktieanalys

Statisk, premium kurssajt byggd med **Astro**. Allt innehåll är markdown, en fil
per lektion. Sidebar, navigering och progress genereras automatiskt — lägg till
en lektion genom att lägga en `.md`-fil i rätt mapp. Hostas på Cloudflare Pages
bakom en lösenordsgrind.

Live: **https://kurs-7m8.pages.dev** (lösenord: `kurs2026`)

---

## Kom igång

```bash
npm install
npm run dev        # http://localhost:4321
```

> Obs: lösenordsgrinden och progress/localStorage testas bäst på den hostade
> sajten eller via `wrangler pages dev dist`. `astro dev` kör utan grinden.

## Bygga

```bash
npm run build      # → dist/
npm run preview    # förhandsgranska byggd output
```

## Deploya (Cloudflare Pages)

Projektet heter `kurs` (direkt-upload, ingen Git-koppling).

```bash
npm run build
npx wrangler pages deploy dist --project-name=kurs --branch=main
```

`functions/`-mappen byggs automatiskt in som en Pages Function (lösenordsgrinden).

**Vid Git-baserad deploy i dashboarden istället**, sätt:

- Build command: `npm run build`
- Build output directory: `dist`

---

## Lägga till en lektion

Skapa en markdown-fil under `src/content/kurs/`. Modulmapparna är numrerade för
sortering; lektionsfiler namnges efter lektionsnummer och slug:

```
src/content/kurs/
  01-investeringsfilosofi/
    1.1-vad-det-innebar-att-aga-en-aktie.md
    1.2-pris-vs-varde.md
  02-affarsmodeller/
    ...
```

Filen dyker upp i sidebaren och får en egen sida automatiskt. Frontmattern
valideras vid build (Zod-schema i `src/content.config.ts`) — fel frontmatter
stoppar bygget.

### Frontmatter

```yaml
---
del: "Grunden"                 # vilken av de sex delarna
modul: 1                        # modulnummer (int)
modulTitel: "Investeringsfilosofi och tankesätt"
lektion: "1.1"                  # string, för visning
titel: "Vad det innebär att äga en aktie"
niva: "Nybörjare"               # Nybörjare | Mellan | Avancerad
ordning: 101                    # int, global sortering (modul*100 + index)
fardighet: "Du kan formulera vad du faktiskt köper när du köper en aktie."
---
```

Body är ren markdown. **Lektionen presenteras som ett "deck" av korta steg
(slides)** för bitesized läsning:

- **Varje `##`-sektion blir ett eget steg.** Variera rubrikerna fritt — inget är
  hårdkodat.
- **`---` (horisontell linje) = valfri manuell sidbrytning** inom en sektion, om
  du vill dela upp ett långt parti i flera steg (reveal.js/Slidev-konventionen).
- Långa steg får scrolla internt — innehållet kapas aldrig mitt i en tanke.
- Man rör sig med **Fortsätt/Tillbaka, piltangenter eller progress-prickarna**.
- `- [ ]`-listor renderas som självskattnings-checklistor.

Utan JavaScript faller sidan tillbaka till en vanlig, läsbar artikel (progressiv
förbättring).

### Quiz (valfritt)

Lägg ett `quiz:`-fält i frontmattern. `ratt` som ett tal = ett rätt svar
(radio); `ratt` som en lista = flera rätta (kryssruta, "Välj alla som stämmer").
Index är 0-baserade.

```yaml
quiz:
  - fraga: "Vad köper du när du köper en aktie?"
    svar:
      - "En lapp som rör sig på en skärm"
      - "En ägarandel i ett företag"
    ratt: 1
    forklaring: "En aktie är en ägarandel i ett bolag."
  - fraga: "Vilka stämmer? (Välj alla som stämmer)"
    svar: ["Följ verksamheten", "Sälj vid varje dipp", "Kursen är ett erbjudande"]
    ratt: [0, 2]
    forklaring: "Ägaren följer verksamheten och ser kursen som ett erbjudande."
```

Quizet renderas som en poängsatt kunskapskoll i slutet av lektionen (% rätt,
godkänt vid 80 %, "Försök igen", omedelbar feedback med förklaring).

---

## Funktioner

- **Deck-läge**: lektionen delas i korta steg (ett per `##`-sektion) med mjuka
  slide-övergångar, progress-prickar och tangentbordsnavigering.
- **Auto-genererad sidebar**: Del → Modul → Lektion, hopfällbara moduler,
  markerar aktuell lektion, bockar och modul-/totalprogress.
- **Läsupplevelse**: serif brödtext, begränsad radlängd, lugn typografi.
- **Mörkt läge som default** + toggle (sparas i localStorage).
- **Läsprogress-bar** scopad till lektionstexten.
- **Progress**: "Markera som klar" per lektion (localStorage), speglas i sidebar.
- **Quiz** med poäng, feedback och förklaringar.
- **Reveal-on-scroll**: text, bilder och grafer animerar in mjukt.
- **View Transitions** mellan lektioner. Allt respekterar `prefers-reduced-motion`.
- **Tangentbord**: `←/→` föregående/nästa steg (vid lektionens slut/start hoppar
  de vidare till nästa/föregående lektion), `[` fäll sidebar, `Esc` stäng mobilmeny.

## Lösenordsskydd

Hela sajten ligger bakom en grind i `functions/_middleware.js` (körs på edgen,
så innehållet är skyddat server-side). Lösenordet läses från miljövariabeln
`SITE_PASSWORD`, med fallback `kurs2026`.

**Byta lösenord** (rekommenderat — sätt en hemlighet istället för fallbacken):

```bash
npx wrangler pages secret put SITE_PASSWORD --project-name=kurs
```

---

## Projektstruktur

```
functions/_middleware.js     Lösenordsgrind (Pages Function)
src/
  content.config.ts          Collection-schema (frontmatter + quiz)
  content/kurs/…              Lektioner (markdown)
  lib/course.ts              Bygger trädet, ordning, prev/next, lästid
  layouts/                   BaseLayout, LessonLayout
  components/                Sidebar, Quiz, LessonHeader, PrevNext, m.fl.
  scripts/                   progress.ts (localStorage), theme.ts
  styles/                    tokens.css (designtokens), global.css
  pages/                     index.astro, kurs/[...slug].astro
docs/                        Designspec + design-prompt
```
