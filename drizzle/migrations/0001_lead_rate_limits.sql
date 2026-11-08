create table public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);
grant all on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;
-- no client policies: service role only