import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { services } from "@/data/services";
import { site } from "@/data/site";
import { hasProjects } from "@/data/projects";
import { buildWhatsAppLink, external, messages } from "@/lib/whatsapp";
import { FooterWordmark } from "./Backgrounds";

export function Footer() {
  const h = "mb-3 md:mb-5 text-base text-muted-foreground";
  const a = "ghost-link inline-flex min-h-11 items-center text-base";
  return (
    <footer className="border-t border-border bg-card">
      <div className="container-x grid grid-cols-1 gap-6 py-10 md:gap-12 md:py-20 min-[480px]:grid-cols-2 md:grid-cols-12">
        <div className="order-3 min-[480px]:col-span-2 md:order-none md:col-span-4">
          <Logo />
          <p className="mt-5 max-w-xs text-base text-muted-foreground">{"{"} Websites, marketing and growth advice for businesses across India {"}"}</p>
        </div>
        <div className="order-2 md:order-none md:col-span-3">
          <details className="md:hidden"><summary className="flex cursor-pointer items-center text-base">Services</summary><ul className="space-y-1 py-3">{services.map((s) => <li key={s.slug}><Link to="/services/$slug" params={{slug:s.slug}} className="ghost-link inline-flex min-h-11 items-center text-base">{s.name}</Link></li>)}</ul></details>
          <p className={`${h} hidden md:block`}>Services</p>
          <ul className="hidden space-y-2.5 md:block">
            {services.map((s) => <li key={s.slug}><Link to="/services/$slug" params={{ slug: s.slug }} className={a}>{s.name}</Link></li>)}
          </ul>
        </div>
        <div className="order-2 md:order-none md:col-span-2">
          <p className={h}>Company</p>
          <ul className="space-y-2.5">
            <li><Link to="/about" className={a}>About</Link></li>
            {hasProjects && <li><Link to="/work" className={a}>Work</Link></li>}
            <li><Link to="/blog" className={a}>Blog</Link></li>
            <li><Link to="/faq" className={a}>FAQ</Link></li>
            <li><Link to="/contact" className={a}>Contact</Link></li>
          </ul>
        </div>
        <div className="order-first md:order-none md:col-span-3">
          <p className={h}>Contact</p>
          <ul className="space-y-0 text-base">
            <li><a href={`mailto:${site.email}`} className={a}>{site.email}</a></li>
            <li><a href={site.phoneHref} className={a}>{site.phone}</a></li>
            <li><a href={buildWhatsAppLink(messages.general)} {...external} className={a}>WhatsApp {site.whatsapp}</a></li>
            <li className="text-muted-foreground">{site.location}</li>
            <li className="flex gap-4 pt-2">
              {site.instagram.href && <a href={site.instagram.href} {...external} className={a}>Instagram</a>}
              {site.facebook.href && <a href={site.facebook.href} {...external} className={a}>Facebook</a>}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-x flex flex-col gap-3 pb-28 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:pb-6">
          <p>© 2026 Designed and developed by WebZaura</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="ghost-link inline-flex min-h-11 items-center">Privacy Policy</Link>
            <Link to="/terms" className="ghost-link inline-flex min-h-11 items-center">Terms of Service</Link>
          </div>
        </div>
      </div>
      <FooterWordmark />
    </footer>
  );
}
