ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'quoted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'negotiating';
COMMENT ON TYPE public.lead_status IS 'Active values: new, contacted, quoted, negotiating, won, lost. DEPRECATED: qualified, proposal_sent, negotiation';

CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired');
CREATE TYPE public.discount_kind AS ENUM ('percent','amount');

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_label text;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  gstin text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  default_unit_price numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS next_follow_up date,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE SEQUENCE public.quotation_number_seq;

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT current_date,
  valid_until date,
  discount_type public.discount_kind NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 18 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  notes text,
  terms text,
  share_token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_by uuid DEFAULT auth.uid(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;

CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  item_discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (item_discount >= 0),
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
CREATE INDEX ON public.quotation_items(quotation_id);
CREATE INDEX ON public.quotations(lead_id);
CREATE INDEX ON public.quotations(client_id);
CREATE INDEX ON public.leads(client_id);

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','manager'))
$$;

CREATE OR REPLACE FUNCTION public.owns_lead(_lead_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.leads where id = _lead_id and owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.client_linked_to_me(_client_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.leads where client_id = _client_id and owner_id = auth.uid())
      or exists (select 1 from public.quotations q left join public.leads l on l.id = q.lead_id
                 where q.client_id = _client_id and (q.created_by = auth.uid() or l.owner_id = auth.uid()))
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid), public.owns_lead(uuid), public.client_linked_to_me(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid), public.owns_lead(uuid), public.client_linked_to_me(uuid) TO authenticated;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients read" ON public.clients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid() OR public.client_linked_to_me(id));
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid() OR public.client_linked_to_me(id))
  WITH CHECK (public.is_staff(auth.uid()) OR created_by = auth.uid() OR public.client_linked_to_me(id));
CREATE POLICY "clients delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services read" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services admin write" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotations read" ON public.quotations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid() OR (lead_id IS NOT NULL AND public.owns_lead(lead_id)));
CREATE POLICY "quotations insert" ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_staff(auth.uid()) OR (
    (lead_id IS NULL OR public.owns_lead(lead_id)) AND
    (client_id IS NULL OR public.client_linked_to_me(client_id) OR EXISTS (select 1 from public.clients c where c.id = client_id and c.created_by = auth.uid())))));
CREATE POLICY "quotations update" ON public.quotations FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid() OR (lead_id IS NOT NULL AND public.owns_lead(lead_id)))
  WITH CHECK (public.is_staff(auth.uid()) OR created_by = auth.uid() OR (lead_id IS NOT NULL AND public.owns_lead(lead_id)));
CREATE POLICY "quotations delete" ON public.quotations FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items follow quotation" ON public.quotation_items FOR ALL TO authenticated
  USING (EXISTS (select 1 from public.quotations q where q.id = quotation_id))
  WITH CHECK (EXISTS (select 1 from public.quotations q where q.id = quotation_id));

CREATE POLICY "manager inserts leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager deletes leads" ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'manager'));
CREATE POLICY "member inserts own leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "manager reads audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'manager'));
CREATE POLICY "member reads audit of own records" ON public.audit_logs FOR SELECT TO authenticated
  USING ((table_name = 'leads' AND public.owns_lead(record_id))
      OR (table_name = 'quotations' AND EXISTS (select 1 from public.quotations q where q.id = record_id)));

CREATE OR REPLACE FUNCTION public.set_quotation_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.number is null then
    new.number := 'WZ-Q-' || to_char(coalesce(new.issue_date, current_date), 'YYYY') || '-' || lpad(nextval('public.quotation_number_seq')::text, 4, '0');
  end if;
  return new;
end; $$;
CREATE TRIGGER quotation_number BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_quotation_number();

