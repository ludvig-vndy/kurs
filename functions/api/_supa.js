/* functions/api/_supa.js  —  tunn klient mot Supabases REST-API.

   Övriga funktioner inlinar sina anrop. Prospektlistan gör tillräckligt många
   för att det ska löna sig att samla dem, men mönstret är detsamma: service-
   nyckeln, aldrig anon-nyckeln, och scoping sker server-side.

   Ligger separat från _lib.js med flit, så den här grenen inte krockar med
   annat pågående arbete i den filen. */

const FALLBACK_URL = 'https://xpxghvxrckpzbbkjmtcw.supabase.co';

export function supaConfig(env) {
  const secret = env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return {
    base: env.SUPABASE_URL || FALLBACK_URL,
    headers: {
      apikey: secret,
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/json',
    },
  };
}

export async function supaGet(cfg, path) {
  const r = await fetch(cfg.base + '/rest/v1/' + path, { headers: cfg.headers });
  if (!r.ok) throw new Error('supabase GET ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.json();
}

/* Upsert med on_conflict, så ett andra anrop på samma rad uppdaterar i
   stället för att spränga unique-villkoret. */
export async function supaUpsert(cfg, table, rows, onConflict) {
  const url = cfg.base + '/rest/v1/' + table +
    (onConflict ? '?on_conflict=' + encodeURIComponent(onConflict) : '');
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error('supabase UPSERT ' + r.status + ': ' + (await r.text()).slice(0, 200));
}

export async function supaDelete(cfg, path) {
  const r = await fetch(cfg.base + '/rest/v1/' + path, {
    method: 'DELETE',
    headers: { ...cfg.headers, Prefer: 'return=minimal' },
  });
  if (!r.ok) throw new Error('supabase DELETE ' + r.status + ': ' + (await r.text()).slice(0, 200));
}
