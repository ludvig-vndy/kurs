/* Kostnaden ska ga att se, inte gissas.

   Tidigare sparades bara output_tokens per anrop. Input ar cirka 89 procent
   av notan, sa det gick varken att saga vad en riktig kundfraga kostar eller
   om prompt-cachen traffar. Provet haller fast bada delarna: att falten
   plockas ur leverantorens usage, och att de summeras per moment aven nar
   svaret blockeras. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sys } from './_fraga-fixtur.mjs';
import { onRequestPost } from '../../functions/api/fraga.js';
import { tokensammanfattning } from '../../functions/api/_fraga-status.js';

const ENV = { ANTHROPIC_API_KEY: 'k' };
const anrop = q => onRequestPost({
  request: new Request('https://x.test/api/fraga', { method: 'POST', body: JSON.stringify({ question: q }) }),
  env: ENV,
});

test('varje modellanrop redovisar input, output och cachetraffar', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    const granskare = sys(b).startsWith('Du granskar ett svar');
    return new Response(JSON.stringify({
      content: granskare
        ? [{ type: 'text', text: '{"godkand":true}' }]
        : [{ type: 'tool_use', id: 's1', name: 'svara',
             input: { version: 1, block: [{ typ: 'metod', text: 'Kassaflodet sager nagot annat an resultatet.' }] } }],
      stop_reason: granskare ? 'end_turn' : 'tool_use',
      usage: { input_tokens: granskare ? 700 : 12000, output_tokens: granskare ? 5 : 120,
        cache_read_input_tokens: granskare ? 0 : 9000, cache_creation_input_tokens: granskare ? 0 : 3000 },
    }));
  };
  try {
    const d = await (await anrop('vad ar kassaflode')).json();
    const rad = d.tackning.anropstider.find(a => a.moment === 'svar');
    assert.equal(rad.inputTokens, 12000, 'inputtoken sparades inte');
    assert.equal(rad.cacheLast, 9000, 'cachetraffen sparades inte');
    assert.equal(rad.cacheSkrivet, 3000, 'cacheskrivningen sparades inte');
    assert.equal(d.tackning.tokens.svar.in, 12000);
    assert.equal(d.tackning.tokens.svar.cacheLast, 9000);
  } finally { globalThis.fetch = original; }
});

test('sammanfattningen summerar per moment och klarar tomma falt', () => {
  const ut = tokensammanfattning([
    { moment: 'svar', inputTokens: 100, outputTokens: 10, cacheLast: 60 },
    { moment: 'svar', inputTokens: 200, outputTokens: 20, cacheSkrivet: 40 },
    { moment: 'granskning', inputTokens: 50 },
  ]);
  assert.deepEqual(ut.svar, { anrop: 2, in: 300, ut: 30, cacheLast: 60, cacheSkrivet: 40 });
  assert.deepEqual(ut.granskning, { anrop: 1, in: 50, ut: 0, cacheLast: 0, cacheSkrivet: 0 });
  assert.equal(tokensammanfattning([]), undefined);
  assert.equal(tokensammanfattning(undefined), undefined);
});
