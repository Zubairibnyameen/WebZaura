import { getMyProfile } from "@/lib/leads.functions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listActivity, listNotifications, markNotificationsRead } from "@/lib/activity.functions";
import { listMentionables } from "@/lib/projects.functions";
import { fmtDate } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { Empty, ErrorNote, ListSkeleton, PageHead, Pager, field, labelCls } from "@/components/crm/ui";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({ meta: [{ title: "Activity | WebZaura" }, { name: "description", content: "Team activity and notifications." }, { property: "og:title", content: "Activity | WebZaura" }, { property: "og:description", content: "Team activity and notifications." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Activity,
});

const TABLE_LABEL: Record<string, string> = { leads: "Lead", clients: "Client", quotations: "Quotation", projects: "Project", tasks: "Task", project_files: "File", project_members: "Project team", invoices: "Invoice", payments: "Payment", comments: "Comment", services: "Service" };
const ACTION_LABEL: Record<string, string> = { create: "created", update: "updated", delete: "deleted", status_change: "changed status", owner_change: "reassigned" };

export function activityLink(r: { table_name: string; record_id: string | null; details: any; action: string }): string | null {
  if (r.action === "delete" || !r.record_id) return null;
  const base: Record<string, string> = { leads: "/app/leads/", clients: "/app/clients/", quotations: "/app/quotations/", projects: "/app/projects/", invoices: "/app/invoices/" };
  if (base[r.table_name]) return base[r.table_name] + r.record_id;
  if (["tasks", "project_files", "project_members"].includes(r.table_name) && r.details?.parent) return "/app/projects/" + r.details.parent;
  if (r.table_name === "payments" && r.details?.parent) return "/app/invoices/" + r.details.parent;
  return null;
}

function Activity() {
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const staffMe = me?.role === "admin" || me?.role === "manager";
  const qc = useQueryClient();
  const [module, setModule] = useState("");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const args = { module: module || undefined, userId: userId || undefined, page };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["activity", args], queryFn: () => listActivity({ data: args }), placeholderData: keepPreviousData });
  const { data: people = [] } = useQuery({ queryKey: ["mentionables"], queryFn: () => listMentionables() });
  const { data: notes } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });

  useEffect(() => {
    if (!notes?.unread) return;
    const t = setTimeout(async () => { await markNotificationsRead({ data: {} }); qc.invalidateQueries({ queryKey: ["notifications"] }); }, 1500);
    return () => clearTimeout(t);
  }, [notes?.unread, qc]);

  return (
    <div className="max-w-5xl">
      <PageHead eyebrow="Activity" title="What changed, and who did it." />
      <h2 className="mt-10 text-heading font-semibold">Notifications</h2>
      {!notes ? <ListSkeleton rows={2} /> : notes.rows.length === 0 ? <p className="mt-4 text-lg text-muted-foreground">No notifications yet. Mentions, assignments and quotation replies show up here.</p> : (
        <ul className="mt-4 border-b border-border">
          {notes.rows.map((n) => (
            <li key={n.id} className="border-t border-border">
              <a href={n.link ?? "/app"} className="ghost-link flex flex-wrap justify-between gap-2 py-4">
                <span className="text-base">{!n.read_at && <span className="mr-2 font-semibold">New</span>}{n.title}</span>
                <span className="text-base text-muted-foreground">{fmtDate(n.created_at)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {notes && notes.unread > 0 && <Button variant="editorial" className="mt-4" onClick={async () => { await markNotificationsRead({ data: {} }); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>Mark all read</Button>}

      <h2 className="mt-14 text-heading font-semibold">Team activity</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className={labelCls}>Module
          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">All modules</option>
            {["leads", "clients", "quotations", "projects", ...(staffMe ? ["invoices"] : []), "comments", ...(me?.role === "admin" ? ["services"] : [])].map((m) => <option key={m} value={m} className="bg-background">{m[0]!.toUpperCase() + m.slice(1)}</option>)}
          </select>
        </label>
        <label className={labelCls}>Person
          <select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">Everyone</option>
            {people.map((p) => <option key={p.id} value={p.id} className="bg-background">{p.full_name || p.email}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Activity could not be loaded.</ErrorNote> : !data?.rows.length ? <Empty>No activity matches these filters.</Empty> : (
        <>
          <ol className="mt-8 border-b border-border">
            {data.rows.map((r: any) => {
              const link = activityLink(r);
              const text = <><span className="font-semibold">{r.who}</span> {ACTION_LABEL[r.action] ?? r.action} {TABLE_LABEL[r.table_name]?.toLowerCase() ?? r.table_name} {r.details?.label ? <span>“{r.details.label}”</span> : null}{r.action === "status_change" && r.details?.to ? ` to ${String(r.details.to).replace(/_/g, " ")}` : ""}</>;
              return (
                <li key={r.id} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[140px_1fr]">
                  <span className="text-base text-muted-foreground">{fmtDate(r.created_at)}</span>
                  {link ? <a href={link} className="ghost-link text-base">{text}</a> : <span className="text-base">{text}</span>}
                </li>
              );
            })}
          </ol>
          <Pager page={page} count={data.count} onPage={setPage} />
        </>
      )}
    </div>
  );
}
