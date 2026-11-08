export type Service = {
  slug: string;
  name: string;
  headline: string;
  summary: string;
  /** Text color class for this service's label. Keep literal so Tailwind keeps it. */
  color: string;
  featured?: boolean;
  included: string[];
  forWho: string;
  approach: string;
  outcome: string;
};

export const services: Service[] = [
  {
    slug: "web-development",
    name: "Web Development",
    color: "text-svc-web",
    headline: "Websites built to perform.",
    summary: "Fast, mobile-first websites that load quickly on any phone and make it easy for customers to call or message you.",
    included: ["Custom design and development", "Mobile-first builds that work on budget phones", "On-page SEO and Google Business Profile setup", "Contact forms, WhatsApp buttons and integrations", "Domain, hosting and launch support"],
    forWho: "Shops, clinics, coaching centres, startups and service businesses that need a website customers trust.",
    approach: "We plan the pages around what your customers ask most, design each screen for clarity, then build it to load fast on slow networks.",
    outcome: "A quick, credible website that shows up on Google and brings in calls and WhatsApp enquiries.",
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    color: "text-svc-marketing",
    headline: "Marketing you can measure.",
    summary: "SEO, Google and Meta ads, email and WhatsApp campaigns, planned around the customers you want and tracked every month.",
    included: ["Local and national SEO", "Google Ads and Meta Ads management", "Email and WhatsApp campaigns", "Content planning", "A plain monthly report"],
    forWho: "Businesses ready to spend on marketing and wanting to know exactly what each rupee brings back.",
    approach: "We research how your customers search, in English, Hindi and Hinglish, launch small focused campaigns and put more behind what works.",
    outcome: "More enquiries from the right people, and a monthly report you can read in five minutes.",
  },
  {
    slug: "social-media-management",
    name: "Social Media Management",
    color: "text-svc-social",
    headline: "A social presence that stays consistent.",
    summary: "Posts, Reels and replies handled for you, with a calendar planned around your business and Indian festivals.",
    included: ["Platform plan and content calendar", "Posts, carousels and Reels", "Replies to comments and messages", "Targeted social ads", "Monthly performance notes"],
    forWho: "Owners who know they should post regularly but do not have the time to do it well.",
    approach: "We agree on your tone, plan a month of content at a time, publish on schedule and adjust based on what your audience responds to.",
    outcome: "A recognisable brand on Instagram and Facebook, and more people messaging you from it.",
  },
  {
    slug: "ui-ux-graphic-design",
    name: "UI/UX & Graphic Design",
    color: "text-svc-design",
    headline: "Design that makes sense to your customers.",
    summary: "Interfaces, logos, brand identity and marketing creatives that look professional and are easy to use.",
    included: ["UI/UX for websites and apps", "Logo and brand identity", "Marketing creatives and festival posts", "Design systems", "Clickable prototypes"],
    forWho: "Founders and teams whose product or brand looks dated, inconsistent or confusing.",
    approach: "We start with who uses it and why, try a few directions with you, then refine one into a consistent visual system.",
    outcome: "A brand people remember and screens people can use without help.",
  },
  {
    slug: "ai-chatbot-integration",
    name: "AI Chatbot Integration",
    color: "text-svc-ai",
    headline: "Answer customers at any hour.",
    summary: "AI assistants on your website, WhatsApp and Instagram that reply to common questions and collect leads while you sleep.",
    included: ["Website chat assistants", "WhatsApp Business API bots", "Instagram and Messenger bots", "Lead capture and handoff to your team", "Hindi and regional language replies"],
    forWho: "Businesses that get the same questions every day or miss enquiries after hours.",
    approach: "We list your most common questions, train the assistant on your business, connect it to your tools and improve it from real chats.",
    outcome: "Instant replies, fewer missed leads and more time for your team.",
  },
  {
    slug: "app-development",
    name: "App Development",
    color: "text-svc-app",
    headline: "Apps people keep using.",
    summary: "iOS and Android apps with UPI payments and simple screens, built for real users and ready to grow.",
    included: ["iOS and Android apps", "UX research and design", "UPI and card payments", "Admin dashboards and APIs", "Store launch and maintenance"],
    forWho: "Startups and businesses ready to give customers a dedicated app.",
    approach: "We test the core idea first, design the main flows, build in short rounds and launch with analytics in place.",
    outcome: "A reliable app your customers open again and again.",
  },
  {
    slug: "growth-consulting",
    name: "Growth Consulting",
    color: "text-svc-growth",
    headline: "How to grow your business online.",
    summary: "We look at everything you do online today, tell you plainly what to fix first, and stay with you while you do it.",
    featured: true,
    included: ["Audit of your website, Google listing, social pages and ads", "A prioritised growth roadmap", "Advice on enquiries and conversions", "Which channels to focus on, and which to drop", "Monthly advisory calls"],
    forWho: "Owners who know they should be growing online but are not sure where to start or what to fix first.",
    approach: "We audit what you have, pick the few changes that matter most, hand you a written roadmap and review progress with you every month.",
    outcome: "A clear plan, fewer wasted experiments and steady progress you can see.",
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
export const getServiceByName = (name: string) => services.find((s) => s.name === name);
