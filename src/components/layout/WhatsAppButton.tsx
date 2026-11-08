import { buildWhatsAppLink, external, messages } from "@/lib/whatsapp";

export function WhatsAppButton() {
  return (
    <aside aria-label="WhatsApp contact"><a
      href={buildWhatsAppLink(messages.general)}
      {...external}
      aria-label="Chat with WebZaura on WhatsApp (opens in a new tab)"
      className="pill fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 bg-background px-5 py-3 text-base"
    >
      WhatsApp
    </a></aside>
  );
}
