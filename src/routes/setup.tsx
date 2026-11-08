import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { bootstrapAdmin } from "@/lib/team.functions";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { name: "description", content: "Team Setup for the WebZaura private team area." }, { property: "og:title", content: "Team Setup | WebZaura" }, { property: "og:description", content: "Team Setup for WebZaura team members." }, { title: "Setup | WebZaura" }, { name: "robots", content: "noindex" }] }),
  component: Setup,
});

/** One-time first-admin bootstrap. Permanently disabled once any account exists. */
function Setup() {
  const [result, setResult] = useState<{ ok: boolean; email?: string; password?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await bootstrapAdmin();
      setResult(r);
    } catch {
      setResult({ ok: false, error: "Setup could not be completed." });
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-[100svh] flex-col">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="container-x flex flex-1 items-center py-16">
        <div className="w-full max-w-md">
          <p className="text-base">{"{"} One-time setup {"}"}</p>
          <h1 className="mt-6 text-heading">Create the first admin</h1>
          {!result ? (
            <>
              <p className="mt-6 text-lg text-muted-foreground">This creates the first admin account and then turns itself off for good.</p>
              <Button variant="editorial" onClick={run} disabled={busy} className="pill mt-8">{busy ? "Creating..." : "Create admin account"}</Button>
            </>
          ) : result.ok ? (
            <div className="mt-8 rounded-lg border border-border bg-card p-6" role="status">
              <p className="text-lg">Admin account created.</p>
              <p className="mt-3 text-base text-muted-foreground">Email: <span className="text-foreground">{result.email}</span></p>
              <p className="mt-1 text-base text-muted-foreground">Temporary password, shown once: <span className="select-all font-semibold text-foreground">{result.password}</span></p>
              <p className="mt-3 text-base text-muted-foreground">Save it now, then sign in and change it.</p>
              <Link to="/login" className="pill mt-6 inline-block">Go to login</Link>
            </div>
          ) : (
            <p className="mt-8 text-lg text-muted-foreground" role="alert">{result.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
