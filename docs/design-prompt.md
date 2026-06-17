# Design-prompt — Fundamental aktieanalys

En återanvändbar prompt + designsystem för att generera nya sidor, komponenter
eller grafik som matchar plattformen. Klistra in i ditt designverktyg (v0, Figma
AI, Claude/GPT, etc.) och beskriv vad du vill ha — referera till tokens nedan.

---

## Master-prompt (kopiera)

> Designa [BESKRIV KOMPONENT/SIDA] för en premium svensk onlinekurs i
> **fundamental aktieanalys**. Tonen är **dyr, lugn och seriös** — som en
> kvalitetsbok mött av Stripe/Linear-precision, inte en flashig consumer-app.
> Fokus är läsbarhet och lärande; rörelse och dekor får aldrig stå i vägen för
> innehållet.
>
> **Känsla:** institutionellt förtroende, redaktionellt lugn, gott om luft,
> få accentfärger. Mörkt läge är default.
>
> **Färg (mörkt, default):** bakgrund `#131619`, upphöjda ytor `#181c20`/`#1b2024`,
> text `#e6e5df`, dämpad text `#9aa0a0`, kant `#2a3036`, accent (teal) `#4fb89e`.
> **Färg (ljust):** varmt papper `#fbfbf9`, text `#1f1e1b`, accent `#0f6e5c`.
> Använd accenten sparsamt: länkar, aktiv nav, progress, primär knapp. Grön/röd
> bara för quiz rätt/fel.
>
> **Typografi:** brödtext i serif (Source Serif 4), ~19px, radhöjd 1.6, radlängd
> max ~65 tecken. UI, rubriker, siffror och etiketter i sans (Inter). Tabulära
> siffror för finansdata. Tighta radhöjder på rubriker (~1.15).
>
> **Form & rytm:** radie 6–16px, mjuka 1px-kanter snarare än tunga skuggor,
> generös spacing (4/8/12/16/24/32/48/64). Upphöjning via ljusare yta i mörkt
> läge, inte slagskuggor.
>
> **Rörelse:** subtilt och snabbt. Mikrointeraktioner 150 ms, komponenter 250 ms,
> `ease-out` in. Innehåll fadar + glider in (translateY 12px→0) när det scrollas
> in. Inga studsiga fjädrar, ingen rörelse som fördröjer användaren. Allt ska
> respektera `prefers-reduced-motion`.
>
> **Undvik:** rent svart/vitt (#000/#fff), klargröna/blå default-länkar, mer än
> två typsnitt, justerad text, confetti/leaderboards/maskotar, tunga skuggor,
> långa eller dekorativa animationer.

---

## Designtokens (sanningskällan)

Dessa speglar `src/styles/tokens.css`. Referera till variabelnamnen.

### Färg — mörkt (default)
| Token | Värde | Användning |
|---|---|---|
| `--bg` | `#131619` | sidbakgrund |
| `--bg-elev` | `#181c20` | kort, paneler |
| `--surface` | `#1b2024` | quiz, callouts |
| `--surface-2` | `#232a30` | spår, fält |
| `--text` | `#e6e5df` | brödtext |
| `--text-muted` | `#9aa0a0` | sekundär text |
| `--text-faint` | `#6c7376` | etiketter, metadata |
| `--border` | `#2a3036` | kanter, avdelare |
| `--accent` | `#4fb89e` | accent (teal) |
| `--accent-contrast` | `#07120f` | text på accent |

### Färg — ljust
| Token | Värde |
|---|---|
| `--bg` | `#fbfbf9` |
| `--bg-elev` | `#ffffff` |
| `--surface` | `#f4f3ee` |
| `--text` | `#1f1e1b` |
| `--text-muted` | `#6b6a63` |
| `--border` | `#e5e3db` |
| `--accent` | `#0f6e5c` |

### Semantik (båda teman)
| Token | Ljust | Mörkt | Användning |
|---|---|---|---|
| `--ok` | `#1f7a55` | `#5fc191` | quiz rätt |
| `--err` | `#b23b3b` | `#e58a8a` | quiz fel |

### Typografi
- Serif: **Source Serif 4** → brödtext (`--text-md` ≈ 19px, radhöjd `1.62`)
- Sans: **Inter** → UI, rubriker, siffror
- Skala (~1.2): 0.79 / 0.889 / 1.0 / 1.19 / 1.33 / 1.6 / 1.92 / 2.31 rem
- Radlängd brödtext: `--measure: 65ch`

### Form & rörelse
- Radie: 6 / 10 / 16 / 999px
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- Tider: `--dur-micro 150ms`, `--dur-comp 250ms`, `--dur-reveal 520ms`
- Easing: `--ease-out cubic-bezier(0.16,1,0.3,1)`, `--ease-standard cubic-bezier(0.4,0,0.2,1)`

---

## Grafik & diagram (för lektionsbilder)

När du genererar illustrationer, grafer eller diagram till lektionerna:

- Platt, redaktionell stil. Tunna linjer, gott om luft, inga gradient-tunga 3D.
- Paletten ovan: neutral bas + teal som enda accent. Grön/röd endast för
  semantik (upp/ner, rätt/fel) — sparsamt.
- Linjer/axlar i `--text-faint`/`--border`; dataserier i `--accent` (en serie)
  eller accent + en neutral (två serier).
- Tabulära siffror, tydliga etiketter, ingen visuell brus-dekor.
- Leverera gärna både en mörk och en ljus variant (eller transparent PNG/SVG
  som funkar mot båda bakgrunderna).
- Animera in dem mjukt på sidan (sköts redan av reveal-on-scroll — lägg bara
  bilden i markdownen).
