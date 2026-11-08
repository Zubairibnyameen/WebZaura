import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { convertQuotationToProject } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { MemberPicker } from "./ProjectForm";
import { field, labelCls } from "./ui";

export function ConvertToProject({ quotationId, defaultName, onCancel }: { quotationId: string; defaultName: string; onCancel: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(defaultName);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [due, setDue] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  return (
    <form aria-label="Convert to project" className="mt-8 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-3" onSubmit={async (e) => {
      e.preventDefault();
      if (due && due < start) { toast.error("The due date is before the start date."); return; }
      setBusy(true);
      const r = await convertQuotationToProject({ data: { quotationId, name, start_date: start || null, due_date: due || null, memberIds: members } })
        .catch(() => ({ ok: false as const, error: "Could not create the project." }));
      setBusy(false);
      if (!r.ok) { if ("existingId" in r && r.existingId) { setExistingId(r.existingId); return; } toast.error(r.error); return; }
      toast.success("Project created with one task per line item");
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/app/projects/$id", params: { id: r.id } });
    }}>
      <h2 className="text-lg font-semibold sm:col-span-3">Convert to project</h2>
      <p role="status" className="text-base sm:col-span-3 empty:hidden">{existingId && <>This quotation already has a project. <Link to="/app/projects/$id" params={{ id: existingId }} className="underline">Open the project</Link></>}</p>
      <label className={labelCls}>Project name<input required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
      <label className={labelCls}>Start date<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
      <label className={labelCls}>Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
      <div className="sm:col-span-3"><MemberPicker value={members} onChange={setMembers} /></div>
      <div className="flex gap-3 sm:col-span-3">
        <Button variant="editorial" type="submit" disabled={busy}>{busy ? "Creating..." : "Create project"}</Button>
        <Button variant="editorial" type="button" className="text-muted-foreground" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
