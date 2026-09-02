-- Kontotyp per innehav: depå, ISK eller kapitalförsäkring.
--
-- Varför på innehavet och inte på användaren: de flesta har både ett ISK och en
-- depå, och det är kontot affären gjordes på som avgör om vinsten beskattas.
-- Ett innehav utan kontotyp beskattas inte och räknas som okänt i gränssnittet,
-- alltså: null betyder "vet inte", inte "depå".
--
-- Bara vinstskatten hänger på det här fältet. Schablonen på ISK och KF bygger
-- på statslåneräntan och ändras varje år, och räknas därför inte i koden alls.

alter table holdings
  add column if not exists konto text
  check (konto is null or konto in ('depa', 'isk', 'kf'));

comment on column holdings.konto is
  'Kontotyp: depa, isk eller kf. Null = okänt, beskattas inte.';
