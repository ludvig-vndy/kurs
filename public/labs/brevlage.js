/* Vad Ägarbrevet ska visa när /api/brev svarat.
   ------------------------------------------------------------------------
   Ren funktion, ingen DOM, så den går att prova (tools/__tests__/brevlage.test.mjs).
   Laddas som modul av /labs/agarbrevet.html.

   VARFÖR DEN FINNS: sidan hade en enradig fallback som gick till
   /labs/data/brev-exempel.json så fort svaret inte var 200. Den filen är en
   demo från 2026-07-11 med påhittade bolag, och ingenting på sidan sa att det
   var ett exempel. En pilot vars session gått ut fick alltså ett två månader
   gammalt brev om bolag som inte finns, serverat som sitt eget morgonbrev.

   Regeln nu: brevet visas bara om vi faktiskt har brevet. Har vi det inte står
   det varför. Exempeldatan når man bara genom att be om den (?exempel=1), och
   den märks ut på sidan.

   Ett brev kan också bli gammalt utan att något svar går fel: stannar
   nattjobbet fortsätter KV att svara 200 med gårdagens brev. Därför räknas
   åldern ut här, så sidan kan skriva ut den i stället för att säga "i natt". */

export const EXEMPEL_URL = '/labs/data/brev-exempel.json';

// Heldagar mellan två YYYY-MM-DD. Null när datumet saknas eller är obegripligt:
// då vet vi inte åldern, och då ska sidan inte påstå att brevet är dagens.
export function alder(datum, idag) {
  const d = Date.parse(String(datum || '') + 'T12:00:00Z');
  const n = Date.parse(String(idag || '') + 'T12:00:00Z');
  if (!isFinite(d) || !isFinite(n)) return null;
  return Math.round((n - d) / 864e5);
}

/* Klockslaget brevet faktiskt skrevs, ur faltet skriven.

   Sidhuvudet stod förut "Ägarbrevet · <datum> · 07:30" med tiden hårdkodad.
   Den var inte sann: de schemalagda körningarna 1 till 7 september startade 241
   till 306 minuter efter sin tid, så brevet skrevs 10:30 till 11:36 svensk tid.
   Ett påhittat klockslag på en produkt vars hela löfte är att det du ser är
   sant är samma fel som demobrevet, bara mindre.

   Svensk tid, inte läsarens: brevet handlar om nordiska bolag och säger "i
   natt". Den natten är Stockholms, oavsett var läsaren sitter. */
export function klockslag(iso) {
  const t = Date.parse(iso || '');
  if (!isFinite(t)) return '';
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(t));
  } catch (e) { return ''; }
}

function meddelande(rubrik, text, lank) {
  return lank ? { sort: 'meddelande', rubrik, text, lank } : { sort: 'meddelande', rubrik, text };
}

export function brevLage(svar) {
  const s = svar || {};
  if (s.exempel) return { sort: 'exempel' };

  const status = Number(s.status) || 0;
  const kropp = s.kropp;

  // Ett brev känns igen på att det har en postlista. Tom lista är en tyst dag,
  // och den tysta dagen är hela poängen med produkten, inte ett saknat brev.
  if (status === 200 && kropp && Array.isArray(kropp.poster)) {
    return { sort: 'brev', brev: kropp, alderDagar: alder(kropp.date, s.idag) };
  }

  if (status === 401) {
    return meddelande('Du är utloggad.',
      'Brevet handlar om dina bolag, så det kräver att du är inloggad.',
      { href: '/logga-in', text: 'Logga in' });
  }

  if (status === 404) {
    return meddelande('Inget brev ännu.',
      (kropp && kropp.forklaring) || 'Lägg till dina bolag, så skriver motorn ditt första brev i natt.',
      { href: '/labs/lagg-till-bolag.html', text: 'Lägg till bolag' });
  }

  // Allt annat: 200 med något som inte är ett brev, 5xx, eller status 0 för
  // nätverksfel. Vi vet inte vad som hände, och då säger vi det.
  return meddelande('Brevet kunde inte hämtas just nu.',
    'Det är ett fel hos oss, inte ett besked om dina bolag. Ladda om sidan om en stund.');
}
