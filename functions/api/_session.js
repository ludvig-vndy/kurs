/* functions/api/_session.js  —  en vag in till "vem ar det som fragar".

   /api/* ar undantaget i _middleware.js, med motiveringen att funktionerna
   gor sin egen auth. Da maste den authen finnas pa ETT stalle, annars gor
   varje ny route sin egen tolkning och den svagaste blir gransen.

   Verifieringen ar verifieraSession() i _lib.js: samma lokala JWKS-kontroll
   som middleware anvander. Inget natanrop per request, och inget beroende
   till en anon-nyckel som inte ar satt nagonstans i projektet. En tidigare
   version av den har filen anropade /auth/v1/user med SUPABASE_ANON_KEY, och
   eftersom den variabeln inte finns hade den tyst returnerat null for alla.

   Ingen route laser cookien sjalv. Den anropar kravAnvandare() och far
   antingen ett user_id eller ett fardigt 401-svar. */

import { secureJson as json, verifieraSession } from './_lib.js';

/* Returnerar { id, epost } eller null. id ar auth-anvandarens uuid, alltsa
   samma varde som auth.uid() i databasens policyer. */
export async function laserAnvandare(context) {
  const payload = await verifieraSession(context.request);
  if (!payload || !payload.sub) return null;
  return { id: payload.sub, epost: String(payload.email || '').toLowerCase() };
}

/* Samma sak, men svarar 401 i stallet for null.
   Returnerar antingen { anvandare } eller { svar }, aldrig bada. */
export async function kravAnvandare(context) {
  const anvandare = await laserAnvandare(context);
  if (!anvandare) return { svar: json({ error: 'ej inloggad' }, 401) };
  return { anvandare };
}
