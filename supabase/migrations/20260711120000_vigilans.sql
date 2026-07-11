-- ── Vigilans-datamodellen ─────────────────────────────────────────────────
-- Plan: docs/superpowers/plans/2026-07-11-portfoljforsakring-pipeline.md (avsnitt 6).
-- Additiv migration (bygger på 20260710000000_init.sql: profiles, holdings...).
-- SKISS: körs inte förrän den appliceras. Ingen extern datakälla behövs för
-- schemat; det är ryggraden som tes/tråd/brev-loopen skriver till.
--
-- Allt är RLS-skyddat på user_id (samma mönster som holdings/decisions): en
-- medlem ser och rör bara sina egna rader. Motor-skripten skriver med
-- service-nyckeln (RLS-oberoende), aldrig klienten direkt.

-- Operator och status för trådar; status för brev.
create type tripwire_op as enum ('below', 'above', 'crosses');
create type tripwire_status as enum ('armed', 'tripped', 'muted');
create type brief_status as enum ('silent', 'alerts');

-- ── theses: "försäkringsbrevet" per innehav ────────────────────────────────
-- Varför jag äger det + de invarianter som måste förbli sanna. Metriken/trådarna
-- i tripwires är den maskinläsbara delen; invariants fångar resonemanget.
create table theses (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references holdings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  why text,                       -- varför jag äger det
  invariants jsonb not null default '[]',   -- [{claim: "..."}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holding_id)
);
alter table theses enable row level security;
create index on theses (user_id);

-- ── tripwires: de hårda parametrarna (dödmansgreppet) ──────────────────────
-- metric är avsiktligt text (öppen), så nya mått kan läggas till utan migration.
-- Kartan motor/vigilans/lektionskarta.mjs binder metric till rätt lektion.
create table tripwires (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references holdings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  metric text not null,           -- gross_margin | net_debt | cash_runway | dilution | ...
  op tripwire_op not null,
  value numeric not null,
  unit text,
  note text,
  status tripwire_status not null default 'armed',
  created_at timestamptz not null default now()
);
alter table tripwires enable row level security;
create index on tripwires (holding_id);
create index on tripwires (user_id);

-- ── holding_figures: strukturerade periodsiffror ───────────────────────────
-- Fylls av datakällan (senare) ELLER av Rapportkollen ur en inklistrad rapport
-- (fungerar redan idag, utan extern API). source_ref gör varje tal spårbart.
create table holding_figures (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references holdings(id) on delete cascade,
  period text not null,           -- t.ex. 2025Q3
  as_of date,                     -- perioden som datum, för tes-bandet över tiden
  metric text not null,
  value numeric,
  unit text,
  source_ref jsonb,               -- {url, page, title}
  ingested_at timestamptz not null default now(),
  unique (holding_id, period, metric)
);
alter table holding_figures enable row level security;
create index on holding_figures (holding_id, metric);

-- ── tripwire_events: när en tråd korsats. Tidslinje-redo (avsnitt 2b): kind +
--    as_of gör raden till en ritbar markör, lesson_ids kopplar den till kursen.
create table tripwire_events (
  id uuid primary key default gen_random_uuid(),
  tripwire_id uuid references tripwires(id) on delete set null,
  holding_id uuid not null references holdings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'tripwire', -- tripwire | insider | emission | report
  as_of date,                     -- datum markören sitter på kurvan
  metric text not null,
  observed numeric,
  threshold numeric,
  unit text,
  period text,
  source_ref jsonb,
  lesson_ids text[],              -- från lektionskartan (händelse -> lektion)
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
alter table tripwire_events enable row level security;
create index on tripwire_events (user_id, triggered_at);
create index on tripwire_events (holding_id, as_of);

-- ── prices: prisserie per innehav (tidslinjens axlar). Dagsslut räcker för
--    annotering, ingen realtid. Fylls av datakällan; slotten finns från Fas 2.
create table prices (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references holdings(id) on delete cascade,
  d date not null,
  close numeric,
  source text,
  unique (holding_id, d)
);
alter table prices enable row level security;
create index on prices (holding_id, d);

-- ── briefs: genererat morgonbrev per användare per dag ─────────────────────
create table briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  brief_date date not null,
  status brief_status not null default 'silent',
  payload jsonb not null default '{}',    -- larm i risk-först-ordning
  checked jsonb not null default '{}',    -- {reports, filings, insiders} (kvittologgen)
  created_at timestamptz not null default now(),
  unique (user_id, brief_date)
);
alter table briefs enable row level security;
create index on briefs (user_id, brief_date);

-- ── RLS: egna rader ────────────────────────────────────────────────────────
create policy "egna teser"          on theses          for select using (user_id = auth.uid());
create policy "egna teser skriv"    on theses          for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "egna tradar"         on tripwires       for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "egna handelser"      on tripwire_events for select using (user_id = auth.uid());
create policy "egna brev"           on briefs          for select using (user_id = auth.uid());
-- holding_figures och prices speglar innehavets ägare (via holdings).
create policy "egna siffror" on holding_figures for select
  using (exists (select 1 from holdings h where h.id = holding_figures.holding_id and h.user_id = auth.uid()));
create policy "egna priser" on prices for select
  using (exists (select 1 from holdings h where h.id = prices.holding_id and h.user_id = auth.uid()));

-- Skriv till figures/prices/events/briefs sker via motor-skript med
-- service-nyckeln (security definer eller direkt REST), aldrig av klienten.
-- Därför ingen insert/update-policy för dem här.

-- ── Beslutsdagboken blir markörer på tidslinjen (lager 3, spegeln) ─────────
-- Utökar befintliga decisions (20260710000000_init.sql) så varje beslut kan
-- ritas på kurvan och mata den disciplinerade tvillingen.
alter table decisions add column if not exists rule_ref uuid references tripwires(id) on delete set null;
alter table decisions add column if not exists as_of date;
