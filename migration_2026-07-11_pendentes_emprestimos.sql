-- Alypay — migração incremental (rode uma vez só, no SQL Editor do
-- mesmo projeto Supabase onde você já rodou o schema.sql original).
--
-- Adiciona:
--   1. Empréstimos em dinheiro (tipo='emprestimo', prazo opcional)
--   2. Lançamentos pendentes de aprovação (o primo pode enviar compra/
--      pagamento pelo próprio link; só conta no saldo depois que você
--      aprova pelo painel admin)
--
-- Todo registro que já existe vira status='aprovado' automaticamente
-- (é o default da coluna nova), então nada muda pro que já está lançado.

alter table compras
  add column if not exists tipo text not null default 'compra' check (tipo in ('compra', 'emprestimo')),
  add column if not exists prazo date,
  add column if not exists status text not null default 'aprovado' check (status in ('pendente', 'aprovado', 'rejeitado'));

alter table pagamentos
  add column if not exists status text not null default 'aprovado' check (status in ('pendente', 'aprovado', 'rejeitado'));
