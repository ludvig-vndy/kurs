/* public/labs/skatt.js  —  skatten på säkrad avkastning.

   Piloten bad om att kunna lägga till eller ta bort skatten, eftersom talet
   bredvid "säkrad avkastning" stod som "före skatt" och därmed var oanvändbart
   för den som vet vilket konto affären gjordes på.

   MEKANIK, INTE FRYSTA TAL. Husets regel är att skatteregler ges som mekanism
   och aldrig som ett fryst belopp. Därför:

     - satsen är ett argument, inte en konstant här inne, och sidan visar den
       som ett fält du kan ändra
     - schablonen på ISK och KF räknas inte alls. Den bygger på
       statslåneräntan och ändras varje år, så den hör hemma som en inmatning
       eller ingenstans, aldrig som en siffra i koden
     - ett innehav utan kontotyp beskattas inte, men räknas och namnges

   Vinstskatt betalas bara i depå. ISK och KF beskattas på kapitalet, inte på
   vinsten, så där finns ingen vinst att dra ifrån.

   Klassiskt skript med avsikt: dina-bolag.html laddar det med en vanlig
   script-tagg, och tools/__tests__/skatt.test.mjs kör exakt samma fil.
*/
(function (global) {
  var KONTON = { depa: 'Depå', isk: 'ISK', kf: 'Kapitalförsäkring' };
  var STANDARDSATS = 30;

  function giltigtKonto(v) {
    var k = String(v == null ? '' : v).toLowerCase().trim();
    return KONTON[k] ? k : null;
  }

  /* Noll ar en giltig sats (den som vill se bruttot satter den sa). Saknat
     varde ar det inte, och Number(null) ar 0, sa det maste skiljas ut fore
     omvandlingen. */
  function rimligSats(sats) {
    if (sats === null || sats === undefined || sats === '') return STANDARDSATS;
    var s = Number(sats);
    return isFinite(s) && s >= 0 && s <= 100 ? s : STANDARDSATS;
  }

  /* Kvittning inom depån sker före skatten: en förlust i ett innehav möter en
     vinst i ett annat. Att beskatta varje vinst för sig och tiga om
     förlusterna hade gett ett för högt skattetal. En samlad förlust ger noll
     skatt, inte ett negativt belopp: avdraget beror på annat du deklarerar och
     är inte vår sak att räkna. */
  function skattaRealiserat(poster, sats) {
    var s = rimligSats(sats);
    var brutto = 0, depa = 0, okant = 0, beskattat = 0;
    for (var i = 0; i < (poster || []).length; i++) {
      var p = poster[i] || {};
      var v = Number(p.belopp);
      if (!isFinite(v)) continue;
      brutto += v;
      var k = giltigtKonto(p.konto);
      if (k === 'depa') { depa += v; beskattat++; }
      else if (!k) okant++;
    }
    var skatt = depa > 0 ? depa * (s / 100) : 0;
    return { brutto: brutto, skatt: skatt, netto: brutto - skatt, okant: okant, beskattat: beskattat };
  }

  global.SKATT = {
    KONTON: KONTON,
    STANDARDSATS: STANDARDSATS,
    giltigtKonto: giltigtKonto,
    rimligSats: rimligSats,
    skattaRealiserat: skattaRealiserat,
  };
})(typeof window !== 'undefined' ? window : this);
