# Riktiga konton och en tenantgräns som håller

> **För agentiska arbetare:** OBLIGATORISK UNDERSKILL: använd superpowers:subagent-driven-development (rekommenderas) eller superpowers:executing-plans för att genomföra planen uppgift för uppgift. Stegen använder kryssrutor (`- [ ]`) för spårning.

**Mål:** Låt prospektdelen födas med riktiga Supabase-konton, `user_id` som nyckel och RLS-policyer som håller, i stället för med den e-postnyckel och pilotcookie som var tänkta som ett provisorium.

**Arkitektur:** `supabase/migrations/20260829140000_prospektlistor.sql` är **aldrig applicerad**. Kontrollerat mot projektet `xpxghvxrckpzbbkjmtcw` den 1 september 2026: `public` innehåller `decisions`, `holdings`, `invites`, `profiles`, `subscriptions` och `theses`, men ingen tabell som börjar på `prospekt`. Den senare migrationen `20260830150000_tes.sql` är däremot körd, så prospektlistor hoppades över med flit eftersom den bor på en omergad gren.

Därför rättas filen **på plats** i stället för att tre migrationer läggs ovanpå den. Ingen backfill, inga avbrottsvillkor, ingen risk att tappa data som inte finns. Pilotcookien i `functions/api/pilot-login.js` ersätts av Supabase-session plus en rättighetsrad, så att skiljelinjen mot Delägaren som `functions/_middleware.js` rad 133 beskriver hålls kvar.

**Tech Stack:** Postgres (Supabase), Cloudflare Pages Functions, `node --test` för testerna, `pg` som testklient.

---

## Förutsättningar

- [ ] **En testdatabas.** Ett andra Supabase-projekt, inte en tom Postgres: testerna behöver `auth.users` och `auth.uid()`, som är Supabase-specifika. Anslutningen läses ur `TEST_DATABASE_URL` i `.env`, som redan ligger i `.gitignore`. Använd **Session pooler**, inte Transaction pooler, eftersom `set local` annars inte överlever mellan satser.
- [ ] **Egen gren.** `git switch -c konton-och-rls`
- [ ] **Grenen `prospektlista` behöver inte utredas först.** Divergensen mellan fil och databas visade sig inte finnas, eftersom ingenting är applicerat. Den ocommittade omskrivningen från `prospekt_rad` till `prospekt_bolag` är helt enkelt den aktuella versionen och committas som en del av uppgift 2.

---

## Filstruktur

| Fil | Ansvar |
| --- | --- |
| `supabase/migrations/20260829140000_prospektlistor.sql` | Ändras på plats: `user_id` som nyckel, deltagartabellen, RLS-policyer, `force row level security` |
| `functions/api/_session.js` | Läser Supabase-sessionen och returnerar `user_id`. En väg in, ingen route gör det själv |
| `functions/_middleware.js` | Ändras: Motparten kräver session **och** rättighet |
| `functions/api/prospekt/arbete.js` | Ändras: scopar på `user_id` |
| `functions/api/prospekt/lista.js` | Ändras: scopar på `user_id` |
| `functions/api/pilot-login.js` | Tas bort i sista uppgiften |
| `tools/__tests__/_db.mjs` | Anslutningshjälpare för databastester |
| `tools/__tests__/isolering.test.mjs` | Bevisar att användare A inte når användare B |

---

## Uppgift 1: Testklient och en databas att köra mot

**Filer:**
- Ändra: `package.json`
- Skapa: `tools/__tests__/_db.mjs`

- [ ] **Steg 1: Lägg till testklienten**

```bash
npm install --save-dev pg@8.13.1
```

- [ ] **Steg 2: Skriv anslutningshjälparen**

Skapa `tools/__tests__/_db.mjs`:

