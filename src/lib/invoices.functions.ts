import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAGE_SIZE, cleanSearch, fmtDate, invoiceBase, todayISO, PAYMENT_METHOD_LABELS, INVOICE_STATUS_LABELS, invoiceStatus } from "@/lib/crm-format";
import { requireStaff } from "@/lib/leads.functions";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    q: z.string().max(100).optional(), status: z.enum(["unpaid", "partially_paid", "paid", "overdue"]).optional(),
    page: z.number().int().min(1).max(10000).default(1), clientId: uuid.optional(), projectId: uuid.optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const from = (data.page - 1) * PAGE_SIZE;
    const today = todayISO();
    let q = context.supabase.from("invoices").select("id, number, issue_date, due_date, total, paid_total, payment_status, clients(company)", { count: "exact" });
    const s = cleanSearch(data.q);
    if (s) q = q.ilike("number", `%${s}%`);
    if (data.clientId) q = q.eq("client_id", data.clientId);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status === "overdue") q = q.neq("payment_status", "paid").lt("due_date", today);
    else if (data.status === "paid") q = q.eq("payment_status", "paid");
    else if (data.status) q = q.eq("payment_status", data.status).or(`due_date.is.null,due_date.gte.${today}`);
    const { data: rows, count, error } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Could not load invoices");
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const invoiceSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const [{ data: quotes }, { data: projects }] = await Promise.all([
      context.supabase.from("quotations").select("id, number, client_id, subtotal, discount_total, tax_rate, total, clients(company)").eq("status", "accepted").order("created_at", { ascending: false }).limit(500),
      context.supabase.from("projects").select("id, name, client_id, quotation_id").order("created_at", { ascending: false }).limit(500),
    ]);
    return { quotes: quotes ?? [], projects: projects ?? [] };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    quotationId: uuid.nullable(), projectId: uuid.nullable(),
    mode: z.enum(["full", "percent", "custom"]), value: z.number().min(0).max(9999999999),
    label: z.string().trim().max(200).optional(),
    taxRate: z.number().min(0).max(100), dueDate: date.nullable(), notes: z.string().trim().max(4000).nullable(),
  }).refine((v) => v.quotationId || v.projectId, "Choose a quotation or project").parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const sb = context.supabase;
    let quotationId = data.quotationId;
    let clientId: string | null = null;
    if (data.projectId) {
      const { data: p } = await sb.from("projects").select("client_id, quotation_id").eq("id", data.projectId).maybeSingle();
      if (!p) return { ok: false as const, error: "Project not found." };
      clientId = p.client_id;
      quotationId = quotationId ?? p.quotation_id;
    }
    let quote: any = null;
    if (quotationId) {
      const { data: q } = await sb.from("quotations").select("id, number, status, client_id, subtotal, discount_total").eq("id", quotationId).maybeSingle();
      if (!q || q.status !== "accepted") return { ok: false as const, error: "Invoices can only be made from accepted quotations." };
      quote = q; clientId = clientId ?? q.client_id;
    }
    if (!quote && data.mode !== "custom") return { ok: false as const, error: "This project has no accepted quotation. Use a custom amount." };

    let items: { description: string; quantity: number; unit_price: number; item_discount: number; position: number }[];
    let discount = 0;
    if (data.mode === "full") {
      const { data: qi } = await sb.from("quotation_items").select("description, quantity, unit_price, item_discount, position").eq("quotation_id", quote.id).order("position");
      items = (qi ?? []).map((x) => ({ ...x, quantity: Number(x.quantity), unit_price: Number(x.unit_price), item_discount: Number(x.item_discount) }));
      discount = Number(quote.discount_total);
    } else {
      const base = quote ? Number(quote.subtotal) - Number(quote.discount_total) : 0;
      const amount = invoiceBase(base, data.mode, data.value);
      if (amount <= 0) return { ok: false as const, error: "The invoice amount must be more than zero." };
      if (quote && amount > base) return { ok: false as const, error: "The amount is more than the quotation value." };
      const desc = data.label || (data.mode === "percent" ? `${data.value}% of quotation ${quote.number}` : quote ? `Milestone for quotation ${quote.number}` : "Professional services");
      items = [{ description: desc, quantity: 1, unit_price: amount, item_discount: 0, position: 0 }];
    }
    if (!items.length) return { ok: false as const, error: "The quotation has no items." };

    const { data: inv, error } = await sb.from("invoices").insert({
      client_id: clientId, project_id: data.projectId, quotation_id: quotationId, due_date: data.dueDate,
      tax_rate: data.taxRate, discount_amount: discount, notes: data.notes, created_by: context.userId,
    }).select("id").single();
    if (error || !inv) return { ok: false as const, error: "Could not create the invoice." };
    const { error: e2 } = await sb.from("invoice_items").insert(items.map((it) => ({ ...it, invoice_id: inv.id })));
    if (e2) { await sb.from("invoices").delete().eq("id", inv.id); return { ok: false as const, error: "Could not save the invoice items." }; }
    return { ok: true as const, id: inv.id };
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: inv } = await sb.from("invoices").select("*, clients(*), projects(id, name), quotations(id, number)").eq("id", data.id).maybeSingle();
    if (!inv) throw new Error("Invoice not found");
    const [{ data: items }, { data: payments }] = await Promise.all([
      sb.from("invoice_items").select("*").eq("invoice_id", data.id).order("position"),
      sb.from("payments").select("*").eq("invoice_id", data.id).order("paid_on"),
    ]);
    return { invoice: inv, items: items ?? [], payments: payments ?? [] };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    invoiceId: uuid, amount: z.number().positive().max(9999999999), paidOn: date,
    method: z.enum(["upi", "bank_transfer", "cash", "cheque", "card", "other"]), reference: z.string().trim().max(200).nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    if (data.paidOn > todayISO()) return { ok: false as const, error: "The payment date cannot be in the future." };
    const { error } = await context.supabase.from("payments").insert({
      invoice_id: data.invoiceId, amount: data.amount, paid_on: data.paidOn, method: data.method, reference: data.reference, recorded_by: context.userId,
    });
    if (error) {
      if (error.message.includes("exceeds")) {
        const { data: inv } = await context.supabase.from("invoices").select("total, paid_total").eq("id", data.invoiceId).maybeSingle();
        const bal = inv ? Math.round((Number(inv.total) - Number(inv.paid_total)) * 100) / 100 : 0;
        return { ok: false as const, error: `Payment is more than the balance due, which is ₹${bal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` };
      }
      return { ok: false as const, error: "Could not record the payment." };
    }
    return { ok: true as const };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("payments").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the payment." };
    return { ok: true as const };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the invoice." };
    return { ok: true as const };
  });

