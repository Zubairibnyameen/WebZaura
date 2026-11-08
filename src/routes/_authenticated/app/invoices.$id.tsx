import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { deleteInvoice, deletePayment, getInvoice, recordPayment, regenerateInvoiceToken } from "@/lib/invoices.functions";
import { INVOICE_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, fmtDate, inr, invoiceStatus, todayISO } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ErrorNote, PageHead, field, labelCls } from "@/components/crm/ui";
import { Comments } from "@/components/crm/Comments";
import { useConfirm } from "@/components/crm/Confirm";
import { GstNotice } from "@/components/crm/GstNotice";
import { StaffOnly } from "./invoices.index";

export const Route = createFileRoute("/_authenticated/app/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice | WebZaura" }, { name: "description", content: "Invoice details." }, { property: "og:title", content: "Invoice | WebZaura" }, { property: "og:description", content: "Invoice details." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: () => <StaffOnly><InvoicePage /></StaffOnly>,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice({ data: { id } }) });
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("upi");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [payErr, setPayErr] = useState("");

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;
  if (error || !data) return <div><ErrorNote onRetry={() => refetch()}>This invoice could not be opened.</ErrorNote><Link to="/app/invoices" className="ghost-link mt-4 inline-block underline">Back to invoices</Link></div>;
  const { invoice: v, items, payments } = data as any;
  const status = invoiceStatus(v);
  const balance = Math.round((Number(v.total) - Number(v.paid_total)) * 100) / 100;
  const c = v.clients;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); };
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/i/${v.share_token}` : "";

  return (
    <div className="max-w-5xl">
      <Link to="/app/invoices" className="ghost-link text-base text-muted-foreground">Back to invoices</Link>
      <div className="mt-6"><PageHead eyebrow={`Invoice · ${INVOICE_STATUS_LABELS[status]}`} title={v.number} /></div>
      <GstNotice />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="editorial" disabled={busy} onClick={async () => {
          setBusy(true);
          try { const { downloadInvoicePdf } = await import("@/components/crm/InvoicePdf"); await downloadInvoicePdf({ ...v, status: INVOICE_STATUS_LABELS[status], client: c, items }); }
          catch { toast.error("The PDF could not be created."); }
          setBusy(false);
        }}>Download PDF</Button>
        <Button variant="editorial" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success("Share link copied"); } catch { toast.error("Copy failed. The link is: " + shareUrl); } }}>Copy share link</Button>
        <Button variant="editorial" onClick={async () => {
          if (!(await confirm({ title: "Create a new share link?", body: "The old link will stop working.", action: "Revoke old link" }))) return;
          const r = await regenerateInvoiceToken({ data: { id } }); if (!r.ok) toast.error(r.error); else { toast.success("New link created"); refresh(); }
        }}>Revoke link</Button>
        <Button variant="editorial" className="text-destructive" onClick={async () => {
          if (!(await confirm({ title: `Delete ${v.number}?`, body: "Its payments are deleted too. This cannot be undone." }))) return;
          const r = await deleteInvoice({ data: { id } }); if (!r.ok) toast.error(r.error); else { toast.success("Invoice deleted"); qc.invalidateQueries({ queryKey: ["invoices"] }); navigate({ to: "/app/invoices" }); }
        }}>Delete</Button>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-base text-muted-foreground">Billed to</p>
          <p className="mt-2 text-lg">{c?.company ?? "No client"}</p>
          {[c?.contact_name, c?.address, c?.city, c?.email, c?.phone].filter(Boolean).map((l: string, i: number) => <p key={i} className="text-base text-muted-foreground">{l}</p>)}
          <p className="text-base">GSTIN: {c?.gstin || "Not given"}</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-base">
          <div><dt className="text-muted-foreground">Issued</dt><dd className="text-lg">{fmtDate(v.issue_date)}</dd></div>
          <div><dt className="text-muted-foreground">Due</dt><dd className={`text-lg ${status === "overdue" ? "text-destructive" : ""}`}>{fmtDate(v.due_date)}</dd></div>
          {v.projects && <div><dt className="text-muted-foreground">Project</dt><dd><Link to="/app/projects/$id" params={{ id: v.projects.id }} className="ghost-link underline">{v.projects.name}</Link></dd></div>}
          {v.quotations && <div><dt className="text-muted-foreground">Quotation</dt><dd><Link to="/app/quotations/$id" params={{ id: v.quotations.id }} className="ghost-link underline">{v.quotations.number}</Link></dd></div>}
        </dl>
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
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(v.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>{inr(v.discount_total)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Taxable value</dt><dd>{inr(Number(v.subtotal) - Number(v.discount_total))}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">GST ({Number(v.tax_rate)}%: CGST {Number(v.tax_rate) / 2}% + SGST {Number(v.tax_rate) / 2}%)</dt><dd>{inr(v.tax_total)}</dd></div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(v.total)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd>{inr(v.paid_total)}</dd></div>
        <div className="flex justify-between text-lg font-semibold"><dt>Balance due</dt><dd>{inr(balance)}</dd></div>
      </dl>

      <h2 className="mt-14 text-heading font-semibold">Payments</h2>
      {payments.length === 0 ? <p className="mt-4 text-lg text-muted-foreground">No payments recorded yet.</p> : (
        <ul className="mt-4 border-b border-border">
          {payments.map((p: any) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4">
              <span className="text-base">{fmtDate(p.paid_on)} · {PAYMENT_METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ""}</span>
              <span className="flex items-center gap-4"><span className="text-lg">{inr(p.amount)}</span>
                <Button variant="ghost" className="ghost-link h-auto p-0 text-base text-muted-foreground underline" onClick={async () => {
                  if (!(await confirm({ title: `Delete payment of ${inr(p.amount)}?` }))) return;
                  const r = await deletePayment({ data: { id: p.id } }); if (!r.ok) toast.error(r.error); else refresh();
                }}>Delete</Button></span>
            </li>
          ))}
        </ul>
      )}
      {balance > 0 && (
        <form className="mt-8 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(amount);
          setPayErr("");
          if (!(n > 0)) { setPayErr("Enter an amount above zero."); return; }
          if (n > balance) { setPayErr(`Payment is more than the balance due, which is ${inr(balance)}.`); return; }
          setBusy(true);
          const r = await recordPayment({ data: { invoiceId: id, amount: n, paidOn, method, reference: ref || null } }).catch(() => ({ ok: false as const, error: "Could not record the payment." }));
          setBusy(false);
          if (!r.ok) { setPayErr(r.error); return; }
          toast.success("Payment recorded"); setAmount(""); setRef(""); refresh();
        }}>
          <h3 className="text-lg font-semibold sm:col-span-2">Record payment</h3>
          <label className={labelCls}>Amount (INR)<input type="number" required step="0.01" value={amount} aria-invalid={payErr ? true : undefined} aria-describedby="pay-err" onChange={(e) => { setAmount(e.target.value); setPayErr(""); }} className={field} /></label>
          <p id="pay-err" role="alert" aria-live="assertive" className="text-base text-destructive sm:col-span-2 empty:hidden">{payErr}</p>
          <label className={labelCls}>Date<input type="date" required max={todayISO()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={field} /></label>
          <label className={labelCls}>Method
            <select value={method} onChange={(e) => setMethod(e.target.value as any)} className={field}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="bg-background">{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </label>
          <label className={labelCls}>Reference (optional)<input maxLength={200} value={ref} onChange={(e) => setRef(e.target.value)} className={field} /></label>
          <div className="sm:col-span-2"><Button variant="editorial" type="submit" disabled={busy}>Record payment</Button></div>
        </form>
      )}
      <Comments type="invoice" id={id} />
    </div>
  );
}