```javascript
/* Anslutning för databastester. Läser TEST_DATABASE_URL, aldrig en
   inbyggd sträng, så ett test aldrig kan råka köra mot prod. */
import pg from 'pg';
import { readFileSync } from 'node:fs';

function urEnvFil() {
  try {
    const rad = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
      .split('\n').find((r) => r.startsWith('TEST_DATABASE_URL='));
    return rad ? rad.slice('TEST_DATABASE_URL='.length).trim() : null;
  } catch (e) {
    return null;
  }
}

export function kravUrl() {
  const url = process.env.TEST_DATABASE_URL || urEnvFil();
  if (!url) throw new Error('TEST_DATABASE_URL saknas. Satt den i .env eller i miljon.');
  if (/xpxghvxrckpzbbkjmtcw/.test(url)) {
    throw new Error('TEST_DATABASE_URL pekar pa prod. Anvand testprojektet.');
  }
  return url;
}

export async function anslut() {
  const klient = new pg.Client({ connectionString: kravUrl() });
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
```

Spärren mot prod-referensen är avsiktlig. Ett test som råkar köra mot prod är den dyraste sortens misstag och den billigaste att omöjliggöra.

- [ ] **Steg 3: Verifiera att anslutningen fungerar**

Kör: `node -e "import('./tools/__tests__/_db.mjs').then(async m => { const k = await m.anslut(); console.log((await k.query('select current_database()')).rows[0]); await k.end(); })"`

Förväntat: `{ current_database: 'postgres' }`.

- [ ] **Steg 4: Commit**

```bash
git add package.json package-lock.json tools/__tests__/_db.mjs
git commit -m "test: anslutningshjalpare for databastester"
```

---

## Uppgift 2: Migrationen föds rätt

Filen är aldrig applicerad. Den rättas därför på plats, med tre ändringar: nyckeln blir `user_id`, deltagartabellen tillkommer, och RLS får policyer i stället för att bara vara påslagen.

**Filer:**
- Ändra: `supabase/migrations/20260829140000_prospektlistor.sql`
- Test: `tools/__tests__/isolering.test.mjs`

- [ ] **Steg 1: Skriv det misslyckande testet**

Skapa `tools/__tests__/isolering.test.mjs`:

```javascript
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
       where relname in ('prospekt_arbete','prospekt_kop','motparten_deltagare')`);
    assert.equal(r.rows.length, 3);
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
        `insert into auth.users (id, email) values ($1,'a@test.se'),($2,'b@test.se')`, [a, b]);
      await k.query(
        `insert into prospekt_arbete (user_id, epost, orgnr) values ($1,'a@test.se','5560000001')`, [a]);
      await k.query(
        `insert into prospekt_arbete (user_id, epost, orgnr) values ($1,'b@test.se','5560000002')`, [b]);

      await k.query(`set local role authenticated`);
      await k.query(
        `select set_config('request.jwt.claims', json_build_object('sub',$1)::text, true)`, [a]);

      const r = await k.query(`select orgnr from prospekt_arbete order by orgnr`);
      assert.deepEqual(r.rows.map((x) => x.orgnr), ['5560000001'],
        'A ska se sin egen rad och ingen annans');
    });
  } finally {
    await k.end();
  }
});
```

- [ ] **Steg 2: Kör testet och se att det misslyckas**

Kör: `node --test tools/__tests__/isolering.test.mjs`

Förväntat: FAIL, `relation "prospekt_arbete" does not exist`. Tabellerna finns inte än, vare sig i test eller prod.

Går insert mot `auth.users` senare inte igenom på grund av en NOT NULL-kolumn i Supabases egen tabell, lägg till fälten felmeddelandet namnger. Hela testet ligger i en transaktion som rullas tillbaka, så inget blir kvar oavsett hur många kolumner som behövs.

- [ ] **Steg 3: Byt nyckel på prospekt_arbete**

I `supabase/migrations/20260829140000_prospektlistor.sql`, ersätt kommentarsblocket och tabellhuvudet för `prospekt_arbete`:

```sql
-- fore
--   Nyckeln ar (epost, orgnr), alltsa personen och BOLAGET. Tre foljder:
create table prospekt_arbete (
  id uuid primary key default gen_random_uuid(),
  epost text not null,
  orgnr text not null,
  lista_id uuid references prospekt_lista(id) on delete set null,
  user_id uuid references profiles(id) on delete cascade,
```

```sql
-- efter
--   Nyckeln ar (user_id, orgnr), alltsa personen och BOLAGET. Tre foljder:
create table prospekt_arbete (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  epost text not null,          -- data, inte nyckel. Behovs av prospekt_glom()
  orgnr text not null,
  lista_id uuid references prospekt_lista(id) on delete set null,
```

och längst ned i samma tabell:

```sql
-- fore
  unique (epost, orgnr)
-- efter
  unique (user_id, orgnr)
```

- [ ] **Steg 4: Byt nyckel på prospekt_kop och rätta indexen**

```sql
-- prospekt_kop, fore
  epost text not null,                          -- alltid gemener
  user_id uuid references profiles(id) on delete cascade,  -- fylls när Motparten får konton
  ...
  unique (lista_id, epost)
);
alter table prospekt_kop enable row level security;
create index on prospekt_kop (epost);

-- efter
  user_id uuid not null references profiles(id) on delete cascade,
  epost text not null,                          -- alltid gemener, data inte nyckel
  ...
  unique (lista_id, user_id)
);
alter table prospekt_kop enable row level security;
create index on prospekt_kop (user_id);
```

och indexen på `prospekt_arbete`:

```sql
-- fore
create index on prospekt_arbete (epost, lista_id);
create index on prospekt_arbete (epost, nasta_datum) where nasta_datum is not null;
-- efter
create index on prospekt_arbete (user_id, lista_id);
create index on prospekt_arbete (user_id, nasta_datum) where nasta_datum is not null;
```

- [ ] **Steg 5: Lägg till deltagartabellen**

`functions/_middleware.js` rad 133 till 136 säger uttryckligen att Delägaren och Motparten är skilda produkter och att Delägarens JWT inte ska släppa in på Motparten. Den gränsen ska hållas. En giltig session räcker alltså inte, det krävs också en rättighet.

Lägg in efter enum-blocket, före `prospekt_lista`:

```sql
-- ── motparten_deltagare (vem som far komma in) ────────────────────────
--
-- Ersatter ALLOWLIST i pilot-login.js. En giltig Supabase-session racker
-- INTE: middleware kraver bade session och en rad har. Skiljelinjen mellan
-- Delagaren och Motparten som _middleware.js rad 133 beskriver halls
-- darfor kvar aven nar bada produkterna delar inloggning.
create table motparten_deltagare (
  user_id    uuid primary key references profiles(id) on delete cascade,
  epost      text not null,
  kalla      text not null default 'pilot',   -- 'pilot' | 'stripe' | 'manuell'
  created_at timestamptz not null default now()
);
alter table motparten_deltagare enable row level security;
alter table motparten_deltagare force row level security;

