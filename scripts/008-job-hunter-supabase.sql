-- Supabase Postgres only; the existing portfolio MySQL database is unchanged.
create table public.job_hunter_jobs (
  id uuid primary key default gen_random_uuid(),
  url_hash text not null unique check (url_hash ~ '^[a-f0-9]{64}$'),
  source text not null check (source in ('remoteok','weworkremotely','rss','linkedin','indeed','wellfound','greenhouse','lever','manual')),
  title text not null check (char_length(trim(title)) between 1 and 250),
  url text not null check (char_length(url) <= 2048 and url ~ '^https?://'),
  description text not null default '' check (char_length(description) <= 16000),
  company text check (char_length(company) <= 250),
  location text check (char_length(location) <= 500),
  published_at timestamptz,
  status text not null default 'discovered',
  created_at timestamptz not null default now()
);
alter table public.job_hunter_jobs enable row level security;
revoke all on public.job_hunter_jobs from public, anon, authenticated;
grant select, insert on public.job_hunter_jobs to service_role;
