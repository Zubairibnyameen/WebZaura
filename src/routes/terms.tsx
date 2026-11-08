import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/sections/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "/terms" }],
    meta: [{ property: "og:url", content: "/terms" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Terms of Service | WebZaura" },
      { name: "description", content: "The terms for using the WebZaura website and working with WebZaura on a project." },
      { property: "og:title", content: "Terms of Service | WebZaura" },
      { property: "og:description", content: "Terms for using WebZaura's website and services." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms of Service"
      updated="October 2026"
      sections={[
        ["Using this website", "The content on this website is general information about our services. It may change without notice and is not a binding offer."],
        ["Consultations", "The first consultation is free and comes with no obligation. Advice given on a call is general until it is written into an agreed proposal."],
        ["Proposals and scope", "Every project starts with a written proposal that sets out the scope, timeline, payment milestones and deliverables. Work outside that scope is agreed separately in writing, usually over email or WhatsApp."],
        ["Your responsibilities", "You provide content, logins and approvals on time, and confirm you have the right to use any text, photos or logos you give us."],
        ["Payments", "Payments are made by bank transfer or UPI according to the milestones in your proposal. Work may pause if a milestone payment is overdue."],
        ["Ownership", "Once the project is fully paid, you own the final deliverables described in the proposal. We may show the work in our portfolio unless you ask us not to."],
        ["Third-party services", "Hosting, domains, WhatsApp, Google, Meta and payment gateways are run by other companies under their own terms. We are not responsible for their outages or policy changes."],
        ["Liability", "We take care in our work, but we are not liable for indirect losses such as lost profits. Our total liability for a project is limited to the amount paid for it."],
        ["Governing law", "These terms are governed by the laws of India, with courts in Delhi having jurisdiction."],
        ["Contact", "Questions about these terms? Email webzaura@gmail.com."],
      ]}
    />
  ),
});
