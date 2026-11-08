export type Project = {
  slug: string;
  name: string;
  /** Must match a Service.name, e.g. "Web Development". */
  service: string;
  tag: string;
  description: string;
  overview: string;
  built: string[];
  approach: string;
  url: string;
};

// Images come from src/assets/images/project-{slug}-desktop.webp (see src/data/images.ts).
// REPLACE: current desktop images are temporary Unsplash placeholders.
export const projects: Project[] = [
  {
    slug: "webzaura",
    name: "WebZaura",
    service: "Web Development",
    tag: "Our own site",
    description: "The website we built and maintain for ourselves.",
    overview: "Our own website is the clearest example of how we work: fast pages, plain language and one clear next step on every screen.",
    built: ["A multi-page website covering every service", "A contact form that opens WhatsApp with the details filled in", "Light and dark themes", "A blog and FAQ written in plain language"],
    approach: "We treated ourselves like a client: wrote the content first, designed for phones, kept the pages light and checked every word before launch.",
    url: "https://webzaura.vercel.app",
  },
  {
    slug: "brew-and-co",
    name: "Brew & Co",
    service: "Web Development",
    tag: "Concept project",
    description: "A neighbourhood cafe website with menu, location and WhatsApp ordering.",
    overview: "A concept project showing how a small cafe can take orders and table enquiries straight from its website, without paying commissions to delivery apps.",
    built: ["A one-page menu with photos and prices", "WhatsApp ordering with a prefilled message per item", "A location block with map and opening hours", "A Google Business Profile setup checklist"],
    approach: "We designed around the two things cafe visitors want most: the menu and the location. Everything else comes second.",
    url: "",
  },
  {
    slug: "learnly",
    name: "Learnly",
    service: "UI/UX & Graphic Design",
    tag: "Concept project",
    description: "A coaching institute landing page and brand kit.",
    overview: "A concept project for a coaching institute: a landing page that answers parents' questions and a brand kit that works across print and social.",
    built: ["A landing page structured around courses, teachers and results", "A logo, colour palette and type system", "Social post templates for admission season", "A brochure layout ready for print"],
    approach: "We started with the questions parents actually ask before enrolling, and built the page and brand around answering them quickly.",
    url: "",
  },
  {
    slug: "kapda-ghar",
    name: "Kapda Ghar",
    service: "Social Media Management",
    tag: "Concept project",
    description: "An Instagram content system for a small clothing store.",
    overview: "A concept project showing how a small clothing store can post consistently on Instagram without hiring a full-time content person.",
    built: ["A monthly content calendar planned around festivals and sales", "Reel and carousel templates the store can reuse", "A simple photo guide for shooting new stock on a phone", "Reply templates for common questions in comments and DMs"],
    approach: "We built a repeatable system instead of one-off posts, so the store can keep the account active with a few hours of work each week.",
    url: "",
  },
];

export const hasProjects = projects.length > 0;
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
