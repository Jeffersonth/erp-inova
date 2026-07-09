-- ===========================================================================
-- 0007 — Vendas / contas a receber com controle de pagamento
-- valor_pago = quanto já foi recebido; data_pagamento = data do último pagamento.
-- status 'parcial' = pago em parte (0 < valor_pago < valor).
-- ===========================================================================

alter type recebimento_status add value if not exists 'parcial';

alter table recebimentos
  add column if not exists valor_pago numeric not null default 0,
  add column if not exists data_pagamento date;
