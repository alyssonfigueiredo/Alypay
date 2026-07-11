-- Alypay — migração incremental #2 (rode no SQL Editor do mesmo projeto).
--
-- Muda o modelo de "primo pede aprovação antes de contar" pra "primo
-- lança e já conta na hora, admin pode contestar depois". Adiciona a
-- coluna "origem" (admin/primo) pra alimentar a aba Atividade do admin.
--
-- Registros que já existem viram origem='admin' automaticamente (é o
-- default), o que está certo — foram todos lançados por você.

alter table compras
  add column if not exists origem text not null default 'admin' check (origem in ('admin', 'primo'));

alter table pagamentos
  add column if not exists origem text not null default 'admin' check (origem in ('admin', 'primo'));
