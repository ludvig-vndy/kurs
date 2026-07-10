-- Ägarbrevet: access, medlemskap, innehav, beslutsdagbok.
-- Kör en gång i Supabase: SQL Editor -> klistra in hela filen -> Run.
-- Allt skyddas av Row Level Security: varje användare ser bara sitt eget.

create extension if not exists pgcrypto;

-- ── Enums ─────────────────────────────────────────────────────────────
create type invite_status as enum ('pending','accepted','revoked');
create type sub_plan       as enum ('membership','tools_only');   -- membership nu, tools_only senare
create type sub_status     as enum ('active','trialing','past_due','canceled','incomplete');
create type holding_rel    as enum ('ager','foljer');
create type holding_src    as enum ('manual','csv','tink','nordnet');
create type decision_kind  as enum ('kop','salj','folj');

-- ── profiles (1:1 med auth-användaren) ────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Skapa profilrad automatiskt när en auth-användare skapas.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── invites (personliga engångslänkar) ────────────────────────────────
create table invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16),'hex'),
  created_by uuid references profiles(id) on delete set null,   -- null = admin-frö (dina första inbjudningar)
  email text,                                                    -- valfritt: bind till en mottagare
  status invite_status not null default 'pending',
  accepted_by uuid references profiles(id),
  accepted_email text,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table invites enable row level security;
create index on invites (created_by);
create index on invites (token);

-- ── subscriptions (Stripe) ────────────────────────────────────────────
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan sub_plan not null default 'membership',
  status sub_status not null default 'incomplete',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan)
);
alter table subscriptions enable row level security;

-- ── holdings (innehav, från CSV/manuell) ──────────────────────────────
create table holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  ticker text,
  isin text,
  quantity numeric,
  gav numeric,                          -- genomsnittligt anskaffningsvärde
  relation holding_rel not null default 'ager',
  source holding_src not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table holdings enable row level security;
create index on holdings (user_id);

-- ── decisions (beslutsdagboken, vallgraven) ───────────────────────────
create table decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  holding_id uuid references holdings(id) on delete set null,
  kind decision_kind not null,
  reason text,                          -- skälet i stunden
  quantity numeric,
  price numeric,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table decisions enable row level security;
create index on decisions (user_id);

-- ── RLS: varje användare ser bara sitt ────────────────────────────────
create policy "egen profil las"   on profiles      for select using (id = auth.uid());
create policy "egen profil andra" on profiles      for update using (id = auth.uid());
create policy "egna innehav"      on holdings       for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "egna beslut"       on decisions      for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "egen sub las"      on subscriptions  for select using (user_id = auth.uid());
create policy "egna inbjudningar" on invites        for select using (created_by = auth.uid());
-- subscriptions skrivs bara av servern (Stripe-webhook med secret key gar forbi RLS).
-- invites skapas/valideras via funktionerna nedan (security definer), aldrig direkt av klienten.

-- ── Kvot: 2 inbjudningar per medlem, skapade "pa direkten" ─────────────
-- Nar en prenumeration blir 'active' (membership) skapas upp till 2 pending-inbjudningar.
create or replace function grant_invites_on_active()
returns trigger language plpgsql security definer set search_path = public as $$
declare existing int;
begin
  if new.plan = 'membership' and new.status = 'active'
     and (old.status is distinct from new.status) then
    select count(*) into existing from public.invites where created_by = new.user_id;
    if existing < 2 then
      insert into public.invites (created_by)
      select new.user_id from generate_series(1, 2 - existing);
    end if;
  end if;
  return new;
end; $$;
create trigger on_sub_active
  after insert or update on subscriptions
  for each row execute function grant_invites_on_active();

-- ── Servern accepterar en inbjudan (engangs) ──────────────────────────
create or replace function accept_invite(p_token text, p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare inv public.invites;
begin
  select * into inv from public.invites where token = p_token for update;
  if inv.id is null or inv.status <> 'pending'
     or (inv.expires_at is not null and inv.expires_at < now()) then
    return false;
  end if;
  update public.invites
     set status = 'accepted', accepted_by = p_user,
         accepted_email = (select email from public.profiles where id = p_user),
         accepted_at = now()
   where id = inv.id;
  update public.profiles set invited_by = inv.created_by where id = p_user;
  return true;
end; $$;

-- ── Frö: skapa dina forsta admin-inbjudningar (byt antalet vid behov) ──
-- created_by = null markerar att det ar huset som bjuder in, inte en medlem.
insert into invites (created_by) select null from generate_series(1, 10);
-- Hamta lankarna efter korning med:  select token from invites where created_by is null;
