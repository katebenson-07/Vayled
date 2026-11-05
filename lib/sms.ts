/**
 * Shared helpers for appointment texts. No browser or database imports, so it
 * works in API routes and on the Settings page alike.
 */

export const DEFAULT_CONFIRM_TEMPLATE =
  "Hi {bride_name}! Your {title} with {studio_name} is booked for {date} at {time}. Location: {location}. Reply with any questions.";

export const DEFAULT_REMINDER_TEMPLATE =
  "Hi {bride_name}! A reminder that your {title} with {studio_name} is tomorrow, {date} at {time}. Location: {location}.";

export const DEFAULT_FEEDBACK_TEMPLATE =
  "Hi {bride_name}! Thank you for coming in for your preview with {studio_name}. We would love your feedback on your look: {feedback_link}";

/** Merge fields a studio can use in either message. */
export const SMS_FIELDS = ["{bride_name}", "{title}", "{date}", "{time}", "{location}", "{studio_name}", "{studio_phone}"];

export interface SmsContext {
  bride_name: string;
  title: string;
  /** yyyy-mm-dd */
  date: string;
  /** HH:MM or HH:MM:SS, or null */
  time: string | null;
  location: string | null;
  studio_name: string | null;
  studio_phone: string | null;
  feedback_link?: string;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function prettyTime(t: string | null): string {
  if (!t) return "the time we discussed";
  const [hh, mm] = t.split(":").map(Number);
  if (Number.isNaN(hh)) return t;
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm ?? 0).padStart(2, "0")} ${ampm}`;
}

/** Fills the {merge_fields}. Missing values become sensible text, never "null". */
export function fillTemplate(template: string, ctx: SmsContext): string {
  const values: Record<string, string> = {
    bride_name: ctx.bride_name.split(" ")[0] || "there",
    title: ctx.title,
    date: prettyDate(ctx.date),
    time: prettyTime(ctx.time),
    location: ctx.location?.trim() || "to be confirmed",
    studio_name: ctx.studio_name?.trim() || "your stylist",
    studio_phone: ctx.studio_phone?.trim() || "",
    feedback_link: ctx.feedback_link ?? "",
  };
  return template
    .replace(/\{(\w+)\}/g, (m, key) => (key in values ? values[key] : m))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** The reminder is the template plus whatever extra info the studio always wants to include. */
export function buildReminder(template: string, extra: string, ctx: SmsContext): string {
  const base = fillTemplate(template, ctx);
  const more = extra.trim() ? fillTemplate(extra, ctx) : "";
  return more ? `${base}\n\n${more}` : base;
}

/** US numbers to E.164. Returns null if it doesn't look like a real number. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Sends one text through Twilio. Returns an error string, or null on success. */
export async function sendViaTwilio(to: string, body: string): Promise<string | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return "not_configured";
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) {
    const detail = await res.text();
    return `Twilio error ${res.status}: ${detail.slice(0, 200)}`;
  }
  return null;
}
