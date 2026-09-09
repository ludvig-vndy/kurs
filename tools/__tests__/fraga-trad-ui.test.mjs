import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

for (const surface of ['fraga', 'dina-bolag']) test(`${surface}: follow-ups survive reload, reset and account changes discard late answers`, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.testSession = { user: { id: 'alice' }, access_token: 'alice-token' };
      window.authCallbacks = [];
      window.AB = { ready: true, getSession: async () => window.testSession,
        getUser: async () => window.testSession?.user, listHoldings: async () => [],
        onAuthChange: cb => window.authCallbacks.push(cb) };
      window.switchUser = id => {
        window.testSession = id ? { user: { id }, access_token: id + '-token' } : null;
        window.authCallbacks.forEach(cb => cb('SIGNED_IN', window.testSession));
      };
    });
    let number = 0, pending = null;
    const bodies = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/fraga') {
        bodies.push(route.request().postDataJSON()); number++;
        if (bodies.at(-1).question === 'HTTP-fel') {
          await route.fulfill({ status: 503, json: { error: 'Tillfälligt fel' } }); return;
        }
        if (bodies.at(-1).question.startsWith('Vänta')) {
          await new Promise(resolve => { pending = resolve; });
        }
        const blocked = bodies.at(-1).question === 'Blockera';
        await route.fulfill({ json: { answer: blocked ? 'Stoppat svar' : 'Synligt svar ' + number,
          blockerat: blocked, trad: blocked ? undefined : 'signed-' + number } });
        return;
      }
      if (url.origin === 'http://fraga.test' && (['/labs/fraga.html', '/labs/dina-bolag.html'].includes(url.pathname) || ['/fraga-svar.js', '/fraga-trad.js', '/fraga-svar.css'].includes(url.pathname))) {
        try {
          const body = await readFile(new URL('../../public' + url.pathname, import.meta.url));
          return route.fulfill({ body, contentType: url.pathname.endsWith('.html') ? 'text/html' : url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' });
        } catch {}
      }
      await route.fulfill({ body: '', contentType: 'application/javascript' });
    });
    const page = await context.newPage();
    await page.goto('http://fraga.test/labs/' + surface + '.html');
    async function ask(text) {
      await page.locator('#askinput').fill(text);
      await page.locator('#askform').evaluate(form => form.requestSubmit());
    }
    async function answered(n) { await page.getByText('Synligt svar ' + n, { exact: true }).waitFor({ state: 'attached' }); }
    await ask('Första frågan'); await answered(1);
    assert.equal(bodies[0].trad, ''); assert.equal(bodies[0].djup, false);
    await page.reload();
    await page.locator('#askinput').focus();
    await page.locator('#fraga-djup').check();
    await ask('Och kassan?'); await answered(2);
    assert.equal(bodies[1].trad, 'signed-1'); assert.equal(bodies[1].djup, true);
    await ask('Blockera'); await page.getByText('Stoppat svar', { exact: true }).waitFor({ state: 'attached' });
    await ask('Vänta reset');
    await page.waitForFunction(() => document.querySelector('[aria-busy="true"]'));
    while (!pending) await new Promise(r => setTimeout(r, 10));
    assert.equal(bodies[3].trad, 'signed-2');
    await page.locator('#fraga-reset').click(); pending(); pending = null;
    await page.waitForTimeout(100);
    assert.equal(await page.getByText('Synligt svar 4', { exact: true }).count(), 0);
    await ask('Efter reset'); await answered(5); assert.equal(bodies[4].trad, '');
    await ask('Vänta konto');
    while (!pending) await new Promise(r => setTimeout(r, 10));
    await page.evaluate(() => window.switchUser('bob'));
    pending(); pending = null; await page.waitForTimeout(100);
    assert.equal(await page.getByText('Synligt svar 5', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Synligt svar 6', { exact: true }).count(), 0);
    await ask('Bobs fråga'); await answered(7); assert.equal(bodies[6].trad, '');
    await page.evaluate(() => window.switchUser('alice'));
    await ask('Tillbaka'); await answered(8); assert.equal(bodies[7].trad, 'signed-5');
    const other = surface === 'fraga' ? 'dina-bolag' : 'fraga';
    await page.goto('http://fraga.test/labs/' + other + '.html');
    await ask('Andra ytan'); await answered(9); assert.equal(bodies[8].trad, 'signed-8');
    await ask('HTTP-fel'); await page.getByText('Tillfälligt fel', { exact: true }).waitFor({ state: 'attached' });
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); }; });
    await ask('Full lagring'); await answered(11); assert.equal(bodies[10].trad, 'signed-9');
    await ask('Minnet fungerar'); await answered(12); assert.equal(bodies[11].trad, 'signed-11');
    await page.evaluate(() => window.switchUser(null));
    await ask('Anonym fråga'); await answered(13); assert.equal(bodies[12].trad, '');
    await ask('Anonym igen'); await answered(14); assert.equal(bodies[13].trad, '');

  } finally { await browser.close(); }
});

 test('previous facts keep their source and clearly mark earlier answers', async () => {
  const vm = await import('node:vm');
  const scope = {};
  vm.runInNewContext(await readFile(new URL('../../public/fraga-svar.js', import.meta.url), 'utf8'), scope);
  const html = scope.FragaSvar.render({ block: [{ etikett: 'Rapporterat', tidigare: true, text: 'Q1 2025: 8 MSEK', kallor: [{ rubrik: 'Rapport', url: 'https://example.test/report' }] }] });
  assert.match(html, /Tidigare svar/);
  assert.match(html, /Q1 2025/);
  assert.match(html, /https:\/\/example.test\/report/);
});

