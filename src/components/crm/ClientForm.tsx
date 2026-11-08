import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveClient } from "@/lib/crm.functions";
import { field, labelCls } from "./ui";

export type ClientFields = { company: string; contact_name: string; email: string; phone: string; address: string; city: string; gstin: string; notes: string };
const blank: ClientFields = { company: "", contact_name: "", email: "", phone: "", address: "", city: "", gstin: "", notes: "" };

export function ClientForm({ id, initial, onSaved, onCancel }: { id?: string; initial?: Partial<Record<keyof ClientFields, string | null>>; onSaved: (id: string) => void; onCancel?: () => void }) {
  const [f, setF] = useState<ClientFields>(() => ({ ...blank, ...Object.fromEntries(Object.entries(initial ?? {}).map(([k, v]) => [k, v ?? ""])) }));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ClientFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (f.gstin && !/^[0-9A-Za-z]{15}$/.test(f.gstin.trim())) { setErr("GSTIN has 15 letters and digits."); return; }
    setBusy(true);
    try {
      const r = await saveClient({ data: { ...f, id } });
      if (!r.ok) { setErr(r.error); return; }
      toast.success(id ? "Client saved" : "Client added");
      onSaved(r.id);
    } catch { setErr("Check the fields and try again."); }
    finally { setBusy(false); }
  };

  const input = (k: keyof ClientFields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={labelCls}>{label}<input value={f[k]} onChange={set(k)} className={field} {...props} /></label>
  );

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2" noValidate={false}>
      {input("company", "Company", { required: true, minLength: 2, maxLength: 160 })}
      {input("contact_name", "Contact person", { maxLength: 120 })}
      {input("email", "Email", { type: "email", maxLength: 200 })}
      {input("phone", "Phone", { type: "tel", maxLength: 30 })}
      {input("city", "City", { maxLength: 80 })}
      {input("gstin", "GSTIN (optional)", { maxLength: 15, autoCapitalize: "characters" })}
      <label className={`${labelCls} sm:col-span-2`}>Address<input value={f.address} onChange={set("address")} maxLength={300} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Notes<textarea rows={3} value={f.notes} onChange={set("notes")} maxLength={2000} className={field} /></label>
      {err && <p role="alert" className="text-base text-destructive sm:col-span-2">{err}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button variant="editorial" type="submit" disabled={busy}>{busy ? "Saving..." : "Save client"}</Button>
        {onCancel && <Button variant="editorial" type="button" className="text-muted-foreground" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
