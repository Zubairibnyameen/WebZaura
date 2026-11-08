import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAGE_SIZE, cleanSearch } from "@/lib/crm-format";
import { requireStaff } from "@/lib/leads.functions";

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const uuid = z.string().uuid();
const pageSchema = z.object({ q: z.string().max(100).optional(), page: z.number().int().min(1).max(10000).default(1) });

async function isAdmin(sb: any, userId: string) {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

/* ---------- Clients ---------- */

const clientSchema = z.object({
  company: z.string().trim().min(2).max(160),
  contact_name: opt(120),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")).transform((v) => v || null),
  phone: opt(30),
  address: opt(300),
  city: opt(80),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, "GSTIN has 15 letters and digits").optional().nullable().or(z.literal("")).transform((v) => v || null),
  notes: opt(2000),
});

export const listClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageSchema.extend({ sort: z.enum(["company", "created_at"]).default("company") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * PAGE_SIZE;
    let q = context.supabase.from("clients").select("id, company, contact_name, email, phone, city, created_at", { count: "exact" });
    const s = cleanSearch(data.q);
    if (s) q = q.or(`company.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%`);
    const { data: rows, count, error } = await q.order(data.sort, { ascending: data.sort === "company" }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Could not load clients");
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: client } = await sb.from("clients").select("*").eq("id", data.id).maybeSingle();
    if (!client) throw new Error("Client not found");
    const [{ data: leads }, { data: quotes }] = await Promise.all([
      sb.from("leads").select("id, name, status, created_at").eq("client_id", data.id).order("created_at", { ascending: false }),
      sb.from("quotations").select("id, number, status, total, issue_date").eq("client_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { client, leads: leads ?? [], quotes: quotes ?? [] };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => clientSchema.extend({ id: uuid.optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      const { data: rows, error } = await context.supabase.from("clients").update(fields).eq("id", id).select("id");
      if (error || !rows?.length) return { ok: false as const, error: "Could not save the client." };
      return { ok: true as const, id };
    }
    const { data: row, error } = await context.supabase.from("clients").insert({ ...fields, created_by: context.userId }).select("id").single();
    if (error || !row) return { ok: false as const, error: "Could not create the client." };
    return { ok: true as const, id: row.id };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the client." };
    return { ok: true as const };
  });

/* ---------- Services ---------- */

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("services").select("*").order("position").order("name");
    if (error) throw new Error("Could not load services");
    return data ?? [];
  });

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: uuid.optional(),
      name: z.string().trim().min(2).max(120),
      description: opt(1000),
      default_unit_price: z.number().min(0).max(9999999999).nullable(),
      is_active: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) return { ok: false as const, error: "Only admins can edit services." };
    const { id, ...f } = data;
    const res = id
      ? await context.supabase.from("services").update(f).eq("id", id)
      : await context.supabase.from("services").insert({ ...f, position: 100 });
    if (res.error) return { ok: false as const, error: res.error.code === "23505" ? "A service with this name exists." : "Could not save the service." };
    return { ok: true as const };
  });

/* ---------- Quotations ---------- */

const statusEnum = z.enum(["draft", "sent", "accepted", "rejected", "expired"]);

export const listQuotations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageSchema.extend({ status: statusEnum.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await sb.rpc("expire_quotations");
    const from = (data.page - 1) * PAGE_SIZE;
    let q = sb.from("quotations").select("id, number, status, issue_date, valid_until, total, clients(company), leads(name)", { count: "exact" });
    let sumQ = sb.from("quotations").select("total");
    const s = cleanSearch(data.q);
    if (s) { q = q.ilike("number", `%${s}%`); sumQ = sumQ.ilike("number", `%${s}%`); }
    if (data.status) { q = q.eq("status", data.status); sumQ = sumQ.eq("status", data.status); }
    const [{ data: rows, count, error }, { data: sums }] = await Promise.all([
      q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
      sumQ.limit(5000),
    ]);
    if (error) throw new Error("Could not load quotations");
    return { rows: rows ?? [], count: count ?? 0, sum: (sums ?? []).reduce((a, r) => a + Number(r.total), 0) };
  });

