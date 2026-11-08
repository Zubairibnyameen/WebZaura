import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAGE_SIZE, extractMentions, handleOf, todayISO } from "@/lib/crm-format";

const uuid = z.string().uuid();
const entity = z.enum(["lead", "client", "project", "quotation", "invoice"]);

async function namesFor(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", uniq);
  return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email]));
}

async function mentionTeam() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email").eq("is_active", true);
  return (data ?? []).map((p) => ({ id: p.id, handle: handleOf(p) }));
}

/* ---------- Comments ---------- */

export const listComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ type: entity, id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("comments").select("id, body, user_id, mentions, created_at, updated_at")
      .eq("entity_type", data.type).eq("entity_id", data.id).order("created_at").limit(500);
    if (error) throw new Error("Could not load comments");
    const names = await namesFor((rows ?? []).map((r) => r.user_id));
    const { data: staffCaller } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    return (rows ?? []).map((r) => ({ ...r, author: names.get(r.user_id) ?? "Teammate", mine: r.user_id === context.userId, canDelete: !!staffCaller }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ type: entity, id: uuid, body: z.string().trim().min(1).max(4000) }).parse(i))
  .handler(async ({ data, context }) => {
    const mentions = extractMentions(data.body, await mentionTeam());
    const { error } = await context.supabase.from("comments").insert({ entity_type: data.type, entity_id: data.id, body: data.body, mentions, user_id: context.userId });
    if (error) return { ok: false as const, error: "Could not post the comment." };
    return { ok: true as const };
  });

export const editComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, body: z.string().trim().min(1).max(4000) }).parse(i))
  .handler(async ({ data, context }) => {
    const mentions = extractMentions(data.body, await mentionTeam());
    const { data: rows, error } = await context.supabase.from("comments").update({ body: data.body, mentions }).eq("id", data.id).eq("user_id", context.userId).select("id");
    if (error || !rows?.length) return { ok: false as const, error: "You can only edit your own comments." };
    return { ok: true as const };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("comments").delete().eq("id", data.id).select("id");
    if (error || !rows?.length) return { ok: false as const, error: "Could not delete the comment." };
    return { ok: true as const };
  });

/* ---------- Activity feed ---------- */

const MODULE_TABLES: Record<string, string[]> = {
  leads: ["leads"], clients: ["clients"], quotations: ["quotations"], projects: ["projects", "tasks", "project_files", "project_members"],
  invoices: ["invoices", "payments"], comments: ["comments"], services: ["services"],
};

export const listActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ module: z.string().max(30).optional(), userId: uuid.optional(), page: z.number().int().min(1).max(10000).default(1) }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * PAGE_SIZE;
    let q = context.supabase.from("audit_logs").select("id, user_id, action, table_name, record_id, details, actor_label, created_at", { count: "exact" });
    if (data.module && MODULE_TABLES[data.module]) q = q.in("table_name", MODULE_TABLES[data.module]!);
    if (data.userId) q = q.eq("user_id", data.userId);
    const { data: rows, count, error } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Could not load activity");
    const names = await namesFor((rows ?? []).map((r) => r.user_id as string));
    return { rows: (rows ?? []).map((r) => ({ ...r, who: r.actor_label ?? (r.user_id ? names.get(r.user_id) ?? "Teammate" : "System") })), count: count ?? 0 };
  });

/* ---------- Notifications ---------- */

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows }, { count }] = await Promise.all([
      context.supabase.from("notifications").select("id, kind, title, link, read_at, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", context.userId).is("read_at", null),
    ]);
    return { rows: rows ?? [], unread: count ?? 0 };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ids: z.array(uuid).max(100).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.userId).is("read_at", null);
    if (data.ids?.length) q = q.in("id", data.ids);
    await q;
    return { ok: true as const };
  });

/* ---------- Dashboard ---------- */

const monthKey = (d: string) => d.slice(0, 7);

