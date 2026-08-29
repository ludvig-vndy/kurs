import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/coach.js';

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
  return { PILOT_SECRET: 'hemlis', ANTHROPIC_API_KEY: 'sk-test', RL: falskKV(), ...over };
}

async function cookie(mejl = 'ludvig@vndy.se', sekunder = 3600, hemlighet = 'hemlis') {
  const utgang = Math.floor(Date.now() / 1000) + sekunder;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(hemlighet),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${mejl}|${utgang}`));
  let b = '';
  for (const x of new Uint8Array(bytes)) b += String.fromCharCode(x);
  const sig = btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `motparten_pilot=${encodeURIComponent(`${mejl}|${utgang}|${sig}`)}`;
}

async function post(kropp, { medCookie = true, origin = 'https://motparten.pages.dev', typ = 'application/json' } = {}) {
  const h = new Headers();
  if (typ) h.set('Content-Type', typ);
  if (origin) h.set('Origin', origin);
  if (medCookie) h.set('Cookie', await cookie());
  return new Request(URL_, { method: 'POST', headers: h, body: JSON.stringify(kropp) });
}

test('utan ANTHROPIC_API_KEY: 501', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }), env: env({ ANTHROPIC_API_KEY: '' }) });
  assert.equal(r.status, 501);
});

test('utan PILOT_SECRET: 501', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'hej' }), env: env({ PILOT_SECRET: '' }) });
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

test('tom fraga: 400', async () => {
  const r = await onRequestPost({ request: await post({ fraga: '   ' }), env: env() });
  assert.equal(r.status, 400);
});

test('for lang fraga: 400', async () => {
  const r = await onRequestPost({ request: await post({ fraga: 'a'.repeat(6001) }), env: env() });
  assert.equal(r.status, 400);
});

test('for stor kompletteringskontext: 400', async () => {
  const r = await onRequestPost({
    request: await post({
      fraga: 'a'.repeat(3000),
      komplettering: { ursprunglig_fraga: 'b'.repeat(4000), coachens_fraga: 'c'.repeat(2000) },
    }),
    env: env(),
  });
  assert.equal(r.status, 400);
});
