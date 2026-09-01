/* Slutforandet av en magic-lank, den del som gar att prova utan webblasare.
   Anvands av src/pages/logga-in.astro (buntas in av Vite) och provas av
   tools/__tests__/magiclank.test.mjs.

   Bakgrunden, sa den inte gar forlorad: inloggningen har TVA halvor som maste
   fyllas samtidigt.

     1. da_session-cookien. Servergrinden i functions/_middleware.js verifierar
        JWT:ns signatur mot Supabases JWKS. Det ar den riktiga grinden.
     2. localStorage['sb-<ref>-auth-token']. supabase-js laser den vid sidladdning,
        och labbsidorna (public/labs/site-masthead.js) domer inloggat lage pa den.

   Snabbvagen som lades in 2026-07-12 fyllde bara halva ett: den satte cookien ur
   URL-hashen och navigerade vidare direkt. Det ar snabbare an supabase-js hinner,
   for _getSessionFromURL vantar in ett natverksanrop till /auth/v1/user innan den
   skriver sin nyckel. Foljden blev en snurra som sag ut som ett trasigt mejl:
   servern slappte in, klienten skickade tillbaka till /logga-in.

   Darfor byggs sessionen har, synkront, i exakt den form supabase-js sjalv sparar,
   och bada halvorna skrivs innan vi navigerar. */

// Projektreferensen ur SUPABASE_URL. Byter projektet maste den byta har ocksa,
// annars skriver vi till en nyckel ingen laser.
export const LAGRINGSNYCKEL = 'sb-xpxghvxrckpzbbkjmtcw-auth-token';

/* Nyttolasten ur en JWT, utan att verifiera signaturen. Det ar i sin ordning:
   det enda vi anvander den till ar att fylla i namn och mejl i granssnittet.
   Alla behorighetsbeslut tas server-side, dar signaturen faktiskt provas. */
function nyttolast(token) {
  try {
    const del = String(token).split('.');
    if (del.length !== 3) return null;
    let s = del[1].replace(/-/g, '+').replace(/_/g, '/');
    s += '==='.slice((s.length + 3) % 4);
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(u));
  } catch (e) {
    return null;
  }
}

function anvandare(token) {
  const p = nyttolast(token);
  if (!p || !p.sub) return null;
  return {
    id: p.sub,
    aud: p.aud || 'authenticated',
    role: p.role || 'authenticated',
    email: p.email || '',
    user_metadata: p.user_metadata || {},
    app_metadata: p.app_metadata || {},
  };
}

/* Vad hashen efter ett lankklick betyder. Tre utfall, och det tredje ar det som
   saknades: en brand eller utgangen lank landar HAR, med skalet i URL:en, och
   utan det har blocket sag anvandaren bara inloggningsformularet igen utan ett
   ord om varfor. */
export function tolkaHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!h) return null;
  const p = new URLSearchParams(h);

  const fel = p.get('error_code') || p.get('error');
  if (fel) return { sort: 'fel', kod: fel, beskrivning: p.get('error_description') || '' };

  const token = p.get('access_token');
  if (!token) return null;

  const nu = Math.round(Date.now() / 1000);
  const giltigI = parseInt(p.get('expires_in') || '3600', 10) || 3600;
  const gar_ut = parseInt(p.get('expires_at') || '', 10) || nu + giltigI;

  return {
    sort: 'session',
    session: {
      access_token: token,
      refresh_token: p.get('refresh_token') || null,
      token_type: p.get('token_type') || 'bearer',
      expires_in: giltigI,
      expires_at: gar_ut,
      user: anvandare(token),
    },
  };
}

/* Felet i klartext. Sager vad som hant och vad man gor at det, aldrig felkoden
   rakt av: "otp_expired" hjalper ingen som star och vill logga in. */
export function felText(kod) {
  switch (String(kod || '')) {
    case 'otp_expired':
      return 'Länken har gått ut eller är redan använd. Skicka en ny så får du en färsk.';
    case 'access_denied':
      return 'Länken gick inte att använda. Skicka en ny och öppna den i samma webbläsare.';
    default:
      return 'Inloggningslänken fungerade inte. Skicka en ny och försök igen.';
  }
}
