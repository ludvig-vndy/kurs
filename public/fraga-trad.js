/* Signering är inte kryptering. Spara aldrig tråden under en gemensam kontonyckel.
   Innehållet är serverns; klienten återger det men tolkar aldrig trådsträngen. */
(function (root) {
  'use strict';
  const prefix = 'agarbrevet-fraga-trad:';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount({ container, form, deep, reset, onPending, onRender }) {
    let uid, trad = '', turns = [], generation = 0, authRevision = 0, busy = false;
    container.setAttribute('aria-live', 'polite');
    function draw() {
      container.innerHTML = turns.map(t => '<article class="qa"><div class="q"><span class="who">Du</span> <span class="qt">' + esc(t.question) + '</span></div><div class="a">' + root.FragaSvar.render(t.response) + '</div></article>').join('');
      if (!uid && turns.length) container.insertAdjacentHTML('beforeend', '<p class="foot"><a href="/labs/inbjudan.html">Logga in för att fråga om ditt innehav →</a></p>');
      if (onRender) onRender(turns.length);
    }
    function setBusy(value) {
      busy = value;
      container.setAttribute('aria-busy', String(value));
      form.querySelector('[type="submit"]').disabled = value;
    }
    function read() {
      trad = ''; turns = [];
      if (!uid) return;
      try {
        const value = JSON.parse(root.localStorage.getItem(prefix + uid) || 'null');
        if (value && typeof value.trad === 'string' && Date.now() - value.saved < 86400000 && Array.isArray(value.turns)) {
          trad = value.trad;
          turns = value.turns.filter(t => typeof t.question === 'string' && t.response && typeof t.response === 'object').slice(-6);
        }
      } catch (_) { /* Lagring kan vara avstängd eller innehålla gammalt format. */ }
    }
    function save() {
      if (!uid) return;
      try {
        // Begränsa även den lokala svarsvyn; serverns minnesbudget gäller separat.
        let value = JSON.stringify({ trad, turns, saved: Date.now() });
        while (value.length > 250000 && turns.length) {
          turns.shift(); value = JSON.stringify({ trad, turns, saved: Date.now() });
        }
        root.localStorage.setItem(prefix + uid, value);
      } catch (_) { /* Samtalet fortsätter i minnet när lagring inte går. */ }
    }
    function identity(session) {
      const next = session?.user?.id || null;
      if (next === uid) return;
      if (uid !== undefined) generation++;
      uid = next; setBusy(false); read(); draw();
      deep.checked = false;
      form.querySelector('input[type="text"]').value = '';
    }
    async function session() {
      try { return root.AB?.ready ? await root.AB.getSession() : null; }
      catch (_) { return null; }
    }
    const ready = new Promise(resolve => {
      async function boot() {
        if (root.AB?.ready && root.AB.onAuthChange) root.AB.onAuthChange((_event, ses) => {
          authRevision++;
          identity(ses);
        });
        const before = generation;
        const authBefore = authRevision;
        const ses = await session();
        // Även första auth-händelsen ersätter ett äldre sessionsuppslag.
        if (generation === before && authRevision === authBefore) identity(ses);
        resolve();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
      else boot();
    });
    reset.addEventListener('click', () => {
      generation++; trad = ''; turns = []; setBusy(false); deep.checked = false;
      form.querySelector('input[type="text"]').value = '';
      try { if (uid) root.localStorage.removeItem(prefix + uid); } catch (_) {}
      draw();
    });
    root.addEventListener('storage', event => {
      if (uid && (event.key === prefix + uid || event.key === null)) {
        generation++; setBusy(false); read(); draw();
      }
    });
    return {
      async ask(question) {
        question = String(question || '').trim();
        if (!question || busy) return false;
        const initial = generation;
        await ready;
        if (initial !== generation) return false;
        const before = generation;
        const ses = await session();
        if (generation !== before) return false;
        identity(ses);
        if (busy) return false;
        const current = generation;
        setBusy(true);
        const pending = document.createElement('article'); pending.className = 'qa';
        pending.innerHTML = '<div class="q">' + esc(question) + '</div><div class="a"><p class="thinking">Undersöker frågan…</p></div>';
        container.appendChild(pending);
        if (onPending) onPending(pending);
        const active = () => generation === current;
        try {
          const response = await fetch('/api/fraga', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, token: ses?.access_token || null, trad: uid ? trad : '', djup: deep.checked }) });
          const data = await response.json().catch(() => ({}));
          if (!active()) return false;
          const latest = await session();
          if (!active()) return false;
          identity(latest);
          if (!active()) return false;
          if (!response.ok || data.error) throw new Error(data.error || 'Kunde inte hämta svaret. Försök igen.');
          // Ett stoppat eller misslyckat svar får aldrig ersätta giltigt minne.
          if (!data.blockerat && uid && typeof data.trad === 'string') trad = data.trad;
          turns.push({ question, response: data }); turns = turns.slice(-6);
          save(); draw();
        } catch (error) {
          if (active()) pending.querySelector('.a').innerHTML = '<p>' + esc(error.message || 'Kunde inte nå tjänsten just nu.') + '</p>';
        } finally { if (active()) setBusy(false); }
        return true;
      }
    };
  }
  root.FragaTrad = { mount };
})(globalThis);
