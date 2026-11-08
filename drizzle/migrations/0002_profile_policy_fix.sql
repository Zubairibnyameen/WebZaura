create or replace function public.own_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_active from public.profiles where id = auth.uid()
$$;

create or replace function public.own_profile_must_change_password()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select must_change_password from public.profiles where id = auth.uid()
$$;

drop policy "user updates own name and avatar" on public.profiles;
create policy "user updates own name and avatar" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and is_active = public.own_profile_is_active()
    and must_change_password = public.own_profile_must_change_password()
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, must_change_password)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''), true);
  if new.email = 'mozubairchoudhary@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

update public.profiles set must_change_password = true where email = 'mozubairchoudhary@gmail.com';