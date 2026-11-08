import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    links: [{ rel: "canonical", href: "/forgot-password" }],
    meta: [{ property: "og:url", content: "/forgot-password" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { name: "description", content: "Forgot Password for the WebZaura private team area." }, { property: "og:title", content: "Forgot Password | WebZaura" }, { property: "og:description", content: "Forgot Password for WebZaura team members." }, 
      { title: "Forgot Password | WebZaura" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPassword,
});

const field = "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-lg text-foreground outline-none focus:border-foreground";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Always show the same message, whether or not the email exists.
    setSent(true);
    setBusy(false);
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
          <h1 className="mt-6 text-heading">Reset your password</h1>
          {sent ? (
            <p className="mt-8 text-lg text-muted-foreground" role="status">
              If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
            </p>
          ) : (
            <AccessibleForm className="mt-12 space-y-8" onSubmit={onSubmit}>
              <div><label htmlFor="email" className="text-base text-muted-foreground">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
              <Button variant="editorial" type="submit" disabled={busy} className="pill">{busy ? "Sending..." : "Send reset link"}</Button>
            </AccessibleForm>
          )}
        </div>
      </div>
    </div>
  );
}
