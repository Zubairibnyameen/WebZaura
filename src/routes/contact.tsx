import { AccessibleForm } from "@/components/layout/AccessibleForm";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, Eyebrow } from "@/components/sections/primitives";
import { services } from "@/data/services";
import { site } from "@/data/site";
import { buildContactMessage, buildWhatsAppLink, external, messages } from "@/lib/whatsapp";
import { submitLead } from "@/lib/leads.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    links: [{ rel: "canonical", href: "/contact" }],
    meta: [{ property: "og:url", content: "/contact" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Contact | WebZaura" },
      { name: "description", content: "Tell us about your business and book a free consultation with WebZaura on WhatsApp." },
      { property: "og:title", content: "Contact WebZaura" },
      { property: "og:description", content: "Book a free consultation with WebZaura." },
    ],
  }),
  component: Contact,
});

const types = ["Business", "Startup", "Individual", "NGO"] as const;
const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{7,15}$/, "Please enter a valid phone number"),
  service: z.string().min(1, "Please choose a service"),
  type: z.enum(types, { errorMap: () => ({ message: "Please choose a type" }) }),
  message: z.string().trim().min(10, "Tell us a little more (10 or more characters)").max(2000),
});
type FormValues = z.infer<typeof schema>;

/** Save the enquiry as a lead. Never blocks the visitor: WhatsApp opens regardless. */
async function saveEnquiry(values: FormValues, honeypot: string): Promise<void> {
  try {
    await submitLead({
      data: {
        name: values.name,
        email: values.email,
        phone: values.phone,
        service: values.service,
        clientType: values.type,
        message: values.message,
        website: honeypot,
      },
    });
  } catch {
    // Saving failed; WhatsApp still opens.
  }
}

const field = "mt-2 min-h-11 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground";
const label = "text-base text-muted-foreground";

function Contact() {
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    // Open the tab synchronously-ish so pop-up blockers allow it.
    const link = buildWhatsAppLink(buildContactMessage(values));
    const win = window.open(link, "_blank", "noopener,noreferrer");
    await saveEnquiry(values, honeypot);
    setSentLink(link);
    if (!win) { /* blocked: fallback button below */ }
  };
  const err = (id: string, m?: string) => m && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">{m}</p>;

  const details = [
    { label: "Email", value: site.email, href: `mailto:${site.email}` },
    { label: "Phone", value: site.phone, href: site.phoneHref },
    { label: "WhatsApp", value: site.whatsapp, href: buildWhatsAppLink(messages.general), ext: true },
    { label: "Location", value: site.location },
  ];

  return (
    <>
      <PageHeader eyebrow="Contact" title="Tell us about your business." body="Based in Delhi. We work with businesses across India. Fill this in and WhatsApp will open with your details ready to send. We usually reply the same day." />
      <section className="container-x grid gap-16 border-t border-border pb-28 pt-16 lg:grid-cols-[1.4fr_1fr]">
        {sentLink ? (
          <div className="rounded-lg bg-card p-6 md:p-10" role="status">
            <Eyebrow>Almost done</Eyebrow>
            <h2 className="mt-6 text-heading">WhatsApp is opening.</h2>
            <p className="mt-4 text-lg text-muted-foreground">If nothing happened, tap the button below. Then press send in WhatsApp.</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <a href={sentLink} {...external} className="pill">Open WhatsApp</a>
              <Button variant="editorial" onClick={() => { setSentLink(null); reset(); }} className="ghost-link text-base underline underline-offset-4">Send another message</Button>
            </div>
          </div>
        ) : (
          <AccessibleForm onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="name" className={label}>Full name</label><input id="name" autoComplete="name" className={field} {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} required />{err("name", errors.name?.message)}</div>
            <div><label htmlFor="email" className={label}>Email</label><input id="email" autoComplete="email" type="email" className={field} {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} required />{err("email", errors.email?.message)}</div>
            <div><label htmlFor="phone" className={label}>Phone</label><input id="phone" autoComplete="tel" type="tel" className={field} {...register("phone")} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} required />{err("phone", errors.phone?.message)}</div>
            <div>
              <label htmlFor="service" className={label}>Service</label>
              <select id="service" defaultValue="" className={field} {...register("service")} aria-invalid={!!errors.service} aria-describedby={errors.service ? "service-error" : undefined} required>
                <option value="" disabled className="bg-background">Choose a service</option>
                {services.map((s) => <option key={s.slug} value={s.name} className="bg-background">{s.name}</option>)}
              </select>
              {err("service", errors.service?.message)}
            </div>
            <div>
              <label htmlFor="type" className={label}>You are a</label>
              <select id="type" defaultValue="" className={field} {...register("type")} aria-invalid={!!errors.type} aria-describedby={errors.type ? "type-error" : undefined} required>
                <option value="" disabled className="bg-background">Choose one</option>
                {types.map((t) => <option key={t} value={t} className="bg-background">{t}</option>)}
              </select>
              {err("type", errors.type?.message)}
            </div>
            <div className="sm:col-span-2"><label htmlFor="message" className={label}>Message</label><textarea id="message" rows={4} className={`${field} resize-none`} placeholder="What does your business do, and what would you like help with?" {...register("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} required />{err("message", errors.message?.message)}</div>
            {/* Honeypot: hidden from people, bots fill it in. */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            <div className="sm:col-span-2"><Button variant="editorial" type="submit" disabled={isSubmitting} className="pill pill-primary">Send on WhatsApp</Button></div>
          </AccessibleForm>
        )}
        <aside className="border-b border-border">
          {details.map((d) => (
            <div key={d.label} className="border-t border-border py-5">
              <p className="text-base text-muted-foreground">{d.label}</p>
              {d.href ? <a href={d.href} {...(d.ext ? external : {})} className="ghost-link mt-1 block text-lg">{d.value}</a> : <p className="mt-1 text-lg">{d.value}</p>}
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}
