/* Delat termsystem for produktytorna. Hamtar /ordlista.json (samma kalla som
   kursens marginalnoter och /ordlista) och uppgraderar sidans <a class="term">:

   - title satts fran den delade forklaringen (en sanningskalla, ingen drift
     mellan handskrivna tooltips och ordlistan)
   - "Lars ut i X.Y" laggs till i title nar termen har en lektion
   - href pekas om till /ordlista#<slug> (djuplank till ratt begrepp)

   Handskrivna title-attribut i mockarna behalls bara nar termen saknas i
   ordlistan. Anvandning: <script defer src="/labs/term-gloss.js"></script> */
(function () {
  function normalize(s) {
    return String(s || '').trim().toLowerCase();
  }
  // Matcha aven svensk bestamd form: "rorelsemarginalen" -> "rorelsemarginal".
  function candidates(text) {
    var t = normalize(text);
    var out = [t];
    ['erna', 'arna', 'en', 'et', 'n'].forEach(function (suf) {
      if (t.length > suf.length + 2 && t.slice(-suf.length) === suf) out.push(t.slice(0, -suf.length));
    });
    return out;
  }
  function apply(data) {
    var index = {};
    Object.keys(data).forEach(function (term) { index[normalize(term)] = data[term]; });
    document.querySelectorAll('a.term').forEach(function (el) {
      var hit = null;
      var cands = candidates(el.textContent);
      for (var i = 0; i < cands.length && !hit; i++) hit = index[cands[i]] || null;
      if (!hit) return; // behall mockens handskrivna title
      el.title = hit.forklaring + (hit.lektion ? ' Lärs ut i lektion ' + hit.lektion + '.' : '');
      el.href = '/ordlista#' + hit.slug;
    });
  }
  fetch('/ordlista.json')
    .then(function (r) { return r.json(); })
    .then(apply)
    .catch(function () { /* offline/fel: mockens egna titles galler */ });
})();