export const regenerateInvoiceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("invoices").update({ share_token: token }).eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not create a new link." };
    return { ok: true as const };
  });

export const clientBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ clientId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: invs } = await context.supabase.from("invoices").select("id, number, issue_date, due_date, total, paid_total, payment_status, payments(id, amount, paid_on, method, reference)").eq("client_id", data.clientId).order("issue_date", { ascending: false });
    const rows = invs ?? [];
    const billed = rows.reduce((a, r) => a + Number(r.total), 0);
    const paid = rows.reduce((a, r) => a + Number(r.paid_total), 0);
    return { invoices: rows, billed, paid, outstanding: billed - paid };
  });

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const toCsv = (head: string[], rows: unknown[][]) => [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

export const exportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: z.enum(["clients", "invoices", "payments"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const sb = context.supabase;
    if (data.kind === "clients") {
      const { data: r } = await sb.from("clients").select("company, contact_name, email, phone, address, city, gstin, created_at").order("company").limit(5000);
      return toCsv(["Company", "Contact", "Email", "Phone", "Address", "City", "GSTIN", "Added"], (r ?? []).map((c) => [c.company, c.contact_name, c.email, c.phone, c.address, c.city, c.gstin, fmtDate(c.created_at)]));
    }
    if (data.kind === "invoices") {
      const { data: r } = await sb.from("invoices").select("number, issue_date, due_date, subtotal, discount_total, tax_rate, tax_total, total, paid_total, payment_status, clients(company, gstin)").order("issue_date", { ascending: false }).limit(5000);
      return toCsv(["Number", "Client", "Client GSTIN", "Issued", "Due", "Subtotal", "Discount", "GST %", "GST", "Total", "Paid", "Balance", "Status"],
        (r ?? []).map((i: any) => [i.number, i.clients?.company, i.clients?.gstin, fmtDate(i.issue_date), fmtDate(i.due_date), i.subtotal, i.discount_total, i.tax_rate, i.tax_total, i.total, i.paid_total, (Number(i.total) - Number(i.paid_total)).toFixed(2), INVOICE_STATUS_LABELS[invoiceStatus(i)]]));
    }
    const { data: r } = await sb.from("payments").select("amount, paid_on, method, reference, invoices(number, clients(company))").order("paid_on", { ascending: false }).limit(5000);
    return toCsv(["Date", "Invoice", "Client", "Amount (INR)", "Method", "Reference"], (r ?? []).map((p: any) => [fmtDate(p.paid_on), p.invoices?.number, p.invoices?.clients?.company, p.amount, PAYMENT_METHOD_LABELS[p.method], p.reference]));
  });

/* ---------- Public invoice link ---------- */

export const getSharedInvoice = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{48,96}$/) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `iview:${ip}`;
    const now = Date.now();
    const { data: rl } = await supabaseAdmin.from("rate_limits").select("count, window_start").eq("key", key).maybeSingle();
    if (rl && now - new Date(rl.window_start).getTime() < 600000) {
      if (rl.count >= 60) return null;
      await supabaseAdmin.from("rate_limits").update({ count: rl.count + 1 }).eq("key", key);
    } else await supabaseAdmin.from("rate_limits").upsert({ key, count: 1, window_start: new Date(now).toISOString() });
    const { data: inv } = await supabaseAdmin.from("invoices")
      .select("id, number, issue_date, due_date, subtotal, discount_total, tax_rate, tax_total, total, paid_total, payment_status, notes, clients(company, contact_name, email, phone, address, city, gstin)")
      .eq("share_token", data.token).maybeSingle();
    if (!inv) return null;
    const { data: items } = await supabaseAdmin.from("invoice_items").select("description, quantity, unit_price, item_discount").eq("invoice_id", inv.id).order("position");
    const { id: _omit, ...pub } = inv;
    return { invoice: pub, items: items ?? [] };
  });
