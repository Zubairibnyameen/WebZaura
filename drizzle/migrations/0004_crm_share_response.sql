CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare act text; rec uuid; det jsonb; skip text[] := array['updated_at','subtotal','discount_total','tax_total','total'];
begin
  if tg_op = 'INSERT' then act := 'create'; rec := new.id; det := jsonb_build_object('label', coalesce(to_jsonb(new)->>'number', to_jsonb(new)->>'company', to_jsonb(new)->>'name'));
  elsif tg_op = 'DELETE' then act := 'delete'; rec := old.id; det := jsonb_build_object('label', coalesce(to_jsonb(old)->>'number', to_jsonb(old)->>'company', to_jsonb(old)->>'name'));
  else
    rec := new.id;
    if tg_table_name = 'leads' and ((to_jsonb(old)->>'status') is distinct from (to_jsonb(new)->>'status') or (to_jsonb(old)->>'owner_id') is distinct from (to_jsonb(new)->>'owner_id')) then
      return null;
    end if;
    if (to_jsonb(old) - skip) = (to_jsonb(new) - skip) then return null; end if;
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

CREATE OR REPLACE FUNCTION public.respond_to_quotation(_token text, _accept boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare q public.quotations;
begin
  select * into q from public.quotations where share_token = _token for update;
  if not found then return 'not_found'; end if;
  if q.status in ('accepted','rejected') then return 'decided'; end if;
  if q.status = 'expired' or (q.valid_until is not null and q.valid_until < current_date) then
    update public.quotations set status = 'expired' where id = q.id and status <> 'expired';
    return 'expired';
  end if;
  perform set_config('app.actor_label', 'Client via share link', true);
  update public.quotations set status = case when _accept then 'accepted'::public.quotation_status else 'rejected'::public.quotation_status end where id = q.id;
  if q.lead_id is not null and q.created_by is not null then
    insert into public.lead_notes (lead_id, user_id, body)
    values (q.lead_id, q.created_by, 'Client ' || case when _accept then 'accepted' else 'declined' end || ' quotation ' || q.number || ' through the share link.');
  end if;
  return case when _accept then 'accepted' else 'rejected' end;
end; $$;
REVOKE EXECUTE ON FUNCTION public.respond_to_quotation(text, boolean) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.respond_to_quotation(text, boolean) TO service_role;
