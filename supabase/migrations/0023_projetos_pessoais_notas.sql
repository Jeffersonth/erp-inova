begin;
-- Migra uma única vez, preservando cada texto anterior como uma anotação.
-- A coluna antiga permanece disponível para recuperação da versão anterior.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projetos_pessoais' and column_name = 'notas'
  ) then
    alter table public.projetos_pessoais
      add column notas jsonb not null default '[]'::jsonb
      check (jsonb_typeof(notas) = 'array');
    update public.projetos_pessoais
    set notas = jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text, 'texto', anotacoes, 'concluida', false
    ))
    where length(trim(anotacoes)) > 0;
  end if;
end $$;
commit;
