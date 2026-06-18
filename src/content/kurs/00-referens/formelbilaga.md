---
del: "Referens"
modul: 0
modulTitel: "Referens"
lektion: "0.0"
titel: "Formelbilaga"
niva: "Nybörjare"
ordning: 9000
fardighet: "Du har en kanonisk uppslagsplats för kursens definitioner och formler, så att varje lektion kan referera hit i stället för att omdefiniera dem."
format: "referens"
---

## Så använder du den här bilagan

Det här är kursens enda sanning för centrala definitioner och formler. Lektioner
länkar hit i stället för att förklara samma formel på nytt. Om en lektion och
bilagan någonsin skiljer sig: bilagan gäller.

## Resultatmått och marginaler

**EBIT (rörelseresultat)** = resultat före räntor och skatt. Marginalen: rörelsemarginal = EBIT / omsättning.

**EBITDA** = EBIT + av- och nedskrivningar (resultat före räntor, skatt, av- och nedskrivningar). Tar bort av- och nedskrivningar och döljer därmed kapitalintensitet, användbart men aldrig hela bilden; jämför alltid mot EBIT och capex.

**EBITA** = EBIT + avskrivningar på (förvärvsrelaterade) immateriella tillgångar (resultat före räntor, skatt och nedskrivning/avskrivning av immateriella tillgångar). Vanligt rubrikmått hos serieförvärvare, eftersom det rensar bort den avskrivning som uppstår just av att förvärv bokförs, men kom ihåg att förvärven ändå kostade riktiga pengar (se ROIC inkl. vs exkl. goodwill).

**Marginaler:** bruttomarginal = bruttoresultat / omsättning; rörelsemarginal = EBIT / omsättning; nettomarginal = nettoresultat / omsättning.

## Balansräkning och skuldsättning

**Soliditet** = eget kapital / totala tillgångar. Hur stor del av tillgångarna som är finansierad med eget kapital, ju högre, desto mer motståndskraft.

**Nettoskuld** = räntebärande skulder − kassa och likvida medel.

**Nettoskuld/EBITDA** = nettoskuld / EBITDA. Hur många års rörelseresultat (före av- och nedskrivningar) skulden motsvarar.

**Räntetäckningsgrad** = EBIT / räntekostnad. Hur många gånger rörelseresultatet täcker räntan.

**Materiellt eget kapital** = eget kapital − goodwill − immateriella tillgångar. Det egna kapital som backas av påtagliga tillgångar.

## Lönsamhet och kapitalavkastning

**NOPAT (rörelseresultat efter skatt)**
NOPAT = rörelseresultat (EBIT) × (1 − skattesats).
Notera: det är EBIT multiplicerat med (1 minus skattesatsen), *inte* "EBIT minus
den redovisade skatten". Den redovisade skatten är beräknad efter räntekostnader;
NOPAT ska rensa bort finansieringen.

**ROIC (avkastning på investerat kapital)**
ROIC = NOPAT / investerat kapital.
Investerat kapital = eget kapital + räntebärande skulder − kassa (förenklat).
Värde skapas när ROIC > kapitalkostnaden (WACC), och förstörs när ROIC < WACC.

**DuPont, håll isär de två nedbrytningarna**
- ROE = nettomarginal × kapitalomsättning × hävstång (bas: totala tillgångar och
  eget kapital). Hävstången kan blåsa upp ROE utan att verksamheten blivit bättre.
- ROIC = NOPAT-marginal × omsättning på investerat kapital (bas: investerat kapital).
Blanda aldrig baserna. ROE mäter avkastning på ägarnas kapital inklusive hävstång;
ROIC mäter avkastning på allt arbetande kapital, opåverkat av finansiering.

**ROE och ROA**
ROE = nettoresultat / eget kapital. ROA = nettoresultat / totala tillgångar.
ROE högre än ROIC beror nästan alltid på hävstång, inte på bättre drift.

## Kassaflöde

**FCFF (fritt kassaflöde till hela bolaget)**
FCFF ≈ rörelsekassaflöde − investeringar (capex), före finansiering. Tillfaller
både långivare och ägare. **Diskonteras med WACC.**

