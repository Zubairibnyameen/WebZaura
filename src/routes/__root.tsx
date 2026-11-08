import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import Lenis from "lenis";

import "@fontsource-variable/hanken-grotesk";
import appCss from "../styles.css?url";
import { Navbar, AnnouncementBanner } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { themeScript } from "@/components/layout/ThemeToggle";
import { Eyebrow, ConsultButton, PageSkeleton } from "@/components/sections/primitives";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { BackgroundLayers } from "@/components/layout/Backgrounds";

const FALLBACK_SITE_URL = "https://webzaura.vercel.app";

function siteBaseUrl() {
  const configured = typeof process !== "undefined" ? process.env["SITE_URL"] : undefined;
  return (configured?.trim() || FALLBACK_SITE_URL).replace(/\/+$/, "");
}

function NotFoundComponent() {
  return (
    <section className="container-x flex min-h-[70vh] flex-col justify-center py-24">
      <Eyebrow>404</Eyebrow>
      <h1 className="mt-6 text-heading-lg">This page does not exist.</h1>
      <p className="mt-6 max-w-md text-lg text-muted-foreground">It may have moved, or the link was typed wrong.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/" className="pill">Back to home</Link>
        <ConsultButton />
      </div>
    </section>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[100svh] items-center bg-background">
      <div className="container-x">
        <Eyebrow>Error</Eyebrow>
        <h1 className="mt-6 text-heading">This page did not load.</h1>
        <p className="mt-4 text-lg text-muted-foreground">Something went wrong on our side. Try again, or go back home.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="editorial" onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
          <a href="/" className="pill">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const siteUrl = siteBaseUrl();
    const logoUrl = `${siteUrl}/webzaura-logo.png`;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "author", content: "WebZaura" },
        { property: "og:site_name", content: "WebZaura" },
        { property: "og:type", content: "website" },
        { property: "og:image", content: logoUrl },
        { property: "og:image:alt", content: "WebZaura logo" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: logoUrl },
        { name: "twitter:image:alt", content: "WebZaura logo" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/icon-32.png" },
        { rel: "icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/icon-180.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "preload", href: "/webzaura-logo.png", as: "image", type: "image/png" },
      ],
      scripts: [{ children: themeScript }, { type: "application/ld+json", children: JSON.stringify([
        { "@context": "https://schema.org", "@type": "Organization", name: "WebZaura", url: siteUrl, logo: logoUrl, image: logoUrl, email: "webzaura@gmail.com", telephone: "+919149097947" },
        { "@context": "https://schema.org", "@type": "WebSite", name: "WebZaura", url: siteUrl, image: logoUrl, description: "Websites, marketing and Growth Consulting for businesses across India." },
      ]) }],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PageSkeleton,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Lenis smooth scrolling, desktop pointers only, off for reduced motion. */
function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches && navigator.maxTouchPoints === 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const lenis = new Lenis({ anchors: true, duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}

/** 250ms cross-fade between pages. */
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  // Login and the private team area render without the public chrome.
  const bare = ["/login", "/forgot-password", "/reset-password", "/setup"].includes(pathname) || pathname.startsWith("/app") || pathname.startsWith("/q/") || pathname.startsWith("/i/");
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (bare) {
    return (
      <QueryClientProvider client={queryClient}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-background focus:px-3 focus:py-2">Skip to main content</a>
        {!pathname.startsWith("/app") && <SmoothScroll />}
        <PageTransition>
          {pathname.startsWith("/app") ? <Outlet /> : <main id="main"><Outlet /></main>}
        </PageTransition>
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-background focus:px-3 focus:py-2">Skip to main content</a>
      <SmoothScroll />
      <BackgroundLayers />
      <AnnouncementBanner />
      <Navbar />
      <main id="main" tabIndex={-1}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <nav aria-label="Page navigation" className="container-x pb-6 md:hidden"><a href="#main" className="ghost-link inline-flex min-h-11 items-center underline underline-offset-4">Back to top</a></nav>
      <Footer />
      <WhatsAppButton />
      <Toaster />
    </QueryClientProvider>
  );
}
