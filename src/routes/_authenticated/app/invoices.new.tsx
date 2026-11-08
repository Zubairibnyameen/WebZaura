import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createInvoice, invoiceSources } from "@/lib/invoices.functions";
import { inr, invoiceBase } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ListSkeleton, PageHead, field, labelCls } from "@/components/crm/ui";
import { StaffOnly } from "./invoices.index";
import { GstNotice } from "@/components/crm/GstNotice";

export const Route = createFileRoute("/_authenticated/app/invoices/new")({
  validateSearch: (s) => z.object({ quotation: z.string().uuid().optional(), project: z.string().uuid().optional() }).catch({}).parse(s),
  head: () => ({ meta: [{ title: "New invoice | WebZaura" }, { name: "description", content: "Create an invoice." }, { property: "og:title", content: "New invoice | WebZaura" }, { property: "og:description", content: "Create an invoice." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: () => <StaffOnly><NewInvoice /></StaffOnly>,
});

const plus15 = () => new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);

function NewInvoice() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["invoice-sources"], queryFn: () => invoiceSources() });
  const [projectId, setProjectId] = useState(search.project ?? "");
  const [quotationId, setQuotationId] = useState(search.quotation ?? "");
  const [mode, setMode] = useState<"full" | "percent" | "custom">("full");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [tax, setTax] = useState("18");
  const [due, setDue] = useState(plus15());
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) return <ListSkeleton />;
  const project = data.projects.find((p) => p.id === projectId);
  const qid = quotationId || project?.quotation_id || "";
  const quote = data.quotes.find((q) => q.id === qid) as any;
  const base = quote ? Number(quote.subtotal) - Number(quote.discount_total) : 0;
  const amount = mode === "full" ? base : invoiceBase(base, mode, Number(value) || 0);
  const taxRate = mode === "full" && quote ? Number(quote.tax_rate) : Number(tax) || 0;
  const gst = Math.round(amount * taxRate) / 100;

  return (
    <div className="max-w-3xl">
      <Link to="/app/invoices" className="ghost-link text-base text-muted-foreground">Back to invoices</Link>
      <div className="mt-6"><PageHead eyebrow="Invoice" title="New invoice" /></div>
      <GstNotice />
      <form className="mt-8 grid gap-6 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!qid && !projectId) { setErr("Choose an accepted quotation or a project."); return; }
        setBusy(true);
        const r = await createInvoice({ data: { quotationId: qid || null, projectId: projectId || null, mode, value: Number(value) || 0, label: label || undefined, taxRate, dueDate: due || null, notes: notes || null } })
          .catch(() => ({ ok: false as const, error: "Check the fields and try again." }));
        setBusy(false);
        if (!r.ok) { setErr(r.error); return; }
        toast.success("Invoice created"); qc.invalidateQueries({ queryKey: ["invoices"] });
        navigate({ to: "/app/invoices/$id", params: { id: r.id } });
      }}>
        <label className={labelCls}>Accepted quotation
          <select value={quotationId} onChange={(e) => setQuotationId(e.target.value)} className={field}>
            <option value="" className="bg-background">{project?.quotation_id ? "From the project" : "None"}</option>
            {data.quotes.map((q: any) => <option key={q.id} value={q.id} className="bg-background">{q.number} · {q.clients?.company ?? ""} · {inr(q.total)}</option>)}
          </select>
        </label>
        <label className={labelCls}>Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field}>
            <option value="" className="bg-background">None</option>
            {data.projects.map((p) => <option key={p.id} value={p.id} className="bg-background">{p.name}</option>)}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className={labelCls}>Amount</legend>
          <div className="mt-2 flex flex-wrap gap-x-6">
            {([["full", "Full quotation"], ["percent", "Percentage (advance)"], ["custom", "Custom amount (milestone)"]] as const).map(([k, l]) => (
              <label key={k} className="flex min-h-11 items-center gap-2 text-base">
                <input type="radio" name="mode" value={k} checked={mode === k} disabled={k !== "custom" && !quote} onChange={() => setMode(k)} className="h-5 w-5 accent-foreground" />{l}
              </label>
            ))}
          </div>
        </fieldset>
        {mode !== "full" && <>
          <label className={labelCls}>{mode === "percent" ? "Percent of quotation (before GST)" : "Amount before GST (INR)"}
            <input type="number" required min={0.01} max={mode === "percent" ? 100 : undefined} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
          </label>
          <label className={labelCls}>Line description (optional)<input maxLength={200} value={label} onChange={(e) => setLabel(e.target.value)} className={field} /></label>
          <label className={labelCls}>GST rate (%)<input type="number" min={0} max={100} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} className={field} /></label>
        </>}
        <label className={labelCls}>Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
        <label className={`${labelCls} sm:col-span-2`}>Notes<textarea rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} /></label>
        <dl className="space-y-2 text-base sm:col-span-2" aria-live="polite">
          <div className="flex justify-between"><dt className="text-muted-foreground">Amount before GST</dt><dd>{inr(amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">GST ({taxRate}%)</dt><dd>{inr(gst)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Estimated total</dt><dd>{inr(amount + gst)}</dd></div>
        </dl>
        {err && <p role="alert" className="text-base text-destructive sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2"><Button variant="editorial" type="submit" disabled={busy}>{busy ? "Creating..." : "Create invoice"}</Button></div>
      </form>
    </div>
  );
}
