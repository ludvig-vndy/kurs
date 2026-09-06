/* Rutnätets två lägen.

   `markerad` betydde två olika saker i datan utan att formatet kunde skilja
   dem åt. I 0.1-oddsen är talet ett ANTAL: elva aktiva fonder av hundra slår
   sitt index. I 1.1-aga-en-aktie är det en POSITION: rutan som är du, en enda
   av tjugoåtta. Prototypen (public/labs/visualmotorn.html) tolkade alltid
   antal, Astro-komponenten alltid position, så oddsbilden renderade en enda
   prick där etiketten under lovade elva. Bild och text sa emot varandra på
   den sida som ska vara kursens mest ärliga.

   Båda filerna kan inte vara rätt samtidigt under en gemensam tolkning, så
   avsikten skrivs ut i datan i stället för att gissas. Okänt läge markerar
   ingenting: hellre ett tomt rutnät som syns i granskningen än en bild som
   tyst påstår fel sak. */

export const LAGEN = ['antal', 'position'];

function tal(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** Vilka celler som ska målas, som en mängd index. */
export function markerade(visual) {
  const v = visual || {};
  const celler = Math.max(0, tal(v.celler));
  const markerad = tal(v.markerad);

  if (v.lage === 'antal') {
    const n = Math.max(0, Math.min(celler, markerad));
    return new Set(Array.from({ length: n }, (_, i) => i));
  }
  if (v.lage === 'position') {
    return markerad >= 0 && markerad < celler ? new Set([markerad]) : new Set();
  }
  return new Set();
}

/** Text för skärmläsare. Beskriver bilden, inte fältet. */
export function rutnatEtikett(visual) {
  const v = visual || {};
  const celler = Math.max(0, tal(v.celler));
  const antal = markerade(v).size;
  const svans = v.etikett ? '. ' + v.etikett : '';
  if (antal === 1) return `Rutnät: en av ${celler} rutor markerad${svans}`;
  return `Rutnät: ${antal} av ${celler} rutor markerade${svans}`;
}
