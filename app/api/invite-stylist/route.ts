import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Sends a team-invite email to a stylist via Resend, same no-service-role
 * pattern as /api/send-email: the request carries the owner's own access
 * token, so every query below runs through a client authenticated as that
 * user — RLS is what actually confirms the stylist/membership row is theirs
 * to invite, this route just sends the email.
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

  let payload: { stylistId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { stylistId } = payload;
  if (!stylistId) {
    return NextResponse.json({ error: "Missing stylistId." }, { status: 400 });
  }

  // Confirm this stylist is actually this owner's, and pull their invite —
  // RLS means a mismatched id just comes back empty rather than someone
  // else's stylist.
  const { data: stylist } = await supabase.from("stylists").select("id, name, email").eq("id", stylistId).maybeSingle();
  if (!stylist) {
    return NextResponse.json({ error: "Stylist not found." }, { status: 404 });
  }
  if (!stylist.email) {
    return NextResponse.json({ error: "This stylist doesn't have an email on file yet." }, { status: 400 });
  }

  const { data: member } = await supabase
    .from("studio_members")
    .select("invite_token, status")
    .eq("stylist_id", stylistId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "No invite has been created for this stylist yet." }, { status: 404 });
  }
  if (member.status === "active") {
    return NextResponse.json({ error: "This stylist already has an active login." }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("studio_settings")
    .select("studio_name")
    .eq("studio_id", userData.user.id)
    .maybeSingle();
  const studioName = settings?.studio_name || "your studio";

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email sending isn't configured yet." }, { status: 501 });
  }

  const origin = req.headers.get("origin") || "https://vayled.com";
  const inviteLink = `${origin}/team-invite/${member.invite_token}`;
  const fromAddress = process.env.RESEND_FROM_EMAIL || "notifications@vayled.com";

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${studioName} <${fromAddress}>`,
      to: [stylist.email],
      subject: `You've been invited to join ${studioName} on Vayled`,
      text: `Hi ${stylist.name},\n\n${studioName} has invited you to join their team on Vayled, where you can see your own wedding schedule, your payout, and manage your trial notes.\n\nSet up your login here:\n${inviteLink}\n\nSee you there!`,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    return NextResponse.json({ error: `Resend error: ${errText}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
