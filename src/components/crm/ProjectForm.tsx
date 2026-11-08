import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listTeamOptions, saveProject } from "@/lib/projects.functions";
import { quotationOptions } from "@/lib/crm.functions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ListSkeleton, field, labelCls } from "./ui";

export type ProjectInitial = { id?: string; name?: string; client_id?: string | null; service_type?: string | null; status?: string; start_date?: string | null; due_date?: string | null; description?: string | null; memberIds?: string[] };

export function MemberPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: team = [], isLoading } = useQuery({ queryKey: ["team-options"], queryFn: () => listTeamOptions() });
  if (isLoading) return <div className="skeleton h-12 rounded-lg" />;
  return (
    <fieldset>
      <legend className={labelCls}>Team members</legend>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {team.map((t) => (
          <label key={t.id} className="flex min-h-11 items-center gap-2 text-base">
            <input type="checkbox" className="h-5 w-5 accent-foreground" checked={value.includes(t.id)} onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((x) => x !== t.id))} />
            {t.full_name || t.email}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProjectForm({ initial = {}, onSaved, onCancel }: { initial?: ProjectInitial; onSaved: (id: string) => void; onCancel?: () => void }) {
  const { data: opts, isLoading } = useQuery({ queryKey: ["quote-options"], queryFn: () => quotationOptions() });
  const [f, setF] = useState({
    name: initial.name ?? "", client_id: initial.client_id ?? "", service_type: initial.service_type ?? "", status: initial.status ?? "planning",
    start_date: initial.start_date ?? "", due_date: initial.due_date ?? "", description: initial.description ?? "",
  });
  const [members, setMembers] = useState<string[]>(initial.memberIds ?? []);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  if (isLoading || !opts) return <ListSkeleton rows={3} />;

  return (
    <form className="grid gap-6 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault(); setErr(null); setBusy(true);
      const r = await saveProject({ data: {
        id: initial.id, name: f.name, client_id: f.client_id || null, service_type: f.service_type || null, status: f.status as any,
        start_date: f.start_date || null, due_date: f.due_date || null, description: f.description || null, memberIds: members,
      } }).catch(() => ({ ok: false as const, error: "Check the fields and try again." }));
      setBusy(false);
      if (!r.ok) { setErr(r.error); return; }
      toast.success("Project saved"); onSaved(r.id);
    }}>
      <label className={labelCls}>Name<input required minLength={2} maxLength={160} value={f.name} onChange={set("name")} className={field} /></label>
      <label className={labelCls}>Client
        <select value={f.client_id} onChange={set("client_id")} className={field}>
          <option value="" className="bg-background">No client</option>
          {opts.clients.map((c) => <option key={c.id} value={c.id} className="bg-background">{c.company}</option>)}
        </select>
      </label>
      <label className={labelCls}>Service type
        <select value={f.service_type} onChange={set("service_type")} className={field}>
          <option value="" className="bg-background">Not set</option>
          {opts.services.map((s) => <option key={s.id} value={s.name} className="bg-background">{s.name}</option>)}
        </select>
      </label>
      <label className={labelCls}>Status
        <select value={f.status} onChange={set("status")} className={field}>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{PROJECT_STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      <label className={labelCls}>Start date<input type="date" value={f.start_date} onChange={set("start_date")} className={field} /></label>
      <label className={labelCls}>Due date<input type="date" value={f.due_date} onChange={set("due_date")} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Description<textarea rows={3} maxLength={4000} value={f.description} onChange={set("description")} className={field} /></label>
      <div className="sm:col-span-2"><MemberPicker value={members} onChange={setMembers} /></div>
      {err && <p role="alert" className="text-base text-destructive sm:col-span-2">{err}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <Button variant="editorial" type="submit" disabled={busy}>{busy ? "Saving..." : "Save project"}</Button>
        {onCancel && <Button variant="editorial" type="button" className="text-muted-foreground" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
