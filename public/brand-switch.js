/* Intern dev-växel: flippar wordmarken Delägaren <-> Marginalen för delning och
   skärmdumpar på sociala medier. INTE en publik feature.

   Aktivera:   lägg till ?brand=marginalen i URL:en (sparas i localStorage)
   Återställ:  ?brand=delagaren

   Rör bara synlig text (wordmark, sigill, titel), aldrig den byggda identiteten
   eller server-metan. Gäller tills du återställer, per webbläsare. */
(function () {
  var KEY = 'da-brand';
  try {
    var q = new URLSearchParams(location.search).get('brand');
    if (q) {
      var v = q.toLowerCase();
      if (v === 'marginalen') localStorage.setItem(KEY, 'marginalen');
      else localStorage.removeItem(KEY); // delagaren / annat = tillbaka till standard
    }
  } catch (e) {}

  function marginalen() {
    try { return localStorage.getItem(KEY) === 'marginalen'; } catch (e) { return false; }
  }

  function swap() {
    if (!marginalen()) return;
    // Wordmark (Broadsheet .wordmark, labs .dm-word), sigillets namn, ev. boxad brand.
    document.querySelectorAll('.wordmark, .dm-word, .seal__name, .lp-brand').forEach(function (el) {
      if (/^\s*del[äa]garen\s*$/i.test(el.textContent)) el.textContent = 'Marginalen';
    });
    // Fliktitel, så delade skärmdumpar av fliken stämmer.
    if (document.title && /del[äa]garen/i.test(document.title)) {
      document.title = document.title.replace(/del[äa]garen/gi, 'Marginalen');
    }
  }

  if (document.readyState !== 'loading') swap();
  else document.addEventListener('DOMContentLoaded', swap);
  // View Transitions: kör om efter varje klient-navigering.
  document.addEventListener('astro:page-load', swap);
})();
