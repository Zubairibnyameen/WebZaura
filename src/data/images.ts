// Every image slot on the site. Files live in src/assets/images with the exact slot filename.
// Missing files resolve to undefined, and ImageSlot shows a labelled placeholder instead.
const files = import.meta.glob("../assets/images/*.webp", { eager: true, import: "default" }) as Record<string, string>;

export type SlotInfo = { file: string; size: string; src?: string | undefined };

export function slot(file: string, size: string): SlotInfo {
  return { file, size, src: files[`../assets/images/${file}`] };
}

// REPLACE: all current files are temporary Unsplash placeholders (Unsplash License).
// Swap each file in src/assets/images for a real screenshot or photo, keeping the filename.
export const images = {
  // REPLACE: placeholder by Jakub Zerdzicki (Unsplash). Swap for a mockup of real sites we built.
  hero: slot("home-hero-showcase.webp", "2400x1000"),
  // REPLACE: placeholder by Deng Xiang (Unsplash). Swap for a real, blurred analytics screenshot.
  growth: slot("growth-consulting-analytics.webp", "1600x1000"),
  // REPLACE: placeholder by Annie Spratt (Unsplash). Swap for a photo of our own workspace.
  workspace: slot("about-workspace.webp", "1800x1200"),
  // Founder photo: not supplied yet, shows a placeholder.
  founder: slot("founder-zubair.webp", "1200x1500"),
};

// REPLACE: service images are Unsplash placeholders:
// web-development Mohammad Rahmani, digital-marketing Luke Chesser, social-media-management Berke Citak,
// ui-ux-graphic-design Amelie Mourichon, ai-chatbot-integration Adem Ay, app-development Jay Openiano,
// growth-consulting Startae Team.
export const serviceImage = (slug: string) => slot(`service-${slug}.webp`, "1600x1200");

// REPLACE: project desktop images are Unsplash placeholders:
// webzaura Ostudio, brew-and-co Clement Proust, learnly Scott Graham, kapda-ghar Luca A.
export const projectImage = (slug: string, kind: "desktop" | "mobile") =>
  slot(`project-${slug}-${kind}.webp`, kind === "desktop" ? "1600x1000" : "900x1950");