export const quotationOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: clients }, { data: leads }, { data: services }] = await Promise.all([
      sb.from("clients").select("id, company").order("company").limit(1000),
      sb.from("leads").select("id, name, company, client_id").order("created_at", { ascending: false }).limit(1000),
      sb.from("services").select("id, name, description, default_unit_price").eq("is_active", true).order("position"),
    ]);
    return { clients: clients ?? [], leads: leads ?? [], services: services ?? [] };
  });

export const getQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await sb.rpc("expire_quotations");
    const { data: quote } = await sb.from("quotations").select("*, clients(*), leads(id, name, email, phone, company)").eq("id", data.id).maybeSingle();
    if (!quote) throw new Error("Quotation not found");
    const [{ data: items }, { data: audits }] = await Promise.all([
      sb.from("quotation_items").select("*").eq("quotation_id", data.id).order("position"),
      sb.from("audit_logs").select("id, action, details, created_at, actor_label").eq("table_name", "quotations").eq("record_id", data.id).order("created_at"),
    ]);
    return { quote, items: items ?? [], audits: audits ?? [] };
  });

const itemSchema = z.object({
  service_id: uuid.nullable(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(100000),
  unit_price: z.number().min(0).max(9999999999),
  item_discount: z.number().min(0).max(9999999999),
});

export const saveQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: uuid.optional(),
      lead_id: uuid.nullable(),
      client_id: uuid.nullable(),
      valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      discount_type: z.enum(["percent", "amount"]),
      discount_value: z.number().min(0).max(9999999999),
      tax_rate: z.number().min(0).max(100),
      notes: opt(4000),
      terms: opt(4000),
      items: z.array(itemSchema).min(1).max(100),
    }).refine((v) => v.lead_id || v.client_id, "Choose a client or a lead").parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { id, items, ...fields } = data;
    let qid = id;
    if (qid) {
      const { data: rows, error } = await sb.from("quotations").update(fields).eq("id", qid).select("id, status");
      if (error || !rows?.length) return { ok: false as const, error: error?.message.includes("Accepted") ? "Accepted quotations cannot be changed." : "Could not save the quotation." };
      const { error: delErr } = await sb.from("quotation_items").delete().eq("quotation_id", qid);
      if (delErr) return { ok: false as const, error: "Could not update the items." };
    } else {
      const { data: row, error } = await sb.from("quotations").insert({ ...fields, created_by: context.userId }).select("id").single();
      if (error || !row) return { ok: false as const, error: "Could not create the quotation. Check you can access the chosen client or lead." };
      qid = row.id;
    }
    const { error: itErr } = await sb.from("quotation_items").insert(items.map((it, position) => ({ ...it, position, quotation_id: qid! })));
    if (itErr) return { ok: false as const, error: "The quotation saved, but its items did not." };
    if (data.lead_id && !id) {
      await sb.from("leads").update({ status: "quoted" }).eq("id", data.lead_id).in("status", ["new", "contacted"]);
    }
    return { ok: true as const, id: qid! };
  });

export const setQuotationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, status: statusEnum }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("quotations").update({ status: data.status }).eq("id", data.id).select("id");
    if (error || !rows?.length) return { ok: false as const, error: error?.message.includes("Accepted") ? "Accepted quotations cannot be changed." : "Could not change the status." };
    return { ok: true as const };
  });

export const duplicateQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: q } = await sb.from("quotations").select("lead_id, client_id, discount_type, discount_value, tax_rate, notes, terms").eq("id", data.id).maybeSingle();
    if (!q) return { ok: false as const, error: "Quotation not found." };
    const { data: items } = await sb.from("quotation_items").select("service_id, description, quantity, unit_price, item_discount, position").eq("quotation_id", data.id);
    const { data: row, error } = await sb.from("quotations").insert({ ...q, created_by: context.userId }).select("id").single();
    if (error || !row) return { ok: false as const, error: "Could not duplicate the quotation." };
    if (items?.length) await sb.from("quotation_items").insert(items.map((it) => ({ ...it, quotation_id: row.id })));
    return { ok: true as const, id: row.id };
  });

