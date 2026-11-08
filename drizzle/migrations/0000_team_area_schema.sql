create type public.app_role as enum ('admin', 'manager', 'member');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost');
create type public.client_type as enum ('Business', 'Startup', 'Individual', 'NGO');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and is_active
  )
$$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  service_interest text,
  client_type client_type,
  message text,
  source text not null default 'website_form',
  status lead_status not null default 'new',
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.lead_notes to authenticated;
grant all on public.lead_notes to service_role;
alter table public.lead_notes enable row level security;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- profiles policies
create policy "admin full profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "manager reads profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'manager'));
create policy "user reads own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "user updates own name and avatar" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_active = (select p.is_active from public.profiles p where p.id = auth.uid()) and must_change_password = (select p.must_change_password from public.profiles p where p.id = auth.uid()));

-- user_roles policies
create policy "admin manages roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "user reads own role" on public.user_roles for select to authenticated
  using (user_id = auth.uid());

-- leads policies
create policy "admin all leads" on public.leads for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "manager read update leads" on public.leads for select to authenticated
  using (public.has_role(auth.uid(), 'manager'));
create policy "manager update leads" on public.leads for update to authenticated
  using (public.has_role(auth.uid(), 'manager')) with check (public.has_role(auth.uid(), 'manager'));
create policy "member reads own leads" on public.leads for select to authenticated
  using (owner_id = auth.uid());
create policy "member updates own leads" on public.leads for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- lead_notes policies: same visibility as parent lead
create policy "read notes of visible leads" on public.lead_notes for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "add note to visible lead" on public.lead_notes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.leads l where l.id = lead_id));

-- audit_logs: admin read only, no client writes
create policy "admin reads audit logs" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- new auth user gets a profile; the founder email gets the first admin role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  if new.email = 'mozubairchoudhary@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- audit trail for lead status and owner changes
create or replace function public.audit_lead_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs (user_id, action, table_name, record_id, details)
    values (auth.uid(), 'status_change', 'leads', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if old.owner_id is distinct from new.owner_id then
    insert into public.audit_logs (user_id, action, table_name, record_id, details)
    values (auth.uid(), 'owner_change', 'leads', new.id, jsonb_build_object('from', old.owner_id, 'to', new.owner_id));
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_lead_change
  before update on public.leads
  for each row execute function public.audit_lead_change();