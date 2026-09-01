/* tools/__tests__/_db.mjs  —  anslutning för databastester.

   Läser TEST_DATABASE_URL, aldrig en inbyggd sträng, så ett test aldrig kan
   råka köra mot prod. Spärren mot prod-referensen är avsiktlig: ett test som
   kör mot skarp data är den dyraste sortens misstag och den billigaste att
   göra omöjlig. */

import pg from 'pg';
import { readFileSync } from 'node:fs';

const PROD_REF = 'xpxghvxrckpzbbkjmtcw';

function urEnvFil() {
  try {
    const rad = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
      .split('\n')
      .find((r) => r.startsWith('TEST_DATABASE_URL='));
    return rad ? rad.slice('TEST_DATABASE_URL='.length).trim() : null;
  } catch (e) {
    return null;
  }
}

export function kravUrl() {
  const url = process.env.TEST_DATABASE_URL || urEnvFil();
  if (!url) throw new Error('TEST_DATABASE_URL saknas. Satt den i .env eller i miljon.');
  if (url.includes(PROD_REF)) {
    throw new Error('TEST_DATABASE_URL pekar pa prod. Anvand testprojektet.');
  }
  return url;
}

/* Icke-kastande variant. Testerna anvander den for att HOPPA OVER i stallet
   for att falla, sa en maskin utan testdatabas inte rodmarkerar hela grinden. */
export function finnsUrl() {
  try { kravUrl(); return true; } catch (e) { return false; }
}

export async function anslut() {
  const klient = new pg.Client({
    connectionString: kravUrl(),
    // Supabases pooler kraver TLS men presenterar ett cert som inte gar att
    // kedja mot en rot vi har lokalt. Testanslutning mot en kand vard, sa
    // det ar acceptabelt har och ingen annanstans.
    ssl: { rejectUnauthorized: false },
  });
  await klient.connect();
  return klient;
}

/* Kör en funktion inne i en transaktion som alltid rullas tillbaka.
   Testerna lämnar därför aldrig något efter sig. */
export async function iTransaktion(klient, fn) {
  await klient.query('begin');
  try {
    return await fn();
  } finally {
    await klient.query('rollback');
  }
}
