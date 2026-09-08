# Fraga: dataposter och serverrenderade fakta

Godkand inriktning i samtalet 2026-09-08. Omfattar verifieringen och den
kallvisning som kravs for att leverera den. Samtalsminne, ett nytt
berakningsverktyg och djupgranskning ar senare steg.

- Modellen returnerar JSON-block. En faktareferens innehaller bara typ och id.
- Servern ager bolags-id, matt, period, signerat varde, enhet och kallstalle.
  Den renderar hela uppgiften, aldrig ett tal inuti modellskriven faktaprosa.
- Ursprung ar rapporterat, beraknat, egen uppgift, antagande eller
  kursmaterial/illustration. En referens kan inte byta ursprung.
- Dokumentcitat renderas ordagrant fran ett registrerat utdrag. Godtyckliga
  fakta som extraktionen inte kan typa far citeras med sin kontext, inte
  skrivas om till nya numeriska pastaenden.
- Beraknade poster pekar pa sina indata och bar formel. Endast belagda
  indata far anvandas. Historik som hamtas under ett svar uppdaterar registret.
- Fri prosa ar metod, tolkning eller saknas. Siffror och utskrivna belopp
  stoppas mekaniskt. En separat modellgranskning provar faktastod, kategorier,
  motsagelser och radgivning. Den ar ett extra skydd, ingen sanningsgaranti.
- Kontrollfel, okanda id:n, trunkerat JSON och granskarfel faller stangt.
  Inget fallback-anrop far kringga verifieringen. Ingen ratext visas vid stopp.
- Bada fragaytorna visar serverns block, kallstallen och tackning med escaping.
- Inga nya beroenden, inga andringar i innehallskallor eller deployment.

Begransning: en korrekt renderad post bevisar inte att ursprungsextraktionen
tolkade rapporten ratt. Kallcitat, period och proveniens maste folja med.
Semantisk granskning ar probabilistisk; fria resonemang kan fortfarande vara fel.
