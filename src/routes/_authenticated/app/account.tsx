import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyName } from "@/lib/leads.functions";
import { Eyebrow } from "@/components/sections/primitives";

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({ meta: [{ name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { name: "description", content: "Account for the WebZaura private team area." }, { property: "og:title", content: "Account | WebZaura" }, { property: "og:description", content: "Account for WebZaura team members." }, { title: "Account | WebZaura" }, { name: "robots", content: "noindex" }] }),
  component: Account,
});

const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base text-foreground outline-none focus:border-foreground";

function Account() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const [name, setName] = useState<string | null>(null);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !data?.profile) {
    return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-48 rounded-lg" /><div className="skeleton h-32 rounded-lg" /></div>;
  }
  const p = data.profile;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await updateMyName({ data: { fullName: name ?? p.full_name } });
    setNameMsg(r.ok ? "Name saved." : (r.error ?? "Could not save your name."));
    if (r.ok) queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setPwMsg("Use at least 8 characters."); return; }
    if (next !== confirm) { setPwMsg("The passwords do not match."); return; }
    setBusy(true);
    setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
    setBusy(false);
    if (error) { setPwMsg("Could not change the password. Check your current password and try again."); return; }
    setPwMsg("Password changed.");
    setCurrent(""); setNext(""); setConfirm("");
  };

  return (
    <div className="max-w-xl">
      <Eyebrow>Account</Eyebrow>
      <h1 className="mt-4 text-heading">Your details.</h1>
      <p className="mt-4 text-lg text-muted-foreground">{p.email} · {data.role}</p>

      <AccessibleForm onSubmit={saveName} className="mt-12">
        <label htmlFor="name" className="text-base text-muted-foreground">Full name</label>
        <input id="name" value={name ?? p.full_name} onChange={(e) => setName(e.target.value)} className={field} />
        <Button variant="editorial" type="submit" className="pill mt-6">Save name</Button>
        {nameMsg && <p className="mt-3 text-base text-muted-foreground" role="status">{nameMsg}</p>}
      </AccessibleForm>

      <h2 className="mt-14 text-heading font-semibold">Change password</h2>
      <AccessibleForm onSubmit={savePassword} className="mt-6 space-y-8">
        <div><label htmlFor="cur" className="text-base text-muted-foreground">Current password</label><input id="cur" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} /></div>
        <div><label htmlFor="new" className="text-base text-muted-foreground">New password</label><input id="new" type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} /></div>
        <div><label htmlFor="cfm" className="text-base text-muted-foreground">Repeat new password</label><input id="cfm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} /></div>
        <Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Saving..." : "Change password"}</Button>
        {pwMsg && <p className="text-base text-muted-foreground" role="status">{pwMsg}</p>}
      </AccessibleForm>
    </div>
  );
}
