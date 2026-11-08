import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAGE_SIZE, cleanSearch, LEAD_STATUS_LABELS, fmtDate } from "@/lib/crm-format";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  service: z.string().trim().max(120).optional().or(z.literal("")),
  clientType: z.enum(["Business", "Startup", "Individual", "NGO"]).optional(),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot: must stay empty
});

/** Public contact-form save. Always returns a generic result; the form opens WhatsApp regardless. */
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      if (data.website) return { ok: true as const }; // honeypot filled: pretend success
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

      // Per-IP rate limit: max 5 enquiries per 10 minutes.
      const windowMs = 10 * 60 * 1000;
      const { data: rl } = await supabaseAdmin.from("rate_limits").select("count, window_start").eq("key", `lead:${ip}`).maybeSingle();
      const now = Date.now();
      if (rl && now - new Date(rl.window_start).getTime() < windowMs) {
        if (rl.count >= 5) return { ok: true as const };
        await supabaseAdmin.from("rate_limits").update({ count: rl.count + 1 }).eq("key", `lead:${ip}`);
      } else {
        await supabaseAdmin.from("rate_limits").upsert({ key: `lead:${ip}`, count: 1, window_start: new Date(now).toISOString() });
      }

      // Duplicate guard: same email within 60 seconds.
      const since = new Date(now - 60 * 1000).toISOString();
      const { data: dup } = await supabaseAdmin
        .from("leads").select("id").eq("email", data.email).gte("created_at", since).limit(1);
      if (dup?.length) return { ok: true as const };

      const { error } = await supabaseAdmin.from("leads").insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        service_interest: data.service || null,
        client_type: data.clientType ?? null,
        message: data.message,
        source: "website_form",
      });
      if (error) return { ok: false as const };
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

const statusEnum = z.enum(["new", "contacted", "quoted", "negotiating", "won", "lost"]);

async function roleOf(supabase: any, userId: string): Promise<"admin" | "manager" | "member"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  return roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "member";
}
export async function requireStaff(supabase: any, userId: string) {
  const r = await roleOf(supabase, userId);
  if (r === "member") throw new Error("Forbidden");
  return r;
}

