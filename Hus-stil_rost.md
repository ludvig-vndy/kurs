# Hus-stil: rösten i kurstexten

## Vad det här är

Den gemensamma röst-standarden för all kurstext, både deck-källan och spelaren. Både Code och Sebastian skriver och kontrollerar mot den, så att människa och maskin konvergerar mot samma ton i stället för att var och en tolkar fritt. Det är en kalibrering av rösten, inte en omskrivning av innehållet. Fakta, siffror, formler och struktur står still.

## Måttet: så här ska det låta

Det här är en människas text (Sebastian). Den träffar tonen vi vill ha. Härma den, inte abstrakta regler.

> Även de största tillväxtinvesteringarna är brutalt skakiga på vägen upp. De slutliga storvinnarna faller rutinmässigt 50 procent, ibland 70 till 80, en eller flera gånger innan de till slut lyckas.
>
> Det skapar en av investeringens svåraste paradoxer. För att fånga exceptionell avkastning i en tidig vinnare måste du överleva resan, alltså stanna investerad genom magvändande nedgångar när allt känns fel, utan att paniksälja på botten. Men inte varje stort fall är ett läge.
>
> Ibland faller ett bolag för att marknaden faktiskt har rätt, för att förutsättningarna har förändrats och för att det du en gång trodde på inte längre gäller.
>
> Den svåra färdigheten är att skilja de två: vanlig volatilitet, där verksamheten är intakt och bara priset svänger, från permanent försämring, där anledningen till att du investerade har försvunnit.
>
> Den som lär sig se skillnaden kan hålla sina vinnare genom stormar och lämna förlorarna innan förlusten blir för stor.

(Sista meningen var delvis avklippt i skärmdumpen, bekräfta den exakta lydelsen. Den ursprungliga texten hade en run-on i andra stycket, här delad i två meningar, det är så vi vill ha det.)

Varför den fungerar: rakt tilltal ("du"), konkreta och kroppsliga bilder, intervall i ord ("70 till 80"), en enda motsats och den bär lektionen, ett levande slut, och en ojämn rytm med både långa och korta meningar.

## Positiva regler (vad du ska göra)

- **Tilltal:** skriv till läsaren som "du". Aldrig "hen", "man" eller "han/hon".
- **Konkret och kroppsligt:** föredra fysiska, visuella verb och bilder framför abstraktioner. "Magvändande nedgångar" slår "betydande volatilitet".
- **Intervall i ord:** "70 till 80 procent", aldrig med streck.
- **En motsats, bara där den är poängen:** behåll den kontrast som är själva lektionen (volatilitet mot permanent försämring). Skippa motsatsen som ren rytm ("det är inte X, det är Y").
- **Lita på läsaren:** säg poängen rakt, rama inte in den. Inget metaprat ("det fina är", "poängen är", "lägg märke till", "lärdomen är skarp").
- **Variera rytmen:** korta tvära meningar bredvid längre. Dela en mening som tappar fästet. Avsluta ibland tvärt.
- **Ett levande slut får stå.** Platta, formelmässiga sammanfattningar ska bort.
- **Tunna fyllnadsorden:** genuint, faktiskt, just, själva, precis, verkligen.
- **Inga tretal på rad som manér.**
- **Dra ner tecknen, behåll substansen.** Målet är "lite mindre AI", inte en annan text.

## Hen ska bort helt

Ersätt varje "hen", "hens", "henom". Aldrig "han/hon", "han eller hon" eller "denne". I prioritetsordning: skriv om till "du", eller till ett konkret påstående utan pronomen, eller använd substantivet varierat ("en erfaren investerare", "investeraren"). Hen-meningarna är oftast den formelmässiga "så här tänker en van investerare"-mallen, bryt den i samma drag.

## Vad som ALDRIG ändras

Inga fakta, siffror, formler, bolagssiffror, korsreferenser eller strukturändringar. Återinför inga em-dashes eller en-dashes. Överkorrigera inte till platt och generisk prosa, behåll värmen och de bästa bilderna.

## Så används den

1. Code skriver röst-passet mot exemplet ovan plus de positiva reglerna. Exemplet är den största spaken, det drar texten mot rätt ton mer än någon regel.
2. Den oberoende klarhets-läsningen fångar run-ons, skarvar och saknade ord.
3. `granska_rost.py` flaggar golvet: hen (hård), plus rådgivande täthet för antites, metaprat, fyllnadsord, tretal och överlånga meningar. Använd siffrorna för att rikta arbetet mot de värsta lektionerna.
4. Sebastian läser ett stickprov och bekräftar tonen.
5. Kalibrera på en liten batch först. Träffar den inte nivån, skärp exemplet eller reglerna och kör om, innan du skalar.