create policy deltagare_egen on motparten_deltagare
  for select to authenticated using (user_id = auth.uid());
```

- [ ] **Steg 6: Lägg till policyerna längst ned i filen**

Före `prospekt_glom`:

```sql
-- ── Tenantgransen ─────────────────────────────────────────────────────
--
-- RLS var tidigare pasl aget utan policyer, alltsa neka-allt mot
-- anon-nyckeln, medan Pages Functions gjorde scopingen med service-nyckeln.
-- Det holl sa lange det fanns exakt en vag in. Verktyget blir en egen
-- deploy, alltsa finns snart tva, och da ska gransen ligga dar bada
-- passerar.
--
-- force behovs eftersom tabellagaren annars kringgar policyn, precis som
-- superuser och bypassrls gor.
alter table prospekt_arbete        force row level security;
alter table prospekt_kop           force row level security;
alter table prospekt_lista         force row level security;
alter table prospekt_bolag         force row level security;
alter table prospekt_arbetsstalle  force row level security;

-- Egna rader, inget annat. Inget medlemskapsuppslag, eftersom kunden ar en
-- ensam saljare: se docs/superpowers/specs/2026-08-30-saljverktyget-design.md
-- avsnitt 2. Den dagen en saljorganisation ska stodjas ar det en annan
-- produkt och en annan policy.
create policy arbete_eget on prospekt_arbete
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy kop_eget on prospekt_kop
  for select to authenticated using (user_id = auth.uid());

-- Listorna och bolagen ar inte personliga, men far bara lasas av den som
-- kopt listan. prospekt_kop ar grinden.
create policy lista_kopt on prospekt_lista
  for select to authenticated
  using (exists (select 1 from prospekt_kop k
                  where k.lista_id = prospekt_lista.id and k.user_id = auth.uid()));

