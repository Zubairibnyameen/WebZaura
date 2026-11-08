const FALLBACK_SITE_URL = "https://webzaura.vercel.app";

export function getSiteUrl(): string {
  const configured = typeof process !== "undefined" ? process.env["SITE_URL"] : undefined;
  return (configured?.trim() || FALLBACK_SITE_URL).replace(/\/+$/, "");
}
