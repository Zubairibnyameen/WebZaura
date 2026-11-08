import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, buildContactMessage, messages } from "@/lib/whatsapp";

describe("WhatsApp links", () => {
  it("uses the WebZaura WhatsApp number and encodes the message", () => {
    expect(buildWhatsAppLink(messages.general)).toBe(
      "https://wa.me/919068507572?text=Hi%20WebZaura%2C%20I%20would%20like%20to%20book%20a%20free%20consultation.",
    );
  });

  it("names the service in service-page messages", () => {
    expect(messages.service("App Development")).toBe(
      "Hi WebZaura, I would like to book a free consultation about App Development.",
    );
  });

  it("puts each contact field on its own line", () => {
    const m = buildContactMessage({ name: "Asha", email: "a@b.in", phone: "9999999999", service: "Web Development", type: "Business", message: "Need a site" });
    expect(m.split("\n")).toEqual([
      "Hi WebZaura, I am Asha.",
      "Email: a@b.in",
      "Phone: 9999999999",
      "Service: Web Development",
      "Type: Business",
      "Message: Need a site",
    ]);
  });
});
