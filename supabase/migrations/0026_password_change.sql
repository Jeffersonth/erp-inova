begin;
alter table auth.users add column if not exists session_version integer not null default 0;

create table if not exists auth.password_change_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  attempts integer not null default 0
);
revoke all on auth.password_change_attempts from public, anon, authenticated, erp_inova_app;

create or replace function auth.reserve_password_change_attempt(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, auth as $$
declare total integer;
begin
  if not exists (select 1 from auth.users where id=p_user_id and lower(email)='jeff.thchaves@gmail.com') then return false; end if;
  insert into auth.password_change_attempts(user_id,started_at,attempts) values(p_user_id,now(),1)
  on conflict(user_id) do update set
    attempts=case when password_change_attempts.started_at < now()-interval '15 minutes' then 1 else password_change_attempts.attempts+1 end,
    started_at=case when password_change_attempts.started_at < now()-interval '15 minutes' then now() else password_change_attempts.started_at end
  returning attempts into total;
  return total<=5;
end;
$$;

create or replace function auth.change_own_password(p_user_id uuid,p_previous_hash text,p_new_hash text,p_version integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, auth as $$
declare changed integer;
begin
  if p_new_hash is null or p_new_hash !~ '^\$2b\$12\$[./A-Za-z0-9]{53}$' then return false; end if;
  update auth.users set encrypted_password=p_new_hash,session_version=session_version+1,updated_at=now()
  where id=p_user_id and lower(email)='jeff.thchaves@gmail.com' and encrypted_password=p_previous_hash and session_version=p_version;
  get diagnostics changed = row_count;
  if changed=1 then delete from auth.password_change_attempts where user_id=p_user_id; end if;
  return changed=1;
end;
$$;
revoke all on function auth.reserve_password_change_attempt(uuid) from public,anon,authenticated;
revoke all on function auth.change_own_password(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function auth.reserve_password_change_attempt(uuid) to erp_inova_app;
grant execute on function auth.change_own_password(uuid,text,text,integer) to erp_inova_app;
commit;