create policy bolag_kopt on prospekt_bolag
  for select to authenticated
  using (exists (select 1 from prospekt_kop k
                  where k.lista_id = prospekt_bolag.lista_id and k.user_id = auth.uid()));

create policy arbetsstalle_kopt on prospekt_arbetsstalle
  for select to authenticated
  using (exists (select 1 from prospekt_kop k
                  where k.lista_id = prospekt_arbetsstalle.lista_id and k.user_id = auth.uid()));
```

- [ ] **Steg 7: Rätta prospekt_glom så den går via user_id**

```sql
-- efter
create or replace function prospekt_glom(p_epost text)
returns int language plpgsql security definer set search_path = public as $$
declare n int; v_user uuid;
begin
  select id into v_user from profiles where lower(email) = lower(p_epost);
  delete from prospekt_arbete where user_id = v_user;
  get diagnostics n = row_count;
  delete from prospekt_kop where user_id = v_user;
  delete from motparten_deltagare where user_id = v_user;
  update prospekt_bestallning set bestallare_epost = '(raderad)', bestallare_namn = null
   where bestallare_epost = lower(p_epost);
  return n;
end; $$;
```

- [ ] **Steg 8: Kör migrationen mot testdatabasen**

Kör: `node -e "import('./tools/__tests__/_db.mjs').then(async m => { const k = await m.anslut(); const fs = await import('node:fs'); await k.query(fs.readFileSync('supabase/migrations/20260829140000_prospektlistor.sql','utf8')); console.log('ok'); await k.end(); })"`

Förväntat: `ok`.

- [ ] **Steg 9: Kör testerna**

Kör: `node --test tools/__tests__/isolering.test.mjs`

Förväntat: PASS, tre tester.

- [ ] **Steg 10: Commit**

```bash
git add supabase/migrations/20260829140000_prospektlistor.sql tools/__tests__/isolering.test.mjs
git commit -m "feat(prospekt): schemat fods med user_id som nyckel och RLS som biter"
```

---

## Uppgift 3: Sessionen och rättigheten

**Filer:**
- Skapa: `functions/api/_session.js`
- Ändra: `functions/_middleware.js`

- [ ] **Steg 1: Skriv sessionsläsaren**

Skapa `functions/api/_session.js`:

```javascript
/* functions/api/_session.js  —  en väg in till "vem är det som frågar".

   Ingen route läser cookien själv. Varje route som rör personlig data
   anropar kravAnvandare() och får ett user_id eller ett 401-svar. */

import { secureJson as json } from './_lib.js';

/* Läser da_session-cookien och returnerar auth-användarens id, eller null. */
export async function laserAnvandare(context) {
  const { request, env } = context;
  const cookie = request.headers.get('cookie') || '';
  const traff = /(?:^|;\s*)da_session=([^;]+)/.exec(cookie);
  if (!traff) return null;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  const svar = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + decodeURIComponent(traff[1]),
    },
  });
  if (!svar.ok) return null;
  const anv = await svar.json();
  return anv && anv.id ? { id: anv.id, epost: anv.email } : null;
}

/* Samma sak, men svarar 401 i stället för null. Returnerar antingen
   { anvandare } eller { svar }, aldrig båda. */
export async function kravAnvandare(context) {
  const anvandare = await laserAnvandare(context);
  if (!anvandare) return { svar: json({ error: 'ej inloggad' }, 401) };
  return { anvandare };
}
```

- [ ] **Steg 2: Kräv session och rättighet på Motparten-värden**

I `functions/_middleware.js`, ersätt raderna 137 till 141:

```javascript
// fore
  if (motparten) {
    if (PILOT_SIDA.has(normalizePath(url.pathname))) return next();
    if (await verifieraPilot(request, env && env.PILOT_SECRET)) return next();
    return Response.redirect(new URL('/pilot', url.origin).toString(), 302);
  }
```

```javascript
// efter
  if (motparten) {
    if (PILOT_SIDA.has(normalizePath(url.pathname))) return next();
    // Riktigt konto PLUS rattighet. Enbart en giltig JWT racker inte:
    // skiljelinjen mot Delagaren ligger i motparten_deltagare, inte i
    // franvaron av en delad session.
    const token = getCookie(request, COOKIE);
    if (token && (await verifyJwt(token)) && (await arDeltagare(token, env))) return next();
    // Pilotcookien lever kvar tills uppgift 5.
    if (await verifieraPilot(request, env && env.PILOT_SECRET)) return next();
    return Response.redirect(new URL('/pilot', url.origin).toString(), 302);
  }
