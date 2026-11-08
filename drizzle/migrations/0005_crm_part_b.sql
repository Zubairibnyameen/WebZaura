CREATE TYPE public.project_status AS ENUM ('planning','in_progress','review','completed','on_hold');
CREATE TYPE public.task_status AS ENUM ('todo','doing','done');
CREATE TYPE public.payment_method AS ENUM ('upi','bank_transfer','cash','cheque','card','other');
CREATE TYPE public.comment_entity AS ENUM ('lead','client','project','quotation','invoice');
CREATE TYPE public.invoice_payment_status AS ENUM ('unpaid','partially_paid','paid');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  name text NOT NULL,
  service_type text,
  status public.project_status NOT NULL DEFAULT 'planning',
  start_date date,
  due_date date,
  description text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'todo',
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  size bigint NOT NULL CHECK (size > 0 AND size <= 10485760),
  mime_type text,
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.project_files TO service_role;

CREATE SEQUENCE public.invoice_number_seq;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid_total numeric(12,2) NOT NULL DEFAULT 0,
  payment_status public.invoice_payment_status NOT NULL DEFAULT 'unpaid',
  notes text,
  share_token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  item_discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (item_discount >= 0),
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  method public.payment_method NOT NULL DEFAULT 'upi',
  reference text,
  recorded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.comment_entity NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

CREATE INDEX ON public.projects(client_id); CREATE INDEX ON public.projects(quotation_id); CREATE INDEX ON public.projects(status);
CREATE INDEX ON public.project_members(user_id);
CREATE INDEX ON public.tasks(project_id); CREATE INDEX ON public.tasks(assignee_id); CREATE INDEX ON public.tasks(status);
CREATE INDEX ON public.project_files(project_id);
CREATE INDEX ON public.invoices(client_id); CREATE INDEX ON public.invoices(project_id); CREATE INDEX ON public.invoices(quotation_id); CREATE INDEX ON public.invoices(payment_status);
CREATE INDEX ON public.invoice_items(invoice_id);
CREATE INDEX ON public.payments(invoice_id); CREATE INDEX ON public.payments(paid_on);
CREATE INDEX ON public.comments(entity_type, entity_id);
CREATE INDEX ON public.notifications(user_id, read_at);
CREATE INDEX ON public.audit_logs(table_name, record_id); CREATE INDEX ON public.audit_logs(created_at);
CREATE INDEX ON public.leads(status); CREATE INDEX ON public.leads(owner_id); CREATE INDEX ON public.quotations(status);

-- Helpers
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.project_members where project_id = _project_id and user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_access_entity(_type public.comment_entity, _id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if public.is_staff(auth.uid()) then return true; end if;
  if _type = 'lead' then return public.owns_lead(_id);
  elsif _type = 'client' then return exists (select 1 from public.clients where id = _id and created_by = auth.uid()) or public.client_linked_to_me(_id);
  elsif _type = 'project' then return public.is_project_member(_id);
  elsif _type = 'quotation' then return exists (select 1 from public.quotations q where q.id = _id and (q.created_by = auth.uid() or (q.lead_id is not null and public.owns_lead(q.lead_id))));
  end if;
  return false;
end; $$;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid), public.can_access_entity(public.comment_entity, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid), public.can_access_entity(public.comment_entity, uuid) TO authenticated;

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.is_project_member(id));
CREATE POLICY "projects staff insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "projects staff update" ON public.projects FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "projects staff delete" ON public.projects FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read" ON public.project_members FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.is_project_member(project_id));
CREATE POLICY "members staff write" ON public.project_members FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.is_project_member(project_id) OR assignee_id = auth.uid());
CREATE POLICY "tasks staff insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR assignee_id = auth.uid()) WITH CHECK (public.is_staff(auth.uid()) OR assignee_id = auth.uid());
CREATE POLICY "tasks staff delete" ON public.tasks FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files read" ON public.project_files FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.is_project_member(project_id));
CREATE POLICY "files insert" ON public.project_files FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND (public.is_staff(auth.uid()) OR public.is_project_member(project_id)));
CREATE POLICY "files staff delete" ON public.project_files FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices staff" ON public.invoices FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice items staff" ON public.invoice_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments staff" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.comments FOR SELECT TO authenticated USING (public.can_access_entity(entity_type, entity_id));
CREATE POLICY "comments insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_access_entity(entity_type, entity_id));
CREATE POLICY "comments update own" ON public.comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments delete own or staff" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "member reads audit of own projects" ON public.audit_logs FOR SELECT TO authenticated
  USING ((table_name = 'projects' AND public.is_project_member(record_id))
      OR (table_name = 'tasks' AND EXISTS (select 1 from public.tasks t where t.id = record_id)));

