import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    // Deactivated accounts are signed out immediately.
    const { data: profile } = await supabase
      .from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => <Outlet />,
});