**FCFE (fritt kassaflöde till ägarna)**
FCFE = FCFF − räntor efter skatt − amortering + nyupplåning. Det som faktiskt är
ägarnas. **Diskonteras med avkastningskravet på eget kapital**, inte WACC.
Var alltid konsekvent med vilket mått en DCF diskonterar och matcha räntan.

**Capex** = investeringsutgifter för långsiktiga tillgångar (maskiner, fabriker,
aktiverad utveckling). Underhållscapex ≈ vad som krävs för att hålla verksamheten
igång; tillväxtcapex = det som bygger ut den. Avskrivningar är bara en *approximation*
av underhållscapex.

## Värdering

**Pengars tidsvärde / nuvärde**
Nuvärde = framtida belopp / (1 + r)^n, där r är diskonteringsräntan och n antal år.

**WACC (vägd kapitalkostnad)**
WACC = (E/V) × kostnad eget kapital + (D/V) × kostnad skuld efter skatt.
E = marknadsvärde eget kapital, D = räntebärande skuld, V = E + D.

**CAPM (kostnad för eget kapital)**
kostnad eget kapital = riskfri ränta + beta × marknadsriskpremie.
Riskfri ränta förankras i en lång statsobligation (t.ex. svenska tioåringen);
marknadsriskpremie historiskt ~4-5 %.

**Gordon / terminalvärde (DCF)**
Terminalvärde (vid slutet av prognosår n) = FCF(n+1) / (r − g),
där g = evig tillväxttakt och r = diskonteringsränta. Kräver r > g.
Terminalvärdet diskonteras tillbaka till nutid med 1/(1 + r)^n och utgör ofta
merparten av totalvärdet, där sitter de farligaste antagandena.

**Multiplar**
- P/E = pris per aktie / vinst per aktie (equity-mått).
- EV/EBIT, EV/EBITDA och EV/EBITA använder Enterprise Value (EV = börsvärde +
  nettoskuld), kapitalstruktur-neutralt, till skillnad från P/E. EV/EBITA är
  vanligt för serieförvärvare (EBITA rensar förvärvsavskrivningen).
- P/S = börsvärde / omsättning, för bolag utan meningsfull vinst.
- P/B = pris per aktie / bokfört eget kapital per aktie (eller börsvärde / eget kapital), för tillgångstunga bolag (banker, fastighet, cykliskt). Jämförs med ROE: hög ROE motiverar högre P/B.

**Felmarginal (margin of safety)**
felmarginal = (uppskattat värde − pris) / uppskattat värde.
Skydd mot egna misstag och otur; större vid högre osäkerhet.

## Tillväxtbolag / enhetsekonomi

**LTV (kundens livstidsvärde)**
LTV ≈ (intäkt per kund × bruttomarginal) / churn (stabilt läge), helst diskonterad.
Använd *inte* "årligt bidrag × fast antal år" annat än som medvetet förenklad,
konservativ approximation, och säg då att den är det. Hög churn dödar LTV oavsett.

**CAC och LTV/CAC**
CAC = total kundanskaffningskostnad / antal nya kunder (håll isär organisk och
betald CAC). Tumregeln LTV/CAC ≥ 3 avser *odiskonterad* LTV och är därför
medvetet konservativt satt. Payback = CAC / (årlig bruttovinst per kund).

**Regeln om 40**
omsättningstillväxt (%) + lönsamhetsmarginal (%) ≥ 40, där marginalen är
**FCF-marginal eller rörelsemarginal**, inte nettovinstmarginal.

**Operating leverage**
Äkta operating leverage kommer från *fasta* kostnader (FoU, administration) som
inte växer i takt med intäkten. Att försäljning & marknadsföring faller som andel
av intäkten är skalfördel i kundanskaffning, inte ren operating leverage. Håll isär.

**Burn rate och runway**
Runway (antal månader) = likvida medel / nettoburn per månad.
Skilj på gross burn (totala utgifter) och net burn (utgifter − intäkter).

**Utspädning**
Ny ägarandel som nyemission ger = emissionsbelopp / (pre-money värde + emissionsbelopp).
Att resa kapital från styrka (högt pris) späder lite; från svaghet (lågt pris)
späder mycket. Räkna värde *per aktie efter förväntad framtida utspädning*.
