-- Alypay — migração incremental: gastos pessoais do Alysson (extrato +
-- fatura do C6 Bank), separado da dívida dos primos. Rode no SQL Editor
-- do mesmo projeto Supabase onde o schema.sql original já rodou.

create table if not exists lancamentos_pessoais (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text not null,
  valor numeric(10,2) not null check (valor > 0),
  origem text not null check (origem in ('extrato', 'fatura')),
  categoria text,
  -- 'proprio': gasto do Alysson mesmo, conta no total do mês.
  -- 'de_primo': bateu com uma compra de primo já lançada — não conta de
  --   novo (senão duplica: uma vez como "gasto meu" no extrato/fatura,
  --   outra como "dívida deles").
  -- 'ignorado': linha que não é gasto de verdade (pagamento da própria
  --   fatura, movimentação de investimento, estorno) — o admin marcou ou
  --   o parser já sugeriu isso pelo nome do lançamento.
  status text not null default 'proprio' check (status in ('proprio', 'de_primo', 'ignorado')),
  compra_relacionada_id uuid references compras(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lancamentos_pessoais_data_idx on lancamentos_pessoais(data);

alter table lancamentos_pessoais enable row level security;
-- Mesmo isolamento das outras tabelas: RLS ligado, sem policy pra
-- anon/authenticated — só as Functions com service_role key acessam.
