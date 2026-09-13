# Grävande kundpilot

Godkänd riktning: Ludvigs kör den 14 september. Bas: 2253ea7.
Spec: docs/superpowers/specs/2026-09-12-fraga-researchpilot-design.md i huvudarbetsytan.

Mål: samma chattflöde, postkontroller och rendering med dynamisk extern hämtning i en lokal testchatt. Produktion påverkas inte. Nycklar stannar på servern.

## Leveranser

- [ ] Säker begränsad läsning av publika HTML-original. DNS/IP och varje redirect kontrolleras, bytes och tid begränsas. Testa privata adresser, överstor sida och omdirigering.
- [ ] Requestlokala forskningsverktyg: sökträffar blir kandidater, enbart läst originaltext blir registerposter. Fulla dokument behålls och ytterligare textfönster kan läsas. Tre sökningar, sex dokument, inga fria URL:er från modellen. Testa att sökutdrag aldrig blir faktaposter.
- [ ] Serverägd pilotkoppling i befintlig fraga.js, av utan lokal callback. Befintlig slutkontroll och rendering används. Fördjupat läge används i jämförelsens båda varianter.
- [ ] Lokal testchatt med synlig baslinje/pilot, verkliga statusmeddelanden, signerat samtal och sparade fulla resultat. Anthropic används när lokal nyckel finns; ingen tyst modellväxling.
- [ ] Kompletta offentliga utvecklingsfrågor: Unibap/Bifrost, Sivers/POET, AAC/sjöfart, samt fråga med obestyrkt orderpremiss. Samma input till båda varianter, två upprepningar. Manuell sakgranskning av svar, källor, tid och kostnad. Inga procentsatser om generaliserad kvalitet.

Baslinjens dokumentpaket ska låsas och beskrivas. Tomt eller manuellt paket får inte kallas produktionens underlag. Modellskillnader redovisas som separat experiment. Om Anthropic inte finns lokalt kan GitHub-provet använda sin befintliga hemlighet; den får inte exporteras till provresultat.

Provbudget: högst 2 USD innan första sammanställning; därefter nytt internt kvalitetsbeslut inom redan godkänd billig provning. Sökverktygets användningsestimat är inte leverantörens hårda fakturatak. Resultat med okänd usage får ingen påhittad kostnad.

Godkänt svar kräver relevant läst externt original, bevarad viktig bolagsroll, användbar villkorad slutsats och inga obelagda order-/leverantörsöverföringar. Rätt vägran av obestyrkt premiss ska fortfarande besvara vad som faktiskt kan beläggas. Alla felaktiga blockeringar och faktabortfall redovisas.
