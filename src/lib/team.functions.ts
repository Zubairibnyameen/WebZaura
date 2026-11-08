import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "mozubairchoudhary@gmail.com";

async function requireAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

async function countActiveAdmins(admin: any) {
  const { data: adminRows } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  if (!adminRows?.length) return 0;
  const { data: active } = await admin
    .from("profiles")
    .select("id")
    .in("id", adminRows.map((r: any) => r.user_id))
    .eq("is_active", true);
  return active?.length ?? 0;
}

/** One-time bootstrap: creates the first admin account. Only works while no profiles exist. */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { ok: false as const, error: "Setup has already been completed." };
  const password = process.env["ADMIN_BOOTSTRAP_PASSWORD"];
  if (!password) return { ok: false as const, error: "Setup is not configured." };
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Muhammad Zubair" },
  });
  if (error) return { ok: false as const, error: "Could not create the account." };
  // The handle_new_user trigger assigns the admin role for this email.
  return { ok: true as const, email: ADMIN_EMAIL, password, userId: data.user.id };
});

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: profiles } = await context.supabase.from("profiles").select("id, full_name, email, is_active, created_at").order("created_at");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleByUser = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    return (profiles ?? []).map((p: any) => ({ ...p, role: roleByUser.get(p.id) ?? "member" }));
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(200),
      role: z.enum(["admin", "manager", "member"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rand = crypto.getRandomValues(new Uint8Array(9));
    const tempPassword = Array.from(rand, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12) + "Wz!1";
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) return { ok: false as const, error: "Could not create that user. The email may already be in use." };
    const userId = created.user.id;
    await supabaseAdmin.from("profiles").update({ full_name: data.fullName, must_change_password: true }).eq("id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "user_created", table_name: "profiles", record_id: userId,
      details: { email: data.email, role: data.role },
    });
    return { ok: true as const, email: data.email, tempPassword };
  });

export const changeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "manager", "member"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role !== "admin") {
      return { ok: false as const, error: "You cannot remove your own admin role." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.role !== "admin") {
      const { data: targetRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
      const wasAdmin = targetRoles?.some((r: any) => r.role === "admin");
      if (wasAdmin && (await countActiveAdmins(supabaseAdmin)) <= 1) {
        return { ok: false as const, error: "At least one active admin is required." };
      }
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) return { ok: false as const, error: "Could not change the role." };
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "role_change", table_name: "user_roles", record_id: data.userId,
      details: { role: data.role },
    });
    return { ok: true as const };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.active) {
      return { ok: false as const, error: "You cannot deactivate your own account." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.active) {
      const { data: targetRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
      const isAdmin = targetRoles?.some((r: any) => r.role === "admin");
      if (isAdmin && (await countActiveAdmins(supabaseAdmin)) <= 1) {
        return { ok: false as const, error: "At least one active admin is required." };
      }
    }
    const { error } = await supabaseAdmin.from("profiles").update({ is_active: data.active }).eq("id", data.userId);
    if (error) return { ok: false as const, error: "Could not update the account." };
    if (!data.active) await supabaseAdmin.auth.admin.signOut(data.userId);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: data.active ? "user_reactivated" : "user_deactivated",
      table_name: "profiles", record_id: data.userId, details: {},
    });
    return { ok: true as const };
  });
