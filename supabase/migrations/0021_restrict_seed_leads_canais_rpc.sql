-- seed_leads_canais só deve rodar via trigger, não deve ser chamável via RPC
-- (mesmo endurecimento aplicado a handle_new_user na 0003).
revoke execute on function public.seed_leads_canais() from public, anon, authenticated;