```

och lägg till hjälparen ovanför `onRequest`:

```javascript
/* Rattighetskollen for Motparten. Slar upp deltagarraden med anvandarens
   EGEN token, sa RLS-policyn deltagare_egen ar det som svarar. Saknas
   raden blir svaret en tom lista, alltsa nej. */
async function arDeltagare(token, env) {
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;
  try {
    const r = await fetch(
      env.SUPABASE_URL + '/rest/v1/motparten_deltagare?select=user_id&limit=1',
      { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
    if (!r.ok) return false;
    const rader = await r.json();
    return Array.isArray(rader) && rader.length === 1;
  } catch (e) {
    return false;
  }
}
```

- [ ] **Steg 3: Verifiera**

Kör: `npm run check && npm run test:tools`

Förväntat: gröna grindar. Beteendet i webbläsaren verifieras i uppgift 5, efter att schemat är applicerat i prod.

- [ ] **Steg 4: Commit**

```bash
git add functions/api/_session.js functions/_middleware.js
git commit -m "feat(auth): Motparten kraver konto plus rattighet"
```

---

## Uppgift 4: Rutterna scopar på user_id

**Filer:**
- Ändra: `functions/api/prospekt/arbete.js`
- Ändra: `functions/api/prospekt/lista.js`

- [ ] **Steg 1: Byt scoping i arbete.js**

Rad 17, importen:

```javascript
// fore
import { pilotAdress } from '../_lib.js';
// efter
import { kravAnvandare } from '../_session.js';
```

Rad 43, identiteten:

```javascript
// fore
const adress = await pilotAdress(request, env);
// efter
const { anvandare, svar } = await kravAnvandare(context);
if (svar) return svar;
```

Rad 93 till 94, köpen:

```javascript
// fore
const kopta = await supaGet(cfg,
  `prospekt_kop?select=lista_id&epost=eq.${encodeURIComponent(adress)}`);
// efter
const kopta = await supaGet(cfg,
  `prospekt_kop?select=lista_id&user_id=eq.${encodeURIComponent(anvandare.id)}`);
```

Rad 110, filtret vid radering:

```javascript
// fore
`&epost=eq.${encodeURIComponent(adress)}`);
// efter
`&user_id=eq.${encodeURIComponent(anvandare.id)}`);
```

Rad 114 till 124, upserten:

```javascript
// fore
await supaUpsert(cfg, 'prospekt_arbete', [{
  epost: adress,
  ...
}], 'epost,orgnr');
// efter
await supaUpsert(cfg, 'prospekt_arbete', [{
  user_id: anvandare.id,
  epost: anvandare.epost,   // data, inte nyckel. Behovs av prospekt_glom()
  ...
}], 'user_id,orgnr');
```

- [ ] **Steg 2: Samma sak i lista.js**

Rad 11 och rad 47: identiskt med steg 1.

Rad 61, behörighetskollen:

```javascript
// fore
`prospekt_kop?select=id&lista_id=eq.${lista.id}&epost=eq.${encodeURIComponent(adress)}`);
// efter
`prospekt_kop?select=id&lista_id=eq.${lista.id}&user_id=eq.${encodeURIComponent(anvandare.id)}`);
```

Rad 82, arbetsraderna:

```javascript
// fore
`&epost=eq.${encodeURIComponent(adress)}` +
// efter
`&user_id=eq.${encodeURIComponent(anvandare.id)}` +
```

- [ ] **Steg 3: Verifiera**

Kör: `npm run check && npm run test:tools`

Förväntat: gröna grindar.

- [ ] **Steg 4: Commit**

```bash
git add functions/api/prospekt/arbete.js functions/api/prospekt/lista.js
git commit -m "refactor(prospekt): rutterna scopar pa user_id, inte pa adress"
```

---

## Uppgift 5: Applicera i prod och verifiera

- [ ] **Steg 1: Skapa kontona**

Deltagarna behöver Supabase-konton innan `motparten_deltagare` kan seedas. Bjud in `ludvig@vndy.se` och `sebastian@vndy.se` via samma inbjudningsflöde som Delägaren använder, och bekräfta att `profiles` har en rad för var och en.

- [ ] **Steg 2: Kör migrationen i prod**

Öppna Supabase SQL Editor för `xpxghvxrckpzbbkjmtcw`, klistra in hela `supabase/migrations/20260829140000_prospektlistor.sql` och kör.

Förväntat: inga fel. Verifiera med:

```sql
select table_name from information_schema.tables
 where table_schema='public' and table_name like 'prospekt%' or table_name='motparten_deltagare'
 order by 1;
