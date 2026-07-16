-- Säkerhetshärdning av inbjudningsflödet (från den adversariellt verifierade auditen).
-- APPLICERAS PÅ LIVE-DB: kör via `supabase db push` eller klistra in i Supabase SQL-editor.
-- OBS: klientanropet i public/labs/agarbrevet-supabase.js (acceptInvite ->
-- sb.rpc('accept_invite', ...)) MÅSTE samtidigt sluta skicka p_user (se not sist),
-- annars bryts signaturen. Uppdatera + deploya klienten i samma veva som denna körs.

-- ── 1. accept_invite litar på auth.uid(), inte på ett klientstyrt p_user ──────
-- Tidigare tog funktionen mottagarens user-id som ett fritt argument och validerade
-- aldrig p_user = auth.uid(). Som SECURITY DEFINER (förbi RLS) lät det en inloggad
-- medlem skriva om en GODTYCKLIG annan användares profiles.invited_by och förbruka
-- inbjudan i deras namn. Nu härleds användaren enbart från sessionens auth.uid().
drop function if exists public.accept_invite(text, uuid);

create or replace function public.accept_invite(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare inv public.invites; v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then return false; end if;           -- måste vara inloggad
  select * into inv from public.invites where token = p_token for update;
  if inv.id is null or inv.status <> 'pending'
     or (inv.expires_at is not null and inv.expires_at < now()) then
    return false;
  end if;
  update public.invites
     set status = 'accepted', accepted_by = v_user,
         accepted_email = (select email from public.profiles where id = v_user),
         accepted_at = now()
   where id = inv.id;
  update public.profiles set invited_by = inv.created_by where id = v_user;
  return true;
end; $$;

-- Bara inloggade (authenticated) får anropa RPC:n, aldrig anon.
revoke execute on function public.accept_invite(text) from anon, public;
grant execute on function public.accept_invite(text) to authenticated;

-- ── 2. Inga eviga inbjudningar: sätt utgång på befintliga och framtida ────────
-- Seed- och kvot-inbjudningar skapades utan expires_at, och utgångskollen behandlar
-- NULL som "går aldrig ut" -> en läckt oanvänd token vore en permanent bakdörr.
-- Ge alla oförbrukade en tidsgräns, och låt kvot-triggern sätta en framöver.
update public.invites
   set expires_at = now() + interval '30 days'
 where status = 'pending' and expires_at is null;

create or replace function public.grant_invites_on_active()
returns trigger language plpgsql security definer set search_path = public as $$
declare existing int;
begin
  if new.plan = 'membership' and new.status = 'active'
     and (old.status is distinct from new.status) then
    select count(*) into existing from public.invites where created_by = new.user_id;
    if existing < 2 then
      insert into public.invites (created_by, expires_at)
      select new.user_id, now() + interval '30 days' from generate_series(1, 2 - existing);
    end if;
  end if;
  return new;
end; $$;

-- ── Klient-not (kräver kod-deploy tillsammans med denna migration) ────────────
-- I public/labs/agarbrevet-supabase.js, ändra:
--     sb.rpc("accept_invite", { p_token: token, p_user: user.id })
-- till:
--     sb.rpc("accept_invite", { p_token: token })
-- (funktionen läser numera användaren ur sessionen själv).
