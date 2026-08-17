"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, EmailTemplate, SentEmail } from "@/lib/types";
import { buildMergeContext, applyTemplate, MERGE_FIELD_HELP } from "@/lib/merge";
import { DEFAULT_TEMPLATES } from "@/lib/emailTemplates";
import { sendEmail, openMailto } from "@/lib/sendEmail";
import { format } from "date-fns";

function EmailsContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [sentLog, setSentLog] = useState<SentEmail[]>([]);
  const [studioName, setStudioName] = useState<string | null>(null);
  const [studioContactEmail, setStudioContactEmail] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });

  async function refreshSentLog() {
    if (!bookingId) return;
    const { data } = await supabase
      .from("sent_emails")
      .select("*")
      .eq("booking_id", bookingId)
      .order("sent_at", { ascending: false });
    setSentLog((data as SentEmail[]) ?? []);
  }

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;

    if (studio_id) {
      const { data: profile } = await supabase
        .from("studio_settings")
        .select("studio_name, contact_email")
        .eq("studio_id", studio_id)
        .maybeSingle();
      setStudioName(profile?.studio_name ?? null);
      setStudioContactEmail(profile?.contact_email ?? null);
    }

    let { data: templateData } = await supabase.from("email_templates").select("*").order("created_at");
    if (!templateData || templateData.length === 0) {
      const { data: inserted } = await supabase
        .from("email_templates")
        .insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, studio_id })))
        .select();
      templateData = inserted ?? [];
    }
    setTemplates((templateData as EmailTemplate[]) ?? []);

    if (bookingId) {
      const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      setBooking(bookingData as Booking);
      if (bookingData) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", (bookingData as Booking).client_id)
          .single();
        setClient(clientData as Client);
      }
      const { data: sentData } = await supabase
        .from("sent_emails")
        .select("*")
        .eq("booking_id", bookingId)
        .order("sent_at", { ascending: false });
      setSentLog((sentData as SentEmail[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  function startEdit(t: EmailTemplate | null) {
    setEditing(t);
    setForm(t ? { name: t.name, subject: t.subject, body: t.body } : { name: "", subject: "", body: "" });
  }

  async function saveTemplate() {
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    if (editing) {
      await supabase.from("email_templates").update(form).eq("id", editing.id);
      setTemplates(templates.map((t) => (t.id === editing.id ? { ...t, ...form } : t)));
    } else {
      const { data } = await supabase.from("email_templates").insert({ ...form, studio_id }).select().single();
      if (data) setTemplates([...templates, data as EmailTemplate]);
    }
    setEditing(null);
    setForm({ name: "", subject: "", body: "" });
  }

  async function removeTemplate(id: string) {
    await supabase.from("email_templates").delete().eq("id", id);
    setTemplates(templates.filter((t) => t.id !== id));
  }

  async function sendTemplate(t: EmailTemplate) {
    if (!booking || !client) return;
    const totalPaidRes = await supabase.from("payments").select("amount").eq("booking_id", booking.id);
    const totalPaid = (totalPaidRes.data ?? []).reduce((sum, p: any) => sum + Number(p.amount), 0);
    const balanceDue = Number(booking.contract_total) - totalPaid;
    const context = buildMergeContext(client, booking, balanceDue, studioName);
    const subject = applyTemplate(t.subject, context);
    const body = applyTemplate(t.body, context);

    setSendStatus(null);
    const result = await sendEmail({
      to: client.email ?? "",
      subject,
      body,
      replyTo: studioContactEmail,
      fromName: studioName,
      bookingId: booking.id,
      templateName: t.name,
    });

    if (result.ok) {
      setSendStatus(`Sent to ${client.email} ✓`);
      await refreshSentLog();
      return;
    }

    if (result.reason === "not_configured") {
      openMailto(client.email ?? "", subject, body);
      const { data: userData } = await supabase.auth.getUser();
      const studio_id = userData.user?.id;
      await supabase.from("sent_emails").insert({ studio_id, booking_id: booking.id, template_name: t.name, subject });
      await refreshSentLog();
      return;
    }

    setSendStatus(`Couldn't send: ${result.message ?? "unknown error"}`);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Email templates</h1>
        <p className="text-charcoal/60 text-sm">{MERGE_FIELD_HELP}</p>
      </div>

      {bookingId && client && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h2 className="font-serif text-lg mb-1">Send to {client.bride_name}</h2>
          <p className="text-charcoal/60 text-sm mb-4">
            Pick a template — it sends automatically once Vayled&apos;s email is set up, or opens in your own email app
            pre-filled until then. Either way it logs here once sent.{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => sendTemplate(t)}
                className="border border-charcoal/20 rounded-md px-3 py-2 text-sm hover:bg-ivory"
              >
                {t.name}
              </button>
            ))}
          </div>
          {sendStatus && <p className="text-sm text-charcoal/70 mb-4">{sendStatus}</p>}
          {sentLog.length > 0 && (
            <div>
              <p className="text-xs text-charcoal/50 mb-2">Sent log</p>
              <div className="space-y-1 text-sm">
                {sentLog.map((s) => (
                  <div key={s.id} className="flex justify-between border-b border-charcoal/10 pb-1">
                    <span>{s.template_name}</span>
                    <span className="text-charcoal/60">{format(new Date(s.sent_at), "MMM d, h:mm a")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg">Library</h2>
          <button onClick={() => startEdit(null)} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
            New template
          </button>
        </div>

        {editing !== null || form.name ? (
          <div className="border border-charcoal/10 rounded-md p-4 mb-4 space-y-3 text-sm">
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={6}
              placeholder="Body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="bg-charcoal text-ivory rounded-md px-4 py-2">
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setForm({ name: "", subject: "", body: "" });
                }}
                className="border border-charcoal/20 rounded-md px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 text-sm">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-charcoal/60 text-xs">{t.subject}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => startEdit(t)} className="text-gold">
                  Edit
                </button>
                <button onClick={() => removeTemplate(t.id)} className="text-red-600">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function EmailsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="text-charcoal/60">Loading...</p>}>
        <EmailsContent />
      </Suspense>
    </AuthGuard>
  );
}
