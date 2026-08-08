"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function PublicInquiryPage() {
  const { stylistId } = useParams<{ stylistId: string }>();
  const [form, setForm] = useState({
    bride_name: "",
    wedding_date: "",
    venue: "",
    email: "",
    phone: "",
    party_size: "",
    referral_source: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const notesParts = [];
    if (form.party_size) notesParts.push(`Estimated wedding party size: ${form.party_size}`);
    if (form.message) notesParts.push(form.message);
    const notes = notesParts.join("\n\n");

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        stylist_id: stylistId,
        bride_name: form.bride_name,
        email: form.email || null,
        phone: form.phone || null,
        wedding_date: form.wedding_date || null,
        venue: form.venue || null,
        referral_source: form.referral_source || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (clientError || !client) {
      setSubmitting(false);
      setError("Something went wrong submitting your inquiry. Please try again, or reach out directly.");
      return;
    }

    const { error: bookingError } = await supabase.from("bookings").insert({
      stylist_id: stylistId,
      client_id: client.id,
      status: "inquiry",
      contract_total: 0,
      deposit_amount: 0,
      deposit_paid: false,
    });

    setSubmitting(false);
    if (bookingError) {
      setError("Your info was saved, but something went wrong finishing your inquiry. We'll still be in touch!");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <Logo size="md" className="text-ivory justify-center mb-6" />
          <h1 className="font-serif text-2xl text-ivory mb-3">Thank you!</h1>
          <p className="text-beige/80">
            Your inquiry has been received. We&apos;re so excited to hear about your day and will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Logo size="md" className="text-ivory justify-center mb-3" />
          <p className="text-xs uppercase tracking-widest-lg text-beige/70">Bridal hair &amp; makeup inquiry</p>
        </div>
        <div className="bg-ivory rounded-xl p-8">
          <h1 className="font-serif text-2xl text-charcoal mb-1">Welcome, beautiful bride-to-be</h1>
          <p className="text-sm text-charcoal/60 mb-6">
            We&apos;re so honored you&apos;re considering us for your special day. Tell us a bit about your wedding and
            we&apos;ll be in touch to check availability.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Your name</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                required
                value={form.bride_name}
                onChange={(e) => update("bride_name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Wedding date</label>
                <input
                  type="date"
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  value={form.wedding_date}
                  onChange={(e) => update("wedding_date", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Party size</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  placeholder="e.g. 6"
                  value={form.party_size}
                  onChange={(e) => update("party_size", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Venue</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">How did you hear about us?</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                placeholder="e.g. Instagram, a friend, your venue"
                value={form.referral_source}
                onChange={(e) => update("referral_source", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Tell us about your vision</label>
              <textarea
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                rows={4}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-charcoal text-ivory rounded-md py-2 hover:bg-charcoal/90 disabled:opacity-50 uppercase text-xs tracking-widest-lg"
            >
              {submitting ? "Sending..." : "Send inquiry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
