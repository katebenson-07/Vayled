import { supabase } from "./supabaseClient";

export interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
  /** Studio's own contact email, used as Reply-To so a bride's reply lands with the studio, not Vayled. */
  replyTo?: string | null;
  /** Studio name shown as the sender's display name. */
  fromName?: string | null;
  /** If set, logs a `sent_emails` row for this booking once the send succeeds. */
  bookingId?: string;
  templateName?: string;
}

export type SendEmailResult = { ok: true } | { ok: false; reason: "not_configured" | "error"; message?: string };

/**
 * Sends through /api/send-email (Resend) when the studio has an API key
 * configured on the server. If it isn't configured yet (RESEND_API_KEY
 * unset), falls back to the mailto flow so sending never breaks while
 * Resend setup is in progress.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, reason: "error", message: "Not signed in." };

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
    });
    if (res.status === 501) {
      return { ok: false, reason: "not_configured" };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: "error", message: data.error ?? `Request failed (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error", message: "Network error reaching the server." };
  }
}

/** Opens the studio's own email app pre-filled — the original fallback flow. */
export function openMailto(to: string, subject: string, body: string) {
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
