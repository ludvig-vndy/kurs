# Avgr?nsad kostnadsoptimering utan bortvalda k?llor

Godk?nt av Ludvig: optimera kostnader utan att tappa visionen. Arbetsgren fraga-kundpilot. Produktion f?rblir of?r?ndrad tills f?rb?ttringarna ?r verifierade och integrerade.

1. M?tning visar att v?xande verktygshistorik ligger efter enda cachebrytpunkten. Prova f?rst automatisk historikcache, med exakt samma modell, instruktioner, verktyg, k?lltext och serverkontroller. Att korta k?llkatalogen skjuts upp tills denna enklare ?tg?rd bed?mts.
2. Testa faktisk payloadlikhet utan cachemetadata och att klientflaggor inte kan aktivera funktionen i produktion. Full testsuite f?re liveprov.
3. K?r kompletta Sivers/POET- och Bifrost-fr?gor med of?r?ndrad pilot och pilot-cache. Samma publika arkiv per par. S?kresultaten ?r inte frysta; totalpris och kvalitetsvariation kan d?rf?r inte ensamma tillskrivas cache?ndringen.
4. L?s provider-usage per modellvarv: cachel?sning, nya cacheskrivningar och ocachad input. Inkludera misslyckade svar, granskning, redigering och s?kning. Utebliven cachetr?ff ?r ingen besparing.
5. L?s faktiska svar och k?llor. L?ngre eller s?mre svar r?knas inte som produktf?rb?ttring ?ven om input blivit billigare. Redovisa enskilda utfall, inga generaliserade kvalitetsprocent.
6. Spara rapport och svar. Om cache hj?lper: beh?ll som avgr?nsad pilotf?rb?ttring. N?sta inneh?lls?ndrande experiment ?r en kort unders?kningskatalog med serverbevarade fulltextk?llor; dess t?ckning beh?ver egna tester.

API-dokumentation: https://platform.claude.com/docs/en/build-with-claude/prompt-caching

Budget: befintlig j?mf?relsebudget h?gst 2 USD per batch; tv? svar per initial batch, avbryt vid ok?nd usage. Detta ?r maximala lokala stopptr?sklar och ingen garanti om leverant?rens faktura.
