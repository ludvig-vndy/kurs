# Kundpilot: byggd koppling, svarjämförelse återstår

Bas: driftsatt 2253ea7. Separat arbetsgren fraga-kundpilot. Ingen produktionsändring eller deploy.

## Vad som finns

Lokal testchatt på samma `onRequestPost`, svarsgranskning, signerade samtal och `FragaSvar`-rendering som produktionen. Baslinje och pilot väljs i gränssnittet. Research är en serverägd callback, inte en flagga som klienten kan aktivera i produktionen. Piloten får söka kandidater och läsa valda HTML-original. Sökutdrag registreras aldrig som fakta.

HTML-läsningen kontrollerar DNS och varje omdirigering, låser destinationens adress, begränsar bytes/tid och behåller dokumenttext, hash och hämtningstid för revision. Endast hela meningsfönster registreras som neutrala dokumentcitat. Publiceringsdatum och avsändare uppfinns inte. Tidigare försök att återanvända motpartstypen och kapa fasta textlängder underkändes i kodgranskningen och är borttagna.

Granskaren får även registrerade externa dokument som generatorn inte valde i svaret. Det är ett underlag för modellgranskning, ingen sanningsgaranti.

## Utförda prov

- Sista hela kodsviten: 681 godkända, 3 överhoppade, inga fel. Fokuserad pilotsvit: 21/21.
- `npm run check` godkänd. Bygge: 278 sidor.
- Lokal webbläsarkontroll: sidan laddar, saknad nyckel ger begripligt fel, knappar återaktiveras, modelltext renderas med befintlig escaping. Signerad följdfråga provad med modellstubbar, inte skarpt.
- Skarpt API-prov 1: sökning 8,934 s, uppskattat 0,02340650 USD. Leverantören returnerade två webbposter trots begärt max_tool_calls=1; första implementationen avvisade resultatet.
- Skarpt API-prov 2 efter korrigerad redovisning: sökning 8,205 s + läsning 0,641 s, 0,02241636 USD. Första hittade kandidaten var Unibaps Bifrost-original. Läsningen bevarade iX5-105, LOOM, utvecklingsstöd och partnerlista. Detta bevisar API-kopplingen, inte självständig extern grävning eller svarskvalitet.
- Totalt betalda API-prov hittills: 0,04582286 USD, cirka 46 öre med bokföringsantagandet 10 SEK/USD. Inte faktisk växelkurs eller fakturakvitto.

Prisunderlag kontrollerat mot [OpenAI](https://developers.openai.com/api/docs/pricing) och [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing). Alla webbposter räknas konservativt som debiterade anrop. Tre webbposter är en lokal stopptröskel; leverantören har redan visat att ett anrop kan ge fler än det begärda antalet. Ingen garanti om ett hårt leverantörstak.

## Nästa körning förberedd

`tools/prova-fraga-kundpilot.mjs` kör samma frågor genom testchattens HTTP-gränssnitt, i båda lägen och omvänd ordning vid upprepning. Fyra utvecklingsfrågor: Unibap/Bifrost, Sivers/POET, AAC/sjöfart och obestyrkt Unibap/BEACONSAT-order. Gemensam batchbudget 2 USD; okänd användning behåller reservationen och stoppar fler betalda anrop. Fulla API-svar, lästa dokument, kundsvar och tids-/kostnadsdata sparas lokalt.

`--from-kv` läser en fryst kopia av relevanta publika bolagsarkiv från produktion, utan KV-skrivningar eller privata användardata. Den kopian används lika i båda varianter. Ingen jämförelse mot en avsiktligt tom baslinje.

GitHub-jobbet `kundpilot` i befintliga `prova-fraga.yml` använder en separat input och kör inte de gamla proven samtidigt. Kod och jobb är ännu inte pushade eller körda.

## Återstående begränsningar

- Ingen komplett skarp svarjämförelse har körts. Kvalitet, total svarstid och styckkostnad är fortfarande okända.
- Lokal Anthropic-nyckel saknas. Befintlig nyckel finns i Actions. Försöket att lägga OpenAI-nyckeln som ny Actions-hemlighet avvisades av automatisk godkännandegranskning eftersom extern lagring inte var uttryckligen godkänd. Ingen nyckel överfördes. Ludvig har fått frågan om godkännande; alternativt kan han lägga ANTHROPIC_API_KEY lokalt.
- Djupa lägets fyra hämtningsvarv är oförändrade. De kan visa sig otillräckliga; högre tak ska grundas i kompletta resultat.
- Samtal återanvänder signerade valda poster. Fulla dokument och kandidatlistor återanvänds ännu inte mellan frågor, och den automatiska jämförelsen provar inte följdfrågor ännu.
- HTML, UTF-8 och okomprimerade svar stöds; oläsbara original ger en lucka. Ingen PDF-utbyggnad ingår.

Starta lokalt: `node tools/fraga-kundpilot-server.mjs --env C:/dev/kurs/.env --port 8789`. Utan `--fixture` är arkivet uttryckligen tomt och får inte kallas produktionsbaslinje.
