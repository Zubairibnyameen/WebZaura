import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { deleteQuotation, duplicateQuotation, getQuotation, regenerateShareToken, setQuotationStatus } from "@/lib/crm.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, fmtDate, inr } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ErrorNote, PageHead, field, labelCls } from "@/components/crm/ui";
import { QuoteBuilder } from "@/components/crm/QuoteBuilder";
import { useConfirm } from "@/components/crm/Confirm";
import { Comments } from "@/components/crm/Comments";
import { ConvertToProject } from "@/components/crm/ConvertToProject";

export const Route = createFileRoute("/_authenticated/app/quotations/$id")({
  head: () => ({ meta: [{ title: "Quotation | WebZaura" }, { name: "description", content: "Quotation details." }, { property: "og:title", content: "Quotation | WebZaura" }, { property: "og:description", content: "Quotation details." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: QuotePage,
});

const auditText = (a: any) => a.action === "status_change"
  ? `Status changed from ${QUOTE_STATUS_LABELS[a.details?.from] ?? a.details?.from} to ${QUOTE_STATUS_LABELS[a.details?.to] ?? a.details?.to}`
  : a.action === "create" ? "Quotation created" : "Quotation edited";

function QuotePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [converting, setConverting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["quotation", id], queryFn: () => getQuotation({ data: { id } }) });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const isStaff = me?.role === "admin" || me?.role === "manager";

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;
  if (error || !data) return <div><ErrorNote onRetry={() => refetch()}>This quotation could not be opened. It may not exist, or it is not yours.</ErrorNote><Link to="/app/quotations" className="ghost-link mt-4 inline-block underline">Back to quotations</Link></div>;

  const { quote: q, items, audits } = data as any;
  const locked = q.status === "accepted";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["quotation", id] }); qc.invalidateQueries({ queryKey: ["quotations"] }); };
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${q.share_token}` : "";
  const to = q.clients
    ? { name: q.clients.company, lines: [q.clients.contact_name, q.clients.address, q.clients.city, q.clients.email, q.clients.phone, q.clients.gstin ? `GSTIN ${q.clients.gstin}` : null].filter(Boolean) }
    : { name: q.leads?.company || q.leads?.name || "Client", lines: [q.leads?.company ? q.leads.name : null, q.leads?.email, q.leads?.phone].filter(Boolean) };

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    const r = await fn().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!r.ok) { toast.error(r.error ?? "Something went wrong."); return r; }
    toast.success(ok); refresh(); return r;
  };

  const download = async () => {
    setBusy(true);
    try {
      const { downloadQuotePdf } = await import("@/components/crm/QuotePdf");
      await downloadQuotePdf({ ...q, to, items });
    } catch { toast.error("The PDF could not be created. Try again."); }
    setBusy(false);
  };

  if (editing && !locked) {
    return (
      <div className="max-w-5xl">
        <PageHead eyebrow="Edit quotation" title={q.number} />
        <QuoteBuilder initial={{ ...q, discount_value: Number(q.discount_value), tax_rate: Number(q.tax_rate), items: items.map((i: any) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), item_discount: Number(i.item_discount) })) }}
          onSaved={() => { toast.success("Quotation saved"); setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link to="/app/quotations" className="ghost-link text-base text-muted-foreground">Back to quotations</Link>
      <div className="mt-6"><PageHead eyebrow={`Quotation · ${QUOTE_STATUS_LABELS[q.status]}`} title={q.number} /></div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="editorial" disabled={busy} onClick={download}>Download PDF</Button>
        <Button variant="editorial" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success("Share link copied"); } catch { toast.error("Copy failed. The link is: " + shareUrl); } }}>Copy share link</Button>
        {!locked && <Button variant="editorial" onClick={() => setEditing(true)}>Edit</Button>}
        <Button variant="editorial" disabled={busy} onClick={async () => { const r = await act(() => duplicateQuotation({ data: { id } }), "Duplicate created"); if (r.ok) navigate({ to: "/app/quotations/$id", params: { id: r.id } }); }}>Duplicate</Button>
        {me?.role === "admin" && <Button variant="editorial" disabled={busy} onClick={async () => { if (await confirm({ title: "Create a new share link?", body: "The old link will stop working.", action: "Revoke old link" })) act(() => regenerateShareToken({ data: { id } }), "New link created. The old one no longer works."); }}>Revoke link</Button>}
        {locked && isStaff && <Button variant="editorial" onClick={() => setConverting(true)}>Convert to project</Button>}
        {locked && isStaff && <Link to="/app/invoices/new" search={{ quotation: id }} className="pill">Create invoice</Link>}
        {isStaff && <Button variant="editorial" disabled={busy} className="text-destructive" onClick={async () => { if (!(await confirm({ title: "Delete this quotation?" }))) return; const r = await act(() => deleteQuotation({ data: { id } }), "Quotation deleted"); if (r.ok) navigate({ to: "/app/quotations" }); }}>Delete</Button>}
      </div>

      {converting && <ConvertToProject quotationId={id} defaultName={`${to.name} project`} onCancel={() => setConverting(false)} />}
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        <label className={labelCls}>Status
          <select value={q.status} disabled={busy || locked} onChange={(e) => act(() => setQuotationStatus({ data: { id, status: e.target.value as any } }), "Status updated")} className={field}>
            {QUOTE_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{QUOTE_STATUS_LABELS[s]}</option>)}
          </select>
          {locked && <span className="mt-2 block text-base">Accepted quotations are locked.</span>}
        </label>
        <div><p className="text-base text-muted-foreground">Issued</p><p className="mt-3 text-lg">{fmtDate(q.issue_date)}</p></div>
        <div><p className="text-base text-muted-foreground">Valid until</p><p className="mt-3 text-lg">{fmtDate(q.valid_until)}</p></div>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-base text-muted-foreground">Prepared for</p>
          <p className="mt-2 text-lg">{to.name}</p>
          {to.lines.map((l: string, i: number) => <p key={i} className="text-base text-muted-foreground">{l}</p>)}
        </div>
        <div className="text-base">
          {q.clients && <Link to="/app/clients/$id" params={{ id: q.client_id }} className="ghost-link block underline">Open client</Link>}
          {q.leads && <Link to="/app/leads/$id" params={{ id: q.lead_id }} className="ghost-link mt-2 block underline">Open lead</Link>}
        </div>
      </div>

      <ol className="mt-10 border-b border-border">
        {items.map((it: any, i: number) => (
          <li key={it.id} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[2rem_1fr_auto] sm:gap-4">
            <span className="text-base text-muted-foreground">{i + 1}.</span>
            <span className="text-base">{it.description}<span className="block text-muted-foreground">{Number(it.quantity)} × {inr(it.unit_price)}{Number(it.item_discount) ? ` less ${inr(it.item_discount)}` : ""}</span></span>
            <span className="text-base sm:text-right">{inr(Math.max(Number(it.quantity) * Number(it.unit_price) - Number(it.item_discount), 0))}</span>
          </li>
        ))}
      </ol>
      <dl className="mt-6 ml-auto max-w-sm space-y-2 text-base">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(q.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>{inr(q.discount_total)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">GST ({Number(q.tax_rate)}%)</dt><dd>{inr(q.tax_total)}</dd></div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(q.total)}</dd></div>
      </dl>
      {q.notes && <><h2 className="mt-10 text-lg font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{q.notes}</p></>}
      {q.terms && <><h2 className="mt-6 text-lg font-semibold">Terms</h2><p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{q.terms}</p></>}

      <Comments type="quotation" id={id} />
      <h2 className="mt-14 text-heading font-semibold">Activity</h2>
      {audits.length === 0 ? <p className="mt-4 text-lg text-muted-foreground">No activity yet.</p> : (
        <ol className="mt-6 border-b border-border">
          {audits.map((a: any) => (
            <li key={a.id} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[180px_1fr]">
              <span className="text-base text-muted-foreground">{fmtDate(a.created_at)}{a.actor_label ? ` · ${a.actor_label}` : ""}</span>
              <span className="text-base">{auditText(a)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
