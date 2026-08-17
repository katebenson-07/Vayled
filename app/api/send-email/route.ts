import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Sends a real email via Resend, on behalf of the signed-in studio.
 *
 * No service-role key is used here on purpose: the incoming request carries
 * the studio's own Supabase access token, and every query below runs through
 * a client authenticated as that user, so Postgres RLS is what actually
 * decides whether a booking/log row is theirs to touch — this route can't be
 * tricked into sending as, or logging against, a different studio.
 *
 * Returns 501 if RESEND_API_KEY isn't set yet, so the client can fall back
 * to the mailto flow instead of failing outright.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let payload: {
    to?: string;
    subject?: string;
    body?: string;
    replyTo?: string | null;
    fromName?: string | null;
    bookingId?: string;
    templateName?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, subject, body, replyTo, fromName, bookingId, templateName } = payload;
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing to/subject/body." }, { status: 400 });
  }

  // Confirm the booking is actually this studio's before logging against it —
  // RLS means a mismatched id just comes back empty rather than someone
  // else's row.
  if (bookingId) {
    const { data: booking } = await supabase.from("bookings").select("id").eq("id", bookingId).maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email sending isn't configured yet." }, { status: 501 });
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "notifications@vayled.com";
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      text: body,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    return NextResponse.json({ error: `Resend error: ${errText}` }, { status: 502 });
  }

  if (bookingId) {
    await supabase.from("sent_emails").insert({
      studio_id: userData.user.id,
      booking_id: bookingId,
      template_name: templateName ?? null,
      subject,
    });
  }

  return NextResponse.json({ ok: true });
}
