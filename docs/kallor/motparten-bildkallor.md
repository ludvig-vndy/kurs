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
| Kapitel 2, Trygghet och risk | Profil vid ett fönster, svartvitt. Ögonblicket innan man bestämmer sig. | Demeter Attila | 59196 | https://www.pexels.com/photo/man-standing-in-front-of-window-59196/ |
| Kapitel 3, Nyfikenhet | Två personer i fåtöljer, mitt i ett samtal. | cottonbro studio | 7964139 | https://www.pexels.com/photo/two-people-sitting-and-talking-7964139/ |
| Kapitel 5, Lyssnande | Gråskala, en ring av stolar, en person sedd bakifrån mot dem som talar. Släkt med crownbilden. | cottonbro studio | 5711372 | https://www.pexels.com/photo/grayscale-photo-of-people-sitting-on-chairs-5711372/ |
| Kapitel 7, Värde | Två personer över samma dokument, den ena visar. | Mikhail Nilov | 5918192 | https://www.pexels.com/photo/colleagues-looking-at-a-document-5918192/ |
| Kapitel 8, Beslut och friktion | Gråskala, fem personer vid ett konferensbord sett genom glas. Rummet där beslutet fattas. | Christina Morillo | 1181735 | https://www.pexels.com/photo/grayscale-photography-of-man-and-woman-sitting-on-chair-1181735/ |
| Kapitel 9, Integritet | Svartvit arkad, två personer i ett eget samtal vid sidan om. | Life Of Pix | 1299394 | https://www.pexels.com/photo/two-persons-talking-to-each-other-on-hallway-1299394/ |

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

Kapitel 4, 6, 10 och 11 saknar bild. `KapitelSida.astro` kontrollerar om filen
finns och ritar annars det graverade märket ur `KapitelPlate.astro`, så inget
kapitel står med tom bakgrund medan man letar. Lägg bara filen på plats med rätt
namn, så byter kapitlet till foto vid nästa bygge.

## Om urvalet

Träffsäkerheten är låg. Av femton kandidater som hämtades och granskades
godkändes sex. Det som fälldes var nästan alltid samma sak: iscensatta
kontorsscener med påhittade diagram, glada team runt en surfplatta, engelsk text
i bild, eller ett register som drog åt sorg i stället för yrke. Räkna med att
titta på tre bilder per kapitel som blir kvar.