export const regenerateShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) return { ok: false as const, error: "Only admins can revoke links." };
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("quotations").update({ share_token: token }).eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not create a new link." };
    return { ok: true as const };
  });

export const deleteQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("quotations").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the quotation." };
    return { ok: true as const };
  });

/* ---------- Global search ---------- */

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    const s = cleanSearch(data.q);
    if (s.length < 2) return [];
    const sb = context.supabase;
    const [{ data: leads }, { data: clients }, { data: quotes }, { data: projects }, { data: invoices }] = await Promise.all([
      sb.from("leads").select("id, name, company").or(`name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`).limit(6),
      sb.from("clients").select("id, company, contact_name").or(`company.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%`).limit(6),
      sb.from("quotations").select("id, number").ilike("number", `%${s}%`).limit(6),
      sb.from("projects").select("id, name").ilike("name", `%${s}%`).limit(6),
      sb.from("invoices").select("id, number").ilike("number", `%${s}%`).limit(6), // RLS returns nothing for members
    ]);
    return [
      ...(leads ?? []).map((l) => ({ kind: "Lead" as const, id: l.id, label: l.name, sub: l.company })),
      ...(clients ?? []).map((c) => ({ kind: "Client" as const, id: c.id, label: c.company, sub: c.contact_name })),
      ...(quotes ?? []).map((q) => ({ kind: "Quotation" as const, id: q.id, label: q.number ?? "", sub: null })),
      ...(projects ?? []).map((p) => ({ kind: "Project" as const, id: p.id, label: p.name, sub: null })),
      ...(invoices ?? []).map((v) => ({ kind: "Invoice" as const, id: v.id, label: v.number ?? "", sub: null })),
    ];
  });

/* ---------- Public share link (no sign-in; looked up by token on the server) ---------- */

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48,96}$/) });

async function rateLimited(admin: any, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const { data: rl } = await admin.from("rate_limits").select("count, window_start").eq("key", key).maybeSingle();
  if (rl && now - new Date(rl.window_start).getTime() < windowMs) {
    if (rl.count >= max) return true;
    await admin.from("rate_limits").update({ count: rl.count + 1 }).eq("key", key);
    return false;
  }
  await admin.from("rate_limits").upsert({ key, count: 1, window_start: new Date(now).toISOString() });
  return false;
}

export const getSharedQuotation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => tokenSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await rateLimited(supabaseAdmin, `qview:${ip}`, 60, 10 * 60 * 1000)) return null;
    await supabaseAdmin.rpc("expire_quotations");
    const { data: q } = await supabaseAdmin
      .from("quotations")
      .select("id, number, status, issue_date, valid_until, discount_type, discount_value, tax_rate, notes, terms, subtotal, discount_total, tax_total, total, clients(company, contact_name, email, phone, address, city, gstin), leads(name, company, email)")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!q) return null;
    const { data: items } = await supabaseAdmin.from("quotation_items").select("description, quantity, unit_price, item_discount, position").eq("quotation_id", q.id).order("position");
    const { id: _omit, ...pub } = q;
    return { quote: pub, items: items ?? [] };
  });

export const respondToSharedQuotation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => tokenSchema.extend({ accept: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await rateLimited(supabaseAdmin, `qresp:${ip}`, 5, 10 * 60 * 1000)) {
      return { ok: false as const, error: "Too many attempts. Please try again in a few minutes." };
    }
    const { data: result, error } = await supabaseAdmin.rpc("respond_to_quotation", { _token: data.token, _accept: data.accept });
    if (error) return { ok: false as const, error: "Your response could not be saved. Please try again." };
    if (result === "accepted" || result === "rejected") return { ok: true as const, status: result };
    const msg: Record<string, string> = {
      not_found: "This link is no longer valid.",
      decided: "This quotation already has a response.",
      expired: "This quotation has expired. Please contact WebZaura for a new one.",
    };
    return { ok: false as const, error: msg[String(result)] ?? "Your response could not be saved." };
  });
