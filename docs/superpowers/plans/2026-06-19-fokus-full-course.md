# Fokus-spelaren: full kurstäckning, plan

**Mål:** Utöka Fokus-lektionsspelaren från den kurerade startsträckan (kap 1-3, 11 lektioner) till att täcka hela kursen, alla 22 källmoduler, som ~51 spelarlektioner i 16 kapitel.

**Arkitektur:** Källan (de ~115 verifierade markdown-lektionerna i `src/content/kurs/`) förblir sanningen. Spelarlektionerna i `content/fundamental-aktieanalys/` är härledda artefakter: en JSON per lektion, en `course.json` med kapitelträdet, renderade av Fokus-spelaren utifrån `typ`-fält. Inget innehåll skrivs nytt; källan kondenseras troget.

**Process:** En subagent per lektion (läser källa + kontrakt, skriver en JSON-fil), validerad av `tools/check-fokus.mjs` (ingår i `npm run check`). Kapitel för kapitel, godkännande mellan.

---

## Låsta principer (gäller all produktion)

1. **Trogen transform.** Inget påstående, tal eller begrepp som inte finns i källan. Inga em-dashes eller en-dashes. Sifferpolicy: tal endast ur källan eller uttryckligen illustrativa och märkta; aldrig påhittade för namngivet verkligt bolag (utom Lifco, som har riktiga daterade tal som behålls exakt).
2. **Innehållet avgör grafik mot text.** En graf förtjänar sin plats bara om den visar en form prosan inte kan (struktur, samband, proportion, förlopp, jämförelse, en överraskande storlek). Annars text. `visual` är valfri på concept/dataviz. 3 till 7 steg, en kafferast.
3. **Slå ihop på idé, dela på cram.** Ingen målsiffra på lektionsantal. Flera källlektioner blir en spelarlektion när de bär en idé; en lektion delas om den lär ut mer än en sak.
4. **Helhetsbalans (tre kontroller).** Variation (ingen visual-typ dominerar; variera concept-formen, luta inte på jamforelse), icke-redundans (två lektioner visualiserar inte samma idé likadant), och **symmetrisk pacing**: vakta både långa text-rader (psykologi) och långa grafik-rader (räkenskaper, värdering). Andningspausen i en grafik-svit är ett reading- eller concept-steg som kliver tillbaka till omdömet, aldrig en pliktgraf.
5. **Kontraktsformat:** ASCII-fältnamn (`typ`/`fraga`/`alternativ`/`ratt`/`forklaring` osv.), `ratt` alltid lista, quiz exakt 3 frågor, `highlight` ordagrann delsträng av `lead`. Se `content/fundamental-aktieanalys/RENDERER-BRIEF.md`.

---

## Numrering och omnumrering

Spelaren får egen kursordningsnumrering (skiljer sig från huvudkursen). De 11 befintliga numreras om in i sekvensen (innehåll oförändrat, bara `kapitel`/`lektion`/filnamn + course.json ändras):

| Gammal fil | Ny fil | kapitel/lektion |
|---|---|---|
| 1.1-aga-en-aktie | 1.1-aga-en-aktie | 1 / 1.1 (oförändrad) |
| 1.2-pris-mot-varde | 1.2-pris-mot-varde | 1 / 1.2 (oförändrad) |
| 2.1-resultatrakningen | 4.1-resultatrakningen | 4 / 4.1 |
| 2.2-balansrakningen | 4.2-balansrakningen | 4 / 4.2 |
| 2.3-kassaflodet | 4.3-kassaflodet | 4 / 4.3 |
| 2.4-nyckeltal | 5.1-nyckeltal | 5 / 5.1 |
| 3.1-vad-ar-varde | 8.1-vad-ar-varde | 8 / 8.1 |
| 3.2-multiplar | 9.1-multiplar | 9 / 9.1 |
| 3.3-dcf | 9.3-dcf | 9 / 9.3 |
| 3.4-sakerhetsmarginal | 10.2-sakerhetsmarginal | 10 / 10.2 |
| 3.5-riktpris | 9.5-riktpris | 9 / 9.5 |

Kap 12 (8 lektioner) är redan i ny numrering.

---

## Full mappning (16 kapitel, ~51 lektioner)

Status: **K** = klar, **N** = ny (att producera). Visual-styr är en utgångspunkt; transformen får gå text-tung om formen inte bär.

### Kap 1 Investeringsfilosofi (källmodul 1)
- 1.1 Äga en aktie ← 1.1 — **K**
- 1.2 Pris mot värde ← 1.2 (+12.1) — **K**
- 1.3 Tidshorisont och avkastningens källor ← 1.3 — **N** (grafik: andel/stapel, avkastningens tre källor)
- 1.4 Filosofi och kompetenscirkel ← 1.4+1.5 — **N** (text-tung)

### Kap 2 Affärsmodeller (modul 2)
- 2.1 Hur ett bolag tjänar pengar ← 2.1 — **N** (flode)
- 2.2 Affärsmodeller och intäktstyper ← 2.2+2.4 — **N** (jamforelse: återkommande mot cyklisk)
- 2.3 Enhetsekonomi och tillväxt ← 2.3+2.5 — **N** (grafik: enhetsekonomi)

### Kap 3 Årsredovisningen (modul 3)
- 3.1 Årsredovisningens delar ← 3.1 — **N** (text/lätt struktur)
- 3.2 Läsa mellan raderna ← 3.2+3.3+3.4 — **N** (text-tung: läsfärdighet)

