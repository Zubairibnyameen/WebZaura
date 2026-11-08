import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useState, type ReactNode } from "react";
import { buildWhatsAppLink, external, messages } from "@/lib/whatsapp";
import type { SlotInfo } from "@/data/images";
import { GiantType } from "@/components/layout/Backgrounds";

/** Shared easing and timing for all site animation. */
export const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: "-80px" } as const;

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 12 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container: direct Reveal children rise with an 80ms stagger. */
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 12 : 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Hairline divider that draws in left to right. */
export function Hairline({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px w-full origin-left bg-border ${className}`}
      initial={reduce ? { opacity: 0 } : { opacity: 1, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, ease: EASE }}
    />
  );
}

/** Curly-bracket section eyebrow; braces slide in toward the label. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string | undefined }) {
  const reduce = useReducedMotion();
  const brace = (from: number) =>
    reduce
      ? { initial: { opacity: 0 }, whileInView: { opacity: 1 } }
      : { initial: { opacity: 0, x: from }, whileInView: { opacity: 1, x: 0 } };
  return (
    <p className={`text-base ${className || "text-foreground"}`}>
      <motion.span className="inline-block" {...brace(-10)} viewport={VIEWPORT} transition={{ duration: 0.6, ease: EASE }}>{"{"}</motion.span>
      <motion.span className="inline-block px-1" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEWPORT} transition={{ duration: 0.6, delay: 0.1 }}>{children}</motion.span>
      <motion.span className="inline-block" {...brace(10)} viewport={VIEWPORT} transition={{ duration: 0.6, ease: EASE }}>{"}"}</motion.span>
    </p>
  );
}

/** The single primary action: opens WhatsApp with a prefilled message. */
export function ConsultButton({ message, label = "Book a Free Consultation", className = "" }: { message?: string | undefined; label?: string; className?: string }) {
  return (
    <a href={buildWhatsAppLink(message ?? messages.general)} {...external} className={`pill pill-primary ${className}`}>{label}</a>
  );
}

export function Section({ children, className = "", id, word, inverted = false }: { children: ReactNode; className?: string; id?: string; word?: string; inverted?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, VIEWPORT);
  return (
    <div ref={ref} className="section-shell">
    <motion.section id={id} className={`editorial-section ${inverted ? "inverted-surface" : ""} ${className}`}
      initial={inverted && !reduce ? { clipPath: "inset(100% 0 0 0)" } : false}
      animate={inverted ? { clipPath: visible || reduce ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)" } : {}}
      transition={{ duration: 0.8, ease: EASE }}>
      {word && <GiantType word={word} />}
      <Hairline />
      <div className="container-x section-y section-content">{children}</div>
    </motion.section>
    </div>
  );
}

export function PageHeader({ eyebrow, title, body, eyebrowClass }: { eyebrow: string; title: ReactNode; body?: string; eyebrowClass?: string }) {
  return (
    <section className="container-x pb-16 pt-16 md:pb-24 md:pt-24">
      <Reveal>
        <Eyebrow className={eyebrowClass}>{eyebrow}</Eyebrow>
        <h1 className="mt-6 max-w-5xl text-heading-lg">{title}</h1>
        {body && <p className="mt-8 max-w-2xl text-lg text-muted-foreground md:text-lg">{body}</p>}
      </Reveal>
    </section>
  );
}

export function CTABand({ title = "Let's talk about your business.", body = "Book a free consultation on WhatsApp. We will look at where you are today and tell you honestly what we would do next.", message }: { title?: string; body?: string; message?: string | undefined }) {
  return (
    <Section>
      <Reveal>
        <Eyebrow>Free consultation</Eyebrow>
        <h2 className="mt-6 max-w-5xl text-heading">{title}</h2>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">{body}</p>
        <div className="mt-10"><ConsultButton message={message} /></div>
      </Reveal>
    </Section>
  );
}

/** Image with a flat skeleton until it loads. */
export function SmartImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`image-slot relative overflow-hidden rounded-lg ${loaded ? "bg-card" : "skeleton"} ${className}`}>
      <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

/** Named image slot: clip-path reveal from the bottom with scale 1.08 to 1, or a labelled placeholder when the file is missing. */
export function ImageSlot({ slot, alt, ratio, priority = false, className = "" }: { slot: SlotInfo; alt: string; ratio: string; priority?: boolean; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const visible = useInView(frame, { once: true, margin: "-80px" });
  const [w, h] = slot.size.split("x").map(Number);
  if (!slot.src) {
    return (
      <div className={`image-slot grid place-items-center rounded-lg bg-card p-6 text-center text-sm text-muted-foreground ${className}`} style={{ aspectRatio: ratio }}>
        <span>{alt}</span>
      </div>
    );
  }
  return (
    <div ref={frame}>
    <motion.div
      className={`image-slot relative overflow-hidden rounded-lg ${loaded ? "bg-card" : "skeleton"} ${className}`}
      style={{ aspectRatio: ratio }}
      initial={reduce || priority ? { opacity: 0 } : { opacity: 1, clipPath: "inset(100% 0 0 0)" }}
      animate={{ opacity: visible || priority ? 1 : 0, clipPath: visible || priority ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)" }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <motion.img
        src={slot.src}
        alt={alt}
        width={w}
        height={h}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        ref={(image) => { if (image?.complete && image.naturalWidth > 0) setLoaded(true); }}
        initial={reduce ? false : { scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.9, ease: EASE }}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </motion.div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x space-y-6 pb-24 pt-24" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-5 w-32 rounded-lg" />
      <div className="skeleton h-24 w-3/4 rounded-lg" />
      <div className="skeleton h-5 w-1/2 rounded-lg" />
    </div>
  );
}
