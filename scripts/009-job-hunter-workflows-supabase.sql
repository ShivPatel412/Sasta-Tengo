-- Supabase Postgres only. No application submission or external messaging is performed.
begin;
alter table public.job_hunter_jobs
  add column applied_at timestamptz,
  add column follow_up_completed boolean not null default false;

create table public.job_hunter_scores (
  job_id uuid primary key references public.job_hunter_jobs(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  breakdown jsonb not null check (jsonb_typeof(breakdown) = 'object'),
  matched_skills jsonb not null check (jsonb_typeof(matched_skills) = 'array'),
  gaps jsonb not null check (jsonb_typeof(gaps) = 'array'),
  eligibility text not null check (eligibility in ('eligible','ineligible','unknown')),
  salary_fit text not null check (salary_fit in ('match','mismatch','unknown')),
  reasons jsonb not null check (jsonb_typeof(reasons) = 'array'),
  recommendation text not null check (recommendation in ('high','review','archive')),
  updated_at timestamptz not null default now()
);

create table public.job_hunter_drafts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_hunter_jobs(id) on delete cascade,
  kind text not null check (kind in ('resume','application','interview')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and content->>'review_required' = 'true'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  review_required boolean not null default true check (review_required),
  created_at timestamptz not null default now(),
  unique (job_id, kind, content_hash)
);

create table public.job_hunter_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_hunter_jobs(id) on delete cascade,
  skill text not null check (skill in ('discover','score','resume','application','tracker','interview','help')),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  reason text not null check (char_length(trim(reason)) between 1 and 3000),
  requires_approval boolean not null default true check (requires_approval),
  status text not null default 'queued' check (status = 'queued'),
  content_hash text not null unique check (content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  check (skill not in ('score','resume','application','interview') or job_id is not null)
);

create table public.job_hunter_reminders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_hunter_jobs(id) on delete cascade,
  reminder_type text not null check (reminder_type = 'review_followup'),
  send_external_message boolean not null default false check (not send_external_message),
  created_at timestamptz not null default now(),
  unique (job_id, reminder_type)
);

alter table public.job_hunter_scores enable row level security;
alter table public.job_hunter_drafts enable row level security;
alter table public.job_hunter_agent_tasks enable row level security;
alter table public.job_hunter_reminders enable row level security;
revoke all on public.job_hunter_scores, public.job_hunter_drafts, public.job_hunter_agent_tasks, public.job_hunter_reminders from public, anon, authenticated;
grant select, insert, update on public.job_hunter_scores to service_role;
grant select, insert on public.job_hunter_drafts, public.job_hunter_agent_tasks, public.job_hunter_reminders to service_role;

create index job_hunter_follow_up_due on public.job_hunter_jobs (applied_at, id)
  where status in ('applied','awaiting_reply') and not follow_up_completed;
create function public.job_hunter_follow_ups(p_days integer default 7)
returns table (id uuid, company text, title text, status text, applied_at timestamptz, follow_up_completed boolean)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'days must be between 1 and 365' using errcode = '22023';
  end if;
  return query select j.id, j.company, j.title, j.status, j.applied_at, j.follow_up_completed
    from public.job_hunter_jobs j
    where j.status in ('applied','awaiting_reply') and not j.follow_up_completed
      and j.applied_at <= now() - make_interval(days => p_days)
      and not exists (select 1 from public.job_hunter_reminders r where r.job_id = j.id)
    order by j.applied_at, j.id limit 100;
end;
$$;
revoke all on function public.job_hunter_follow_ups(integer) from public, anon, authenticated;
grant execute on function public.job_hunter_follow_ups(integer) to service_role;
commit;
