# Bildkällor: Motparten

Kapitelbilderna i `public/bilder/motparten-kapitel-N.jpg`. Alla från Pexels, fri
kommersiell licens utan krav på attribution. Krediten står här ändå, så frågan
"varifrån kommer den här bilden" går att besvara utan att gräva i JPEG-metadata.

Bilderna är hämtade beskurna från Pexels CDN i 1600 gånger 560, alltså den form
kapitelhuvudet faktiskt använder. Ingen efterbehandling i repot: gråskalan och
pappersfaden ligger i CSS, inte i filen.

| Yta | Motiv | Fotograf | Pexels-id | Sida |
| --- | --- | --- | --- | --- |
| Kursöversikt, crown | Svartvit rumsscen, en person sedd bakifrån mot dem som sitter mittemot. Vyn över din egen axel mot den andra sidan, alltså kursens namn. | Vinicius Quaresma | 29390067 | https://www.pexels.com/photo/black-and-white-group-discussion-scene-29390067/ |
| Kapitel 0, Glöm det du lärt dig | Tomma stolar vid ett fönster, svartvitt. Rummet innan någon satt sig, alltså att göra plats. | Laura Cleffmann (@cloudett) | 20297117 | https://www.pexels.com/photo/empty-chairs-in-an-office-20297117/ |
| Kapitel 1, Förtroende | Två personer vid ett bord, en lyssnar. Ett samtal, inte en handskakning. | LinkedIn Sales Navigator | 1251860 | https://www.pexels.com/photo/two-men-talking-while-sitting-beside-table-1251860/ |

Crownbilden ligger i `public/bilder/motparten-crown-1600.jpg` och sätts genom
`--leadprint` i `src/styles/motparten.css`. Regeln i `broadsheet.css` har
börshuset som standardvärde, så Marginalen är oförändrad.

## Urvalsregel

Bilden ska visa en situation, inte en symbol. Undvik det som säljbildbanker är
fulla av: handslag, headset, kostymer som pekar på uppåtgående grafer,
tummen upp. En människa som lyssnar säger mer om kursen än ett handslag gör.

Bilden hamnar i kapitelhuvudets högra, textfria halva och behandlas med gråskala
och en pappersfade, så motivet ska tåla att tappa färg och kontrast. Svartvita
och lågmälda bilder fungerar bättre än mättade.

## Kapitel utan bild

Kapitel 2 till 11 finns ännu inte. När de skrivs behöver de varsin bild enligt
samma regel. Saknas filen renderas kapitelhuvudet utan bakgrund, vilket fungerar
men ser tunnare ut.

Alternativet finns kvar i koden: `src/components/kurs/KapitelPlate.astro` ritar
ett graverat linjeraster ur kapitelnumret, utan bildfil. Det slås på genom att
sätta `plate: 'tryck'` för kursen i `src/lib/kurs.mjs`.
