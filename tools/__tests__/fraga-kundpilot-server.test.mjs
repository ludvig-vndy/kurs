import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createCustomerPilot } from '../fraga-kundpilot-server.mjs';

test('local harness rejects foreign origins, traversal and oversized requests; reloads keys without exposing them', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kundpilot-test-'));
  const envFile = path.join(dir, '.env');
  await writeFile(envFile, '');
  const original = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const server = await createCustomerPilot({ port: 0, envFile, outDir: dir });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body, extra = {}) => fetch(origin + '/api/fraga', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const config = await (await fetch(origin + '/config')).json();
    assert.match(config.context, /Tomt lokalt arkiv/);
    assert.equal(config.anthropicReady, false);
    assert.equal((await fetch(origin + '/.env')).status, 404);
    assert.equal((await fetch(origin + '/tools/fraga-kundpilot-server.mjs')).status, 404);
    const foreign = await post({ question: 'Test', mode: 'baseline' }, { Origin: 'https://evil.example' });
    assert.equal(foreign.status, 403);
    assert.equal(foreign.headers.get('access-control-allow-origin'), null);
    assert.equal((await post({ question: 'Test', mode: 'baseline' }, { Origin: '' })).status, 403);
    assert.equal((await post({ question: 'Test', mode: 'baseline' })).status, 501);
    assert.equal((await post({ question: 'x'.repeat(270000), mode: 'baseline' })).status, 413);
    assert.equal((await post({ question: 'Test', mode: 'invalid' })).status, 400);
    await writeFile(envFile, 'ANTHROPIC_API_KEY=test-secret-never-return\nCHAT_API=other-secret-never-return\n');
    const updated = await (await fetch(origin + '/config')).text();
    assert.equal(JSON.parse(updated).anthropicReady, true);
    assert.equal(JSON.parse(updated).researchReady, true);
    assert.ok(!updated.includes('never-return'));
    const html = await (await fetch(origin)).text();
    assert.ok(!html.includes('__NONCE__'));
    assert.match(html, /FragaSvar.render/);
    for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  } finally {
    if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
