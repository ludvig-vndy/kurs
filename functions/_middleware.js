/* Cloudflare Pages Function: lösenordsgrind för hela sajten.
   Körs på edgen före varje request, så innehållet är skyddat server-side
   (inte bara dolt i klienten). Lösenord: env.SITE_PASSWORD, fallback kurs2026.

   Korrekt lösen -> signerad cookie sätts -> släpps igenom. Annars visas en
   stilren inloggningssida som matchar kursens tema. */

const COOKIE = 'kurs_auth';

async function tokenFor(password) {
  const data = new TextEncoder().encode('kurs::' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function loginPage({ error = false, next = '/' } = {}) {
  return `<!doctype html>
<html lang="sv" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Logga in · Fundamental aktieanalys</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;
    background:#131619;color:#e6e5df;
    font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    padding:24px}
  .card{width:100%;max-width:380px;background:#181c20;border:1px solid #2a3036;
    border-radius:16px;padding:40px 32px;box-shadow:0 12px 40px rgba(0,0,0,.45)}
  .mark{width:40px;height:40px;border-radius:10px;
    background:linear-gradient(145deg,#4fb89e,#6fccb3);margin-bottom:24px}
  h1{font-size:1.3rem;margin:0 0 4px;letter-spacing:-.01em}
  p.sub{margin:0 0 28px;color:#9aa0a0;font-size:.9rem;line-height:1.5}
  label{display:block;font-size:.78rem;text-transform:uppercase;
    letter-spacing:.06em;color:#9aa0a0;margin-bottom:8px;font-weight:600}
  input{width:100%;padding:12px 14px;font-size:1rem;color:#e6e5df;
    background:#131619;border:1px solid #2a3036;border-radius:10px;outline:none;
    transition:border-color .15s}
  input:focus{border-color:#4fb89e}
  button{width:100%;margin-top:16px;padding:12px;font-size:1rem;font-weight:600;
    font-family:inherit;color:#07120f;background:#4fb89e;border:none;
    border-radius:999px;cursor:pointer;transition:background .15s}
  button:hover{background:#6fccb3}
  .err{margin-top:14px;color:#e58a8a;font-size:.85rem;text-align:center}
</style>
</head>
<body>
  <form class="card" method="POST" action="/__login">
    <div class="mark"></div>
    <h1>Fundamental aktieanalys</h1>
    <p class="sub">Den här kursen är skyddad. Ange lösenordet för att fortsätta.</p>
    <input type="hidden" name="next" value="${next.replace(/"/g, '&quot;')}" />
    <label for="pw">Lösenord</label>
    <input id="pw" name="password" type="password" autocomplete="current-password"
      autofocus required />
    <button type="submit">Logga in</button>
    ${error ? '<div class="err">Fel lösenord. Försök igen.</div>' : ''}
  </form>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const password = (env && env.SITE_PASSWORD) || 'kurs2026';
  const expected = await tokenFor(password);
  const url = new URL(request.url);

  // Hantera inloggning
  if (request.method === 'POST' && url.pathname === '/__login') {
    const form = await request.formData();
    const supplied = String(form.get('password') || '');
    const dest = String(form.get('next') || '/') || '/';
    if (supplied === password) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: dest.startsWith('/') ? dest : '/',
          'Set-Cookie': `${COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return new Response(loginPage({ error: true, next: dest }), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Redan inloggad?
  if (getCookie(request, COOKIE) === expected) {
    return next();
  }

  // Inte inloggad -> visa grind
  return new Response(loginPage({ next: url.pathname + url.search }), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
