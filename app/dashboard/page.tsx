"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Payment, PartyMember, TrialSession, EmailTemplate, SentEmail } from "@/lib/types";
import { fetchInboxItems, InboxItem } from "@/lib/inbox";
import { buildMergeContext, applyTemplate } from "@/lib/merge";
import { DEFAULT_TEMPLATES } from "@/lib/emailTemplates";
import { sendEmail, openMailto } from "@/lib/sendEmail";
import {
  format,
  parseISO,
  isSameMonth,
  isBefore,
  isAfter,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  addDays,
  differenceInCalendarDays,
  formatDistanceToNowStrict,
} from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };
type TrialWithClient = TrialSession & { bookings: (Booking & { clients: Client | null }) | null };

const ACTIVITY_GLYPH: Record<InboxItem["type"], string> = {
  contract: "◆",
  payment: "$",
  inquiry: "·",
  trial: "✓",
};

function titleCase(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function DashboardContent() {
  const [greetingName, setGreetingName] = useState("there");
  const [studioName, setStudioName] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [trials, setTrials] = useState<TrialWithClient[]>([]);
  const [activity, setActivity] = useState<InboxItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [studioContactEmail, setStudioContactEmail] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const studio_id = userData.user?.id;
      if (userData.user) {
        const { data: profile } = await supabase
          .from("studio_settings")
          .select("studio_name, contact_email")
          .eq("studio_id", userData.user.id)
          .maybeSingle();
        setStudioName(profile?.studio_name ?? null);
        setStudioContactEmail(profile?.contact_email ?? null);
        const name = profile?.studio_name?.split(" ")[0] || userData.user.email?.split("@")[0] || "there";
        setGreetingName(titleCase(name));
      }

      const [
        { data: bookingData },
        { data: paymentData },
        { data: memberData },
        { data: trialData },
        inboxItems,
        { data: templateData },
        { data: sentEmailData },
      ] = await Promise.all([
        supabase.from("bookings").select("*, clients(*)").neq("status", "cancelled"),
        supabase.from("payments").select("*"),
        supabase.from("party_members").select("*"),
        supabase
          .from("trial_sessions")
          .select("*, bookings(*, clients(*))")
          .order("session_date", { ascending: true }),
        fetchInboxItems(),
        supabase.from("email_templates").select("*").order("created_at"),
        supabase.from("sent_emails").select("*"),
      ]);

      setBookings((bookingData as BookingWithClient[]) ?? []);
      setPayments((paymentData as Payment[]) ?? []);
      setMembers((memberData as PartyMember[]) ?? []);
      setTrials((trialData as TrialWithClient[]) ?? []);
      setActivity(inboxItems.slice(0, 4));
      setSentEmails((sentEmailData as SentEmail[]) ?? []);

      // Seeded lazily (same defaults as the Emails page) so reminder "Send"
      // buttons always have a template to look up, even if this is the first
      // page the studio has ever loaded.
      if (!templateData || templateData.length === 0) {
        const { data: inserted } = await supabase
          .from("email_templates")
          .insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, studio_id })))
          .select();
        setTemplates((inserted as EmailTemplate[]) ?? []);
      } else {
        setTemplates(templateData as EmailTemplate[]);
      }

      setLoading(false);
    }
    load();
  }, []);

  function balanceFor(b: BookingWithClient) {
    const paid = payments.filter((p) => p.booking_id === b.id).reduce((sum, p) => sum + Number(p.amount), 0);
    return Number(b.contract_total) - paid;
  }

  function partySummary(bookingId: string) {
    const party = members.filter((m) => m.booking_id === bookingId);
    if (party.length === 0) return "Party of 1";
    const hasHair = party.some((m) => m.hair);
    const hasMakeup = party.some((m) => m.makeup);
    const service = hasHair && hasMakeup ? "Hair + Makeup" : hasHair ? "Hair only" : hasMakeup ? "Makeup only" : "";
    return [`Party of ${party.length}`, service].filter(Boolean).join(" · ");
  }

  /** One-click send from a Reminders row — same send-and-log flow as the
   *  Emails page (real send via Resend once configured, mailto fallback
   *  until then), just triggered right from the Dashboard so a reminder
   *  never needs a second trip to /emails first. */
  async function sendReminderEmail(booking: BookingWithClient, templateName: string) {
    const template = templates.find((t) => t.name === templateName);
    if (!template || !booking.clients) return;
    const balance = balanceFor(booking);
    const context = buildMergeContext(booking.clients, booking, balance, studioName);
    const subject = applyTemplate(template.subject, context);
    const body = applyTemplate(template.body, context);
    const to = booking.clients.email ?? "";

    setReminderStatus(null);
    const result = await sendEmail({
      to,
      subject,
      body,
      replyTo: studioContactEmail,
      fromName: studioName,
      bookingId: booking.id,
      templateName: template.name,
    });

    if (result.ok) {
      setReminderStatus(`Sent to ${booking.clients.bride_name} ✓`);
      // Full refetch (not scoped to this booking) since sentEmails here also
      // drives de-duplication for every other reminder on the dashboard.
      const { data } = await supabase.from("sent_emails").select("*");
      setSentEmails((data as SentEmail[]) ?? []);
      return;
    }

    if (result.reason === "not_configured") {
      openMailto(to, subject, body);
      const { data: userData } = await supabase.auth.getUser();
      const studio_id = userData.user?.id;
      const { data: logged } = await supabase
        .from("sent_emails")
        .insert({ studio_id, booking_id: booking.id, template_name: template.name, subject })
        .select()
        .single();
      if (logged) setSentEmails((prev) => [logged as SentEmail, ...prev]);
      return;
    }

    setReminderStatus(`Couldn't send: ${result.message ?? "unknown error"}`);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const now = new Date();
  const today = startOfDay(now);
  const weekOut = addDays(today, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const revenueMTD = payments
    .filter((p) => {
      const d = parseISO(p.paid_at);
      return !isBefore(d, monthStart) && !isAfter(d, monthEnd);
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const revenueLastMonth = payments
    .filter((p) => {
      const d = parseISO(p.paid_at);
      return !isBefore(d, lastMonthStart) && !isAfter(d, lastMonthEnd);
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const revenueDelta =
    revenueLastMonth > 0 ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100) : null;

  const bookingsThisMonth = bookings.filter(
    (b) => b.clients?.wedding_date && isSameMonth(parseISO(b.clients.wedding_date), now)
  );

  const upcomingWeddings = bookings.filter((b) => {
    if (!b.clients?.wedding_date) return false;
    const d = parseISO(b.clients.wedding_date);
    return !isBefore(d, today) && !isAfter(d, weekOut);
  });

  const upcomingTrials = trials.filter((t) => {
    if (!t.session_date || t.completed) return false;
    const d = parseISO(t.session_date);
    return !isBefore(d, today) && !isAfter(d, weekOut);
  });

  const scheduledTrials = trials.filter((t) => t.session_date && !t.completed && !isBefore(parseISO(t.session_date), today));
  const nextTrial = scheduledTrials[0];

  const unpaidBookings = bookings.filter((b) => balanceFor(b) > 0);
  const unpaidBalance = unpaidBookings.reduce((sum, b) => sum + balanceFor(b), 0);

  type Reminder = {
    id: string;
    name: string;
    message: string;
    urgent: boolean;
  } & ({ kind: "send"; onSend: () => void } | { kind: "link"; href: string; actionLabel: string });

  // Balance/invoice reminders — flagged once the booking's configured balance
  // due date (default 7 days before the wedding, same as the invoice's own
  // default) is within the next week or has passed, and skipped if a
  // reminder already went out in the last 5 days so it doesn't nag daily.
  const invoiceReminders: Reminder[] = bookings
    .filter((b) => b.status === "booked" && b.clients?.wedding_date)
    .map((b): Reminder | null => {
      const balance = balanceFor(b);
      if (balance <= 0) return null;
      const weddingDate = parseISO(b.clients!.wedding_date!);
      if (isBefore(weddingDate, today)) return null;
      const rule = b.invoice_settings?.balance_due_rule;
      const dueDate =
        rule?.mode === "date" && rule.date ? parseISO(rule.date) : subDays(weddingDate, rule?.days_before ?? 7);
      const daysUntilDue = differenceInCalendarDays(dueDate, today);
      if (daysUntilDue > 7) return null;
      const recentlySent = sentEmails.some(
        (s) =>
          s.booking_id === b.id &&
          s.template_name === "Balance due reminder" &&
          differenceInCalendarDays(today, parseISO(s.sent_at)) < 5
      );
      if (recentlySent) return null;
      return {
        id: `invoice-${b.id}`,
        name: b.clients?.bride_name ?? "Unknown",
        message:
          daysUntilDue <= 0
            ? `Balance of $${balance.toFixed(0)} is overdue`
            : `Balance of $${balance.toFixed(0)} due in ${daysUntilDue}d`,
        urgent: daysUntilDue <= 0,
        kind: "send",
        onSend: () => sendReminderEmail(b, "Balance due reminder"),
      };
    })
    .filter((r): r is Reminder => r !== null);

  // Book-a-preview reminders — any booked wedding with no trial session
  // scheduled yet. Action links straight to that booking's Trial page to
  // enter a date, since the fix here happens in Vayled, not by email.
  const scheduledTrialBookingIds = new Set(trials.filter((t) => t.session_date).map((t) => t.booking_id));
  const trialBookingReminders: Reminder[] = bookings
    .filter((b) => b.status === "booked" && !scheduledTrialBookingIds.has(b.id))
    .map((b) => ({
      id: `trial-book-${b.id}`,
      name: b.clients?.bride_name ?? "Unknown",
      message: "No preview booked yet",
      urgent: false,
      kind: "link" as const,
      href: `/trials/${b.id}`,
      actionLabel: "Schedule",
    }));

  // Pre-trial questionnaire reminders — trial is tomorrow and the
  // questionnaire hasn't already gone out for it.
  const questionnaireReminders: Reminder[] = trials
    .filter((t) => t.session_date && !t.completed && differenceInCalendarDays(parseISO(t.session_date), today) === 1)
    .filter((t) => !sentEmails.some((s) => s.booking_id === t.booking_id && s.template_name === "Preview prep questionnaire"))
    .map((t) => ({
      id: `quest-${t.id}`,
      name: t.bookings?.clients?.bride_name ?? "Client",
      message: "Preview is tomorrow — send the prep questionnaire",
      urgent: true,
      kind: "send" as const,
      onSend: () => t.bookings && sendReminderEmail(t.bookings, "Preview prep questionnaire"),
    }));

  const reminders = [...questionnaireReminders, ...invoiceReminders, ...trialBookingReminders];

  type FeedRow = {
    id: string;
    date: Date;
    name: string;
    tag: "WEDDING DAY" | "PREVIEW";
    subtitle: string;
    amount: number;
    href: string;
  };

  const feed: FeedRow[] = [
    ...upcomingWeddings.map((b) => ({
      id: `w-${b.id}`,
      date: parseISO(b.clients!.wedding_date!),
      name: b.clients?.bride_name ?? "Unknown",
      tag: "WEDDING DAY" as const,
      subtitle: [b.clients?.venue, partySummary(b.id)].filter(Boolean).join(" · "),
      amount: Number(b.contract_total),
      href: `/bookings/${b.id}`,
    })),
    ...upcomingTrials.map((t) => ({
      id: `t-${t.id}`,
      date: parseISO(t.session_date!),
      name: t.bookings?.clients?.bride_name ?? "Client",
      tag: "PREVIEW" as const,
      subtitle: [t.location || "On location", "Party of 1", "Hair + Makeup"].filter(Boolean).join(" · "),
      amount: Number(t.fee),
      href: `/trials/${t.booking_id}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-8">
      <Logo size="lg" tagline className="text-charcoal" />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-script text-3xl md:text-4xl leading-tight mb-1">
            {greeting}, {greetingName}
          </h1>
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">{format(now, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Link
          href="/clients"
          className="bg-charcoal text-ivory rounded-md px-5 py-2.5 text-sm uppercase tracking-wide hover:opacity-90"
        >
          + New booking
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Revenue MTD</p>
          <p className="font-serif text-3xl">${revenueMTD.toFixed(0)}</p>
          <p className="text-xs text-charcoal/50 mt-1">
            {revenueDelta === null ? "First tracked month" : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}% vs last month`}
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Bookings this month</p>
          <p className="font-serif text-3xl">{bookingsThisMonth.length}</p>
          <p className="text-xs text-charcoal/50 mt-1">{upcomingWeddings.length} upcoming this week</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Previews scheduled</p>
          <p className="font-serif text-3xl">{scheduledTrials.length}</p>
          <p className="text-xs text-charcoal/50 mt-1">
            {nextTrial?.session_date ? `Next: ${format(parseISO(nextTrial.session_date), "MMM d")}` : "None scheduled"}
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Unpaid balance</p>
          <p className="font-serif text-3xl">${unpaidBalance.toFixed(0)}</p>
          <p className="text-xs text-charcoal/50 mt-1">
            {unpaidBookings.length} invoice{unpaidBookings.length === 1 ? "" : "s"} pending
          </p>
        </div>
      </div>

      {reminders.length > 0 && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Reminders</h2>
          {reminderStatus && <p className="text-xs text-charcoal/70 mb-3">{reminderStatus}</p>}
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 border-b border-charcoal/10 pb-2 last:border-b-0 last:pb-0 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className={`text-xs truncate ${r.urgent ? "text-red-600" : "text-charcoal/60"}`}>{r.message}</p>
                </div>
                {r.kind === "send" ? (
                  <button
                    onClick={r.onSend}
                    className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs uppercase tracking-wide shrink-0 hover:bg-charcoal/90"
                  >
                    Send
                  </button>
                ) : (
                  <Link
                    href={r.href}
                    className="border border-charcoal/20 rounded-md px-3 py-1.5 text-xs uppercase tracking-wide shrink-0 hover:bg-ivory"
                  >
                    {r.actionLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Upcoming — next 7 days</h2>
            <Link href="/bookings" className="text-gold text-xs hover:underline">
              View all →
            </Link>
          </div>
          {feed.length === 0 ? (
            <p className="text-charcoal/60 text-sm">Nothing on the books in the next week.</p>
          ) : (
            <div className="divide-y divide-charcoal/10">
              {feed.slice(0, 6).map((row) => (
                <Link key={row.id} href={row.href} className="flex items-center gap-4 py-3 -mx-1 px-1 rounded hover:bg-white/40">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] uppercase tracking-wide text-charcoal/50">{format(row.date, "EEE")}</p>
                    <p className="font-serif text-xl leading-none">{format(row.date, "d")}</p>
                    <p className="text-[10px] uppercase tracking-wide text-charcoal/50">{format(row.date, "MMM")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{row.name}</p>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${
                          row.tag === "WEDDING DAY"
                            ? "bg-charcoal text-ivory"
                            : "border border-charcoal/30 text-charcoal/70"
                        }`}
                      >
                        {row.tag}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/60 truncate mt-0.5">{row.subtitle}</p>
                  </div>
                  <span className="text-sm font-medium shrink-0">${row.amount.toFixed(0)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/clients/new" className="border border-charcoal/20 rounded-md px-3 py-3 hover:bg-white/40">
                + New client
              </Link>
              <Link href="/contracts" className="border border-charcoal/20 rounded-md px-3 py-3 hover:bg-white/40">
                + New contract
              </Link>
              <Link
                href={feed[0] ? feed[0].href.replace("/trials/", "/bookings/") : "/bookings"}
                className="border border-charcoal/20 rounded-md px-3 py-3 hover:bg-white/40"
              >
                + Build timeline
              </Link>
              <Link href="/expenses" className="border border-charcoal/20 rounded-md px-3 py-3 hover:bg-white/40">
                + Log expense
              </Link>
            </div>
          </section>

          <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="text-charcoal/60 text-sm">Nothing yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="text-gold shrink-0 mt-0.5">{ACTIVITY_GLYPH[item.type]}</span>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{item.title}</p>
                      <p className="text-charcoal/50 text-xs">
                        {item.name} · {formatDistanceToNowStrict(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
