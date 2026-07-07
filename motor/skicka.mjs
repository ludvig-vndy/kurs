// Mejlutskicket via Resend: ren fetch, ingen SDK. Nyckeln läses ur RESEND_API_KEY.
// Utan verifierad egen domän skickar Resend bara från onboarding@resend.dev och
// bara till kontoägarens adress, vilket räcker exakt för alphans två mottagare
// tills domänen är verifierad (Resend-konsolen, två DNS-poster).

export async function skicka({ till, fran, amne, html }) {
  const nyckel = process.env.RESEND_API_KEY;
  if (!nyckel) throw new Error('RESEND_API_KEY saknas i miljön. Skapa nyckel på resend.com, sätt: $env:RESEND_API_KEY="re_..."');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${nyckel}` },
    body: JSON.stringify({ from: fran, to: till, subject: amne, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}
