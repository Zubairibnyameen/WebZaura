import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProjects } from "@/lib/projects.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, fmtDate, isOverdue } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { DataRows, Empty, ErrorNote, ListSkeleton, PageHead, Pager, SearchBox, field, labelCls } from "@/components/crm/ui";
import { ProjectForm } from "@/components/crm/ProjectForm";
import { useDebounced } from "@/hooks/use-debounced";

export const Route = createFileRoute("/_authenticated/app/projects/")({
  head: () => ({ meta: [{ title: "Projects | WebZaura" }, { name: "description", content: "Projects for the WebZaura team." }, { property: "og:title", content: "Projects | WebZaura" }, { property: "og:description", content: "Projects for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Projects,
});

function Projects() {
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const staff = me?.role === "admin" || me?.role === "manager";
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const args = { q: dq || undefined, status: (status || undefined) as any, page };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["projects", args], queryFn: () => listProjects({ data: args }), placeholderData: keepPreviousData });

  return (
    <div>
      <PageHead eyebrow="Projects" title="Work in progress." actions={staff && !adding && <Button variant="editorial" onClick={() => setAdding(true)}>New project</Button>} />
      {adding && <section aria-label="New project" className="mt-10 rounded-lg border border-border p-6"><ProjectForm onSaved={(id) => navigate({ to: "/app/projects/$id", params: { id } })} onCancel={() => setAdding(false)} /></section>}
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_220px]">
        <SearchBox label="Search projects" value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <label className={labelCls}>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">All statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{PROJECT_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Projects could not be loaded.</ErrorNote> :
        !data?.rows.length ? <Empty>{dq || status ? "No projects match these filters." : staff ? "No projects yet. Create one, or convert an accepted quotation." : "You are not on any projects yet."}</Empty> : (
          <>
            <DataRows rows={data.rows as any[]} rowKey={(r) => r.id}
              renderLink={(r, c) => <Link to="/app/projects/$id" params={{ id: r.id }} className="ghost-link block">{c}</Link>}
              columns={[
                { label: "Project", cell: (r) => r.name },
                { label: "Client", cell: (r) => r.clients?.company ?? "Not set" },
                { label: "Status", cell: (r) => PROJECT_STATUS_LABELS[r.status] },
                { label: "Due", cell: (r) => isOverdue(r.due_date, r.status === "completed" ? "won" : r.status) ? <span className="text-destructive">Overdue · {fmtDate(r.due_date)}</span> : fmtDate(r.due_date) },
              ]} />
            <Pager page={page} count={data.count} onPage={setPage} />
          </>
        )}
    </div>
  );
}
