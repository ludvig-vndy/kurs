/* tools/__tests__/isolering.test.mjs  —  bevisar att tenantgränsen håller.

   Tre påståenden, alla mot en riktig Postgres:
     1. arbetet är nycklat på user_id, inte på en e-postadress
     2. de personliga tabellerna har force row level security, alltså biter
        policyn även på tabellägaren
     3. en användare kan inte läsa en annans rader

   Punkt 2 är inte en formalitet. Utan force kringgår ägaren policyn, och då
   är hela avsnittet ett dekorativt påslag som ingen märker är verkningslöst. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { anslut, iTransaktion } from './_db.mjs';

test('prospekt_arbete ar nycklad pa user_id, inte epost', async () => {
  const k = await anslut();
  try {
    const r = await k.query(`
      select a.attname
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
       where i.indrelid = 'prospekt_arbete'::regclass and i.indisunique`);
    const kolumner = r.rows.map((x) => x.attname);
    assert.ok(kolumner.includes('user_id'), 'user_id ska inga i en unik nyckel');
    assert.ok(!kolumner.includes('epost'), 'epost ska inte vara nyckel');
  } finally {
    await k.end();
  }
});

test('de personliga tabellerna har force row level security', async () => {
  const k = await anslut();
  try {
    const r = await k.query(`
      select relname, relrowsecurity, relforcerowsecurity
        from pg_class
       where relname in ('prospekt_arbete','prospekt_kop','motparten_deltagare')
       order by relname`);
    assert.equal(r.rows.length, 3, 'alla tre tabellerna ska finnas');
    for (const rad of r.rows) {
      assert.ok(rad.relrowsecurity, rad.relname + ': RLS ska vara pa');
      assert.ok(rad.relforcerowsecurity, rad.relname + ': force ska vara pa');
    }
  } finally {
    await k.end();
  }
});

test('anvandare A kan inte lasa anvandare B:s arbete', async () => {
  const k = await anslut();
  try {
    await iTransaktion(k, async () => {
      const a = '11111111-1111-1111-1111-111111111111';
      const b = '22222222-2222-2222-2222-222222222222';

      await k.query(
        `insert into auth.users (id, email) values ($1,'a@test.se'),($2,'b@test.se')`,
        [a, b]);
      await k.query(
        `insert into prospekt_arbete (user_id, epost, orgnr)
         values ($1,'a@test.se','5560000001')`, [a]);
      await k.query(
        `insert into prospekt_arbete (user_id, epost, orgnr)
         values ($1,'b@test.se','5560000002')`, [b]);

      // Byt till den roll klienten faktiskt kommer in som, och sätt den
      // claim auth.uid() läser. Först nu gäller policyn.
      await k.query(`set local role authenticated`);
      await k.query(
        `select set_config('request.jwt.claims', json_build_object('sub',$1)::text, true)`,
        [a]);

      const r = await k.query(`select orgnr from prospekt_arbete order by orgnr`);
      assert.deepEqual(r.rows.map((x) => x.orgnr), ['5560000001'],
        'A ska se sin egen rad och ingen annans');
    });
  } finally {
    await k.end();
  }
});
