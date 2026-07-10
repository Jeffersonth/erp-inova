-- A migracao 0005 removeu a policy de SELECT do bucket avatars assumindo que
-- um bucket publico nao precisa dela para servir arquivos (verdade para o
-- endpoint /object/public/... usado pelo <img>). Mas o upload usa upsert:true,
-- e o Storage API precisa rodar um SELECT (sob RLS do usuario autenticado)
-- para checar conflito antes de decidir entre insert/update — sem policy de
-- SELECT esse upsert falha com 400. Repoe o SELECT, restrito ao dono (nao
-- publico, pra nao reabrir a listagem/enumeracao que a 0005 quis evitar).
create policy "avatars_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
