import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listServices, saveService } from "@/lib/crm.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { inr } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ErrorNote, ListSkeleton, PageHead, field, labelCls } from "@/components/crm/ui";

export const Route = createFileRoute("/_authenticated/app/services")({
  head: () => ({ meta: [{ title: "Services | WebZaura" }, { name: "description", content: "Service catalog for WebZaura admins." }, { property: "og:title", content: "Services | WebZaura" }, { property: "og:description", content: "Service catalog for WebZaura admins." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Services,
});

type Svc = Awaited<ReturnType<typeof listServices>>[number];

function Services() {
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["services"], queryFn: () => listServices(), enabled: me?.role === "admin" });
  const [editing, setEditing] = useState<Svc | "new" | null>(null);

  if (meLoading) return <ListSkeleton />;
  if (me?.role !== "admin") return <div><p className="text-lg text-muted-foreground">Only admins can manage the service catalog.</p><Link to="/app" className="ghost-link mt-4 inline-block underline">Back to dashboard</Link></div>;

  return (
    <div className="max-w-4xl">
      <PageHead eyebrow="Services" title="What we offer in quotations." actions={!editing && <Button variant="editorial" onClick={() => setEditing("new")}>Add service</Button>} />
      {editing && <ServiceForm svc={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Services could not be loaded.</ErrorNote> : (
        <ul className="mt-8 border-b border-border">
          {(data ?? []).map((s) => (
            <li key={s.id} className="grid gap-2 border-t border-border py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
              <span className="text-lg">{s.name}{!s.is_active && <span className="text-muted-foreground"> · Hidden</span>}</span>
              <span className="text-base text-muted-foreground">Default price: {s.default_unit_price == null ? "Not set" : inr(s.default_unit_price)}</span>
              <Button variant="editorial" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceForm({ svc, onDone }: { svc: Svc | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(svc?.name ?? "");
  const [desc, setDesc] = useState(svc?.description ?? "");
  const [price, setPrice] = useState(svc?.default_unit_price != null ? String(svc.default_unit_price) : "");
  const [active, setActive] = useState(svc?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-10 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const r = await saveService({ data: { id: svc?.id, name, description: desc, default_unit_price: price === "" ? null : Number(price), is_active: active } }).catch(() => ({ ok: false as const, error: "Check the fields and try again." }));
      setBusy(false);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Service saved"); qc.invalidateQueries({ queryKey: ["services"] }); onDone();
    }}>
      <label className={labelCls}>Name<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
      <label className={labelCls}>Default unit price (INR, optional)<input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Description<textarea rows={2} maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} className={field} /></label>
      <label className="flex min-h-11 items-center gap-3 text-base"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-foreground" />Show in the quotation builder</label>
      <div className="flex gap-3 sm:col-span-2">
        <Button variant="editorial" type="submit" disabled={busy}>Save service</Button>
        <Button variant="editorial" type="button" className="text-muted-foreground" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
