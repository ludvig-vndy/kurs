# Mager lektionsmall (FRYST indata för omskrivningen)

Den här mallen ersätter den gamla tiostegsmallen. Mål: mindre redundans, varierad
rytm, premium mentor-ton. Strukturgrinden (`tools/check-structure.mjs`) upprätthåller den.

## Obligatoriska sektioner (innehållslektioner, `format: standard`)

En innehållslektion ska ha dessa sex H2-sektioner (formuleringen får varieras något,
grinden matchar på nyckelord):

```markdown
## Varför det spelar roll
Kort krok, gärna en berättelse. Vad förlorar/vinner en ägare på att förstå detta?

## Så fungerar det
Koncept enkelt → fördjupning till proffsnivå, i ETT spår. Länka till formelbilagan
i stället för att omdefiniera formler.

## Hur en erfaren investerare tänker
Andra ordningens tänkande, ägarperspektiv, vanliga fallgropar i resonemanget.

## Exempel
Siffror ELLER ett namngivet, daterat verkligt fall. Aldrig uppfunna bolagssiffror
(se stilguidens sifferpolicy).

## Vad du letar efter och vad som varnar
Slår ihop gröna flaggor, röda flaggor och vanliga misstag till EN vass lista.

## Checklista och övning
Kort checklista + en konkret praktisk övning.
```

## Längd och format

- Innehållslektion: **700–1600 ord**.
- Synteslektioner: frontmatter `format: "syntes"` — undantas från sektionskraven,
  ska vara en *integrerande övning*, inte passiv sammanfattning.
- Referenssidor (formelbilaga): `format: "referens"` — undantas helt.

## Bannlysta mallfraser (grinden fäller dem)

Dessa återkom mekaniskt i den gamla mallen och får inte förekomma:

- "Samma sak, motsatta" / "Samma X, motsatta"
- "Det är därför"
- "En konkret kontrast: ett annat bolag"
- "Tecknet: fråga"

Greppet "två identiska bolag, en variabel" får användas — men selektivt, inte i varje lektion.
