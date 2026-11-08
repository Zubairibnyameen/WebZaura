-- DEMO DATA for WebZaura CRM. Run manually only; nothing runs this automatically.
-- Every record is labelled "DEMO" so it is easy to find and delete.
insert into public.clients (id, company, contact_name, email, phone, city, notes) values
  ('00000000-0000-4000-8000-0000000000c1', 'DEMO Sharma Traders', 'DEMO Ravi Sharma', 'demo.ravi@example.invalid', '+91 90000 00001', 'Lucknow', 'Demo client'),
  ('00000000-0000-4000-8000-0000000000c2', 'DEMO Green Leaf Cafe', 'DEMO Aisha Khan', 'demo.aisha@example.invalid', '+91 90000 00002', 'Kanpur', 'Demo client');

insert into public.leads (id, name, email, company, service_interest, status, source, client_id, next_follow_up) values
  ('00000000-0000-4000-8000-0000000000a1', 'DEMO Ravi Sharma', 'demo.ravi@example.invalid', 'DEMO Sharma Traders', 'Website Design and Development', 'quoted', 'demo', '00000000-0000-4000-8000-0000000000c1', current_date + 2),
  ('00000000-0000-4000-8000-0000000000a2', 'DEMO Aisha Khan', 'demo.aisha@example.invalid', 'DEMO Green Leaf Cafe', 'Social Media Marketing', 'contacted', 'demo', '00000000-0000-4000-8000-0000000000c2', current_date - 1),
  ('00000000-0000-4000-8000-0000000000a3', 'DEMO Neha Verma', 'demo.neha@example.invalid', null, 'Growth Consulting', 'new', 'demo', null, null);

insert into public.quotations (id, lead_id, client_id, status, valid_until, discount_type, discount_value, tax_rate, notes) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', 'draft', current_date + 30, 'percent', 0, 18, 'DEMO quotation');

insert into public.quotation_items (quotation_id, description, quantity, unit_price, position) values
  ('00000000-0000-4000-8000-0000000000b1', 'DEMO Website Design and Development (set your price)', 1, 0, 0);
