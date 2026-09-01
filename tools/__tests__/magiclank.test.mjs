// Magic-lankens slutforande. Provas har for att felet den gangen inte gick att
// se: snabbvagen i logga-in.astro satte da_session-cookien och navigerade vidare
// INNAN supabase-js hunnit skriva sin egen sessionsnyckel i localStorage
// (_getSessionFromURL vantar in ett natverksanrop till /auth/v1/user forst).
// Servergrinden slappte darfor in, medan varje labbsida som doms av localStorage
// skickade tillbaka till /logga-in. Kontraktet nedan ar att bada halvorna fylls.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaHash, felText, LAGRINGSNYCKEL } from '../../src/lib/magiclank.mjs';

// Osignerad JWT: bara nyttolasten las har, signaturen provas server-side i
// functions/_middleware.js. Paditgjorda varden, inget riktigt konto.
function jwt(payload) {
  const b = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  return b({ alg: 'ES256', typ: 'JWT' }) + '.' + b(payload) + '.signatur';
}
const TOKEN = jwt({
  sub: '00000000-0000-4000-8000-000000000000',
  email: 'provperson@exempel.se',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: { full_name: 'Prov Person' },
  exp: Math.round(Date.now() / 1000) + 3600,
});

test('tom hash ger inget', () => {
  assert.equal(tolkaHash(''), null);
  assert.equal(tolkaHash('#'), null);
  assert.equal(tolkaHash(undefined), null);
});

test('en hash utan access_token ar inte en session', () => {
  assert.equal(tolkaHash('#nagot=annat'), null);
});

test('brand eller utgangen lank ger ett fel som gar att visa', () => {
  const r = tolkaHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.equal(r.sort, 'fel');
  assert.equal(r.kod, 'otp_expired');
  const text = felText(r.kod);
  assert.match(text, /ny/i);              // sager vad man gor at det
  assert.doesNotMatch(text, /[—–]/);      // husregeln: inga tankstreck
});

test('okand felkod ger anda ett begripligt besked', () => {
  const t = felText('nagot_helt_annat');
  assert.ok(t.length > 10);
  assert.doesNotMatch(t, /[—–]/);
});

test('en giltig hash ger en session i supabase-js egen form', () => {
  const nu = Math.round(Date.now() / 1000);
  const r = tolkaHash('#access_token=' + TOKEN + '&refresh_token=rt_prov&expires_in=3600&token_type=bearer&type=magiclink');
  assert.equal(r.sort, 'session');
  const s = r.session;
  assert.equal(s.access_token, TOKEN);
  assert.equal(s.refresh_token, 'rt_prov');
  assert.equal(s.token_type, 'bearer');
  assert.equal(s.expires_in, 3600);
  assert.ok(Math.abs(s.expires_at - (nu + 3600)) <= 2);
  // _recoverAndRefresh laser dessa falt ur lagringen; saknas de hittar
  // supabase-js ingen session och sidan ser utloggad ut trots giltig cookie.
  for (const falt of ['access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'user']) {
    assert.ok(falt in s, 'saknar ' + falt);
  }
});

test('anvandaren lases ur token, sa kontochipet vet vem som ar inloggad', () => {
  const { session } = tolkaHash('#access_token=' + TOKEN + '&refresh_token=r&expires_in=3600');
  assert.equal(session.user.id, '00000000-0000-4000-8000-000000000000');
  assert.equal(session.user.email, 'provperson@exempel.se');
  assert.equal(session.user.user_metadata.full_name, 'Prov Person');
});

test('expires_at i hashen vinner over expires_in', () => {
  const { session } = tolkaHash('#access_token=' + TOKEN + '&refresh_token=r&expires_in=3600&expires_at=1893456000');
  assert.equal(session.expires_at, 1893456000);
});

test('trasig token far inte kasta, bara ge en session utan anvandare', () => {
  const { session } = tolkaHash('#access_token=inte.en.jwt&refresh_token=r&expires_in=3600');
  assert.equal(session.access_token, 'inte.en.jwt');
  assert.equal(session.user, null);
});

test('lagringsnyckeln ar den supabase-js sjalv anvander', () => {
  // sb-<projektref>-auth-token. Gar den isar laser klienten en annan nyckel an
  // den vi skriver, och inloggningen ser ut att inte fastna.
  assert.equal(LAGRINGSNYCKEL, 'sb-xpxghvxrckpzbbkjmtcw-auth-token');
});
