import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/sections/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    links: [{ rel: "canonical", href: "/privacy" }],
    meta: [{ property: "og:url", content: "/privacy" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Privacy Policy | WebZaura" },
      { name: "description", content: "What information WebZaura collects through this website and WhatsApp, how we use it and how to ask us to delete it." },
      { property: "og:title", content: "Privacy Policy | WebZaura" },
      { property: "og:description", content: "How WebZaura handles your information." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      updated="October 2026"
      sections={[
        ["Who we are", "WebZaura is a digital agency based in Delhi, India. This policy covers this website and the conversations you start with us from it."],
        ["What the contact form collects", "Your name, email address, phone number, the service you are interested in, the type of organisation you are and your message. Nothing else."],
        ["How the form is sent", "When you submit the form, your details are saved securely as an enquiry for our team and placed into a WhatsApp message on your device. The WhatsApp message is not sent until you press send in WhatsApp. Once sent, that message is also handled under WhatsApp's own privacy policy."],
        ["WhatsApp, phone and email", "If you message, call or email us, we keep that conversation so we can reply, prepare a proposal and deliver the work. We will not add you to marketing broadcasts without asking first."],
        ["Cookies", "This website uses browser storage to remember your light or dark theme and whether the introduction has appeared this session. The private team area also uses storage for secure sign-in. We may use basic, privacy-friendly analytics to count visits. We do not use advertising cookies."],
        ["How we use your information", "Only to reply to you, give you a proposal and deliver the services you ask for. We never sell or rent your information."],
        ["How long we keep it", "Enquiries that do not become projects are deleted within 12 months. Client records are kept as long as needed for the project and for Indian tax and accounting rules."],
        ["Your rights", "Under India's Digital Personal Data Protection Act, 2023, you can ask to see, correct or delete the information we hold about you. Email us and we will respond within 30 days."],
        ["Contact", "For any privacy question, email webzaura@gmail.com."],
      ]}
    />
  ),
});
