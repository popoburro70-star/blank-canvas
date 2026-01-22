-- License system schema (public)

-- 1) Users allowed to use licenses
create table if not exists public.license_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) License keys (store only hash)
create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  valid_days integer not null default 30,
  max_activations integer not null default 1,
  first_activated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_license_keys_expires_at on public.license_keys (expires_at);
create index if not exists idx_license_keys_revoked_at on public.license_keys (revoked_at);

-- 3) Activations (bind key -> one machine (HWID) + one username)
create table if not exists public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_key_id uuid not null references public.license_keys(id) on delete cascade,
  license_user_id uuid not null references public.license_users(id) on delete cascade,
  hwid_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_ip text
);

-- Enforce 1 activation per key ("1 máquina")
create unique index if not exists uq_license_activations_key on public.license_activations (license_key_id);

create index if not exists idx_license_activations_hwid_hash on public.license_activations (hwid_hash);
create index if not exists idx_license_activations_user on public.license_activations (license_user_id);

-- Enable RLS + deny all direct access (edge/server-side only)
alter table public.license_users enable row level security;
alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;

do $$
begin
  -- license_users
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='license_users' and policyname='deny_all_license_users'
  ) then
    create policy deny_all_license_users on public.license_users
      for all
      using (false)
      with check (false);
  end if;

  -- license_keys
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='license_keys' and policyname='deny_all_license_keys'
  ) then
    create policy deny_all_license_keys on public.license_keys
      for all
      using (false)
      with check (false);
  end if;

  -- license_activations
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='license_activations' and policyname='deny_all_license_activations'
  ) then
    create policy deny_all_license_activations on public.license_activations
      for all
      using (false)
      with check (false);
  end if;
end $$;
