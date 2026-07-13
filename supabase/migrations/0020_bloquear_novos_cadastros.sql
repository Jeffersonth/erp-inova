-- ===========================================================================
-- 0020 — Sistema de uso pessoal: bloqueia cadastro de novos usuários
-- ===========================================================================
-- O trigger de cadastro passa a rejeitar qualquer signup cujo e-mail não seja
-- o do dono. Isso bloqueia a criação de contas mesmo por chamadas diretas à
-- API de Auth do Supabase, não só na interface.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) is distinct from 'jeff.thchaves@gmail.com' then
    raise exception 'Cadastro desabilitado — sistema de uso pessoal.';
  end if;
  insert into public.usuarios (id, nome, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
