export type Faq = { q: string; a: string };
export type FaqGroup = { category: string; items: Faq[] };

const proposal =
  "Every project is different, so we scope it around your goals. After a free consultation we send you a custom proposal. There is no obligation.";

export const faqGroups: FaqGroup[] = [
  {
    category: "General",
    items: [
      { q: "How much does a project cost?", a: proposal },
      { q: "What is Growth Consulting?", a: "We review your website, Google Business Profile, social pages and ads, then give you a written plan of what to fix first. After that we check in every month to review results and adjust the plan." },
      { q: "Do you work with businesses outside Delhi?", a: "Yes. We are based in Delhi and work with clients across India over calls, WhatsApp and shared documents." },
      { q: "How long does a project take?", a: "A business website usually takes two to four weeks. Apps and larger platforms take longer. We agree on a timeline before we start." },
      { q: "Is my data safe with you?", a: "We collect only what we need, store it securely, sign an NDA when you ask, and follow India's Digital Personal Data Protection Act." },
    ],
  },
  {
    category: "Web",
    items: [
      { q: "Can you help with domain and hosting?", a: "Yes. We help you pick and register a domain, set up hosting, business email and SSL, and handle the technical setup." },
      { q: "Will my website show up in local Google searches?", a: "We set up on-page SEO, your Google Business Profile, fast mobile pages and location pages so you appear when people nearby search for what you offer." },
      { q: "Can my website be in Hindi or a regional language?", a: "Yes. We build bilingual or multilingual sites with proper fonts so the content reads naturally and ranks in each language." },
      { q: "Will it work in smaller cities with slower internet?", a: "Yes. We keep pages light so they open quickly on slower networks and budget phones." },
      { q: "Can you add UPI or QR payments?", a: "Yes. We connect trusted payment gateways that support UPI, QR codes, cards and net banking." },
      { q: "How secure will my website be?", a: "We use SSL, secure hosting, regular updates, backups and protected forms." },
      { q: "Can you make festival designs?", a: "Yes. We make Diwali, Holi, Eid, Christmas and other seasonal banners, pages and posts, ready in time for your campaign." },
    ],
  },
  {
    category: "Marketing",
    items: [
      { q: "Do you run Google Ads for Indian keywords?", a: "Yes. We research the English, Hindi and Hinglish phrases your customers actually type, and build campaigns around them." },
      { q: "How do I know the marketing is working?", a: "Every month you get a short report on traffic, enquiries and cost per enquiry, with notes on what we will change next." },
      { q: "Do you make Reels and short videos?", a: "Yes. We plan, script and edit Reels and short videos for Instagram, Facebook and YouTube." },
      { q: "Can you set up the WhatsApp Business API?", a: "Yes. We set up the official WhatsApp Business API with a verified profile, message templates, broadcasts and chatbots." },
      { q: "Can you write content in Hindi?", a: "Yes. We write posts, ads and blog articles in Hindi and other regional languages." },
    ],
  },
  {
    category: "Payments and Support",
    items: [
      { q: "How is the project scoped?", a: proposal },
      { q: "How can I pay?", a: "Bank transfer and UPI. Payment milestones are written clearly in your proposal." },
      { q: "Do you offer support after launch?", a: "Yes. We offer ongoing maintenance, updates and monitoring so your website or app keeps running smoothly." },
      { q: "What if I need an urgent fix after hours?", a: "Message us on WhatsApp. For support clients we handle urgent fixes in the evening and on weekends when needed." },
    ],
  },
];

export const homeFaqs: Faq[] = [
  faqGroups[0]!.items[1]!,
  faqGroups[0]!.items[0]!,
  faqGroups[1]!.items[1]!,
  faqGroups[2]!.items[1]!,
  faqGroups[3]!.items[2]!,
];
