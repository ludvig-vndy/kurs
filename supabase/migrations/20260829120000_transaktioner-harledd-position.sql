-- Transaktioner och härledd position.
-- Kör en gång i Supabase: SQL Editor -> klistra in hela filen -> Run.
--
-- Gör decisions (beslutsdagboken) till affärshuvudbok: varje kop/salj-rad är en
-- affär (quantity, price, decided_at, reason). holdings.quantity och holdings.gav
-- räknas härefter ut ur affärerna med snittkostnadsmetoden, via en trigger, så
-- positionen aldrig kan hamna i otakt med historiken. Innehav utan affärer lämnas
-- orörda (manuell snabb-position, låg tröskel kvar). Se
-- docs/specs/transaktioner-och-harledd-position.md.

-- ── Index för huvudboksläsning per innehav ────────────────────────────
create index if not exists decisions_holding_date_idx on decisions (holding_id, decided_at);

-- ── Uträkning: snittkostnadsmetoden ───────────────────────────────────
-- SECURITY INVOKER (default): funktionen kör med anroparens rättigheter, så
-- RLS ("egna innehav" / "egna beslut") gäller. En affär som pekar på ett annat
-- kontos innehav kan alltså varken läsa dess affärer eller skriva dess position.
create or replace function recalc_holding(h_id uuid) returns void as $$
declare
  q   numeric := 0;
  c   numeric := 0;
  avg numeric;
  n   int;
  r   record;
begin
  if h_id is null then return; end if;

  select count(*) into n
    from decisions
   where holding_id = h_id and kind in ('kop','salj');

  -- Ingen huvudbok: lämna en eventuell manuell position orörd.
  if n = 0 then return; end if;

  for r in
    select kind, quantity, price
      from decisions
     where holding_id = h_id
       and kind in ('kop','salj')
       and quantity is not null and price is not null
     order by decided_at asc, created_at asc
  loop
    if r.kind = 'kop' then
      q := q + r.quantity;
      c := c + r.quantity * r.price;
    else  -- salj: sänker antalet men inte snittet
      if q > 0 then
        avg := c / q;
        q := q - r.quantity;
        c := c - r.quantity * avg;
      else
        q := q - r.quantity;
      end if;
    end if;
  end loop;

  if q < 0 then q := 0; end if;
  if c < 0 then c := 0; end if;

  update holdings
     set quantity   = q,
         gav        = case when q > 0 then round(c / q, 4) else null end,
         updated_at = now()
   where id = h_id;
end;
$$ language plpgsql;

-- ── Trigger: räkna om vid varje affärsändring ─────────────────────────
create or replace function tg_recalc_holding() returns trigger as $$
begin
  if tg_op = 'DELETE' then
    perform recalc_holding(old.holding_id);
    return old;
  end if;

  perform recalc_holding(new.holding_id);
  -- Flyttas en affär mellan innehav: räkna om det gamla också.
  if tg_op = 'UPDATE'
     and old.holding_id is distinct from new.holding_id then
    perform recalc_holding(old.holding_id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_decisions_recalc on decisions;
create trigger trg_decisions_recalc
  after insert or update or delete on decisions
  for each row execute function tg_recalc_holding();
