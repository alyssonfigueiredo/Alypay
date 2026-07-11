-- Alypay — Boletim Anti-Calote
-- Schema do Supabase (Postgres). Rode isso inteiro no SQL Editor do
-- seu projeto Supabase (Dashboard → SQL Editor → New query → colar → Run).

create extension if not exists pgcrypto;

create table if not exists primos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  token_acesso uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  primo_id uuid not null references primos(id) on delete cascade,
  descricao text not null,
  -- Se parcelada: valor total da compra, dividido por "parcelas".
  -- Se recorrente (parcelas is null): valor cobrado todo mês, sem fim.
  total numeric(10,2) not null check (total > 0),
  parcelas int check (parcelas is null or parcelas between 1 and 24),
  inicio_mes text not null check (inicio_mes ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  primo_id uuid not null references primos(id) on delete cascade,
  valor numeric(10,2) not null check (valor > 0),
  data date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists compras_primo_id_idx on compras(primo_id);
create index if not exists pagamentos_primo_id_idx on pagamentos(primo_id);
create index if not exists primos_token_acesso_idx on primos(token_acesso);

-- ── Isolamento de acesso ─────────────────────────────────────────────
-- RLS fica ligado nas três tabelas, mas de propósito SEM nenhuma policy
-- para as roles anon/authenticated: isso nega TODO acesso via chave
-- pública do Supabase, sem exceção.
--
-- O navegador (tanto a vista do primo quanto o painel admin) nunca fala
-- diretamente com o Supabase. Todo acesso passa pelas Cloudflare Pages
-- Functions (pasta functions/), que usam a service_role key — essa key
-- ignora RLS por definição, mas só existe como secret no servidor,
-- nunca é enviada ao navegador. A validação de "esse token pertence a
-- qual primo" e "essa senha de admin está correta" acontece nessas
-- Functions antes de qualquer consulta, então nenhum dado do primo
-- errado chega a sair do servidor.
alter table primos enable row level security;
alter table compras enable row level security;
alter table pagamentos enable row level security;

-- Seed: os dois primos. Rode uma vez só — depois disso, edite nome e
-- regenere token pelo próprio painel admin, não direto no SQL.
insert into primos (nome) values ('Primo 1'), ('Primo 2');
