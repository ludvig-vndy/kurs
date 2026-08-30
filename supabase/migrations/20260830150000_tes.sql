-- ── theses: tesen per innehav ──────────────────────────────────────────────
-- Varför du äger bolaget, i dina egna ord. Ett fält, ingen struktur, inget krav.
--
-- Varför den bryts ut hit och inte väntar på vigilans-migrationen: theses
-- definierades ursprungligen i 20260711120000_vigilans.sql, som är en SKISS för
-- hela Fas 2 (trådar, periodsiffror, brev) och inte går att applicera förrän den
-- delen faktiskt byggs. Tesen behövs innan dess, och den behöver inget av det
-- andra. Vigilans-migrationen skapar därför inte längre tabellen, den bygger
-- vidare på den.
--
-- Tesen är underlag för Fråga-assistenten, men ALDRIG en källa till siffror på
-- samma villkor som en rapport: den är ett antagande du skrivit ned, inte något
-- bolaget rapporterat. Skillnaden upprätthålls i functions/api/fraga.js.

create table if not exists theses (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references holdings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  why text,                                  -- varför jag äger det
  invariants jsonb not null default '[]',    -- [{claim: "..."}], fylls i Fas 2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holding_id)
);
alter table theses enable row level security;
create index if not exists theses_user_id_idx on theses (user_id);

-- Samma mönster som holdings/decisions: du ser och rör bara dina egna rader.
create policy "egna teser" on theses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
