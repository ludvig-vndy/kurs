// LLM-klienten: leverantörsagnostiskt anrop via fetch, ingen SDK och inga nya
// beroenden. Nycklar läses ur miljön (OPENAI_API_KEY / ANTHROPIC_API_KEY) och
// saknas de ges ett tydligt fel. Kostnad räknas ur svarets tokenantal mot
// pristabellen nedan.
//
// PRISTABELLEN ÄR EN ÖGONBLICKSBILD (2026-07-07, USD per miljon tokens).
// Uppdatera mot aktuella prislistor innan kostnadssiffror citeras skarpt.

export const MODELLER = {
  'gpt-5.4-mini':     { leverantor: 'openai',    id: 'gpt-5.4-mini',       pris_in: 0.75, pris_ut: 4.50 },
  'gpt-5.5':          { leverantor: 'openai',    id: 'gpt-5.5',            pris_in: 5.00, pris_ut: 30.00 },
  'claude-haiku':     { leverantor: 'anthropic', id: 'claude-haiku-4-5-20251001', pris_in: 1.00, pris_ut: 5.00 },
  'claude-sonnet':    { leverantor: 'anthropic', id: 'claude-sonnet-4-6',  pris_in: 3.00, pris_ut: 15.00 }
};

export function nyckelFinns(modellnamn) {
  const m = MODELLER[modellnamn];
  if (!m) return false;
  return m.leverantor === 'openai' ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;
}

export async function anropa(modellnamn, { system, prompt, maxTokens = 4000, temperatur = 0, json = true }) {
  const m = MODELLER[modellnamn];
  if (!m) throw new Error(`Okänd modell "${modellnamn}". Kända: ${Object.keys(MODELLER).join(', ')}`);

  let text, tokIn, tokUt;

  if (m.leverantor === 'openai') {
    const nyckel = process.env.OPENAI_API_KEY;
    if (!nyckel) throw new Error('OPENAI_API_KEY saknas i miljön. Sätt: $env:OPENAI_API_KEY="sk-..."');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${nyckel}` },
      body: JSON.stringify({
        model: m.id, max_completion_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }]
      })
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    text = data.choices[0].message.content;
    tokIn = data.usage.prompt_tokens; tokUt = data.usage.completion_tokens;
  } else {
    const nyckel = process.env.ANTHROPIC_API_KEY;
    if (!nyckel) throw new Error('ANTHROPIC_API_KEY saknas i miljön. Sätt: $env:ANTHROPIC_API_KEY="sk-ant-..."');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': nyckel, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: m.id, max_tokens: maxTokens, temperature: temperatur,
        system, messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    text = data.content.map(c => c.text || '').join('');
    tokIn = data.usage.input_tokens; tokUt = data.usage.output_tokens;
  }

  const kostnad_usd = (tokIn * m.pris_in + tokUt * m.pris_ut) / 1e6;
  return { text, tokens_in: tokIn, tokens_ut: tokUt, kostnad_usd };
}

// Plockar första JSON-objektet ur ett svar (modeller lindar ibland in i ```json).
export function tolkaJson(text) {
  const start = text.indexOf('{');
  const slut = text.lastIndexOf('}');
  if (start < 0 || slut <= start) throw new Error('Inget JSON-objekt i svaret');
  return JSON.parse(text.slice(start, slut + 1));
}
