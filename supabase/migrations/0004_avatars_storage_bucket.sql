-- Bucket público para fotos de perfil (avatar_url em usuarios)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cada usuário só grava/atualiza/apaga dentro da própria pasta {user_id}/...
create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura pública (bucket público, para exibir a foto em qualquer tela)
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
