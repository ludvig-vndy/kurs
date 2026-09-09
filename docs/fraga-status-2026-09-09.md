# Verklig väntestatus och momenttider

Chattytorna begär NDJSON från befintliga `/api/fraga` med Accept-headern.
Servern skickar endast fasta statuskoder under arbetet, och ett enda slutligt
resultat efter ordinarie faktakontroll och semantisk granskning. Ingen
modelltanke eller ogranskad svarstext strömmas till klienten. Äldre klienter
och provskript får samma JSON-svar och HTTP-status som tidigare.

Status kan visa förberedelse, sökning i underlag, planering, läsning,
beräkning, arbete med svaret, kortning och kontroll. Den byts av verkliga
kodsteg, inte av en tidsstyrd låtsasförloppsindikator. Moment kan återkomma.
Klienten visar förfluten tid och Avbryt. Avbrott, kontobyte och återställning
får inte publicera ett sent svar eller ersätta giltigt samtalsminne.

`tackning.tider` innehåller totalMs och summerad väggtid per moment.
Mätningen omfattar även arbetet runt respektive anrop, inte bara leverantörens
modellkörning. Start och slut är servermätta; klientens väntetid kan även
innehålla nätverkstid. Provskriptet loggar dessa mått för nästa optimering.

Testerna håller slutgranskaren väntande och läser statushändelser under tiden.
De kontrollerar att ett underkänt råsvar aldrig lämnas ut, att upprepade
moment summeras utan dubbelräkning, att interna fel inte läcker och att
avbrott når både modell och läsverktyg. Webbläsartestet prövar delade
JSON-rader, slutresultat, bruten ström och avbrott medan sessionskontrollen
väntar. Befintliga tester prövar båda chattytorna och kontoisolering.

Detta ändrar vänteläget och mätbarheten, inte modellernas svarstid.
Cloudflares strömningsstöd har kontrollerats mot
[dokumentationen](https://developers.cloudflare.com/workers/runtime-apis/streams/).
Flödet är lokalt verifierat; faktisk flush genom en deployad Cloudflare-proxy
behöver kontrolleras vid preview/utrullning. Ingen produktionsdeploy ingår.
