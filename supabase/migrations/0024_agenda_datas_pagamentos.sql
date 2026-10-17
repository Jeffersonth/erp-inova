alter type evento_tipo add value if not exists 'data_importante';
alter type evento_tipo add value if not exists 'pagamento';
alter table public.eventos_agenda
  add column if not exists valor numeric(14,2) check (valor >= 0),
  add column if not exists moeda moeda not null default 'BRL',
  add column if not exists pago boolean not null default false;