CREATE OR REPLACE FUNCTION public.compute_quotation_totals() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare sub numeric(12,2); disc numeric(12,2); taxable numeric(12,2);
begin
  if tg_op = 'UPDATE' and old.status = 'accepted' then
    if (new.status, new.lead_id, new.client_id, new.issue_date, new.valid_until, new.discount_type, new.discount_value, new.tax_rate, new.notes, new.terms)
       is distinct from (old.status, old.lead_id, old.client_id, old.issue_date, old.valid_until, old.discount_type, old.discount_value, old.tax_rate, old.notes, old.terms) then
      raise exception 'Accepted quotations cannot be changed';
    end if;
    new.number := old.number;
    new.subtotal := old.subtotal; new.discount_total := old.discount_total; new.tax_total := old.tax_total; new.total := old.total;
    return new;
  end if;
  if tg_op = 'UPDATE' then new.number := old.number; end if;
  select coalesce(sum(greatest(round(quantity * unit_price, 2) - item_discount, 0)), 0) into sub
    from public.quotation_items where quotation_id = new.id;
  if new.discount_type = 'percent' then
    disc := round(sub * least(new.discount_value, 100) / 100, 2);
  else
    disc := least(new.discount_value, sub);
  end if;
  taxable := sub - disc;
  new.subtotal := sub;
  new.discount_total := disc;
  new.tax_total := round(taxable * new.tax_rate / 100, 2);
  new.total := taxable + new.tax_total;
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('accepted','rejected') then
    new.decided_at := now();
  end if;
  return new;
end; $$;
CREATE TRIGGER quotation_totals BEFORE INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.compute_quotation_totals();

CREATE OR REPLACE FUNCTION public.quotation_items_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare qid uuid; st public.quotation_status;
begin
  qid := coalesce(new.quotation_id, old.quotation_id);
  select status into st from public.quotations where id = qid;
  if st = 'accepted' then raise exception 'Accepted quotations cannot be changed'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
CREATE TRIGGER quotation_items_lock BEFORE INSERT OR UPDATE OR DELETE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION public.quotation_items_changed();

CREATE OR REPLACE FUNCTION public.quotation_items_retotal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update public.quotations set updated_at = now() where id = coalesce(new.quotation_id, old.quotation_id) and status <> 'accepted';
  return null;
end; $$;
CREATE TRIGGER quotation_items_totals AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION public.quotation_items_retotal();

CREATE OR REPLACE FUNCTION public.quotation_accepted_wins_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.lead_id is not null then
    update public.leads set status = 'won' where id = new.lead_id;
  end if;
  return null;
end; $$;
CREATE TRIGGER quotation_wins_lead AFTER UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.quotation_accepted_wins_lead();

CREATE OR REPLACE FUNCTION public.expire_quotations() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  update public.quotations set status = 'expired' where status = 'sent' and valid_until is not null and valid_until < current_date;
$$;
REVOKE EXECUTE ON FUNCTION public.expire_quotations() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.expire_quotations() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare act text; rec uuid; det jsonb;
begin
  if tg_op = 'INSERT' then act := 'create'; rec := new.id; det := jsonb_build_object('label', coalesce(to_jsonb(new)->>'number', to_jsonb(new)->>'company', to_jsonb(new)->>'name'));
  elsif tg_op = 'DELETE' then act := 'delete'; rec := old.id; det := jsonb_build_object('label', coalesce(to_jsonb(old)->>'number', to_jsonb(old)->>'company', to_jsonb(old)->>'name'));
  else
    rec := new.id;
    if tg_table_name = 'leads' and ((to_jsonb(old)->>'status') is distinct from (to_jsonb(new)->>'status') or (to_jsonb(old)->>'owner_id') is distinct from (to_jsonb(new)->>'owner_id')) then
      return null;
    end if;
    if (to_jsonb(old) - 'updated_at') = (to_jsonb(new) - 'updated_at') then return null; end if;
    if tg_table_name = 'quotations' and (to_jsonb(old)->>'status') is distinct from (to_jsonb(new)->>'status') then
      act := 'status_change'; det := jsonb_build_object('from', to_jsonb(old)->>'status', 'to', to_jsonb(new)->>'status');
    else
      act := 'update'; det := null;
    end if;
  end if;
  insert into public.audit_logs (user_id, action, table_name, record_id, details, actor_label)
  values (auth.uid(), act, tg_table_name, rec, det, nullif(current_setting('app.actor_label', true), ''));
  return null;
end; $$;
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_row();

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
begin new.updated_at := now(); return new; end; $$;
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
