import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { exportCsv, listInvoices } from "@/lib/invoices.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { INVOICE_STATUS_LABELS, fmtDate, inr, invoiceStatus } from "@/lib/crm-format";
import { DataRows, Empty, ErrorNote, ListSkeleton, PageHead, Pager, SearchBox, field, labelCls } from "@/components/crm/ui";
import { CsvButton } from "@/components/crm/CsvButton";
import { useDebounced } from "@/hooks/use-debounced";

export const Route = createFileRoute("/_authenticated/app/invoices/")({
  head: () => ({ meta: [{ title: "Invoices | WebZaura" }, { name: "description", content: "Invoices for WebZaura admins and managers." }, { property: "og:title", content: "Invoices | WebZaura" }, { property: "og:description", content: "Invoices for WebZaura admins and managers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Invoices,
});

export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  if (isLoading) return <ListSkeleton />;
  if (me?.role !== "admin" && me?.role !== "manager") return <div><p className="text-lg text-muted-foreground">Invoices are available to admins and managers only.</p><Link to="/app" className="ghost-link mt-4 inline-block underline">Back to dashboard</Link></div>;
  return <>{children}</>;
}

function Invoices() { return <StaffOnly><InvoiceList /></StaffOnly>; }

function InvoiceList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const args = { q: dq || undefined, status: (status || undefined) as any, page };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["invoices", args], queryFn: () => listInvoices({ data: args }), placeholderData: keepPreviousData });
  return (
    <div>
      <PageHead eyebrow="Invoices" title="Billing and payments." actions={<>
        <Link to="/app/invoices/new" className="pill">New invoice</Link>
        <CsvButton label="Export invoices" file="webzaura-invoices" load={() => exportCsv({ data: { kind: "invoices" } })} />
        <CsvButton label="Export payments" file="webzaura-payments" load={() => exportCsv({ data: { kind: "payments" } })} />
      </>} />
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_220px]">
        <SearchBox label="Search by number" value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <label className={labelCls}>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">All statuses</option>
            {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-background">{v}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Invoices could not be loaded.</ErrorNote> :
        !data?.rows.length ? <Empty>{dq || status ? "No invoices match these filters." : "No invoices yet."}</Empty> : (
          <>
            <DataRows rows={data.rows as any[]} rowKey={(r) => r.id}
              renderLink={(r, c) => <Link to="/app/invoices/$id" params={{ id: r.id }} className="ghost-link block">{c}</Link>}
              columns={[
                { label: "Number", cell: (r) => r.number },
                { label: "Client", cell: (r) => r.clients?.company ?? "Not set" },
                { label: "Status", cell: (r) => { const s = invoiceStatus(r); return <span className={s === "overdue" ? "text-destructive" : ""}>{INVOICE_STATUS_LABELS[s]}</span>; } },
                { label: "Due", cell: (r) => fmtDate(r.due_date) },
                { label: "Balance", cell: (r) => inr(Number(r.total) - Number(r.paid_total)) },
              ]} />
            <Pager page={page} count={data.count} onPage={setPage} />
          </>
        )}
    </div>
  );
}
