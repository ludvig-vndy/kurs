/* functions/api/_session.js  —  en vag in till "vem ar det som fragar".

   /api/* ar undantaget i _middleware.js, med motiveringen att funktionerna
   gor sin egen auth. Da maste den authen finnas pa ETT stalle, annars gor
   varje ny route sin egen tolkning och den svagaste blir gransen.

   Ingen route laser cookien sjalv. Den anropar kravAnvandare() och far
   antingen ett user_id eller ett fardigt 401-svar. */

import { secureJson as json } from './_lib.js';

const COOKIE = 'da_session';

/* Laser da_session och returnerar { id, epost } eller null.

   Verifieringen gors av Supabase i stallet for lokalt mot JWKS. Det kostar
   en round trip per anrop, men det fangar ocksa aterkallade sessioner, och
   det slipper duplicera signaturkoden fran _middleware.js. Blir latensen ett
   problem ar ratt atgard att lyfta verifyJwt till _lib.js och dela den, inte
   att lata varje route gissa. */
export async function laserAnvandare(context) {
  const { request, env } = context;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  const cookie = request.headers.get('cookie') || '';
  const traff = new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)').exec(cookie);
  if (!traff) return null;

  let svar;
  try {
    svar = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + decodeURIComponent(traff[1]),
      },
    });
  } catch (e) {
    return null;
  }
  if (!svar.ok) return null;

  const anv = await svar.json();
  if (!anv || !anv.id) return null;
  return { id: anv.id, epost: (anv.email || '').toLowerCase() };
}

/* Samma sak, men svarar 401 i stallet for null.
   Returnerar antingen { anvandare } eller { svar }, aldrig bada. */
export async function kravAnvandare(context) {
  const anvandare = await laserAnvandare(context);
  if (!anvandare) return { svar: json({ error: 'ej inloggad' }, 401) };
  return { anvandare };
}
