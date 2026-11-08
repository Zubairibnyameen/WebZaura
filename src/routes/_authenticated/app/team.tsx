import { listActivity } from "@/lib/activity.functions";
import { fmtDate } from "@/lib/crm-format";
import { Pager } from "@/components/crm/ui";
import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addTeamMember, changeRole, listTeam, setUserActive } from "@/lib/team.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { Eyebrow } from "@/components/sections/primitives";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { name: "description", content: "Team for the WebZaura private team area." }, { property: "og:title", content: "Team | WebZaura" }, { property: "og:description", content: "Team for WebZaura team members." }, { title: "Team | WebZaura" }, { name: "robots", content: "noindex" }] }),
  component: Team,
});

const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base text-foreground outline-none focus:border-foreground";
const roles = ["admin", "manager", "member"] as const;

function Team() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const { data, isLoading, error } = useQuery({
    queryKey: ["team"],
    queryFn: () => listTeam(),
    enabled: me?.role === "admin",
    retry: false,
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]>("member");
  const [msg, setMsg] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (meLoading) {
    return <div className="skeleton h-40 rounded-lg" aria-busy="true" />;
  }
  if (me?.role !== "admin") {
    navigate({ to: "/app" });
    return null;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setCreated(null);
    const r = await addTeamMember({ data: { fullName, email, role } });
    setBusy(false);
    if (!r.ok) { setMsg(r.error ?? "Could not add that person."); return; }
    if (!r.email || !r.tempPassword) { setMsg("Could not create the account."); return; }
    setCreated({ email: r.email, tempPassword: r.tempPassword });
    setFullName("");
    setEmail("");
    setRole("member");
    refresh();
  };

  return (
    <div className="max-w-5xl">
      <Eyebrow>Team</Eyebrow>
      <h1 className="mt-4 text-heading">People with access.</h1>

      <h2 className="mt-12 text-heading font-semibold">Add a team member</h2>
      <AccessibleForm onSubmit={onAdd} className="mt-6 grid gap-8 sm:grid-cols-3">
        <div><label htmlFor="tn" className="text-base text-muted-foreground">Full name</label><input id="tn" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} /></div>
        <div><label htmlFor="te" className="text-base text-muted-foreground">Email</label><input id="te" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
        <div>
          <label htmlFor="tr" className="text-base text-muted-foreground">Role</label>
          <select id="tr" value={role} onChange={(e) => setRole(e.target.value as (typeof roles)[number])} className={field}>
            {roles.map((r) => <option key={r} value={r} className="bg-background">{r}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3"><Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Creating..." : "Create account"}</Button></div>
        {msg && <p role="alert" className="sm:col-span-3 text-base text-destructive">{msg}</p>}
      </AccessibleForm>
      {created && (
        <div className="mt-6 rounded-lg border border-border bg-card p-6" role="status">
          <p className="text-lg">Account created for {created.email}.</p>
          <p className="mt-2 text-base text-muted-foreground">
            Temporary password, shown once: <span className="select-all font-semibold text-foreground">{created.tempPassword}</span>
          </p>
          <p className="mt-2 text-base text-muted-foreground">Ask the new member to use Forgot password on first login to set their own password.</p>
        </div>
      )}

      <h2 className="mt-14 text-heading font-semibold">Everyone</h2>
      {isLoading ? (
        <div className="mt-6 space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
      ) : error || !data ? (
        <p className="mt-6 text-lg text-muted-foreground">The team list could not be loaded.</p>
      ) : (
        <ol className="mt-4 border-b border-border">
          {data.map((u) => (
            <li key={u.id} className="grid gap-3 border-t border-border py-5 md:grid-cols-[1.2fr_1.4fr_140px_120px_1fr] md:items-center md:gap-6">
              <span className="text-lg">{u.full_name || "—"}</span>
              <span className="text-base text-muted-foreground">{u.email}</span>
              <label className="text-sm text-muted-foreground">Role<select
                aria-label={`Role for ${u.full_name || u.email}`}
                value={u.role}
                onChange={async (e) => {
                  const r = await changeRole({ data: { userId: u.id, role: e.target.value as (typeof roles)[number] } });
                  if (!r.ok) setMsg(r.error ?? "Could not change the role.");
                  refresh();
                }}
                className="border-0 border-b border-border bg-transparent py-2 text-base outline-none"
              >
                {roles.map((r) => <option key={r} value={r} className="bg-background">{r}</option>)}
              </select></label>
              <span className="text-base text-muted-foreground">{u.is_active ? "Active" : "Inactive"}</span>
              <span className="flex items-center gap-4 text-base text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString("en-IN")}
                <Button variant="editorial"
                  onClick={async () => {
                    const r = await setUserActive({ data: { userId: u.id, active: !u.is_active } });
                    if (!r.ok) setMsg(r.error ?? "Could not update the account.");
                    refresh();
                  }}
                  className="ghost-link underline underline-offset-4"
                >
                  {u.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <AuditLog />
    </div>
  );
}

function AuditLog() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const args = { page, module: module || undefined };
  const { data, isLoading } = useQuery({ queryKey: ["audit", args], queryFn: () => listActivity({ data: args }) });
  return (
    <section aria-labelledby="audit-h" className="mt-16">
      <h2 id="audit-h" className="text-heading font-semibold">Audit log</h2>
      <label className="mt-6 block max-w-xs text-base text-muted-foreground">Module
        <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-base text-foreground outline-none focus:border-foreground">
          <option value="" className="bg-background">All</option>
          {["leads", "clients", "quotations", "projects", "invoices", "comments", "services"].map((m) => <option key={m} value={m} className="bg-background">{m}</option>)}
        </select>
      </label>
      {isLoading || !data ? <div className="skeleton mt-6 h-40 rounded-lg" /> : data.rows.length === 0 ? <p className="mt-6 text-lg text-muted-foreground">No entries.</p> : (
        <>
          <ol className="mt-6 border-b border-border">
            {data.rows.map((r: any) => (
              <li key={r.id} className="grid gap-1 border-t border-border py-3 sm:grid-cols-[140px_160px_1fr]">
                <span className="text-base text-muted-foreground">{fmtDate(r.created_at)}</span>
                <span className="text-base">{r.who}</span>
                <span className="break-words text-base">{r.action.replace(/_/g, " ")} · {r.table_name.replace(/_/g, " ")}{r.details?.label ? ` · ${r.details.label}` : ""}{r.details?.to ? ` · to ${r.details.to}` : ""}</span>
              </li>
            ))}
          </ol>
          <Pager page={page} count={data.count} onPage={setPage} />
        </>
      )}
    </section>
  );
}
