-- ===========================================================================
-- 0015 — Agenda Inteligente
-- Estende eventos_agenda (0001) com horário de fim, tipo estruturado, local,
-- flag de dia inteiro e notas. "quando" segue como o início do evento.
-- ===========================================================================

create type evento_tipo as enum ('reuniao', 'lembrete', 'bloco', 'entrega');

alter table eventos_agenda
  add column if not exists fim timestamptz,
  add column if not exists tipo_ev evento_tipo not null default 'reuniao',
  add column if not exists local text,
  add column if not exists dia_inteiro boolean not null default false,
  add column if not exists notas text;
