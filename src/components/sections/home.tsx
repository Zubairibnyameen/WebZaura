import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView, useScroll, useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { ConsultButton, EASE, Eyebrow, ImageSlot, Reveal, Section } from "./primitives";
import { images, projectImage } from "@/data/images";
import { services, getServiceByName } from "@/data/services";
import { projects } from "@/data/projects";
import { benefits, differentiators, processSteps, testimonials } from "@/data/site";
import { messages } from "@/lib/whatsapp";
import { HeroField, HomeIntro } from "@/components/layout/Backgrounds";

const pad = (n: number) => String(n).padStart(2, "0");

export function Hero() {
  const reduce = useReducedMotion();
  const lines = ["Websites built", "to perform."];
  return (
    <section className="home-hero overflow-hidden pb-10 pt-8 md:pb-28 md:pt-20">
      <HeroField /><HomeIntro />
      <div className="container-x"><Eyebrow>Web, marketing and growth from Delhi</Eyebrow></div>
      <div className="hero-headline container-x"><h1 className="text-display mt-6">
        {lines.map((l, i) => (
          <span key={l} className="block overflow-hidden pb-[0.06em]">
            <motion.span
              className="block"
              initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: EASE }}
            >
              {l}
            </motion.span>
          </span>
        ))}
      </h1></div>
      <div className="hero-intro container-x mt-6 grid gap-6 md:grid-cols-2 md:items-end">
        <Reveal delay={0.35}>
          <p className="max-w-md text-base leading-normal md:text-xl">
            Websites, marketing and growth advice for businesses across India.
          </p>
        </Reveal>
        <Reveal delay={0.45} className="hero-actions flex flex-col gap-3 md:flex-row md:justify-end">
          <ConsultButton />
          <Link to="/services" className="pill">See How We Work</Link>
        </Reveal>
      </div>
      {/* REPLACE: temporary Unsplash placeholder, swap for a real mockup of our sites */}
      <div className="hero-showcase container-x mt-8 md:mt-20">
        <ImageSlot slot={images.hero} alt="Laptop and phone on a desk" ratio="12 / 5" priority  />
      </div>
    </section>
  );
}

