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

-- ── motparten_deltagare (vem som far komma in) ────────────────────────
--
-- Ersatter ALLOWLIST i functions/api/pilot-login.js.
--
-- En giltig Supabase-session racker INTE. _middleware.js rad 133 sager att
-- Delagaren och Motparten ar skilda produkter och att Delagarens JWT inte
-- ska slappa in har. Den gransen ska halla aven nar bada produkterna delar
-- inloggning, och da maste den ligga nagonstans. Den ligger har: konto plus
-- rad, aldrig konto ensamt.
create table motparten_deltagare (
  user_id    uuid primary key references profiles(id) on delete cascade,
  epost      text not null,
  kalla      text not null default 'pilot',     -- 'pilot' | 'stripe' | 'manuell'
  created_at timestamptz not null default now()
);
alter table motparten_deltagare enable row level security;
alter table motparten_deltagare force row level security;

create policy deltagare_egen on motparten_deltagare
  for select to authenticated using (user_id = auth.uid());

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

-- ── prospekt_bolag (prospektenheten) ──────────────────────────────────
--
-- Ett prospekt ar ett BOLAG, aldrig ett arbetsstalle. Skalet ar matt:
-- ett gymuttag gav 1 285 rader men bara 524 bolag, och fem kedjor agde 726
-- av raderna. 569 rader hade ett namn men bara 180 olika personer, for en
-- kedjas VD upprepades pa varje anlaggning. Samma sak med vaxelnumret.
--
-- Arbetsstallena finns kvar, som barn till bolaget. De ar vardefulla att
-- visa och farliga att salja styckvis.
create table prospekt_bolag (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  orgnr text not null,                          -- nyckeln som bar deltagarens arbete
  nr int not null,
  prio text not null,                           -- 'A' | 'B' | 'C'
  foretag text not null,
  verksamhet text,

  anstallda int,                                -- hela bolaget
  anstallda_band text,
  omsattning_tkr bigint,
  omsattning_ar int,
  omsattning_band text,

  -- ── Koncern ─────────────────────────────────────────────────────────
  -- Unikt organisationsnummer ar inte ett unikt saljtillfalle. I ett uttag
  -- av 100 hotellbolag sorterat pa omsattning ligger 46 i en koncern med
  -- fler traffar, och Choice Hotels ensamt ar 12 av de 100. Utan
  -- koncern_nyckel ringer deltagaren samma inkopsorganisation tolv ganger.
  koncernlage text,                             -- 'Fristående' | 'Dotterbolag' | 'Moderbolag'
  moderbolag text,
  moderbolag_orgnr text,
  koncern_nyckel text generated always as (coalesce(moderbolag_orgnr, orgnr)) stored,

  -- ── Registrerad kontaktperson ───────────────────────────────────────
  -- Namnet ur Bolagsverket sager vem som foretrader bolaget juridiskt. Det
  -- ar INTE samma sak som vem som koper det deltagaren saljer, och far
  -- darfor inte heta beslutsfattare. Den verifierade personen, hittad pa
  -- bolagets egen sajt, bor i prospekt_arbete eftersom den ar ett fynd.
  kontakt_namn text,
  kontakt_roll text,                            -- 'Verkställande direktör', 'Ledamot', ...
  kontakt_kalla text,                           -- 'abpi:2026-08' | 'scb'
  kontakt_datum date,

  hemsida text,
  telefon text,                                 -- bolagets vaxel, inte ett direktnummer
  telefon_kalla text,
  epost text,
  -- Harledd ur arbetsstallena, mest restriktiva vinner: nekar ett enda
  -- arbetsstalle en kanal saknar bolaget den kanalen. Blandad sparr ar
  -- sallsynt, 1 bolag av 1 455 i tre uppmatta segment, och just darfor
  -- det slag av fel som annars slinker igenom.
  kanaler text not null,
  notering text,

  unique (lista_id, orgnr),
  unique (lista_id, nr)
);
alter table prospekt_bolag enable row level security;
create index on prospekt_bolag (lista_id);
create index on prospekt_bolag (orgnr);
create index on prospekt_bolag (lista_id, koncern_nyckel);

-- ── prospekt_arbetsstalle (bolagets fysiska platser) ──────────────────
--
-- cfar ar SCB:s identifierare per arbetsstalle och stabil over tid.
-- Reklamsparren ar registrerad HAR, inte pa bolaget, vilket ar precis
-- darfor bolagets kanaler maste harledas och inte kopieras.
create table prospekt_arbetsstalle (
  id uuid primary key default gen_random_uuid(),
  bolag_id uuid not null references prospekt_bolag(id) on delete cascade,
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  cfar text not null,
  huvudkontor boolean not null default false,
  kommun text,
  ort text,
  postnr text,
  adress text,
  anstallda_klass text,                         -- SCB:s storleksklass for kontoret
  telefon text,
  kanaler text not null,
  unique (lista_id, cfar)
);
alter table prospekt_arbetsstalle enable row level security;
create index on prospekt_arbetsstalle (bolag_id);
create index on prospekt_arbetsstalle (lista_id);

