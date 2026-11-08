import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, PAGE_SIZE, cleanSearch } from "@/lib/crm-format";
import { requireStaff } from "@/lib/leads.functions";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const projectStatus = z.enum(["planning", "in_progress", "review", "completed", "on_hold"]);
const taskStatus = z.enum(["todo", "doing", "done"]);

export const listTeamOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Members can only read their own profile row; staff see everyone.
    const { data } = await context.supabase.from("profiles").select("id, full_name, email").eq("is_active", true).order("full_name");
    return data ?? [];
  });

/** Mention list for comments: all active teammates, names only. */
export const listMentionables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email").eq("is_active", true).order("full_name");
    return (data ?? []).map((p) => ({ id: p.id, full_name: p.full_name, email: p.email }));
  });

export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().max(100).optional(), status: projectStatus.optional(), page: z.number().int().min(1).max(10000).default(1), clientId: uuid.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * PAGE_SIZE;
    let q = context.supabase.from("projects").select("id, name, service_type, status, start_date, due_date, clients(company)", { count: "exact" });
    const s = cleanSearch(data.q);
    if (s) q = q.ilike("name", `%${s}%`);
    if (data.status) q = q.eq("status", data.status);
    if (data.clientId) q = q.eq("client_id", data.clientId);
    const { data: rows, count, error } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Could not load projects");
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: project } = await sb.from("projects").select("*, clients(id, company), quotations(id, number)").eq("id", data.id).maybeSingle();
    if (!project) throw new Error("Project not found");
    const [{ data: members }, { data: tasks }, { data: files }] = await Promise.all([
      sb.from("project_members").select("user_id").eq("project_id", data.id),
      sb.from("tasks").select("*").eq("project_id", data.id).order("position").order("created_at"),
      sb.from("project_files").select("id, file_name, size, mime_type, created_at, uploaded_by").eq("project_id", data.id).order("created_at", { ascending: false }),
    ]);
    // Member names come from the admin client because members cannot read other profiles.
    const ids = [...new Set([...(members ?? []).map((m) => m.user_id), ...(tasks ?? []).map((t) => t.assignee_id).filter(Boolean) as string[]])];
    let people: { id: string; full_name: string; email: string }[] = [];
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: p } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
      people = p ?? [];
    }
    return { project, memberIds: (members ?? []).map((m) => m.user_id), tasks: tasks ?? [], files: files ?? [], people };
  });

const projectSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(160),
  client_id: uuid.nullable(),
  service_type: z.string().trim().max(120).nullable(),
  status: projectStatus,
  start_date: date,
  due_date: date,
  description: z.string().trim().max(4000).nullable(),
  memberIds: z.array(uuid).max(50),
});

async function syncMembers(sb: any, projectId: string, ids: string[]) {
  const { data: cur } = await sb.from("project_members").select("user_id").eq("project_id", projectId);
  const have = new Set((cur ?? []).map((m: any) => m.user_id));
  const want = new Set(ids);
  const add = ids.filter((i) => !have.has(i));
  const remove = [...have].filter((i) => !want.has(i as string));
  if (add.length) await sb.from("project_members").insert(add.map((user_id) => ({ project_id: projectId, user_id })));
  if (remove.length) await sb.from("project_members").delete().eq("project_id", projectId).in("user_id", remove);
}

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => projectSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { id, memberIds, ...f } = data;
    if (f.start_date && f.due_date && f.due_date < f.start_date) return { ok: false as const, error: "The due date is before the start date." };
    let pid = id;
    if (pid) {
      const { error } = await context.supabase.from("projects").update(f).eq("id", pid);
      if (error) return { ok: false as const, error: "Could not save the project." };
    } else {
      const { data: row, error } = await context.supabase.from("projects").insert({ ...f, created_by: context.userId }).select("id").single();
      if (error || !row) return { ok: false as const, error: "Could not create the project." };
      pid = row.id;
    }
    await syncMembers(context.supabase, pid!, memberIds);
    return { ok: true as const, id: pid! };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: files } = await context.supabase.from("project_files").select("storage_path").eq("project_id", data.id);
    if (files?.length) await context.supabase.storage.from("project-files").remove(files.map((f) => f.storage_path));
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the project." };
    return { ok: true as const };
  });

