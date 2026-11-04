import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CONFIRM_TEMPLATE, fillTemplate, sendViaTwilio, toE164 } from "@/lib/sms";

/**
 * Texts the bride that her appointment is booked. Runs as the signed-in
 * studio (RLS decides what they can read), same pattern as /api/send-email.
 * Returns 501 until Twilio keys are set so the app can say so gently.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const studioId = userData.user.id;

  let appointmentId: string | undefined;
  try {
    appointmentId = (await req.json()).appointmentId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!appointmentId) return NextResponse.json({ error: "Missing appointmentId." }, { status: 400 });

  const { data: appt } = await supabase.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (!appt.client_id) return NextResponse.json({ error: "No client on this appointment." }, { status: 400 });

  const [{ data: client }, { data: studio }, { data: sms }] = await Promise.all([
    supabase.from("clients").select("bride_name, phone, sms_consent").eq("id", appt.client_id).maybeSingle(),
    supabase.from("studio_settings").select("studio_name, contact_phone").eq("studio_id", studioId).maybeSingle(),
    supabase.from("sms_settings").select("*").eq("studio_id", studioId).maybeSingle(),
  ]);

  if (sms && sms.confirm_enabled === false) {
    return NextResponse.json({ skipped: "Confirmation texts are turned off in Settings." });
  }
  if (client?.sms_consent === false) {
    return NextResponse.json({ skipped: "This client didn't opt in to texts." });
  }
  const to = toE164(client?.phone);
  if (!client || !to) return NextResponse.json({ error: "This client has no valid phone number." }, { status: 400 });

  const body = fillTemplate(sms?.confirm_template ?? DEFAULT_CONFIRM_TEMPLATE, {
    bride_name: client.bride_name,
    title: appt.title,
    date: appt.appointment_date,
    time: appt.appointment_time,
    location: appt.location,
    studio_name: studio?.studio_name ?? null,
    studio_phone: studio?.contact_phone ?? null,
  });

  const err = await sendViaTwilio(to, body);
  if (err === "not_configured") return NextResponse.json({ error: "Text sending isn't set up yet." }, { status: 501 });
  if (err) return NextResponse.json({ error: err }, { status: 502 });

  await supabase.from("appointments").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", appointmentId);
  return NextResponse.json({ ok: true });
}
