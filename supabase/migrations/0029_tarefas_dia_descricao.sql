begin;
alter table public.tarefas_dia add column if not exists descricao text not null default '';
alter table public.tarefas_dia drop constraint if exists tarefas_dia_descricao_tamanho;
alter table public.tarefas_dia add constraint tarefas_dia_descricao_tamanho check (char_length(descricao) <= 500);
commit;
