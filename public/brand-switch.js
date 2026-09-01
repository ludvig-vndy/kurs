/* Varumärke i headern. DEFAULT = Marginalen (utskrivet i källan). Intern dev-
   växel för att förhandsvisa Delägaren-namnet:

   Flippa till Delägaren:  ?brand=delagaren  (sparas i localStorage)
   Tillbaka till default:  ?brand=marginalen

   Rör bara synlig text (wordmark, sigill, fliktitel), aldrig server-metan. */
(function () {
  var KEY = 'da-brand';
  try {
    var q = new URLSearchParams(location.search).get('brand');
    if (q) {
      var v = q.toLowerCase();
      if (v === 'delagaren' || v === 'delägaren') localStorage.setItem(KEY, 'delagaren');
      else localStorage.removeItem(KEY); // marginalen / annat = default
    }
  } catch (e) {}

  function delagarenMode() {
    try { return localStorage.getItem(KEY) === 'delagaren'; } catch (e) { return false; }
  }

  /* Motpartens vard servas ur SAMMA bygge som Delagaren. Bygget kan darfor
     inte veta vilket varumarke sidan ska bara, och en delad sida som
     /logga-in mote annars en Motparten-deltagare med fel namn i headern.
     Avgors pa vardnamnet, samma monster som inloggningsgrinden i
     Broadsheet.astro. Vinner over dev-vaxeln: pa motparten.* finns inget
     lage dar Marginalen eller Delagaren ar ratt. */
  function motpartenVard() {
    try { return /^motparten[.-]/i.test(location.hostname); } catch (e) { return false; }
  }

  function swap() {
    if (motpartenVard()) {
      document.querySelectorAll('.wordmark, .dm-word, .seal__name, .lp-brand, .brandname').forEach(function (el) {
        if (/^\s*(marginalen|del[äa]garen)\s*$/i.test(el.textContent)) el.textContent = 'Motparten';
      });
      if (document.title) document.title = document.title.replace(/marginalen|del[äa]garen/gi, 'Motparten');
      return;
    }
    var toDelagaren = delagarenMode();
    document.querySelectorAll('.wordmark, .dm-word, .seal__name, .lp-brand, .brandname').forEach(function (el) {
      var t = el.textContent;
      if (toDelagaren) { if (/^\s*marginalen\s*$/i.test(t)) el.textContent = 'Delägaren'; }
      else { if (/^\s*del[äa]garen\s*$/i.test(t)) el.textContent = 'Marginalen'; } // om nagon kalla annu sager Delagaren
    });
    // Fliktitel: source sager "Delägaren", spegla valt lage.
    if (document.title) {
      if (toDelagaren) document.title = document.title.replace(/marginalen/gi, 'Delägaren');
      else document.title = document.title.replace(/del[äa]garen/gi, 'Marginalen');
    }
  }

  if (document.readyState !== 'loading') swap();
  else document.addEventListener('DOMContentLoaded', swap);
  document.addEventListener('astro:page-load', swap);
})();
