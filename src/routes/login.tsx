import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    links: [{ rel: "canonical", href: "/login" }],
    meta: [{ property: "og:url", content: "/login" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Team Login | WebZaura" },
      { name: "description", content: "Sign-in for WebZaura team members only." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Team Login | WebZaura" },
      { property: "og:description", content: "WebZaura team members only." },
    ],
  }),
  component: Login,
});

const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-lg text-foreground outline-none focus:border-foreground";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      // Generic message only: no account enumeration.
      setError("Email or password is incorrect");
      setBusy(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      setError("Email or password is incorrect");
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
          <Link to="/" className="ghost-link text-base">Back to website</Link>
        </div>
      </div>
      <div className="container-x flex flex-1 items-center py-16">
        <div className="w-full max-w-md">
          <p className="text-base">{"{"} WebZaura team only {"}"}</p>
          <h1 className="mt-6 text-heading">Team login</h1>
          <AccessibleForm className="mt-12 space-y-8" onSubmit={onSubmit}>
            <div><label htmlFor="email" className="text-base text-muted-foreground">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
            <div><label htmlFor="password" className="text-base text-muted-foreground">Password</label><input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></div>
            {error && <p role="alert" className="text-base text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Signing in..." : "Sign in"}</Button>
              <Link to="/forgot-password" className="ghost-link text-base text-muted-foreground">Forgot password</Link>
            </div>
          </AccessibleForm>
        </div>
      </div>
    </div>
  );
}
