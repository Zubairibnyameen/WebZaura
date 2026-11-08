import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listQuotations } from "@/lib/crm.functions";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, fmtDate, inr } from "@/lib/crm-format";
import { DataRows, Empty, ErrorNote, ListSkeleton, PageHead, Pager, SearchBox, field, labelCls } from "@/components/crm/ui";
import { useDebounced } from "@/hooks/use-debounced";

export const Route = createFileRoute("/_authenticated/app/quotations/")({
  head: () => ({ meta: [{ title: "Quotations | WebZaura" }, { name: "description", content: "Quotations for the WebZaura team." }, { property: "og:title", content: "Quotations | WebZaura" }, { property: "og:description", content: "Quotations for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Quotations,
});

function Quotations() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const args = { q: dq || undefined, status: (status || undefined) as any, page };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["quotations", args], queryFn: () => listQuotations({ data: args }), placeholderData: keepPreviousData });

  return (
    <div>
      <PageHead eyebrow="Quotations" title="Proposals and their status." actions={<Link to="/app/quotations/new" className="pill">New quotation</Link>} />
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_220px]">
        <SearchBox label="Search by number" value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <label className={labelCls}>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">All statuses</option>
            {QUOTE_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{QUOTE_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Quotations could not be loaded.</ErrorNote> :
        !data?.rows.length ? <Empty>{dq || status ? "No quotations match these filters." : "No quotations yet."}</Empty> : (
          <>
            <p className="mt-6 text-base text-muted-foreground">Total of matching quotations: <span className="text-foreground">{inr(data.sum)}</span></p>
            <DataRows rows={data.rows as any[]} rowKey={(r) => r.id}
              renderLink={(r, c) => <Link to="/app/quotations/$id" params={{ id: r.id }} className="ghost-link block">{c}</Link>}
              columns={[
                { label: "Number", cell: (r) => r.number },
                { label: "For", cell: (r) => r.clients?.company ?? r.leads?.name ?? "Not set" },
                { label: "Status", cell: (r) => QUOTE_STATUS_LABELS[r.status] },
                { label: "Issued", cell: (r) => fmtDate(r.issue_date) },
                { label: "Total", cell: (r) => inr(r.total) },
              ]} />
            <Pager page={page} count={data.count} onPage={setPage} />
          </>
        )}
    </div>
  );
}