export const convertQuotationToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quotationId: uuid, name: z.string().trim().min(2).max(160), start_date: date, due_date: date, memberIds: z.array(uuid).max(50) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: q } = await sb.from("quotations").select("id, status, client_id, lead_id, leads(service_interest)").eq("id", data.quotationId).maybeSingle();
    if (!q) return { ok: false as const, error: "Quotation not found." };
    if (q.status !== "accepted") return { ok: false as const, error: "Only accepted quotations can become projects." };
    const { data: existing } = await sb.from("projects").select("id").eq("quotation_id", q.id).maybeSingle();
    if (existing) return { ok: false as const, error: "This quotation already has a project", existingId: existing.id as string };
    const { data: items } = await sb.from("quotation_items").select("description, position, services(name)").eq("quotation_id", q.id).order("position");
    const serviceType = (items?.[0] as any)?.services?.name ?? (q as any).leads?.service_interest ?? null;
    const { data: p, error } = await sb.from("projects").insert({
      name: data.name, client_id: q.client_id, quotation_id: q.id, service_type: serviceType, status: "planning",
      start_date: data.start_date, due_date: data.due_date, created_by: context.userId,
    }).select("id").single();
    if (error || !p) return { ok: false as const, error: "Could not create the project." };
    if (items?.length) await sb.from("tasks").insert(items.map((it, i) => ({ project_id: p.id, title: it.description.slice(0, 300), position: i, created_by: context.userId })));
    await syncMembers(sb, p.id, data.memberIds);
    return { ok: true as const, id: p.id };
  });

/* ---------- Tasks ---------- */

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: uuid.optional(), project_id: uuid, title: z.string().trim().min(1).max(300), description: z.string().trim().max(4000).nullable(),
    assignee_id: uuid.nullable(), due_date: date, status: taskStatus,
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...f } = data;
    if (id) {
      // Members may only update tasks assigned to them (RLS) and cannot reassign.
      const isStaff = await requireStaff(context.supabase, context.userId).then(() => true, () => false);
      const patch = isStaff ? f : { title: f.title, description: f.description, due_date: f.due_date, status: f.status };
      const { data: rows, error } = await context.supabase.from("tasks").update(patch).eq("id", id).select("id");
      if (error || !rows?.length) return { ok: false as const, error: "You can only edit tasks assigned to you." };
      return { ok: true as const };
    }
    await requireStaff(context.supabase, context.userId);
    const { data: max } = await context.supabase.from("tasks").select("position").eq("project_id", f.project_id).order("position", { ascending: false }).limit(1);
    const { error } = await context.supabase.from("tasks").insert({ ...f, position: (max?.[0]?.position ?? -1) + 1, created_by: context.userId });
    if (error) return { ok: false as const, error: "Could not add the task." };
    return { ok: true as const };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, status: taskStatus }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("tasks").update({ status: data.status }).eq("id", data.id).select("id");
    if (error || !rows?.length) return { ok: false as const, error: "You can only move tasks assigned to you." };
    return { ok: true as const };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the task." };
    return { ok: true as const };
  });

/* ---------- Files ---------- */

export const createFileUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projectId: uuid, fileName: z.string().trim().min(1).max(200), size: z.number().int().positive().max(MAX_FILE_BYTES), mime: z.string().max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const ext = ALLOWED_FILE_TYPES[data.mime];
    if (!ext) return { ok: false as const, error: "This file type is not allowed." };
    const { data: proj } = await context.supabase.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (!proj) return { ok: false as const, error: "You cannot add files to this project." };
    const path = `${data.projectId}/${crypto.randomUUID()}.${ext}`;
    // The upload itself runs as the user, so storage policies apply to it as well.
    const { data: signed, error } = await context.supabase.storage.from("project-files").createSignedUploadUrl(path);
    if (error || !signed) return { ok: false as const, error: "Could not start the upload." };
    return { ok: true as const, path, token: signed.token };
  });

export const registerFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projectId: uuid, path: z.string().max(200), fileName: z.string().trim().min(1).max(200), size: z.number().int().positive().max(MAX_FILE_BYTES), mime: z.string().max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${data.projectId}/`) || !ALLOWED_FILE_TYPES[data.mime]) return { ok: false as const, error: "Invalid file." };
    const { error } = await context.supabase.from("project_files").insert({
      project_id: data.projectId, storage_path: data.path, file_name: data.fileName, size: data.size, mime_type: data.mime, uploaded_by: context.userId,
    });
    if (error) {
      await context.supabase.storage.from("project-files").remove([data.path]);
      return { ok: false as const, error: "Could not save the file record." };
    }
    return { ok: true as const };
  });

export const fileDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: f } = await context.supabase.from("project_files").select("storage_path, file_name").eq("id", data.id).maybeSingle();
    if (!f) return { ok: false as const, error: "File not found." };
    const { data: s, error } = await context.supabase.storage.from("project-files").createSignedUrl(f.storage_path, 60, { download: f.file_name });
    if (error || !s) return { ok: false as const, error: "Could not create the download link." };
    return { ok: true as const, url: s.signedUrl };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: f } = await context.supabase.from("project_files").select("storage_path").eq("id", data.id).maybeSingle();
    if (!f) return { ok: false as const, error: "File not found." };
    await context.supabase.storage.from("project-files").remove([f.storage_path]);
    const { error } = await context.supabase.from("project_files").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not delete the file." };
    return { ok: true as const };
  });
