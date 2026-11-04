import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildReminder, DEFAULT_REMINDER_TEMPLATE, sendViaTwilio, toE164 } from "@/lib/sms";

/**
 * Daily job (see vercel.json). Texts every bride whose appointment is tomorrow
 * in her stylist's time zone. Uses the service-role key because it has to look
 * across all studios; protected by CRON_SECRET, which Vercel sends as a Bearer
 * token on cron calls.
 */
export const dynamic = "force-dynamic";

function tomorrowIn(tz: string): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // en-CA formats as yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Missing service key." }, { status: 501 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey);

  // Only studios that have texts on. (Studios with no row use the defaults, so include them via a second pass.)
  const { data: settingsRows } = await db.from("sms_settings").select("*");
  const settingsByStudio = new Map((settingsRows ?? []).map((s) => [s.studio_id as string, s]));

  // Window wide enough to cover every US time zone; each row is rechecked below.
  const from = new Date(Date.now()).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: appts } = await db
    .from("appointments")
    .select("*")
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .in("status", ["confirmed", "pending"])
    .is("reminder_sent_at", null)
    .not("client_id", "is", null);

  let sent = 0;
  let failed = 0;
  for (const a of appts ?? []) {
    const s = settingsByStudio.get(a.studio_id);
    if (s && s.reminder_enabled === false) continue;
    const tz = s?.timezone ?? "America/Chicago";
    if (a.appointment_date !== tomorrowIn(tz)) continue;

    const [{ data: client }, { data: studio }] = await Promise.all([
      db.from("clients").select("bride_name, phone, sms_consent").eq("id", a.client_id).maybeSingle(),
      db.from("studio_settings").select("studio_name, contact_phone").eq("studio_id", a.studio_id).maybeSingle(),
    ]);
    if (client?.sms_consent === false) continue;
    const phone = toE164(client?.phone);
    if (!client || !phone) continue;

    const body = buildReminder(s?.reminder_template ?? DEFAULT_REMINDER_TEMPLATE, s?.reminder_extra ?? "", {
      bride_name: client.bride_name,
      title: a.title,
      date: a.appointment_date,
      time: a.appointment_time,
      location: a.location,
      studio_name: studio?.studio_name ?? null,
      studio_phone: studio?.contact_phone ?? null,
    });
    const err = await sendViaTwilio(phone, body);
    if (err === "not_configured") return NextResponse.json({ error: "Twilio not configured." }, { status: 501 });
    if (err) {
      failed++;
      continue;
    }
    await db.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id);
    sent++;
  }
  return NextResponse.json({ sent, failed });
}
