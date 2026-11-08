import * as Dialog from "@radix-ui/react-dialog";
import { PASSWORD_FAILURE_MESSAGE, passwordUpdateOutcome } from "@/lib/password-flow";
import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getMyProfile, clearMustChangePassword } from "@/lib/leads.functions";
import { GlobalSearch } from "@/components/crm/GlobalSearch";
import { ConfirmProvider } from "@/components/crm/Confirm";
import { listNotifications } from "@/lib/activity.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Team Area | WebZaura" }, { name: "description", content: "WebZaura private team workspace." }, { property: "og:title", content: "Team Area | WebZaura" }, { property: "og:description", content: "WebZaura private team workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

const linkCls = (active: boolean) =>
  `ghost-link block py-2 text-lg ${active ? "text-foreground" : "text-muted-foreground"}`;

export function ForceChangePassword({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-lg text-foreground outline-none focus:border-foreground";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password, current_password: current });
      if (err) throw err;
      await clearMustChangePassword();
      onDone();
    } catch {
      setError(PASSWORD_FAILURE_MESSAGE);
      setFailed(passwordUpdateOutcome(true).allowContinue);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x flex min-h-[100svh] items-center py-16">
      <div className="w-full max-w-md">
        <p className="text-base">{"{"} First sign-in {"}"}</p>
        <h1 className="mt-6 text-heading">Choose your own password</h1>
        <p className="mt-4 text-lg text-muted-foreground">You signed in with a temporary password. Set a new one to continue.</p>
        <AccessibleForm className="mt-10 space-y-8" onSubmit={onSubmit}>
          <div><label htmlFor="cp" className="text-base text-muted-foreground">Temporary password</label><input id="cp" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} /></div>
          <div><label htmlFor="np" className="text-base text-muted-foreground">New password</label><input id="np" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></div>
          <div><label htmlFor="npc" className="text-base text-muted-foreground">Repeat it</label><input id="npc" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} /></div>
          {error && <p role="alert" className="text-base text-destructive">{error}</p>}
          <Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Saving..." : "Save and continue"}</Button>
        {failed && <div className="flex flex-wrap gap-4"><Link to="/forgot-password" className="ghost-link inline-flex min-h-11 items-center underline">Forgot password</Link><Button variant="editorial" type="button" onClick={onSkip}>Continue into app</Button></div>}
        </AccessibleForm>
      </div>
    </div>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordDeferred, setPasswordDeferred] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const { data: notes } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications(), refetchInterval: 120000, enabled: !!data });
  const unread = notes?.unread ?? 0;
  const myId = data?.profile?.id;
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel(`notify-${myId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${myId}` }, (p: any) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (p.new?.title) toast(p.new.title);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, queryClient]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (isLoading) {
    return (
      <main id="main" className="container-x space-y-6 py-24" aria-busy="true">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-5 w-72 rounded-lg" />
        <div className="skeleton h-40 w-full rounded-lg" />
      </main>
    );
  }

  const profile = data?.profile;
  const role = data?.role ?? "member";

  if (profile?.must_change_password && !passwordDeferred) {
    return <main id="main"><ForceChangePassword onDone={() => refetch()} onSkip={() => setPasswordDeferred(true)} /></main>;
  }

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const nav: [string, string, boolean][] = [
    ["/app", "Dashboard", pathname === "/app"],
    ["/app/leads", "Leads", pathname.startsWith("/app/leads")],
    ["/app/quotations", "Quotations", pathname.startsWith("/app/quotations")],
    ["/app/clients", "Clients", pathname.startsWith("/app/clients")],
    ["/app/projects", "Projects", pathname.startsWith("/app/projects")],
    ...(role !== "member" ? ([["/app/invoices", "Invoices", pathname.startsWith("/app/invoices")]] as [string, string, boolean][]) : []),
    ["/app/activity", unread ? `Activity (${unread} new)` : "Activity", pathname === "/app/activity"],
    ...(role === "admin" ? ([["/app/services", "Services", pathname === "/app/services"], ["/app/team", "Team", pathname === "/app/team"]] as [string, string, boolean][]) : []),
    ["/app/account", "Account", pathname === "/app/account"],
  ];
  const links = (
    <>
      {nav.map(([to, label, active]) => (
        <Link key={to} to={to as "/app"} aria-current={active ? "page" : undefined} className={linkCls(active)} onClick={() => setMenuOpen(false)}>{label}</Link>
      ))}
    </>
  );

  return (
    <div className="flex min-h-[100svh]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border px-6 py-8 md:flex">
        <Logo />
        <nav aria-label="Team" className="mt-12 space-y-1">{links}</nav>
        <a href="/" className="ghost-link mt-auto text-base text-muted-foreground">Back to website</a>
      </aside>


      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border px-4 md:px-8">
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}><Dialog.Trigger asChild><Button variant="ghost" className="ghost-link text-base md:hidden" aria-expanded={menuOpen} aria-controls="app-menu">Menu</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-background" /><Dialog.Content id="app-menu" aria-describedby={undefined} className="fixed inset-0 z-[61] h-[100svh] overflow-y-auto bg-background px-6 py-6"><Dialog.Title className="text-row">Team menu</Dialog.Title><Dialog.Close asChild><Button variant="ghost" className="mt-4">Close</Button></Dialog.Close><nav aria-label="Team mobile" className="mt-8 space-y-4">{links}</nav></Dialog.Content></Dialog.Portal></Dialog.Root>
          <span className="hidden text-base text-muted-foreground md:block">{profile?.full_name || profile?.email}</span>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <GlobalSearch />
            <ThemeToggle />
            <Button variant="editorial" onClick={signOut} className="ghost-link text-base text-muted-foreground">Log out</Button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-10 md:px-8">
          <ConfirmProvider><Outlet /></ConfirmProvider>
        </main>
      </div>
    </div>
  );
}
