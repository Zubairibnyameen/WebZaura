export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  body: { heading?: string; text: string }[];
};


export const posts: Post[] = [
  {
    slug: "5-signs-your-website-is-costing-you-customers",
    title: "5 signs your website is quietly costing you customers",
    excerpt: "Slow pages, vague headlines and hidden contact details push visitors away. Here's how to spot and fix them.",
    date: "2026-09-12",
    readTime: "6 min read",
    category: "Web",
    body: [
      { text: "Most businesses don't lose customers because of their product. They lose them in the first five seconds on their website. Here are the five most common leaks we find in audits." },
      { heading: "1. It takes more than three seconds to load", text: "Over half of mobile visitors leave if a page is slow. Compress images, use modern hosting and measure with Google PageSpeed Insights." },
      { heading: "2. Your headline doesn't say what you do", text: "Clever taglines rarely beat clarity. Say who you help and how, in plain words, at the top of the page." },
      { heading: "3. There's no obvious next step", text: "Each page should have one clear call to action, such as a call, a WhatsApp chat or a booking, repeated where it makes sense." },
      { heading: "4. It wasn't designed for phones", text: "Most of your Indian audience browses on mobile. Tap targets, readable text and short forms matter more than desktop polish." },
      { heading: "5. There's no proof", text: "Reviews, client logos and real results build trust faster than any adjective. Show them early." },
    ],
  },
  {
    slug: "local-seo-guide-for-indian-small-businesses",
    title: "A practical local SEO guide for Indian small businesses",
    excerpt: "How to show up when customers in your city search for what you sell, in English, Hindi or both.",
    date: "2026-08-03",
    readTime: "8 min read",
    category: "Marketing",
    body: [
      { text: "Local search is the highest-intent traffic most businesses can get. Someone searching 'dentist near me' is ready to book today." },
      { heading: "Claim and complete your Google Business Profile", text: "Add accurate hours, categories, photos and a booking or WhatsApp link. Reply to every review." },
      { heading: "Create a page for each service and area", text: "A dedicated page for each service and for key localities helps Google match you to specific searches." },
      { heading: "Use the language your customers search in", text: "Many customers search in Hinglish or Hindi. Including natural regional phrasing can open up less competitive keywords." },
      { heading: "Earn local mentions", text: "Listings in trusted directories, local news and partner websites all signal that you're a real, established business." },
    ],
  },
  {
    slug: "why-every-business-needs-a-growth-plan",
    title: "Why every business needs a growth plan, not just a website",
    excerpt: "A website is a tool. A growth plan tells you how to use it, along with every other channel, to reach your goals.",
    date: "2026-07-01",
    readTime: "5 min read",
    category: "Growth",
    body: [
      { text: "We meet many owners who invested in a website, ran a few ads, posted on Instagram, and still don't know what's working. The missing piece is almost always a plan." },
      { heading: "Start with an honest audit", text: "List every channel you use, what it costs in time and effort, and what it brings back. Patterns appear quickly." },
      { heading: "Pick one or two priorities", text: "Doing everything at once spreads you thin. Choose the channels closest to your customers and go deep." },
      { heading: "Measure monthly, adjust quarterly", text: "Set a few simple metrics, such as enquiries, conversion rate and repeat customers, and review them regularly." },
      { heading: "Get an outside view", text: "This is exactly why we offer Growth Consulting: an experienced eye that turns scattered effort into compounding results." },
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