-- Invoice numbering and totals
CREATE OR REPLACE FUNCTION public.set_invoice_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.number is null then
    new.number := 'WZ-INV-' || to_char(coalesce(new.issue_date, current_date), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end; $$;
CREATE TRIGGER invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

CREATE OR REPLACE FUNCTION public.compute_invoice_totals() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare sub numeric(12,2); paid numeric(12,2); taxable numeric(12,2);
begin
  if tg_op = 'UPDATE' then new.number := old.number; end if;
  select coalesce(sum(greatest(round(quantity * unit_price, 2) - item_discount, 0)), 0) into sub from public.invoice_items where invoice_id = new.id;
  select coalesce(sum(amount), 0) into paid from public.payments where invoice_id = new.id;
  new.subtotal := sub;
  new.discount_total := least(new.discount_amount, sub);
  taxable := sub - new.discount_total;
  new.tax_total := round(taxable * new.tax_rate / 100, 2);
  new.total := taxable + new.tax_total;
  if tg_op = 'UPDATE' and paid > 0 and new.total < paid then
    raise exception 'Invoice total cannot be lower than payments already recorded';
  end if;
  new.paid_total := paid;
  new.payment_status := case when paid <= 0 then 'unpaid' when paid >= new.total then 'paid' else 'partially_paid' end;
  new.updated_at := now();
  return new;
end; $$;
CREATE TRIGGER invoice_totals BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.compute_invoice_totals();

CREATE OR REPLACE FUNCTION public.invoice_children_retotal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update public.invoices set updated_at = now() where id = coalesce(new.invoice_id, old.invoice_id);
  return null;
end; $$;
CREATE TRIGGER invoice_items_totals AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.invoice_children_retotal();
CREATE TRIGGER payments_totals AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.invoice_children_retotal();

CREATE OR REPLACE FUNCTION public.prevent_overpayment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare tot numeric(12,2); paid numeric(12,2);
begin
  select total into tot from public.invoices where id = new.invoice_id for update;
  select coalesce(sum(amount), 0) into paid from public.payments where invoice_id = new.invoice_id and id <> new.id;
  if paid + new.amount > tot then
    raise exception 'Payment exceeds the balance due';
  end if;
  return new;
end; $$;
CREATE TRIGGER payments_no_overpay BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.prevent_overpayment();

CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER comments_updated BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Audit (label falls back to title)
CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare act text; rec uuid; det jsonb; j jsonb; skip text[] := array['updated_at','subtotal','discount_total','tax_total','total','paid_total','payment_status'];
begin
  j := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_op = 'INSERT' then act := 'create'; rec := new.id;
  elsif tg_op = 'DELETE' then act := 'delete'; rec := old.id;
  else
    rec := new.id;
    if tg_table_name = 'leads' and ((to_jsonb(old)->>'status') is distinct from (to_jsonb(new)->>'status') or (to_jsonb(old)->>'owner_id') is distinct from (to_jsonb(new)->>'owner_id')) then
      return null;
    end if;
    if (to_jsonb(old) - skip) = (to_jsonb(new) - skip) then return null; end if;
    if (to_jsonb(old)->>'status') is distinct from (to_jsonb(new)->>'status') then
      act := 'status_change';
    else
      act := 'update';
    end if;
  end if;
  det := jsonb_build_object('label', coalesce(j->>'number', j->>'company', j->>'name', j->>'title', j->>'file_name'),
                            'parent', coalesce(j->>'project_id', j->>'invoice_id'));
  if act = 'status_change' then det := det || jsonb_build_object('from', to_jsonb(old)->>'status', 'to', to_jsonb(new)->>'status'); end if;
  if tg_table_name = 'payments' then det := det || jsonb_build_object('amount', j->>'amount'); end if;
  insert into public.audit_logs (user_id, action, table_name, record_id, details, actor_label)
  values (auth.uid(), act, tg_table_name, rec, det, nullif(current_setting('app.actor_label', true), ''));
  return null;
end; $$;
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_project_members AFTER INSERT OR DELETE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_project_files AFTER INSERT OR DELETE ON public.project_files FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_comments AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- Notifications
CREATE OR REPLACE FUNCTION public.notify_task_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) and new.assignee_id is distinct from auth.uid() then
    insert into public.notifications (user_id, kind, title, link)
    values (new.assignee_id, 'assignment', 'You were assigned: ' || new.title, '/app/projects/' || new.project_id);
  end if;
  return null;
end; $$;
CREATE TRIGGER tasks_notify AFTER INSERT OR UPDATE OF assignee_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

CREATE OR REPLACE FUNCTION public.notify_project_member() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.user_id is distinct from auth.uid() then
    insert into public.notifications (user_id, kind, title, link)
    select new.user_id, 'assignment', 'You were added to project ' || p.name, '/app/projects/' || p.id from public.projects p where p.id = new.project_id;
  end if;
  return null;
end; $$;
CREATE TRIGGER project_members_notify AFTER INSERT ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.notify_project_member();

CREATE OR REPLACE FUNCTION public.notify_mentions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare who text; link text;
begin
  select coalesce(nullif(full_name,''), email) into who from public.profiles where id = new.user_id;
  link := case new.entity_type when 'lead' then '/app/leads/' when 'client' then '/app/clients/' when 'project' then '/app/projects/' when 'quotation' then '/app/quotations/' else '/app/invoices/' end || new.entity_id;
  insert into public.notifications (user_id, kind, title, link)
  select distinct m, 'mention', coalesce(who, 'A teammate') || ' mentioned you', link
  from unnest(new.mentions) m
  where m is distinct from new.user_id
    and (tg_op = 'INSERT' or not (m = any(old.mentions)));
  return null;
end; $$;
CREATE TRIGGER comments_notify AFTER INSERT OR UPDATE OF mentions ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();

CREATE OR REPLACE FUNCTION public.notify_quote_decision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.status in ('accepted','rejected') and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, link)
    select distinct u, 'quotation', 'Quotation ' || new.number || ' was ' || case when new.status = 'accepted' then 'accepted' else 'declined' end, '/app/quotations/' || new.id
    from (select new.created_by u union select owner_id from public.leads where id = new.lead_id) x
    where u is not null;
  end if;
  return null;
end; $$;
CREATE TRIGGER quotations_notify AFTER UPDATE OF status ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.notify_quote_decision();

-- Public invoice lookup is done by the server with the admin client; no anon policies.

-- Storage policies for the private project-files bucket (path: <project_id>/<file>)
CREATE POLICY "project files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files' AND (public.is_staff(auth.uid()) OR public.is_project_member(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "project files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND (public.is_staff(auth.uid()) OR public.is_project_member(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "project files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND public.is_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
