export const WHATSAPP_NUMBER = "919068507572";

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const messages = {
  general: "Hi WebZaura, I would like to book a free consultation.",
  service: (name: string) => `Hi WebZaura, I would like to book a free consultation about ${name}.`,
  growth: "Hi WebZaura, I would like to book a free Growth Consulting session.",
};

export type ContactDetails = {
  name: string;
  email: string;
  phone: string;
  service: string;
  type: string;
  message: string;
};

export function buildContactMessage(d: ContactDetails): string {
  return [
    `Hi WebZaura, I am ${d.name}.`,
    `Email: ${d.email}`,
    `Phone: ${d.phone}`,
    `Service: ${d.service}`,
    `Type: ${d.type}`,
    `Message: ${d.message}`,
  ].join("\n");
}

/** Shared props for every external WhatsApp link. */
export const external = { target: "_blank", rel: "noopener noreferrer" } as const;
