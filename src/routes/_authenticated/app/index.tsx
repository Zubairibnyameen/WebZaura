import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dashboardData } from "@/lib/activity.functions";
import { LEAD_STATUS_LABELS, TASK_STATUS_LABELS, PROJECT_STATUS_LABELS, fmtDate, inr } from "@/lib/crm-format";
import { Eyebrow } from "@/components/sections/primitives";
import { BarChart, HBars } from "@/components/crm/Charts";
import { ErrorNote } from "@/components/crm/ui";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard | WebZaura" }, { name: "description", content: "WebZaura team dashboard." }, { property: "og:title", content: "Dashboard | WebZaura" }, { property: "og:description", content: "WebZaura team dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-background p-6"><p className="text-base text-muted-foreground">{label}</p><p className="mt-2 text-row font-semibold leading-none">{value}</p></div>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-14 text-heading font-semibold">{children}</h2>;
const None = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-lg text-muted-foreground">{children}</p>;

function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardData() });
  if (isLoading) return (
    <div className="space-y-6" aria-busy="true">
      <div className="skeleton h-10 w-56 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-28 rounded-lg" />)}</div>
      <div className="skeleton h-64 rounded-lg" />
    </div>
  );
  if (error || !data) return <ErrorNote onRetry={() => refetch()}>The dashboard could not be loaded.</ErrorNote>;

  if (!data.staff) {
    return (
      <div className="max-w-5xl">
        <Eyebrow>Dashboard</Eyebrow>
        <h1 className="mt-4 text-heading">Your work at a glance.</h1>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Stat label="My open leads" value={data.leads.length} />
          <Stat label="My open tasks" value={data.tasks.length} />
          <Stat label="My projects" value={data.projects.length} />
        </div>
        <H2>Tasks due</H2>
        {data.tasks.length === 0 ? <None>No open tasks assigned to you.</None> : (
          <ol className="mt-4 border-b border-border">{data.tasks.map((t) => (
            <li key={t.id} className="border-t border-border"><Link to="/app/projects/$id" params={{ id: t.project_id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{t.title}</span><span className={`text-base ${t.due_date && t.due_date < data.today ? "text-destructive" : "text-muted-foreground"}`}>{TASK_STATUS_LABELS[t.status]} · {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}</span></Link></li>
          ))}</ol>
        )}
        <H2>My leads</H2>
        {data.leads.length === 0 ? <None>No open leads assigned to you.</None> : (
          <ol className="mt-4 border-b border-border">{data.leads.map((l) => (
            <li key={l.id} className="border-t border-border"><Link to="/app/leads/$id" params={{ id: l.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{l.name}</span><span className="text-base text-muted-foreground">{LEAD_STATUS_LABELS[l.status]}{l.next_follow_up ? ` · Follow up ${fmtDate(l.next_follow_up)}` : ""}</span></Link></li>
          ))}</ol>
        )}
        <H2>My projects</H2>
        {data.projects.length === 0 ? <None>You are not on any active projects.</None> : (
          <ol className="mt-4 border-b border-border">{data.projects.map((p) => (
            <li key={p.id} className="border-t border-border"><Link to="/app/projects/$id" params={{ id: p.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{p.name}</span><span className="text-base text-muted-foreground">{PROJECT_STATUS_LABELS[p.status]} · Due {fmtDate(p.due_date)}</span></Link></li>
          ))}</ol>
        )}
        <H2>Recent comments</H2>
        {data.comments.length === 0 ? <None>No comments yet.</None> : (
          <ol className="mt-4 border-b border-border">{data.comments.map((c) => (
            <li key={c.id} className="border-t border-border py-4"><p className="text-base text-muted-foreground">{c.author} · {fmtDate(c.created_at)} · {c.entity_type}</p><p className="mt-1 line-clamp-2 text-base">{c.body}</p></li>
          ))}</ol>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Eyebrow>Dashboard</Eyebrow>
      <h1 className="mt-4 text-heading">The agency at a glance.</h1>
      <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Active leads" value={data.activeLeads} />
        <Stat label="Quotations sent, awaiting reply" value={data.pendingQuotes} />
        <Stat label="Ongoing projects" value={data.ongoingProjects} />
        <Stat label="Outstanding payments" value={inr(data.outstanding)} />
        <Stat label="Revenue this month" value={inr(data.revenueMonth)} />
        <Stat label="Overdue invoices" value={data.overdue.length} />
      </div>
      <H2>Revenue, last 12 months</H2>
      <BarChart title="Payments received per month" data={data.months.map((m) => ({ label: m.label, value: m.total }))} />
      <H2>Revenue by service</H2>
      <HBars title="Payments received by service, last 12 months" data={data.byService.map((s) => ({ label: s.name, value: s.total }))} />
      <H2>Overdue invoices</H2>
      {data.overdue.length === 0 ? <None>No overdue invoices.</None> : (
        <ol className="mt-4 border-b border-border">{data.overdue.map((i) => (
          <li key={i.id} className="border-t border-border"><Link to="/app/invoices/$id" params={{ id: i.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{i.number}{i.company ? <span className="text-muted-foreground"> · {i.company}</span> : null}</span><span className="text-base text-destructive">Due {fmtDate(i.due_date)} · {inr(i.balance)}</span></Link></li>
        ))}</ol>
      )}
      <H2>Upcoming deadlines (14 days)</H2>
      {data.deadlines.length === 0 ? <None>Nothing due in the next 14 days.</None> : (
        <ol className="mt-4 border-b border-border">{data.deadlines.map((d) => (
          <li key={`${d.kind}-${d.id}`} className="border-t border-border"><Link to="/app/projects/$id" params={{ id: d.projectId }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{d.label}</span><span className="text-base text-muted-foreground">{d.kind} · {fmtDate(d.due)}</span></Link></li>
        ))}</ol>
      )}
    </div>
  );
}