### Kap 4 Räkenskaperna (modul 4,5,6,7) — lång grafik-rad, lägg in omdömes-paus
- 4.1 Resultaträkningen ← 4.1-4.3 — **K** (flode+stapel)
- 4.2 Balansräkningen ← 5.1-5.3 — **K** (jamforelse+andel)
- 4.3 Kassaflödet ← 6.1-6.3 — **K** (flode+stapel)
- 4.4 Vinstkvalitet och varningslampor ← 4.4+4.5+6.4 — **N** (omdömes-paus: text-leaning, vinst mot kassaflöde)
- 4.5 Goodwill och eget kapital ← 5.4+5.5 — **N** (andel, lätt)
- 4.6 De tre rapporterna ihop ← 7.1+7.2 — **N** (flode: kopplingen)

### Kap 5 Nyckeltal och kapitalavkastning (modul 8,9)
- 5.1 Marginaler och ROIC ← 8.1+9.1 — **K** (jamforelse)
- 5.2 Tillväxt, effektivitet och rätt användning ← 8.2+8.3+8.4 — **N**
- 5.3 ROIC i djupet ← 9.2+9.3+9.4 — **N**

### Kap 6 Konkurrensfördelar, moats (modul 10)
- 6.1 Vad en moat är och typerna ← 10.1+10.2 — **N** (text-tung, ev. jamforelse)
- 6.2 Bedöma och se moaten i siffrorna ← 10.3+10.4 — **N** (grafik: uthållig hög ROIC)

### Kap 7 Ledning och kapitalallokering (modul 11)
- 7.1 Att bedöma en ledning ← 11.1 — **N** (text-tung)
- 7.2 Kapitalallokering ← 11.2+11.3+11.4 — **N** (flode/andel: vart kontanterna går)

### Kap 8 Värderingsgrunder (modul 12)
- 8.1 Vad är värde? ← 12.1+12.3 — **K** (jamforelse)
- 8.2 Pengars tidsvärde och diskontering ← 12.2 — **N** (stapel: nuvärde krymper)

### Kap 9 Värdering i praktiken (modul 13,14) — lång grafik-rad, lägg in omdömes-paus
- 9.1 Multiplar och deras fällor ← 13.1+13.2+13.4 — **K** (jamforelse+stapel)
- 9.2 Relativvärdering och jämförelser ← 13.3 — **N** (omdömes-paus möjlig: när jämförelsen ljuger)
- 9.3 Diskonterat kassaflöde ← 14.1+14.3 — **K** (flode+stapel)
- 9.4 Att bygga prognosen ← 14.2 — **N**
- 9.5 Att sätta ett riktpris ← 14.4+14.5 — **K** (text-concept+stapel)

### Kap 10 Risk och felmarginal (modul 15)
- 10.1 Vad risk faktiskt är ← 15.1 — **N** (text-tung)
- 10.2 Säkerhetsmarginal ← 15.2 — **K** (jamforelse)
- 10.3 Kartlägga fel och tänka i sannolikheter ← 15.3+15.4 — **N**

### Kap 11 Investeringspsykologi (modul 16) — lång text-rad, variera rytmen
- 11.1 Flock, rädsla och girighet ← 16.1+16.2 — **N** (text-tung)
- 11.2 Tankefällor ← 16.3+16.6+16.7 — **N** (text-tung)
- 11.3 Story vs analys ← 16.4+16.5 — **N** (text-tung)
- 11.4 Bygga ett system: position sizing och ödmjukhet ← 16.8+16.9 — **N** (andel för sizing är intjänad)

### Kap 12 Tillväxtbolag (modul 17,19) — **K** (8 lektioner, 12.1-12.8)

### Kap 13 Din investeringsprocess (modul 18)
- 13.1 Från idé till case ← 18.1+18.2 — **N** (flode/text)
- 13.2 Bevaka, ompröva, sälja ← 18.3 — **N** (text-tung)

### Kap 14 Fallstudie: Lifco (modul 20)
- 14.1 Lifco, räkenskapsåret 2025 ← 20.1 — **N** (riktiga daterade tal, behålls exakt; grafik på verklig data)

### Kap 15 Sektoranalys (modul 21)
- 15.1 Banker och försäkring ← 21.1+21.2 — **N**
- 15.2 Fastighet och cykliskt ← 21.3+21.4 — **N**

### Kap 16 Praktik och avslut (modul 22, 18.4)
- 16.1 Källor, verktyg och svensk praktik ← 22.1+22.2 — **N** (text-tung)
- 16.2 Din resa härifrån ← 18.4 — **N** (text-tung, kursavslut)

---

## Produktionsordning

1. Omnumrering av de 11 + full `course.json`. (Foundation.)
2. Kapitel i ordning: 2, 3, (4-resten), 5, 6, 7, (8-resten), (9-resten), 10, 11, 13, 14, 15, 16.
3. Per kapitel: dispatcha subagenter, validera med `node tools/check-fokus.mjs`, granska de tunga slagningarna, committa.
4. **Slutpass:** kör om helhets-kontrollen (variation, icke-redundans, symmetrisk pacing) över alla ~51, klipp eko mellan kapitel, säkra omdömes-pauserna i kap 4 och 9.

## Klart efter produktion (renderar-agentens del)
Wira in `/fokus`-översikten mot course.json, verifiera de tre nya visual-typerna mot all data, deploya.
