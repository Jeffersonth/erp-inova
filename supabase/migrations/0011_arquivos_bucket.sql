-- ===========================================================================
-- 0011 — Bucket de arquivos (NF de clientes, docs/imagens de projetos)
-- Privado; acesso dono-por-linha pelo primeiro segmento do caminho (o uid).
-- A tabela public.arquivos (0001) guarda os metadados (nome, storage_path,
-- cliente_id/projeto_id, classificacao_ia).
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

create policy "arquivos_select_own"
  on storage.objects for select
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "arquivos_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "arquivos_delete_own"
  on storage.objects for delete
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text);
