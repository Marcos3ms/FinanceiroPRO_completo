-- =================================================================
-- FinanceiroPro - Schema V1
-- Run this on the Supabase SQL Editor (or via the CLI).
-- Idempotent: pode rodar quantas vezes quiser.
-- =================================================================

-- ==================== profiles ====================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  company_name text,
  cnpj text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists cnpj text;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==================== accounts ====================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  banco text,
  agencia text,
  conta text,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);

alter table public.accounts enable row level security;

drop policy if exists "Accounts are viewable by owner" on public.accounts;
create policy "Accounts are viewable by owner"
  on public.accounts for select using (auth.uid() = user_id);

drop policy if exists "Accounts are insertable by owner" on public.accounts;
create policy "Accounts are insertable by owner"
  on public.accounts for insert with check (auth.uid() = user_id);

drop policy if exists "Accounts are updatable by owner" on public.accounts;
create policy "Accounts are updatable by owner"
  on public.accounts for update using (auth.uid() = user_id);

drop policy if exists "Accounts are deletable by owner" on public.accounts;
create policy "Accounts are deletable by owner"
  on public.accounts for delete using (auth.uid() = user_id);


-- ==================== transactions (receitas + despesas) ====================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  descricao text not null,
  valor numeric(14, 2) not null,
  data date not null,
  categoria text,
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists transfer_id uuid;
alter table public.transactions add column if not exists payment_method text;
alter table public.transactions add column if not exists payment_details text;

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_user_type_data_idx
  on public.transactions(user_id, type, data desc);
create index if not exists transactions_transfer_id_idx on public.transactions(transfer_id);

alter table public.transactions enable row level security;

drop policy if exists "Transactions are viewable by owner" on public.transactions;
create policy "Transactions are viewable by owner"
  on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "Transactions are insertable by owner" on public.transactions;
create policy "Transactions are insertable by owner"
  on public.transactions for insert with check (auth.uid() = user_id);

drop policy if exists "Transactions are updatable by owner" on public.transactions;
create policy "Transactions are updatable by owner"
  on public.transactions for update using (auth.uid() = user_id);

drop policy if exists "Transactions are deletable by owner" on public.transactions;
create policy "Transactions are deletable by owner"
  on public.transactions for delete using (auth.uid() = user_id);


-- ==================== schedules (agendamentos) ====================
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  valor numeric(14, 2) not null,
  frequencia text not null check (frequencia in ('mensal', 'semanal', 'anual')),
  vencimento date not null,
  categoria text,
  account_id uuid references public.accounts(id) on delete set null,
  lembretes text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.schedules add column if not exists paid_at timestamptz;
alter table public.schedules add column if not exists payment_method text;
alter table public.schedules add column if not exists payment_details text;

create index if not exists schedules_user_id_idx on public.schedules(user_id);
create index if not exists schedules_user_vencimento_idx
  on public.schedules(user_id, vencimento);

alter table public.schedules enable row level security;

drop policy if exists "Schedules are viewable by owner" on public.schedules;
create policy "Schedules are viewable by owner"
  on public.schedules for select using (auth.uid() = user_id);

drop policy if exists "Schedules are insertable by owner" on public.schedules;
create policy "Schedules are insertable by owner"
  on public.schedules for insert with check (auth.uid() = user_id);

drop policy if exists "Schedules are updatable by owner" on public.schedules;
create policy "Schedules are updatable by owner"
  on public.schedules for update using (auth.uid() = user_id);

drop policy if exists "Schedules are deletable by owner" on public.schedules;
create policy "Schedules are deletable by owner"
  on public.schedules for delete using (auth.uid() = user_id);
