-- ===========================================================================
-- 0012 — Texto/descrição nos cards do quadro de tarefas
-- ===========================================================================

alter table tarefas add column if not exists descricao text;