export function ServiceRows({ withEyebrow = true }: { withEyebrow?: boolean }) {
  return (
    <Section word="Services">
      {withEyebrow && (
        <Reveal className="mb-12 md:mb-16">
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-6 max-w-4xl text-heading">Seven services. One team that answers on WhatsApp.</h2>
        </Reveal>
      )}
      <ol className="group/list border-b border-border">
        {services.map((s, i) => (
          <li key={s.slug} className="border-t border-border">
            <Reveal
              delay={i * 0.08}
              className="transition-opacity duration-300 md:group-hover/list:opacity-40 md:hover:opacity-100"
            >
              <Link to="/services/$slug" params={{ slug: s.slug }} className="service-row-link grid grid-cols-[24px_minmax(0,1fr)] gap-3 py-4 md:grid-cols-[80px_minmax(0,1fr)_auto] md:items-center md:gap-10 md:py-10">
                <span className="text-sm text-muted-foreground">{pad(i + 1)}</span>
                <div className="min-w-0"><h3 className={`text-row ${s.color}`}>{s.name}</h3><p className="mt-2 truncate text-base text-muted-foreground md:whitespace-normal">{s.summary}</p></div>
                <span className="pill hidden md:inline-flex">Explore</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Shortcut() {
  return (
    <Section>
      <Reveal className="mb-12 md:mb-16">
        <Eyebrow>Shortcut to Success</Eyebrow>
        <h2 className="mt-6 max-w-4xl text-heading">What a good website does for you.</h2>
      </Reveal>
      <ol className="border-b border-border">
        {benefits.map((b, i) => (
          <li key={b.title} className="border-t border-border">
            <Reveal delay={i * 0.08} className="grid gap-4 py-8 md:grid-cols-[80px_1fr_1fr] md:gap-10">
              <span className="text-base text-muted-foreground">{pad(i + 1)}</span>
              <h3 className="text-row">{b.title}</h3>
              <p className="text-lg text-muted-foreground">{b.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Step that brightens when it reaches the reading line. */
function BrightStep({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  return (
    <div ref={ref} className={`transition-colors duration-500 ${inView || reduce ? "text-foreground" : "text-muted-foreground"} ${className}`}>
      {children}
    </div>
  );
}

export function GrowthFeature() {
  const steps = [
    ["Audit", "We go through your website, Google Business Profile, social pages and any ads you run, and note what is working and what is not."],
    ["Roadmap", "You get a short written plan: what to fix first, which channels to focus on and how to tell if it is working."],
    ["Advisory", "A monthly call to review results, answer questions and adjust the plan."],
  ];
  const listRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 80%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  return (
    <Section inverted>
      <div className="grid gap-14 lg:grid-cols-2">
        <Reveal>
          <Eyebrow className="text-brand">Growth Consulting</Eyebrow>
          <h2 className="mt-6 text-heading">We show you how to grow, then help you do it.</h2>
          <p className="mt-8 max-w-lg text-lg text-muted-foreground">Most agencies hand over a website and move on. We sit with you, look at everything you do online and tell you plainly where your time and money should go next.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ConsultButton message={messages.growth} />
            <Link to="/services/$slug" params={{ slug: "growth-consulting" }} className="pill">Explore</Link>
          </div>
        </Reveal>
        <ol ref={listRef} className="relative border-b border-border">
          {/* Scroll progress line down the left edge */}
          <motion.span
            aria-hidden
            className="absolute bottom-0 left-0 top-0 w-px origin-top bg-brand"
            style={reduce ? { opacity: 0.4 } : { scaleY: progress }}
          />
          {steps.map(([t, b], i) => (
            <li key={t} className="border-t border-border">
              <BrightStep className="grid grid-cols-[60px_1fr] gap-4 py-8 pl-5">
                <span className="text-base text-brand">{pad(i + 1)}</span>
                <div><h3 className="text-row">{t}</h3><p className="mt-3 text-lg text-muted-foreground">{b}</p></div>
              </BrightStep>
            </li>
          ))}
        </ol>
      </div>
      {/* REPLACE: temporary Unsplash placeholder, swap for a real blurred analytics screenshot */}
      <div className="mt-14 hidden md:block"><ImageSlot slot={images.growth} alt="Analytics charts" ratio="16 / 10" /></div>
    </Section>
  );
}

export function Different() {
  return (
    <Section>
      <Reveal className="mb-12 md:mb-16">
        <Eyebrow>Why WebZaura</Eyebrow>
        <h2 className="mt-6 max-w-4xl text-heading">How we work differently.</h2>
      </Reveal>
      <ol className="border-b border-border">
        {differentiators.map((d, i) => (
          <li key={d.title} className="border-t border-border">
            <Reveal delay={i * 0.08} className="grid gap-4 py-8 md:grid-cols-[80px_1fr_1fr] md:gap-10">
              <span className="text-base text-muted-foreground">{pad(i + 1)}</span>
              <h3 className="text-row">{d.title}</h3>
              <p className="text-lg text-muted-foreground">{d.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function ProjectCard({ p, headingLevel = 3 }: { p: (typeof projects)[number]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const svc = getServiceByName(p.service);
  const body = (
    <>
      {/* REPLACE: temporary Unsplash placeholder, swap for a real project screenshot */}
      <div className="rounded-lg border border-border p-2">
        <div className="mb-2 flex gap-1.5 px-1" aria-hidden><span className="h-2 w-2 rounded-full border border-border" /><span className="h-2 w-2 rounded-full border border-border" /><span className="h-2 w-2 rounded-full border border-border" /></div>
        <ImageSlot slot={projectImage(p.slug, "desktop")} alt={`${p.name} preview`} ratio="16 / 10" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{p.tag}</p>
      <Heading className="mt-1 text-row">{p.name}</Heading>
      <p className={`mt-2 text-lg ${svc?.color ?? "text-muted-foreground"}`}>{p.service}</p>
    </>
  );
  const cls = "project-card block rounded-lg bg-card p-4 md:p-6";
  return <Link to="/work/$slug" params={{ slug: p.slug }} className={`ghost-link ${cls}`}>{body}</Link>;
}

export function FeaturedWork() {
  if (projects.length === 0) return null;
  return (
    <Section>
      <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div><Eyebrow>Work</Eyebrow><h2 className="mt-6 text-heading">Recent projects.</h2></div>
        <Link to="/work" className="pill">View all work</Link>
      </Reveal>
      <div className="featured-work grid gap-6 md:grid-cols-2">{projects.slice(0, 4).map((p) => <ProjectCard key={p.slug} p={p} />)}</div>
    </Section>
  );
}

export function Process() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 85%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  return (
    <Section word="Process">
      <Reveal className="mb-12 md:mb-16">
        <Eyebrow>Process</Eyebrow>
        <h2 className="mt-6 max-w-4xl text-heading">Six steps, start to finish.</h2>
      </Reveal>
      <ol ref={listRef} className="compact-process relative grid border-t border-border sm:grid-cols-2 lg:grid-cols-6">
        {/* Scroll progress line across the top edge */}
        <motion.span
          aria-hidden
          className="absolute left-0 right-0 top-0 h-px origin-left bg-brand"
          style={reduce ? { opacity: 0.4 } : { scaleX: progress }}
        />
        {processSteps.map((s, i) => (
          <li key={s.title} className="border-b border-border sm:pr-6 lg:border-b-0 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
            <BrightStep className="process-step py-8">
              <span className="text-base text-muted-foreground">{pad(i + 1)}</span>
              <h3 className="mt-6 text-row">{s.title}</h3>
              <p className="mt-3 text-base text-muted-foreground">{s.body}</p>
            </BrightStep>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Testimonials() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const t = testimonials[i];
  if (!t) return null;
  const go = (d: number) => setI((i + d + testimonials.length) % testimonials.length);
  return (
    <Section>
      <Eyebrow>Testimonials</Eyebrow>
      <figure className="mt-10 min-h-[10rem] md:min-h-[16rem]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.blockquote
            key={t.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -300) go(1);
              else if (info.offset.x > 40 || info.velocity.x > 300) go(-1);
            }}
            className="max-w-5xl cursor-grab touch-pan-y text-row font-semibold leading-[1.25] active:cursor-grabbing"
          >
            "{t.quote}"
          </motion.blockquote>
        </AnimatePresence>
        <figcaption className="mt-8 text-lg text-muted-foreground">{t.name}</figcaption>
      </figure>
      <div className="mt-10 flex items-center gap-4">
        <Button variant="editorial" aria-label="Previous testimonial" onClick={() => go(-1)}>Previous</Button>
        <Button variant="editorial" aria-label="Next testimonial" onClick={() => go(1)}>Next</Button>
        <span className="text-base text-muted-foreground">{pad(i + 1)} / {pad(testimonials.length)}</span>
      </div>
    </Section>
  );
}