```

Förväntat: `motparten_deltagare`, `prospekt_arbete`, `prospekt_arbetsstalle`, `prospekt_bestallning`, `prospekt_bolag`, `prospekt_kop`, `prospekt_lista`.

- [ ] **Steg 3: Seeda deltagarna**

```sql
insert into motparten_deltagare (user_id, epost, kalla)
select p.id, lower(p.email), 'pilot'
  from profiles p
 where lower(p.email) in ('ludvig@vndy.se', 'sebastian@vndy.se')
on conflict (user_id) do nothing;
```

Förväntat: `INSERT 0 2`. Blir det `INSERT 0 0` eller `0 1` saknas konton, gå tillbaka till steg 1.

- [ ] **Steg 4: Verifiera i webbläsaren**

Logga in på Motparten med magic link som en av adresserna. Öppna prospektsidan.

Förväntat: sidan laddar. Logga sedan in med en adress som har konto men **ingen** rad i `motparten_deltagare`. Förväntat: omdirigering till `/pilot`, alltså nekad. Det är testet på att gränsen mot Delägaren håller.

---

## Uppgift 6: Pilotcookien tas bort

Först när uppgift 5 är verifierad.

**Filer:**
- Ta bort: `functions/api/pilot-login.js`
- Ändra: `functions/_middleware.js`, `LAUNCH.md`

- [ ] **Steg 1: Ta bort endpointen**

```bash
git rm functions/api/pilot-login.js
```

- [ ] **Steg 2: Ta bort pilotgrenen i middleware**

Ta bort raden `if (await verifieraPilot(...)) return next();`, konstanten `PILOT_SIDA`, funktionen `verifieraPilot` och importen av den. Motparten-värden accepterar därefter bara session plus rättighet.

- [ ] **Steg 3: Stryk raden i LAUNCH.md**

Pilotinloggningen står där som en blockerare att ta bort. Den är nu borta.

- [ ] **Steg 4: Verifiera**

Kör: `npm run check && npm run test:tools`

Förväntat: gröna grindar. `PILOT_SECRET` kan därefter tas bort från projektets miljövariabler.

- [ ] **Steg 5: Commit**

```bash
git add -A
git commit -m "chore(auth): pilotcookien borta, Motparten kor pa riktiga konton"
```

---

## Vad som medvetet inte ingår

**Ingen `workspace`-tabell.** Kunden är den ensamma säljaren, enligt säljverktygsspecen avsnitt 2, och säljorganisationen är uttryckligen en annan produkt. `user_id` är därför rätt nyckel. Att lägga en arbetsyta med medlemmar nu vore att bygga för en kund som inte finns.

**Ingen egen databasroll för verktyget.** Den behövs först när verktyget blir en egen deploy som ansluter direkt till Postgres. `force row level security` läggs redan nu, så rollen kan tillkomma utan att policyerna skrivs om.

**Ingen ny migrationsfil.** `20260829140000_prospektlistor.sql` är aldrig applicerad, verifierat 1 september 2026. Att lägga tre migrationer ovanpå en oapplicerad fil hade gett tre gånger så mycket SQL och ett schema som beskriver sin egen historia i stället för sitt nuläge.

---

## Efter planen

Nästa steg enligt den sammanslagna byggordningen är steg 1 till 4 i säljverktygsspecen avsnitt 9: nästa aktivitet med datum, aktivitetshistorik med nej-orsaker, diktering och Veckan, med infångningen som huvudlinje enligt avsnitt 5.10. Registret i Postgres, marknadsfrågan och krediterna kommer först vid steg 5, när Radar ska bli en sparad och bevakad marknad.