-- ── prospekt_kop (vem som får se vilken lista) ────────────────────────
create table prospekt_kop (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references prospekt_lista(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  epost text not null,                          -- alltid gemener, data inte nyckel
  kalla prospekt_kop_kalla not null default 'manuell',
  stripe_session_id text,
  created_at timestamptz not null default now(),
  unique (lista_id, user_id)
);
alter table prospekt_kop enable row level security;
create index on prospekt_kop (user_id);

-- ── prospekt_arbete (det enda som ar personligt) ──────────────────────
--
-- Nyckeln ar (user_id, orgnr), alltsa personen och BOLAGET. Tre foljder:
--   1. Ett omkort uttag tappar inte anteckningarna, for orgnr bestar.
--   2. Dyker samma bolag upp i en annan lista samma person kopt foljer
--      anteckningen med. Har man redan pratat med dem ar det sant oavsett
--      vilken lista man tittar pa.
--   3. En kedja bar ETT arbete, inte ett per anlaggning.
-- lista_id ar darfor bara "senast sedd i", inte en del av nyckeln.
--
-- Personen ar user_id, inte adressen. En e-postadress ar autentisering och
-- kontaktuppgift, inte identitet for ett affarsobjekt: den byts, och den
-- dagen den byts ska anteckningarna folja med personen och inte bli kvar
-- hos strangen. Adressen star kvar som data, for prospekt_glom() behover
-- kunna hitta rader pa den.
create table prospekt_arbete (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  epost text not null,                          -- data, aldrig nyckel
  orgnr text not null,
  lista_id uuid references prospekt_lista(id) on delete set null,
  status prospekt_status not null default 'ny',
  varde_kr bigint,
  anteckning text,

  -- ── Nasta steg ──────────────────────────────────────────────────────
  -- Det viktigaste faltet i ett mini-CRM, och det som saknades helt. En
  -- anteckning svarar pa vad jag skrev sist. Det har svarar pa vem jag ska
  -- gora nagot med i dag, vilket ar fragan som gor att arbetsytan oppnas.
  nasta_steg text,
  nasta_datum date,

  -- ── Verifierad beslutsfattare ───────────────────────────────────────
  -- Skild fran prospekt_bolag.kontakt_namn med flit. Registret sager vem
  -- som foretrader bolaget. Det har ar vem som visade sig kopa, hittad pa
  -- bolagets egen sajt eller i samtalet, med kalla sa pastaendet gar att
  -- kontrollera i efterhand.
  verifierad_namn text,
  verifierad_titel text,
  verifierad_kalla text,
  verifierad_datum date,

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
  unique (user_id, orgnr)
);
alter table prospekt_arbete enable row level security;
create index on prospekt_arbete (user_id, lista_id);
-- "Vem ska jag gora nagot med i dag?"
create index on prospekt_arbete (user_id, nasta_datum) where nasta_datum is not null;
-- Analysen som gor det har vart besvaret: intressefrekvens per attribut.
create index on prospekt_arbete (lista_id, status) where status <> 'ny';
create index on prospekt_arbete (lista_id, listfel) where listfel is not null;

-- Hall updated_at sann utan att forlita sig pa klienten.
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

-- ── Tenantgransen ─────────────────────────────────────────────────────
--
-- RLS var tidigare pasl aget utan policyer, alltsa neka-allt mot
-- anon-nyckeln, medan Pages Functions gjorde scopingen med service-nyckeln.
-- Det holl sa lange det fanns exakt EN vag in. Verktyget blir en egen
-- deploy, alltsa finns snart tva, och en grans ar bara sa stark som den
-- svagaste vagen igenom den. Darfor flyttar den hit.
--
-- force behovs eftersom tabellagaren annars kringgar policyn, precis som
-- superuser och bypassrls gor. Utan force ar hela avsnittet ett dekorativt
-- pasl ag som ingen markar ar verkningslost.
alter table prospekt_arbete       force row level security;
alter table prospekt_kop          force row level security;
alter table prospekt_lista        force row level security;
alter table prospekt_bolag        force row level security;
alter table prospekt_arbetsstalle force row level security;

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

-- Gallring: en deltagares anteckningar är uppgifter om tredje part.
-- Radera allt arbete för en person i ett svep när någon begär det.
-- Ingangen ar fortfarande adressen, for det ar den den som begar det uppger.
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
