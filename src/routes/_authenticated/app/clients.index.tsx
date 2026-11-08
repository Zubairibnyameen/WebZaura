import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listClients } from "@/lib/crm.functions";
import { fmtDate } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { DataRows, Empty, ErrorNote, ListSkeleton, PageHead, Pager, SearchBox } from "@/components/crm/ui";
import { ClientForm } from "@/components/crm/ClientForm";
import { useDebounced } from "@/hooks/use-debounced";
import { CsvButton } from "@/components/crm/CsvButton";
import { exportCsv } from "@/lib/invoices.functions";
import { getMyProfile } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/app/clients/")({
  head: () => ({ meta: [{ title: "Clients | WebZaura" }, { name: "description", content: "Clients for the WebZaura team." }, { property: "og:title", content: "Clients | WebZaura" }, { property: "og:description", content: "Clients for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Clients,
});

function Clients() {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const args = { q: dq || undefined, page, sort: "company" as const };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["clients", args], queryFn: () => listClients({ data: args }), placeholderData: keepPreviousData });

  return (
    <div>
      <PageHead eyebrow="Clients" title="The businesses we work with." actions={<>{!adding && <Button variant="editorial" onClick={() => setAdding(true)}>Add client</Button>}{me?.role !== "member" && me && <CsvButton file="webzaura-clients" load={() => exportCsv({ data: { kind: "clients" } })} />}</>} />
      {adding && (
        <section aria-label="New client" className="mt-10 rounded-lg border border-border p-6">
          <h2 className="mb-6 text-lg font-semibold">New client</h2>
          <ClientForm onSaved={(id) => navigate({ to: "/app/clients/$id", params: { id } })} onCancel={() => setAdding(false)} />
        </section>
      )}
      <div className="mt-8 max-w-md"><SearchBox label="Search clients" value={q} onChange={(v) => { setQ(v); setPage(1); }} /></div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Clients could not be loaded.</ErrorNote> :
        !data?.rows.length ? <Empty>{dq ? "No clients match that search." : "No clients yet. Add one, or convert a lead."}</Empty> : (
          <>
            <DataRows rows={data.rows} rowKey={(c) => c.id}
              renderLink={(c, ch) => <Link to="/app/clients/$id" params={{ id: c.id }} className="ghost-link block">{ch}</Link>}
              columns={[
                { label: "Company", cell: (c) => c.company },
                { label: "Contact", cell: (c) => c.contact_name ?? "Not given" },
                { label: "Email", cell: (c) => c.email ?? "Not given" },
                { label: "City", cell: (c) => c.city ?? "Not given" },
                { label: "Added", cell: (c) => fmtDate(c.created_at) },
              ]} />
            <Pager page={page} count={data.count} onPage={setPage} />
          </>
        )}
    </div>
  );
}
