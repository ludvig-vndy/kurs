import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, granskaIndata } from '../../functions/api/coach.js';

const URL_ = 'https://motparten.pages.dev/api/coach';

function falskKV() {
  const m = new Map();
  return {
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => { m.set(k, v); },
  };
}

/** En miljo dar allt finns. `over` slar bort eller ersatter delar. */
function env(over = {}) {
  return { ANTHROPIC_API_KEY: 'sk-test', RL: falskKV(), ...over };
}

function cookie() {
  // Bara for de negativa fallen. En giltig Supabase-JWT gar inte att forfalska
  // offline, sa allt som kraver en inloggad session testas mot granskaIndata
  // direkt eller i integration.
  return 'da_session=ogiltig.token.har';
}

async function post(kropp, { medCookie = true, origin = 'https://motparten.pages.dev', typ = 'application/json' } = {}) {
  const h = new Headers();
  if (typ) h.set('Content-Type', typ);
  if (origin) h.set('Origin', origin);
  if (medCookie) h.set('Cookie', cookie());
  return new Request(URL_, { method: 'POST', headers: h, body: JSON.stringify(kropp) });
}

test('utan ANTHROPIC_API_KEY: 501', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }), env: env({ ANTHROPIC_API_KEY: '' }) });
  assert.equal(r.status, 501);
});

test('utan RL-bindning: 501, aldrig ostrypt', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }), env: env({ RL: null }) });
  assert.equal(r.status, 501);
});

test('utan cookie: 401', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }, { medCookie: false }), env: env() });
  assert.equal(r.status, 401);
});

test('fel origin: 403', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }, { origin: 'https://ond.example' }), env: env() });
  assert.equal(r.status, 403);
});

test('saknad origin: 403', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }, { origin: null }), env: env() });
  assert.equal(r.status, 403);
});

test('fel content-type: 415', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }, { typ: 'text/plain' }), env: env() });
  assert.equal(r.status, 415);
});

test('med cookie men ogiltig session: 401', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }), env: env() });
  assert.equal(r.status, 401);
});

// Indatagranskningen ligger bakom sessionskollen i onRequestPost, vilket ar
// ratt: en oinloggad ska inte kunna kosta oss parsning. Den testas darfor
// direkt som ren funktion.
test('tom fraga avvisas', () => {
  assert.equal(granskaIndata({ fraga: '   ' }).fel, 'Skriv en fraga forst.');
});

test('trasig kropp avvisas', () => {
  assert.equal(granskaIndata(null).fel, 'Trasig begaran.');
});

test('for lang fraga avvisas', () => {
  assert.match(granskaIndata({ fraga: 'a'.repeat(6001) }).fel, /hogst/);
});

test('for stor kompletteringskontext avvisas', () => {
  const fel = granskaIndata({
    fraga: 'a'.repeat(3000),
    komplettering: { ursprunglig_fraga: 'b'.repeat(4000), coachens_fraga: 'c'.repeat(2000) },
  }).fel;
  assert.match(fel, /For mycket text/);
});

test('giltig kropp slapps igenom', () => {
  const r = granskaIndata({ fraga: 'Hur bokar jag mote?' });
  assert.equal(r.fel, undefined);
  assert.equal(r.fraga, 'Hur bokar jag mote?');
});
