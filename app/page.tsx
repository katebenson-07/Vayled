"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Payment, PartyMember, TrialSession } from "@/lib/types";
import { fetchInboxItems, InboxItem } from "@/lib/inbox";
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
  addDays,
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
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [trials, setTrials] = useState<TrialWithClient[]>([]);
  const [activity, setActivity] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiryLink, setInquiryLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setInquiryLink(`${window.location.origin}/inquire/${userData.user.id}`);
        const { data: profile } = await supabase
          .from("studio_settings")
          .select("studio_name")
          .eq("studio_id", userData.user.id)
          .maybeSingle();
        const name = profile?.studio_name?.split(" ")[0] || userData.user.email?.split("@")[0] || "there";
        setGreetingName(titleCase(name));
      }

      const [{ data: bookingData }, { data: paymentData }, { data: memberData }, { data: trialData }, inboxItems] =
        await Promise.all([
          supabase.from("bookings").select("*, clients(*)").neq("status", "cancelled"),
          supabase.from("payments").select("*"),
          supabase.from("party_members").select("*"),
          supabase
            .from("trial_sessions")
            .select("*, bookings(*, clients(*))")
            .order("session_date", { ascending: true }),
          fetchInboxItems(),
        ]);

      setBookings((bookingData as BookingWithClient[]) ?? []);
      setPayments((paymentData as Payment[]) ?? []);
      setMembers((memberData as PartyMember[]) ?? []);
      setTrials((trialData as TrialWithClient[]) ?? []);
      setActivity(inboxItems.slice(0, 4));
      setLoading(false);
    }
    load();
  }, []);

  function copyInquiryLink() {
    if (!inquiryLink) return;
    navigator.clipboard.writeText(inquiryLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const now = new Date();
  const today = startOfDay(now);
  const weekOut = addDays(today, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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

  type FeedRow = {
    id: string;
    date: Date;
    name: string;
    tag: "WEDDING DAY" | "TRIAL";
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
      tag: "TRIAL" as const,
      subtitle: [t.location || "On location", "Party of 1", "Hair + Makeup"].filter(Boolean).join(" · "),
      amount: Number(t.fee),
      href: `/trials/${t.booking_id}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl leading-tight mb-1">
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
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Trials scheduled</p>
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

      <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-1">Your public inquiry form</h2>
        <p className="text-charcoal/60 text-sm mb-3">
          Share this link on your website, Instagram bio, or anywhere brides find you. Anyone who fills it out shows up
          as a new inquiry — no account needed on their end.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <input
            readOnly
            value={inquiryLink ?? "Loading..."}
            onFocus={(e) => e.target.select()}
            className="flex-1 border border-charcoal/20 rounded-md px-3 py-2 bg-white/50 text-charcoal/70"
          />
          <button
            onClick={copyInquiryLink}
            disabled={!inquiryLink}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 disabled:opacity-50 whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </section>
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
