/** Shared CRM labels and formatting (browser and server safe). */
export const LEAD_STATUSES = ["new", "contacted", "quoted", "negotiating", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", quoted: "Quoted", negotiating: "Negotiating", won: "Won", lost: "Lost",
  qualified: "Contacted", proposal_sent: "Quoted", negotiation: "Negotiating",
};

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

export const PAGE_SIZE = 25;

const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function inr(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "Not set";
  return inrFmt.format(Number(n));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** DD MMM YYYY, e.g. 05 Oct 2026. Date-only strings are read as calendar dates. */
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "Not set";
  let d: Date;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, day] = v.split("-").map(Number);
    return `${String(day).padStart(2, "0")} ${MONTHS[m! - 1]} ${y}`;
  }
  d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "Not set";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isOverdue(date: string | null | undefined, status?: string): boolean {
  if (!date || status === "won" || status === "lost") return false;
  return date < todayISO();
}

/** Strip characters that would break a PostgREST or() filter. */
export function cleanSearch(q: string | undefined): string {
  return (q ?? "").replace(/[,()*%\\:"']/g, " ").trim().slice(0, 80);
}

export const PROJECT_STATUSES = ["planning", "in_progress", "review", "completed", "on_hold"] as const;
export const PROJECT_STATUS_LABELS: Record<string, string> = { planning: "Planning", in_progress: "In progress", review: "Review", completed: "Completed", on_hold: "On hold" };
export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export const TASK_STATUS_LABELS: Record<string, string> = { todo: "To do", doing: "Doing", done: "Done" };
export const PAYMENT_METHODS = ["upi", "bank_transfer", "cash", "cheque", "card", "other"] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = { upi: "UPI", bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque", card: "Card", other: "Other" };
export const INVOICE_STATUS_LABELS: Record<string, string> = { unpaid: "Unpaid", partially_paid: "Partially paid", paid: "Paid", overdue: "Overdue" };

/** Display status: overdue when past due and not fully paid. */
export function invoiceStatus(inv: { payment_status: string; due_date: string | null }, today = todayISO()): string {
  if (inv.payment_status !== "paid" && inv.due_date && inv.due_date < today) return "overdue";
  return inv.payment_status;
}

/** Amount to invoice from an accepted quotation, before GST. */
export function invoiceBase(quoteTaxable: number, mode: "full" | "percent" | "custom", value: number): number {
  const r = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  if (mode === "full") return r(quoteTaxable);
  if (mode === "percent") return r((quoteTaxable * Math.min(Math.max(value, 0), 100)) / 100);
  return r(Math.max(value, 0));
}

export const ALLOWED_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "text/plain": "txt", "text/csv": "csv",
  "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt", "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Extract @mentions of known teammates from comment text. */
export function extractMentions(body: string, team: { id: string; handle: string }[]): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/@([\p{L}\p{N}._-]+)/gu)) {
    const t = team.find((x) => x.handle.toLowerCase() === m[1]!.toLowerCase());
    if (t) found.add(t.id);
  }
  return [...found];
}
export const handleOf = (p: { full_name?: string | null; email?: string | null }) =>
  ((p.full_name || p.email || "user").split(/[\s@]/)[0] ?? "user").toLowerCase();
