import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { quotationOptions, saveQuotation } from "@/lib/crm.functions";
import { computeTotals } from "@/lib/quote-math";
import { inr } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ListSkeleton, field, labelCls } from "./ui";

type Item = { key: number; service_id: string | null; description: string; quantity: string; unit_price: string; item_discount: string };
export type BuilderInitial = {
  id?: string; lead_id?: string | null; client_id?: string | null; valid_until?: string | null;
  discount_type?: "percent" | "amount"; discount_value?: number; tax_rate?: number; notes?: string | null; terms?: string | null;
  items?: { service_id: string | null; description: string; quantity: number; unit_price: number; item_discount: number }[];
};

let k = 0;
const newItem = (): Item => ({ key: ++k, service_id: null, description: "", quantity: "1", unit_price: "", item_discount: "" });
const plus30 = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
const DEFAULT_TERMS = "Work begins after written acceptance. Timelines are confirmed in the project plan.";

export function QuoteBuilder({ initial, onSaved, onCancel }: { initial: BuilderInitial; onSaved: (id: string) => void; onCancel?: () => void }) {
  const { data: opts, isLoading } = useQuery({ queryKey: ["quote-options"], queryFn: () => quotationOptions() });
  const [leadId, setLeadId] = useState(initial.lead_id ?? "");
  const [clientId, setClientId] = useState(initial.client_id ?? "");
  const [validUntil, setValidUntil] = useState(initial.valid_until ?? plus30());
  const [dType, setDType] = useState<"percent" | "amount">(initial.discount_type ?? "percent");
  const [dValue, setDValue] = useState(String(initial.discount_value ?? 0));
  const [tax, setTax] = useState(String(initial.tax_rate ?? 18));
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [terms, setTerms] = useState(initial.terms ?? DEFAULT_TERMS);
  const [items, setItems] = useState<Item[]>(() =>
    initial.items?.length ? initial.items.map((i) => ({ key: ++k, service_id: i.service_id, description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price), item_discount: i.item_discount ? String(i.item_discount) : "" })) : [newItem()]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => computeTotals(
    items.map((i) => ({ quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0, item_discount: Number(i.item_discount) || 0 })),
    dType, Number(dValue) || 0, Number(tax) || 0), [items, dType, dValue, tax]);

  const upd = (key: number, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const pickService = (key: number, sid: string) => {
    const s = opts?.services.find((x) => x.id === sid);
    upd(key, { service_id: sid || null, ...(s ? { description: s.name, ...(s.default_unit_price != null ? { unit_price: String(s.default_unit_price) } : {}) } : {}) });
  };
  const pickLead = (id: string) => {
    setLeadId(id);
    const l = opts?.leads.find((x) => x.id === id);
    if (l?.client_id && !clientId) setClientId(l.client_id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!leadId && !clientId) { setErr("Choose a client or a lead."); return; }
    const clean = items.filter((i) => i.description.trim());
    if (!clean.length) { setErr("Add at least one item with a description."); return; }
    if (clean.some((i) => !(Number(i.quantity) > 0))) { setErr("Every quantity must be more than zero."); return; }
    setBusy(true);
    try {
      const r = await saveQuotation({ data: {
        id: initial.id, lead_id: leadId || null, client_id: clientId || null, valid_until: validUntil || null,
        discount_type: dType, discount_value: Number(dValue) || 0, tax_rate: Number(tax) || 0, notes, terms,
        items: clean.map((i) => ({ service_id: i.service_id, description: i.description.trim(), quantity: Number(i.quantity), unit_price: Number(i.unit_price) || 0, item_discount: Number(i.item_discount) || 0 })),
      } });
      if (!r.ok) { setErr(r.error); return; }
      onSaved(r.id);
    } catch { setErr("Check the fields and try again."); }
    finally { setBusy(false); }
  };

  if (isLoading || !opts) return <ListSkeleton rows={4} />;

  return (
    <form onSubmit={submit} className="mt-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className={labelCls}>Client
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
            <option value="" className="bg-background">No client</option>
            {opts.clients.map((c) => <option key={c.id} value={c.id} className="bg-background">{c.company}</option>)}
          </select>
        </label>
        <label className={labelCls}>Lead
          <select value={leadId} onChange={(e) => pickLead(e.target.value)} className={field}>
            <option value="" className="bg-background">No lead</option>
            {opts.leads.map((l) => <option key={l.id} value={l.id} className="bg-background">{l.name}{l.company ? ` · ${l.company}` : ""}</option>)}
          </select>
        </label>
      </div>

      <h2 className="mt-12 text-lg font-semibold">Items</h2>
      <ol className="mt-4 border-b border-border">
        {items.map((it, idx) => {
          const line = Math.max((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) - (Number(it.item_discount) || 0), 0);
          return (
            <li key={it.key} className="grid gap-4 border-t border-border py-6 md:grid-cols-[2rem_1.2fr_2fr_5rem_8rem_7rem_auto] md:items-end">
              <span className="text-base text-muted-foreground">{idx + 1}.</span>
              <label className={labelCls}>Service
                <select value={it.service_id ?? ""} onChange={(e) => pickService(it.key, e.target.value)} className={field}>
                  <option value="" className="bg-background">Free text</option>
                  {opts.services.map((s) => <option key={s.id} value={s.id} className="bg-background">{s.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>Description<input required maxLength={500} value={it.description} onChange={(e) => upd(it.key, { description: e.target.value })} className={field} /></label>
              <label className={labelCls}>Qty<input type="number" inputMode="decimal" min={0.01} step="0.01" required value={it.quantity} onChange={(e) => upd(it.key, { quantity: e.target.value })} className={field} /></label>
              <label className={labelCls}>Unit price<input type="number" inputMode="decimal" min={0} step="0.01" value={it.unit_price} onChange={(e) => upd(it.key, { unit_price: e.target.value })} className={field} /></label>
              <label className={labelCls}>Item discount<input type="number" inputMode="decimal" min={0} step="0.01" value={it.item_discount} onChange={(e) => upd(it.key, { item_discount: e.target.value })} className={field} /></label>
              <div className="flex items-center justify-between gap-3 md:block md:text-right">
                <span className="text-base">{inr(line)}</span>
                {items.length > 1 && <Button variant="ghost" type="button" className="ghost-link text-muted-foreground" aria-label={`Remove item ${idx + 1}`} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}>Remove</Button>}
              </div>
            </li>
          );
        })}
      </ol>
      <Button variant="editorial" type="button" className="mt-4" onClick={() => setItems((xs) => [...xs, newItem()])}>Add item</Button>

      <div className="mt-12 grid gap-6 sm:grid-cols-4">
        <label className={labelCls}>Discount type
          <select value={dType} onChange={(e) => setDType(e.target.value as "percent" | "amount")} className={field}>
            <option value="percent" className="bg-background">Percent</option>
            <option value="amount" className="bg-background">Amount (INR)</option>
          </select>
        </label>
        <label className={labelCls}>Discount<input type="number" min={0} max={dType === "percent" ? 100 : undefined} step="0.01" value={dValue} onChange={(e) => setDValue(e.target.value)} className={field} /></label>
        <label className={labelCls}>GST rate (%)<input type="number" min={0} max={100} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} className={field} /></label>
        <label className={labelCls}>Valid until<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={field} /></label>
        <label className={`${labelCls} sm:col-span-2`}>Notes<textarea rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} /></label>
        <label className={`${labelCls} sm:col-span-2`}>Terms<textarea rows={3} maxLength={4000} value={terms} onChange={(e) => setTerms(e.target.value)} className={field} /></label>
      </div>

      <dl className="mt-10 ml-auto max-w-sm space-y-2 text-base" aria-live="polite">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(totals.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>{inr(totals.discount_total)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">GST ({Number(tax) || 0}%)</dt><dd>{inr(totals.tax_total)}</dd></div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(totals.total)}</dd></div>
      </dl>

      {err && <p role="alert" className="mt-6 text-base text-destructive">{err}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="editorial" type="submit" disabled={busy}>{busy ? "Saving..." : initial.id ? "Save changes" : "Save as draft"}</Button>
        {onCancel && <Button variant="editorial" type="button" className="text-muted-foreground" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
