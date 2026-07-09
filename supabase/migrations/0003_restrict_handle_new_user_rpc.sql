-- handle_new_user só deve rodar via trigger, não deve ser chamável via RPC pública
revoke execute on function public.handle_new_user() from public, anon, authenticated;
