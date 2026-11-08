import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    links: [{ rel: "canonical", href: "/reset-password" }],
    meta: [{ property: "og:url", content: "/reset-password" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { name: "description", content: "Set a New Password for the WebZaura private team area." }, { property: "og:title", content: "Set a New Password | WebZaura" }, { property: "og:description", content: "Set a New Password for WebZaura team members." }, 
      { title: "Set a New Password | WebZaura" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-lg text-foreground outline-none focus:border-foreground";

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") {
      setReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError("Could not set the new password. Try the reset link again.");
      setBusy(false);
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-[100svh] flex-col">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login" className="ghost-link text-base">Back to login</Link>
        </div>
      </div>
      <div className="container-x flex flex-1 items-center py-16">
        <div className="w-full max-w-md">
          <p className="text-base">{"{"} WebZaura team only {"}"}</p>
          <h1 className="mt-6 text-heading">Choose a new password</h1>
          {ready ? (
            <AccessibleForm className="mt-12 space-y-8" onSubmit={onSubmit}>
              <div><label htmlFor="password" className="text-base text-muted-foreground">New password</label><input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></div>
              <div><label htmlFor="confirm" className="text-base text-muted-foreground">Repeat it</label><input id="confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} /></div>
              {error && <p role="alert" className="text-base text-destructive">{error}</p>}
              <Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Saving..." : "Set new password"}</Button>
            </AccessibleForm>
          ) : (
            <p className="mt-8 text-lg text-muted-foreground">
              This page only works from the reset link in your email. <Link to="/forgot-password" className="ghost-link underline underline-offset-4">Request a new link</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
