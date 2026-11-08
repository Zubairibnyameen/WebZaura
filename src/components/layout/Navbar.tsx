import { Link } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { services } from "@/data/services";
import { hasProjects } from "@/data/projects";
import { buildWhatsAppLink, external, messages } from "@/lib/whatsapp";

const links = [
  ...(hasProjects ? [{ to: "/work", label: "Work" } as const] : []),
  { to: "/about", label: "About" } as const,
  { to: "/blog", label: "Blog" } as const,
  { to: "/contact", label: "Contact" } as const,
];

export function AnnouncementBanner() {
  return (
    <aside aria-label="Free consultation" className="announcement border-b border-border">
      <p className="container-x py-2.5 text-center text-sm">
        Free consultation: find out how to grow your business online.{" "}
        <a href={buildWhatsAppLink(messages.general)} {...external} className="ghost-link underline underline-offset-4">Message us on WhatsApp</a>
      </p>
    </aside>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      if (event === "SIGNED_OUT") setSignedIn(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const nav = "ghost-link text-base";

  // Hide on scroll down, return on scroll up; hairline appears after the first scroll.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 8);
    setHidden(!open && !document.querySelector("header:focus-within") && y > prev && y > 120);
  });

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <motion.header
      animate={reduce ? { opacity: hidden ? 0 : 1 } : { y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 bg-background ${scrolled || open ? "border-b border-border" : "border-b border-transparent"}`}
    >
      <nav className="container-x flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-7 lg:flex">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild><Button variant="ghost" className={nav}>Services</Button></DropdownMenu.Trigger>
            <DropdownMenu.Portal><DropdownMenu.Content className="z-[70] w-72 rounded-lg border border-border bg-card p-3" sideOffset={12}>
              <DropdownMenu.Item asChild><Link to="/services" className="ghost-link block px-3 py-3">All services</Link></DropdownMenu.Item>
              {services.map((s) => <DropdownMenu.Item key={s.slug} asChild><Link to="/services/$slug" params={{ slug: s.slug }} className={`ghost-link block px-3 py-3 ${s.color}`}>{s.name}</Link></DropdownMenu.Item>)}
            </DropdownMenu.Content></DropdownMenu.Portal>
          </DropdownMenu.Root>
          {links.map((l) => <Link key={l.to} to={l.to} className={nav}>{l.label}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          <a href={buildWhatsAppLink(messages.general)} {...external} className="pill hidden px-5 py-2.5 text-base sm:inline-flex">Book a Free Call</a>
          <ThemeToggle />
          <Link to={signedIn ? "/app" : "/login"} className="ghost-link hidden text-sm text-muted-foreground lg:inline">{signedIn ? "Dashboard" : "Login"}</Link>
          <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button variant="ghost" size="icon" className="grid h-11 w-11 place-items-center rounded-full lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </Button></Dialog.Trigger>
            <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[60] bg-background" />
              <Dialog.Content id="mobile-menu" aria-describedby={undefined} className="fixed inset-0 z-[61] flex h-[100svh] flex-col bg-background">
                <Dialog.Title className="sr-only">WebZaura menu</Dialog.Title>
                <div className="container-x flex h-16 shrink-0 items-center justify-between border-b border-border"><Logo /><Dialog.Close asChild><Button variant="ghost" aria-label="Close menu">Close</Button></Dialog.Close></div>
                <nav aria-label="Mobile" className="container-x flex-1 overflow-y-auto py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <Link to="/" onClick={() => setOpen(false)} className="block py-3 text-row">Home</Link>
                  <Link to="/services" onClick={() => setOpen(false)} className="block py-3 text-row">Services</Link>
                  <ul className="pl-4">{services.map((s) => <li key={s.slug}><Link to="/services/$slug" params={{slug:s.slug}} onClick={() => setOpen(false)} className={`block py-3 text-lg ${s.color}`}>{s.name}</Link></li>)}</ul>
                  {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-3 text-row">{l.label}</Link>)}
                  <a href={buildWhatsAppLink(messages.general)} {...external} className="pill pill-primary mt-6 w-full">Book a Free Call</a>
                  <Link to={signedIn ? "/app" : "/login"} onClick={() => setOpen(false)} className="mt-6 block py-3 text-center text-sm text-muted-foreground">{signedIn ? "Dashboard" : "Login"}</Link>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>

    </motion.header>
  );
}