test('deep coverage separates performed searches from unexamined questions without claiming answers', async () => {
  const vm = await import('node:vm');
  const scope = {};
  vm.runInNewContext(await readFile(new URL('../../public/fraga-svar.js', import.meta.url), 'utf8'), scope);
  const html = scope.FragaSvar.render({ answer: 'Svar', tackning: {
    samtal: { turer: 6, poster: 3, begransat: true },
    utredning: [
      { rubrik: 'Kassaflöde', status: 'undersokt', anrop: 1, nyaPoster: 0 },
      { rubrik: '<img src=x>', status: 'ej_undersokt', anrop: 0, nyaPoster: 0 }
    ]
  } });
  assert.match(html, /Sökningar gjorda: Kassaflöde/);
  assert.match(html, /Inte undersökt: &lt;img src=x&gt;/);
  assert.match(html, /betyder inte att frågan är besvarad/);
  assert.match(html, /Äldre delar av samtalet/);
  assert.doesNotMatch(html, /<img|nyaPoster|anrop/);
});

test('an auth event during initial session loading prevents older account history from reappearing', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const alice = { user: { id: 'alice' }, access_token: 'alice-token' };
      window.testSession = alice;
      let first = true;
      window.AB = {
        ready: true,
        getSession: () => {
          if (!first) return Promise.resolve(window.testSession);
          first = false;
          return new Promise(resolve => { window.resolveOldSession = () => resolve(alice); });
        },
        onAuthChange: callback => { window.authCallback = callback; }
      };
      for (const name of ['alice', 'bob']) localStorage.setItem('agarbrevet-fraga-trad:' + name, JSON.stringify({
        trad: name + '-signed', saved: Date.now(), turns: [{ question: name + ' question', response: { answer: name + ' private history' } }]
      }));
    });
    await context.route('**/*', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (['/labs/fraga.html', '/fraga-trad.js', '/fraga-svar.js', '/fraga-svar.css'].includes(pathname)) {
        return route.fulfill({ body: await readFile(new URL('../../public' + pathname, import.meta.url)),
          contentType: pathname.endsWith('.html') ? 'text/html' : pathname.endsWith('.css') ? 'text/css' : 'application/javascript' });
      }
      return route.fulfill({ body: '', contentType: 'application/javascript' });
    });
    const page = await context.newPage();
    await page.goto('http://fraga.test/labs/fraga.html');
    await page.waitForFunction(() => typeof window.resolveOldSession === 'function');
    await page.evaluate(() => {
      window.testSession = { user: { id: 'bob' }, access_token: 'bob-token' };
      window.authCallback('SIGNED_IN', window.testSession);
    });
    assert.equal(await page.getByText('bob private history', { exact: true }).count(), 1);
    await page.evaluate(async () => {
      window.resolveOldSession();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    assert.equal(await page.getByText('alice private history', { exact: true }).count(), 0);
    assert.equal(await page.getByText('bob private history', { exact: true }).count(), 1);
  } finally { await browser.close(); }
});

test('calculation details start closed while result, assumptions and provenance remain visible', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<main></main>');
    await page.addScriptTag({ content: await readFile(new URL('../../public/fraga-svar.js', import.meta.url), 'utf8') });
    await page.evaluate(() => {
      document.querySelector('main').innerHTML = FragaSvar.render({ block: [
        { typ: 'beraknat', etikett: 'Beräknat', text: [
          'Alfa, kassa, Q1 2026: 80 MSEK.',
          'Så räknades det: 100 - 20 = 80',
          'Andra ledet <img src=x onerror=alert(1)>',
          'Enheter i beräkningen: kronor till MSEK',
          'Förutsättning: Oförändrat antal aktier.',
          'Beräkningen vilar på egen uppgift, inte enbart rapporterade uppgifter.'
        ].join('\n'), kallor: [{ rubrik: 'Rapport', url: 'https://example.test/q1', citat: 'Källcitat' }] },
        { typ: 'rapporterat', etikett: 'Rapporterat', text: 'Rapporterat belopp\nAndra rapportraden', kallor: [] }
      ] });
    });
    const calculation = page.locator('.fraga-block').first();
    const details = calculation.locator('details').filter({ has: page.getByText('Så räknades det', { exact: true }) });
    assert.equal(await details.count(), 1);
    assert.equal(await details.evaluate(el => el.open), false);
    assert.equal(await page.getByText('Alfa, kassa, Q1 2026: 80 MSEK.', { exact: true }).isVisible(), true);
    const assumptions = calculation.locator('p').filter({ hasText: 'Förutsättning:' });
    assert.equal(await assumptions.isVisible(), true);
    assert.equal(await assumptions.evaluate(el => el.closest('details')), null);
    assert.equal(await calculation.locator('p').filter({ hasText: 'Beräkningen vilar på' }).isVisible(), true);
    assert.equal(await details.locator('p').isVisible(), false);
    assert.equal(await page.locator('img').count(), 0);
    assert.equal(await calculation.locator('.fraga-kalla summary').isVisible(), true);
    assert.equal(await page.locator('.fraga-block').nth(1).locator('details').count(), 0);
    assert.equal(await page.getByText('Rapporterat belopp', { exact: false }).isVisible(), true);
    await details.locator('summary').click();
    assert.equal(await details.locator('p').isVisible(), true);
    assert.match(await details.innerText(), /100 - 20 = 80/);
    assert.match(await details.innerText(), /Andra ledet <img src=x onerror=alert\(1\)>/);
    assert.match(await details.innerText(), /kronor till MSEK/);
  } finally { await browser.close(); }
});
