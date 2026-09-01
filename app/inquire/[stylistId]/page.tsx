"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { CustomQuestion, InquiryFormSettings } from "@/lib/types";

const DEFAULT_SETTINGS: Omit<InquiryFormSettings, "studio_id" | "updated_at"> = {
  welcome_heading: "Welcome, beautiful bride-to-be",
  welcome_message:
    "We're so honored you're considering us for your special day. Tell us a bit about your wedding and we'll be in touch to check availability.",
  ask_wedding_date: true,
  ask_venue: true,
  ask_getting_ready_location: true,
  ask_party_size: true,
  ask_referral_source: true,
  ask_message: true,
  ask_budget: false,
  ask_preferred_contact_method: false,
  require_phone: false,
  custom_questions: [],
};

export default function PublicInquiryPage() {
  const { stylistId } = useParams<{ stylistId: string }>();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [form, setForm] = useState({
    bride_name: "",
    wedding_date: "",
    venue: "",
    getting_ready_location: "",
    email: "",
    phone: "",
    party_size: "",
    referral_source: "",
    budget: "",
    preferred_contact_method: "",
    message: "",
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [company, setCompany] = useState(""); // honeypot — real visitors never see or fill this
  const [loadedAt] = useState(() => Date.now());

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from("inquiry_form_settings")
        .select("*")
        .eq("studio_id", stylistId)
        .maybeSingle();
      if (data) {
        setSettings({
          welcome_heading: data.welcome_heading,
          welcome_message: data.welcome_message,
          ask_wedding_date: data.ask_wedding_date,
          ask_venue: data.ask_venue,
          ask_getting_ready_location: data.ask_getting_ready_location,
          ask_party_size: data.ask_party_size,
          ask_referral_source: data.ask_referral_source,
          ask_message: data.ask_message,
          ask_budget: data.ask_budget ?? false,
          ask_preferred_contact_method: data.ask_preferred_contact_method ?? false,
          require_phone: data.require_phone ?? false,
          custom_questions: (data.custom_questions as CustomQuestion[]) ?? [],
        });
      }
      setSettingsLoaded(true);
    }
    loadSettings();
  }, [stylistId]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic bot filters: a filled honeypot field, or a submit faster than any
    // real bride can fill this form out, both "succeed" without writing
    // anything to the database.
    if (company.trim() !== "" || Date.now() - loadedAt < 2000) {
      setDone(true);
      return;
    }

    setSubmitting(true);

    const notesParts: string[] = [];
    if (form.party_size) notesParts.push(`Estimated wedding party size: ${form.party_size}`);
    if (form.budget) notesParts.push(`Budget range: ${form.budget}`);
    if (form.preferred_contact_method) notesParts.push(`Preferred contact method: ${form.preferred_contact_method}`);
    if (form.message) notesParts.push(form.message);
    settings.custom_questions.forEach((q) => {
      const answer = customAnswers[q.id];
      if (answer) notesParts.push(`${q.label}\n${answer}`);
    });
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
      location: form.getting_ready_location || null,
    });

    setSubmitting(false);
    if (bookingError) {
      setError("Your info was saved, but something went wrong finishing your inquiry. We'll still be in touch!");
      return;
    }
    setDone(true);
  }

  if (!settingsLoaded) {
    return <div className="min-h-screen bg-charcoal" />;
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
          <h1 className="font-serif text-2xl text-charcoal mb-1">{settings.welcome_heading}</h1>
          <p className="text-sm text-charcoal/60 mb-6">{settings.welcome_message}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="hidden" aria-hidden="true">
              <label>
                Company
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label className="block text-sm mb-1">Your name</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                required
                value={form.bride_name}
                onChange={(e) => update("bride_name", e.target.value)}
              />
            </div>

            {(settings.ask_wedding_date || settings.ask_party_size) && (
              <div className="grid grid-cols-2 gap-4">
                {settings.ask_wedding_date && (
                  <div>
                    <label className="block text-sm mb-1">Wedding date</label>
                    <input
                      type="date"
                      className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                      value={form.wedding_date}
                      onChange={(e) => update("wedding_date", e.target.value)}
                    />
                  </div>
                )}
                {settings.ask_party_size && (
                  <div>
                    <label className="block text-sm mb-1">Party size</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                      placeholder="e.g. 6"
                      value={form.party_size}
                      onChange={(e) => update("party_size", e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {settings.ask_venue && (
              <div>
                <label className="block text-sm mb-1">Venue</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                />
              </div>
            )}

            {settings.ask_getting_ready_location && (
              <div>
                <label className="block text-sm mb-1">Getting ready location</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  placeholder="Where will hair & makeup happen?"
                  value={form.getting_ready_location}
                  onChange={(e) => update("getting_ready_location", e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  required={settings.require_phone}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
            </div>

            {settings.ask_budget && (
              <div>
                <label className="block text-sm mb-1">Budget range</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  placeholder="e.g. $500-$800"
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                />
              </div>
            )}

            {settings.ask_preferred_contact_method && (
              <div>
                <label className="block text-sm mb-1">Preferred contact method</label>
                <select
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  value={form.preferred_contact_method}
                  onChange={(e) => update("preferred_contact_method", e.target.value)}
                >
                  <option value="">No preference</option>
                  <option value="Email">Email</option>
                  <option value="Phone call">Phone call</option>
                  <option value="Text">Text</option>
                </select>
              </div>
            )}

            {settings.ask_referral_source && (
              <div>
                <label className="block text-sm mb-1">How did you hear about us?</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  placeholder="e.g. Instagram, a friend, your venue"
                  value={form.referral_source}
                  onChange={(e) => update("referral_source", e.target.value)}
                />
              </div>
            )}

            {settings.custom_questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm mb-1">{q.label}</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  value={customAnswers[q.id] ?? ""}
                  onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              </div>
            ))}

            {settings.ask_message && (
              <div>
                <label className="block text-sm mb-1">Tell us about your vision</label>
                <textarea
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                  rows={4}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                />
              </div>
            )}

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
