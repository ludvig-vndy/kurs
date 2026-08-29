import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifieraPilot, PILOT_COOKIE } from '../../functions/api/_lib.js';

const HEMLIGHET = 'testhemlighet';

/** Bygger en giltig cookie pa samma satt som pilot-login.js gor. */
async function bakaCookie(mejl, utgang, hemlighet = HEMLIGHET) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(hemlighet),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${mejl}|${utgang}`));
  let b = '';
  for (const x of new Uint8Array(bytes)) b += String.fromCharCode(x);
  const sig = btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${mejl}|${utgang}|${sig}`;
}

function begaran(cookievarde) {
  const h = new Headers();
  if (cookievarde !== null) h.set('Cookie', `${PILOT_COOKIE}=${encodeURIComponent(cookievarde)}`);
  return new Request('https://motparten.pages.dev/api/coach', { headers: h });
}

const IMORGON = Math.floor(Date.now() / 1000) + 3600;
const IGAR = Math.floor(Date.now() / 1000) - 3600;

test('giltig cookie slapps igenom', async () => {
  const c = await bakaCookie('ludvig@vndy.se', IMORGON);
  assert.equal(await verifieraPilot(begaran(c), HEMLIGHET), true);
});

test('utgangen cookie nekas', async () => {
  const c = await bakaCookie('ludvig@vndy.se', IGAR);
  assert.equal(await verifieraPilot(begaran(c), HEMLIGHET), false);
});

test('fel hemlighet nekas', async () => {
  const c = await bakaCookie('ludvig@vndy.se', IMORGON, 'annan');
  assert.equal(await verifieraPilot(begaran(c), HEMLIGHET), false);
});

test('manipulerad mejladress nekas', async () => {
  const c = await bakaCookie('ludvig@vndy.se', IMORGON);
  const [, utgang, sig] = c.split('|');
  assert.equal(await verifieraPilot(begaran(`angripare@x.se|${utgang}|${sig}`), HEMLIGHET), false);
});

test('utan cookie nekas', async () => {
  assert.equal(await verifieraPilot(begaran(null), HEMLIGHET), false);
});

test('utan hemlighet nekas', async () => {
  const c = await bakaCookie('ludvig@vndy.se', IMORGON);
  assert.equal(await verifieraPilot(begaran(c), ''), false);
});
