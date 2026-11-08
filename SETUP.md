# WebZaura setup

Follow these steps to connect WebZaura to Supabase and deploy it on Vercel.

> **Migrations note:** WebZaura uses Drizzle ORM. Migration SQL lives in `drizzle/migrations/`; there is no `supabase/migrations/` directory. Apply migrations with `drizzle-kit migrate`, not `supabase db push`. Do not run `supabase/seed.sql` in production unless you intentionally want its sample data.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard>.
2. Create a new project, choose an organization and region, and store the database password securely.
3. Wait for provisioning to finish.
4. Copy the project ref from **Project Settings → General**.

## 2. Run the database migrations

Migrations are in `drizzle/migrations/`. Use the Supabase direct connection string from **Project Settings → Database → Connection string → URI**. If your network only supports IPv4, use the session pooler URI instead.

PowerShell:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres"
npx drizzle-kit migrate
```

Bash:

```sh
export SUPABASE_DB_URL="postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres"
npx drizzle-kit migrate
```

Replace every `<...>` placeholder. Do not commit the database password or any connection string containing it.

Verify the applied migrations in **SQL Editor**:

```sql
select id, hash, created_at
from drizzle.__drizzle_migrations
order by created_at;
```

## 3. Create the storage bucket

Project files are stored in a private bucket named `project-files`. In **SQL Editor**, run:

```sql
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;
```

The private-bucket storage policies are included in `drizzle/migrations/0005_crm_part_b.sql`. The bucket must remain private; signed URLs are used for downloads.

## 4. Disable public sign-ups

In **Authentication → Providers → Email** (or **Authentication → Settings**, depending on the dashboard version), turn off **Allow new users to sign up**. Keep the email provider enabled so existing and dashboard-created users can still sign in.

## 5. Set the Site URL and redirect URLs

In **Authentication → URL Configuration**:

- Set **Site URL** to the production URL, for example `https://your-domain.com`.
- Add these **Redirect URLs**:

```text
http://localhost:8080/**
https://your-domain.com/**
```

The password-reset flow redirects to `/reset-password`, which is covered by these patterns.

## 6. Configure SMTP

In **Authentication → Settings → SMTP Settings** (or the equivalent SMTP section in your dashboard):

1. Enable custom SMTP.
2. Enter the provider's host, port, username, and password. Port `587` with TLS is common; use your provider's recommended settings.
3. Set the sender email and sender name.
4. Save the settings and send a test email.

Configure SMTP before testing signup confirmation or password recovery.

## 7. Create the admin user

1. In **Authentication → Users**, choose **Add user**.
2. Enter your admin email and set a password in the dashboard. Do not put the password in this repository.
3. Enable auto-confirm if the dashboard offers it, then create the user.
4. In **SQL Editor**, grant the admin role. Replace the placeholder email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('admin@example.com')
on conflict do nothing;
```

Verify the assignment:

```sql
select u.email, r.role
from auth.users u
join public.user_roles r on r.user_id = u.id
where lower(u.email) = lower('admin@example.com');
```

The app checks roles through `public.user_roles` and its RLS helpers.

## 8. Set environment variables on the host

In **Vercel → Project → Settings → Environment Variables**, set the complete list from `.env.example` for Production, Preview, and Development as needed.

Core values:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SITE_URL=https://your-domain.com
ADMIN_BOOTSTRAP_PASSWORD
```

Set `CRON_SECRET` and `CRON_SECRET_PREVIOUS` if cron jobs are enabled. `SUPABASE_DB_URL` is only needed for local migration commands and should not be exposed to the browser.

`VITE_*` values are exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY` and the other server-only values must never be exposed to the browser. Set `SITE_URL` to the final public URL without a trailing slash.

## 9. Deploy

1. Push the repository to your Git host and import it into Vercel.
2. Use Node.js 20 or newer.
3. Keep the build command as `npm run build`. The Nitro Vercel preset generates `.vercel/output`; no separate output directory setting or `vercel.json` is required.
4. Add the environment variables before the first production deployment.
5. Deploy, then add the custom domain in Vercel.
6. Update the Supabase **Site URL** and **Redirect URLs** if the final domain differs from the one used earlier.

## 10. Production test checklist

- [ ] Sign in with the admin account and confirm the CRM dashboard loads.
- [ ] Sign out and confirm protected routes require authentication again.
- [ ] Use **Forgot password**, receive the email, open the reset link, set a new password, and sign in with it.
- [ ] Submit the public contact form; confirm the lead appears in Supabase under `public.leads` and the WhatsApp handoff opens.
- [ ] Create a second test user with the `member` role (use the admin role SQL above with `'member'`), sign in, and confirm the member cannot access `/app/invoices` or other staff-only CRM actions.
- [ ] Confirm `/robots.txt` and `/sitemap.xml` return the production site URL.