const listSchema = z.object({
  q: z.string().max(100).optional(),
  status: statusEnum.optional(),
  sort: z.enum(["created_at", "name", "next_follow_up", "expected_value"]).default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).max(10000).default(1),
});

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * PAGE_SIZE;
    let query = context.supabase
      .from("leads")
      .select("id, name, email, phone, company, service_interest, status, owner_id, source, expected_value, next_follow_up, created_at", { count: "exact" });
    const q = cleanSearch(data.q);
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,service_interest.ilike.%${q}%`);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, count, error } = await query
      .order(data.sort, { ascending: data.dir === "asc", nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Could not load leads");
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const listPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leads")
      .select("id, name, company, service_interest, status, expected_value, next_follow_up")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Could not load the pipeline");
    return data ?? [];
  });

export const getLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: lead, error } = await sb.from("leads").select("*").eq("id", data.id).maybeSingle();
    if (error || !lead) throw new Error("Lead not found");
    const [{ data: notes }, { data: audits }, { data: owners }, { data: quotes }, client] = await Promise.all([
      sb.from("lead_notes").select("id, body, created_at, user_id").eq("lead_id", data.id).order("created_at"),
      sb.from("audit_logs").select("id, action, details, created_at, actor_label").eq("table_name", "leads").eq("record_id", data.id).order("created_at"),
      sb.from("profiles").select("id, full_name, email").eq("is_active", true),
      sb.from("quotations").select("id, number, status, total, issue_date").eq("lead_id", data.id).order("created_at", { ascending: false }),
      lead.client_id ? sb.from("clients").select("id, company").eq("id", lead.client_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return { lead, notes: notes ?? [], audits: audits ?? [], owners: owners ?? [], quotes: quotes ?? [], client: (client as any).data ?? null };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: statusEnum, lostReason: z.string().trim().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { status: typeof data.status; lost_reason?: string | null } = { status: data.status };
    if (data.status === "lost" && data.lostReason !== undefined) patch.lost_reason = data.lostReason || null;
    const { data: rows, error } = await context.supabase.from("leads").update(patch).eq("id", data.id).select("id");
    if (error || !rows?.length) return { ok: false as const, error: "Could not update the status." };
    return { ok: true as const };
  });

export const updateLeadDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      expectedValue: z.number().min(0).max(9999999999).nullable(),
      nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      lostReason: z.string().trim().max(500).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("leads").update({
      expected_value: data.expectedValue, next_follow_up: data.nextFollowUp, lost_reason: data.lostReason || null,
    }).eq("id", data.id).select("id");
    if (error || !rows?.length) return { ok: false as const, error: "Could not save these details." };
    return { ok: true as const };
  });

export const assignLeadOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), ownerId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await roleOf(context.supabase, context.userId);
    if (role === "member") return { ok: false as const, error: "Only admins and managers can assign owners." };
    const { error } = await context.supabase.from("leads").update({ owner_id: data.ownerId }).eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not assign the owner." };
    return { ok: true as const };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ leadId: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lead_notes").insert({
      lead_id: data.leadId, user_id: context.userId, body: data.body,
    });
    if (error) return { ok: false as const, error: "Could not save the note." };
    return { ok: true as const };
  });

export const convertLeadToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: lead } = await sb.from("leads").select("id, name, email, phone, company, client_id, message").eq("id", data.id).maybeSingle();
    if (!lead) return { ok: false as const, error: "This lead could not be found." };
    if (lead.client_id) return { ok: true as const, clientId: lead.client_id };
    const { data: client, error } = await sb.from("clients").insert({
      company: lead.company || lead.name, contact_name: lead.name, email: lead.email, phone: lead.phone, created_by: context.userId,
    }).select("id").single();
    if (error || !client) return { ok: false as const, error: "Could not create the client." };
    const { error: e2 } = await sb.from("leads").update({ client_id: client.id, converted_at: new Date().toISOString() }).eq("id", lead.id);
    if (e2) return { ok: false as const, error: "Client created, but the lead could not be linked." };
    return { ok: true as const, clientId: client.id };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete this lead." };
    return { ok: true as const };
  });

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // spreadsheet formula guard
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportLeadsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("leads")
      .select("name, email, phone, company, service_interest, client_type, status, source, expected_value, next_follow_up, lost_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error("Could not export leads");
    const head = ["Name", "Email", "Phone", "Company", "Service", "Type", "Status", "Source", "Expected value (INR)", "Next follow-up", "Lost reason", "Created"];
    const lines = (data ?? []).map((l) => [l.name, l.email, l.phone, l.company, l.service_interest, l.client_type, LEAD_STATUS_LABELS[l.status] ?? l.status, l.source, l.expected_value, l.next_follow_up, l.lost_reason, fmtDate(l.created_at)].map(csvCell).join(","));
    return [head.map(csvCell).join(","), ...lines].join("\n");
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    await sb.rpc("expire_quotations");
    const [{ data: leads, error }, { data: quotes }] = await Promise.all([
      sb.from("leads").select("id, name, service_interest, status, created_at, next_follow_up").order("created_at", { ascending: false }).limit(2000),
      sb.from("quotations").select("id, status, total").limit(2000),
    ]);
    if (error) throw new Error("Could not load the dashboard");
    const all = leads ?? [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const byStatus: Record<string, number> = {};
    for (const l of all) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const q = quotes ?? [];
    return {
      total: all.length,
      newCount: all.filter((l) => l.status === "new").length,
      thisWeek: all.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length,
      byStatus,
      newest: all.slice(0, 5),
      followUps: all.filter((l) => l.next_follow_up && l.next_follow_up <= today && l.status !== "won" && l.status !== "lost").slice(0, 8),
      openQuotes: q.filter((x) => x.status === "sent").length,
      openValue: q.filter((x) => x.status === "sent").reduce((s, x) => s + Number(x.total), 0),
      acceptedValue: q.filter((x) => x.status === "accepted").reduce((s, x) => s + Number(x.total), 0),
    };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("id, full_name, email, avatar_url, is_active, must_change_password").eq("id", context.userId).single();
    const role = await roleOf(context.supabase, context.userId);
    return { profile, role };
  });

/** Called after a successful password change to clear the first-sign-in flag. */
export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", context.userId);
    return { ok: true as const };
  });

export const updateMyName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fullName: z.string().trim().min(2).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ full_name: data.fullName }).eq("id", context.userId);
    if (error) return { ok: false as const, error: "Could not save your name." };
    return { ok: true as const };
  });
