-- Motparten: prospektlistor som tilläggstjänst.
-- Kör en gång i Supabase: SQL Editor -> klistra in hela filen -> Run.
--
-- Identitetsmodell: Motparten har ännu inga Supabase-konton, deltagarna
-- kommer in via den signerade pilotcookien (functions/api/pilot-login.js).
-- Därför är nyckeln e-postadressen, med ett nullbart user_id förberett för
-- den dag Motparten får riktiga konton. Ingen backfill behövs då, bara en
-- update och nya policyer.
--
-- RLS är påslaget utan öppna policyer, samma mönster som invites: en
-- oinloggad klient kan inte läsa något direkt, all åtkomst går via
-- Pages Functions med service-nyckeln som scopar på verifierad adress.

-- ── Enums ─────────────────────────────────────────────────────────────
create type prospekt_status as enum ('ny','forsokt','pratat','intresse','nej');
create type prospekt_kop_kalla as enum ('pilot','stripe','manuell');

-- ── prospekt_lista (ett uttag, delat av alla som köpt det) ────────────
create table prospekt_lista (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                    -- t.ex. 'el-vvs-vastra-gotaland'
  namn text not null,                           -- 'Installatörer i Väst'
  ingress text,                                 -- standfirst på sidan
  segment text,                                 -- 'El- och VVS-installatörer'
  geografi text,                                -- 'Västra Götaland'
  urval text,                                   -- SNI-koder och filter i klartext
  population int,                               -- antal i länet före filtrering
  kallhanvisning text not null,                 -- avtalsvillkor hos SCB, se dokument/Användarvillkor.pdf
  uttag_datum date not null,
  publicerad boolean not null default false,
  created_at timestamptz not null default now()
);
alter table prospekt_lista enable row level security;

-- ── prospekt_rad (företagsdatan, en gång, delad) ──────────────────────
create table prospekt_rad (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  nr int not null,
  prio text not null,                           -- 'A' | 'B' | 'C'
  foretag text not null,
  orgnr text,
  kommun text,
  ort text,
  postnr text,
  adress text,
  verksamhet text,                              -- 'El' | 'VVS'
  anstallda_bolag int,                          -- hela bolaget
  anstallda_arbetsstalle text,                  -- SCB:s storleksklass för kontoret
  anstallda_band text,
  omsattning_tkr bigint,
  omsattning_ar int,
  omsattning_band text,
  koncernlage text,                             -- 'Fristående' | 'Dotterbolag'
  moderbolag text,
  vd text,                                      -- bara verkställande direktör, aldrig styrelseposter
  telefon text,
  epost text,
  kanaler text not null,                        -- reklamspärr i klartext, får inte tappas bort
  notering text,
  unique (lista_id, nr)
);
alter table prospekt_rad enable row level security;
create index on prospekt_rad (lista_id);

-- ── prospekt_kop (vem som får se vilken lista) ────────────────────────
create table prospekt_kop (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  epost text not null,                          -- alltid gemener
  user_id uuid references profiles(id) on delete cascade,  -- fylls när Motparten får konton
  kalla prospekt_kop_kalla not null default 'manuell',
  stripe_session_id text,
  created_at timestamptz not null default now(),
  unique (lista_id, epost)
);
alter table prospekt_kop enable row level security;
create index on prospekt_kop (epost);

-- ── prospekt_arbete (det enda som är personligt) ──────────────────────
create table prospekt_arbete (
  id uuid primary key default gen_random_uuid(),
  rad_id uuid not null references prospekt_rad(id) on delete cascade,
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  epost text not null,
  user_id uuid references profiles(id) on delete cascade,
  status prospekt_status not null default 'ny',
  varde_kr bigint,
  anteckning text,
  updated_at timestamptz not null default now(),
  unique (rad_id, epost)
);
alter table prospekt_arbete enable row level security;
create index on prospekt_arbete (lista_id, epost);

-- Håll updated_at sann utan att förlita sig på klienten.
create or replace function prospekt_arbete_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;
create trigger prospekt_arbete_updated
  before update on prospekt_arbete
  for each row execute function prospekt_arbete_touch();

-- Gallring: en deltagares anteckningar är uppgifter om tredje part.
-- Radera allt arbete för en adress i ett svep när någon begär det.
create or replace function prospekt_glom(p_epost text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from prospekt_arbete where epost = lower(p_epost);
  get diagnostics n = row_count;
  delete from prospekt_kop where epost = lower(p_epost);
  return n;
end; $$;