export const dashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", context.userId);
    const staff = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
    const today = todayISO();
    const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await sb.rpc("expire_quotations");

    if (!staff) {
      const [{ data: leads }, { data: tasks }, { data: projects }, { data: comments }] = await Promise.all([
        sb.from("leads").select("id, name, status, next_follow_up").eq("owner_id", context.userId).not("status", "in", "(won,lost)").order("next_follow_up", { ascending: true, nullsFirst: false }).limit(10),
        sb.from("tasks").select("id, title, due_date, status, project_id").eq("assignee_id", context.userId).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(10),
        sb.from("projects").select("id, name, status, due_date").not("status", "in", "(completed)").order("due_date", { ascending: true, nullsFirst: false }).limit(10),
        sb.from("comments").select("id, body, entity_type, entity_id, user_id, created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      const names = await namesFor((comments ?? []).map((c) => c.user_id));
      return { staff: false as const, leads: leads ?? [], tasks: tasks ?? [], projects: projects ?? [], comments: (comments ?? []).map((c) => ({ ...c, author: names.get(c.user_id) ?? "Teammate" })), today };
    }

    const start12 = new Date(); start12.setMonth(start12.getMonth() - 11, 1);
    const start12ISO = start12.toISOString().slice(0, 10);
    const [activeLeads, sentQuotes, ongoing, { data: openInv }, { data: pays }, { data: tasksDue }, { data: projDue }] = await Promise.all([
      sb.from("leads").select("id", { count: "exact", head: true }).not("status", "in", "(won,lost)"),
      sb.from("quotations").select("id", { count: "exact", head: true }).eq("status", "sent"),
      sb.from("projects").select("id", { count: "exact", head: true }).in("status", ["planning", "in_progress", "review"]),
      sb.from("invoices").select("id, number, due_date, total, paid_total, clients(company)").neq("payment_status", "paid").limit(2000),
      sb.from("payments").select("amount, paid_on, invoices(projects(service_type), quotations(leads(service_interest)))").gte("paid_on", start12ISO).limit(5000),
      sb.from("tasks").select("id, title, due_date, project_id").neq("status", "done").gte("due_date", today).lte("due_date", in14).order("due_date").limit(20),
      sb.from("projects").select("id, name, due_date").neq("status", "completed").gte("due_date", today).lte("due_date", in14).order("due_date").limit(20),
    ]);
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start12); d.setMonth(start12.getMonth() + i);
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), total: 0 });
    }
    const byService = new Map<string, number>();
    for (const p of pays ?? []) {
      const m = months.find((x) => x.key === monthKey(p.paid_on));
      if (m) m.total += Number(p.amount);
      const inv: any = p.invoices;
      const svc = inv?.projects?.service_type ?? inv?.quotations?.leads?.service_interest ?? "Other";
      byService.set(svc, (byService.get(svc) ?? 0) + Number(p.amount));
    }
    const thisMonth = today.slice(0, 7);
    const open = openInv ?? [];
    return {
      staff: true as const,
      activeLeads: activeLeads.count ?? 0,
      pendingQuotes: sentQuotes.count ?? 0,
      ongoingProjects: ongoing.count ?? 0,
      outstanding: open.reduce((a, i) => a + Number(i.total) - Number(i.paid_total), 0),
      revenueMonth: months.find((m) => m.key === thisMonth)?.total ?? 0,
      months: months.map((m) => ({ ...m, total: Math.round(m.total * 100) / 100 })),
      byService: [...byService.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
      overdue: open.filter((i) => i.due_date && i.due_date < today).map((i: any) => ({ id: i.id, number: i.number, due_date: i.due_date, balance: Number(i.total) - Number(i.paid_total), company: i.clients?.company ?? null })),
      deadlines: [
        ...(tasksDue ?? []).map((t) => ({ kind: "Task" as const, id: t.id, label: t.title, due: t.due_date!, projectId: t.project_id })),
        ...(projDue ?? []).map((p) => ({ kind: "Project" as const, id: p.id, label: p.name, due: p.due_date!, projectId: p.id })),
      ].sort((a, b) => a.due.localeCompare(b.due)),
      today,
    };
  });
