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

  function swap() {
    var toDelagaren = delagarenMode();
    document.querySelectorAll('.wordmark, .dm-word, .seal__name, .lp-brand').forEach(function (el) {
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
