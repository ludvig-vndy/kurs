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
create type prospekt_bestallning_status as enum ('ny','arbetas','klar','avvisad');

-- Orsakskoder. Fyra oberoende dimensioner, inte en enda "varför blev det nej".
-- Ett bolag som aldrig svarade är inget negativt exempel på listkvalitet, och
-- ett bolag i fel bransch är fel oavsett om någon ringde. Slås de ihop tränar
-- man på flera olika saker samtidigt och lär sig ingenting om någon av dem.
create type prospekt_kontaktresultat as enum (
  'inget_svar', 'fel_nummer', 'fel_person', 'natt_fram', 'ombedd_aterkomma');
create type prospekt_orsak as enum (
  'har_leverantor', 'inget_behov', 'for_dyrt', 'fel_tajming', 'ingen_beslutsratt', 'annat');
create type prospekt_listfel as enum (
  'fel_bransch', 'fel_storlek', 'fel_geografi', 'ar_kedja', 'nedlagt', 'dubblett');

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
--
-- cfar är SCB:s identifierare per arbetsställe och den enda nyckeln här som
-- är stabil över tid. Radens uuid byts när ett uttag körs om, cfar gör det
-- inte, och därför hänger deltagarnas arbete på cfar och inte på rad_id.
create table prospekt_rad (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  cfar text not null,
  nr int not null,
  prio text not null,                           -- 'A' | 'B' | 'C'
  foretag text not null,
  orgnr text,
  kommun text,
  ort text,
  postnr text,
  adress text,
  verksamhet text,
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
  unique (lista_id, cfar),
  unique (lista_id, nr)
);
alter table prospekt_rad enable row level security;
create index on prospekt_rad (lista_id);
create index on prospekt_rad (cfar);

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
--
-- Nyckeln är (epost, cfar), alltså personen och arbetsstället. Två följder,
-- båda avsiktliga:
--   1. Ett omkört uttag tappar inte anteckningarna, för cfar består.
--   2. Dyker samma bolag upp i en annan lista samma person köpt följer
--      anteckningen med. Har man redan pratat med dem är det sant oavsett
--      vilken lista man tittar på.
-- lista_id är därför bara "senast sedd i", inte en del av nyckeln.
create table prospekt_arbete (
  id uuid primary key default gen_random_uuid(),
  epost text not null,
  cfar text not null,
  lista_id uuid references prospekt_lista(id) on delete set null,
  user_id uuid references profiles(id) on delete cascade,
  status prospekt_status not null default 'ny',
  varde_kr bigint,
  anteckning text,

  -- ── De fyra dimensionerna ───────────────────────────────────────────
  -- Nabarhet och interaktion: kom vi fram, och till vem?
  kontaktresultat prospekt_kontaktresultat,
  -- Kommersiellt utfall: varfor blev det inget?
  orsak prospekt_orsak,
  -- Listkvalitet: var raden fel fran borjan? Satts oberoende av status,
  -- eftersom en rad kan vara fel utan att nagon nagonsin ringt den. Det ar
  -- den enda signalen som sager nagot om scrapern snarare an om saljaren.
  listfel prospekt_listfel,

  updated_at timestamptz not null default now(),
  unique (epost, cfar)
);
alter table prospekt_arbete enable row level security;
create index on prospekt_arbete (epost, lista_id);
-- Analysen som gor det har vart besvaret: intressefrekvens per attribut.
create index on prospekt_arbete (lista_id, status) where status <> 'ny';
create index on prospekt_arbete (lista_id, listfel) where listfel is not null;

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

-- ── prospekt_bestallning (en order, oavsett vem som skrev in den) ─────
--
-- Samma tabell för båda lägena: i dag skriver vi in beställningen åt
-- deltagaren, senare skriver deltagaren in den själv. Skillnaden blir vem
-- som står i skapad_av, inte en ny modell.
create table prospekt_bestallning (
  id uuid primary key default gen_random_uuid(),
  bestallare_epost text not null,               -- den som ska få listan
  bestallare_namn text,
  saljer text,                                  -- vad beställaren säljer, styr klassningen
  malgrupp text,                                -- fritext från intaget
  diskvalificerar text,                         -- vad som gör en träff dålig, viktigaste fältet
  sni_koder text[] not null,
  lan_koder text[],
  storlek_koder text[],                         -- SCB:s Anställda-koder
  extra_filter jsonb,
  antal_onskat int,
  status prospekt_bestallning_status not null default 'ny',
  lista_id uuid references prospekt_lista(id) on delete set null,
  notering text,                                -- vår egen, syns inte för beställaren
  skapad_av text,                               -- 'vndy:ludvig@vndy.se' eller 'sjalv'
  created_at timestamptz not null default now(),
  uppdaterad timestamptz not null default now()
);
alter table prospekt_bestallning enable row level security;
create index on prospekt_bestallning (status);
create index on prospekt_bestallning (bestallare_epost);

create trigger prospekt_bestallning_updated
  before update on prospekt_bestallning
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
  update prospekt_bestallning set bestallare_epost = '(raderad)', bestallare_namn = null
   where bestallare_epost = lower(p_epost);
  return n;
end; $$;
