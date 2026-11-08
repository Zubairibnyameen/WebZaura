import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { deleteClient, getClient } from "@/lib/crm.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { LEAD_STATUS_LABELS, QUOTE_STATUS_LABELS, fmtDate, inr } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ErrorNote, PageHead } from "@/components/crm/ui";
import { ClientForm } from "@/components/crm/ClientForm";
import { useConfirm } from "@/components/crm/Confirm";
import { Comments } from "@/components/crm/Comments";
import { listProjects } from "@/lib/projects.functions";
import { clientBilling } from "@/lib/invoices.functions";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, PROJECT_STATUS_LABELS, invoiceStatus } from "@/lib/crm-format";

export const Route = createFileRoute("/_authenticated/app/clients/$id")({
  head: () => ({ meta: [{ title: "Client | WebZaura" }, { name: "description", content: "Client profile for the WebZaura team." }, { property: "og:title", content: "Client | WebZaura" }, { property: "og:description", content: "Client profile for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: ClientPage,
});

const TABS = ["Overview", "Leads", "Quotations", "Projects", "Invoices", "Comments"] as const;

function ClientPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [editing, setEditing] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["client", id], queryFn: () => getClient({ data: { id } }) });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const canDelete = me?.role === "admin" || me?.role === "manager";

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-40 rounded-lg" /></div>;
  if (error || !data) return <div><ErrorNote onRetry={() => refetch()}>This client could not be opened. It may not exist, or it is not linked to you.</ErrorNote><Link to="/app/clients" className="ghost-link mt-4 inline-block underline">Back to clients</Link></div>;
  const { client, leads, quotes } = data;

  return (
    <div className="max-w-4xl">
      <Link to="/app/clients" className="ghost-link text-base text-muted-foreground">Back to clients</Link>
      <div className="mt-6"><PageHead eyebrow="Client" title={client.company} actions={
        <>
          <Link to="/app/quotations/new" search={{ client: client.id }} className="pill">Create quotation</Link>
          {!editing && <Button variant="editorial" onClick={() => setEditing(true)}>Edit</Button>}
          {canDelete && <Button variant="editorial" className="text-destructive" onClick={async () => {
            if (!(await confirm({ title: "Delete this client?", body: "Linked leads, quotations and projects stay, without the link." }))) return;
            const r = await deleteClient({ data: { id } });
            if (!r.ok) { toast.error(r.error); return; }
            toast.success("Client deleted"); qc.invalidateQueries({ queryKey: ["clients"] }); navigate({ to: "/app/clients" });
          }}>Delete</Button>}
        </>
      } /></div>

      <div role="tablist" aria-label="Client sections" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
        {TABS.filter((t) => t !== "Invoices" || canDelete).map((t) => (
          <button key={t} role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} onClick={() => setTab(t)}
            className={`min-h-11 border-b-2 pb-2 text-base ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-8">
        {tab === "Overview" && (editing ? (
          <ClientForm id={client.id} initial={client} onSaved={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["client", id] }); qc.invalidateQueries({ queryKey: ["clients"] }); }} onCancel={() => setEditing(false)} />
        ) : (
          <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {([["Contact person", client.contact_name], ["Email", client.email], ["Phone", client.phone], ["City", client.city], ["Address", client.address], ["GSTIN", client.gstin], ["Added", fmtDate(client.created_at)], ["Notes", client.notes]] as const).map(([k, v]) => (
              <div key={k} className="bg-background p-5"><dt className="text-base text-muted-foreground">{k}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-lg">{v || "Not given"}</dd></div>
            ))}
          </dl>
        ))}
        {tab === "Leads" && (leads.length === 0 ? <p className="text-lg text-muted-foreground">No linked leads.</p> : (
          <ul className="border-b border-border">{leads.map((l) => (
            <li key={l.id} className="border-t border-border"><Link to="/app/leads/$id" params={{ id: l.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{l.name}</span><span className="text-base text-muted-foreground">{LEAD_STATUS_LABELS[l.status]} · {fmtDate(l.created_at)}</span></Link></li>
          ))}</ul>
        ))}
        {tab === "Quotations" && (quotes.length === 0 ? <p className="text-lg text-muted-foreground">No quotations yet.</p> : (
          <ul className="border-b border-border">{quotes.map((q) => (
            <li key={q.id} className="border-t border-border"><Link to="/app/quotations/$id" params={{ id: q.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{q.number}</span><span className="text-base text-muted-foreground">{QUOTE_STATUS_LABELS[q.status]} · {inr(q.total)} · {fmtDate(q.issue_date)}</span></Link></li>
          ))}</ul>
        ))}
        {tab === "Projects" && <ClientProjects clientId={id} />}
        {tab === "Invoices" && canDelete && <ClientInvoices clientId={id} />}
        {tab === "Comments" && <Comments type="client" id={id} />}
      </div>
    </div>
  );
}

function ClientProjects({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["projects", { clientId }], queryFn: () => listProjects({ data: { clientId, page: 1 } }) });
  if (isLoading) return <div className="skeleton h-24 rounded-lg" />;
  if (!data?.rows.length) return <p className="text-lg text-muted-foreground">No projects you can see for this client.</p>;
  return (
    <ul className="border-b border-border">{data.rows.map((p: any) => (
      <li key={p.id} className="border-t border-border"><Link to="/app/projects/$id" params={{ id: p.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{p.name}</span><span className="text-base text-muted-foreground">{PROJECT_STATUS_LABELS[p.status]} · Due {fmtDate(p.due_date)}</span></Link></li>
    ))}</ul>
  );
}

function ClientInvoices({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["client-billing", clientId], queryFn: () => clientBilling({ data: { clientId } }) });
  if (isLoading) return <div className="skeleton h-24 rounded-lg" />;
  if (!data) return <p className="text-lg text-muted-foreground">Billing could not be loaded.</p>;
  return (
    <div>
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {([["Total billed", data.billed], ["Paid", data.paid], ["Outstanding", data.outstanding]] as const).map(([k, v]) => (
          <div key={k} className="bg-background p-5"><dt className="text-base text-muted-foreground">{k}</dt><dd className="mt-1 text-lg">{inr(v)}</dd></div>
        ))}
      </dl>
      {data.invoices.length === 0 ? <p className="mt-6 text-lg text-muted-foreground">No invoices yet.</p> : (
        <ul className="mt-6 border-b border-border">{data.invoices.map((i: any) => (
          <li key={i.id} className="border-t border-border py-4">
            <Link to="/app/invoices/$id" params={{ id: i.id }} className="ghost-link flex flex-wrap justify-between gap-2"><span className="text-lg">{i.number}</span><span className="text-base text-muted-foreground">{INVOICE_STATUS_LABELS[invoiceStatus(i)]} · {inr(i.total)} · balance {inr(Number(i.total) - Number(i.paid_total))}</span></Link>
            {i.payments?.length > 0 && <ul className="mt-2 space-y-1">{i.payments.map((p: any) => <li key={p.id} className="text-base text-muted-foreground">{fmtDate(p.paid_on)} · {PAYMENT_METHOD_LABELS[p.method]} · {inr(p.amount)}</li>)}</ul>}
          </li>
        ))}</ul>
      )}
    </div>
  );
}

