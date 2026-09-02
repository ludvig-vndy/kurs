-- Marknad på innehavet.
--
-- Innehavet lagrade bara ticker. Så länge universumet var nordiskt gick det an:
-- sidan provade sig fram genom SE, FI, NO, DK, IS tills en kurs svarade. Med
-- amerikanska bolag i listan blir det farligt, för samma bokstavskombination
-- kan vara två olika bolag på två marknader, och insynshandeln skulle kunna
-- hämtas för fel bolag.
--
-- Landskoden är samma som /api/kurshistorik använder: SE, NO, DK, FI, IS, US.
-- Null betyder okänt, och då gäller den gamla ordningen att prova sig fram.

alter table holdings
  add column if not exists land text
  check (land is null or land in ('SE', 'NO', 'DK', 'FI', 'IS', 'US'));

comment on column holdings.land is
  'Marknad: SE, NO, DK, FI, IS, US. Null = okänt, kursen söks då genom marknaderna i tur och ordning.';
