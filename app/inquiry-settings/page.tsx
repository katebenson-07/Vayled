"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { CustomQuestion, InquiryFormSettings, ServiceCatalogItem, StudioSettings } from "@/lib/types";

const STARTER_SERVICES: Array<{ name: string; default_rate: number }> = [
  { name: "Bridal Hair", default_rate: 200 },
  { name: "Bridal Makeup", default_rate: 200 },
  { name: "Bridal Hair + Makeup", default_rate: 375 },
  { name: "Bridesmaid Hair", default_rate: 95 },
  { name: "Bridesmaid Makeup", default_rate: 95 },
  { name: "Bridesmaid Hair + Makeup", default_rate: 180 },
  { name: "Mother of the Bride/Groom — Hair + Makeup", default_rate: 180 },
  { name: "Flower Girl — Hair", default_rate: 45 },
  { name: "Preview — Hair + Makeup", default_rate: 250 },
];

const DEFAULTS: Omit<InquiryFormSettings, "studio_id" | "updated_at"> = {
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

type ProfileFields = Pick<
  StudioSettings,
  | "studio_name"
  | "contact_email"
  | "contact_phone"
  | "address"
  | "notify_on_new_inquiry"
  | "notification_email"
  | "default_deposit_type"
  | "default_deposit_percent"
  | "default_deposit_flat"
>;

const PROFILE_DEFAULTS: ProfileFields = {
  studio_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  notify_on_new_inquiry: true,
  notification_email: "",
  default_deposit_type: "percent",
  default_deposit_percent: 25,
  default_deposit_flat: 0,
};

type Tab = "profile" | "notifications" | "inquiry" | "invoice";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Personal Information" },
  { id: "notifications", label: "Notifications" },
  { id: "inquiry", label: "Inquiry Form" },
  { id: "invoice", label: "Invoice" },
];

function InquirySettingsContent() {
  const searchParams = useSearchParams();
  const [studioId, setStudioId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Omit<InquiryFormSettings, "studio_id" | "updated_at">>(DEFAULTS);
  const [profile, setProfile] = useState<ProfileFields>(PROFILE_DEFAULTS);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [inquiryLink, setInquiryLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceRate, setNewServiceRate] = useState("");
  const [editingService, setEditingService] = useState<Record<string, { name: string; rate: string }>>({});

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && TABS.some((t) => t.id === requested)) setActiveTab(requested as Tab);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setStudioId(uid);
      if (uid) {
        setInquiryLink(`${window.location.origin}/inquire/${uid}`);
        const [{ data }, { data: profileData }, { data: serviceData }] = await Promise.all([
          supabase.from("inquiry_form_settings").select("*").eq("studio_id", uid).maybeSingle(),
          supabase.from("studio_settings").select("*").eq("studio_id", uid).maybeSingle(),
          supabase.from("service_catalog").select("*").eq("studio_id", uid).order("order_index"),
        ]);
        let serviceList = (serviceData as ServiceCatalogItem[]) ?? [];
        if (serviceList.length === 0) {
          const seeded = STARTER_SERVICES.map((s, i) => ({ ...s, studio_id: uid, order_index: i }));
          const { data: inserted } = await supabase.from("service_catalog").insert(seeded).select();
          serviceList = (inserted as ServiceCatalogItem[]) ?? [];
        }
        setServices(serviceList);
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
        if (profileData) {
          setProfile({
            studio_name: profileData.studio_name ?? "",
            contact_email: profileData.contact_email ?? "",
            contact_phone: profileData.contact_phone ?? "",
            address: profileData.address ?? "",
            notify_on_new_inquiry: profileData.notify_on_new_inquiry,
            notification_email: profileData.notification_email ?? userData.user?.email ?? "",
            default_deposit_type: profileData.default_deposit_type ?? "percent",
            default_deposit_percent: profileData.default_deposit_percent ?? 25,
            default_deposit_flat: profileData.default_deposit_flat ?? 0,
          });
        } else {
          setProfile((p) => ({ ...p, notification_email: userData.user?.email ?? "" }));
        }
      }
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

  function toggle(key: keyof typeof DEFAULTS) {
    setSettings((s) => ({ ...s, [key]: !s[key as keyof typeof s] }));
  }

  function addQuestion() {
    if (!newQuestion.trim()) return;
    const q: CustomQuestion = { id: crypto.randomUUID(), label: newQuestion.trim() };
    setSettings((s) => ({ ...s, custom_questions: [...s.custom_questions, q] }));
    setNewQuestion("");
  }

  function removeQuestion(id: string) {
    setSettings((s) => ({ ...s, custom_questions: s.custom_questions.filter((q) => q.id !== id) }));
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!newServiceName.trim() || !studioId) return;
    const { data, error } = await supabase
      .from("service_catalog")
      .insert({
        studio_id: studioId,
        name: newServiceName.trim(),
        default_rate: newServiceRate ? Number(newServiceRate) : 0,
        order_index: services.length,
      })
      .select()
      .single();
    if (!error && data) {
      setServices([...services, data as ServiceCatalogItem]);
      setNewServiceName("");
      setNewServiceRate("");
    }
  }

  function startEditService(s: ServiceCatalogItem) {
    setEditingService({ ...editingService, [s.id]: { name: s.name, rate: String(s.default_rate) } });
  }

  function cancelEditService(id: string) {
    const next = { ...editingService };
    delete next[id];
    setEditingService(next);
  }

  async function saveEditService(id: string) {
    const draft = editingService[id];
    if (!draft) return;
    const updates = { name: draft.name.trim(), default_rate: draft.rate ? Number(draft.rate) : 0 };
    const { error } = await supabase.from("service_catalog").update(updates).eq("id", id);
    if (!error) {
      setServices(services.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      cancelEditService(id);
    }
  }

  async function removeService(id: string) {
    const { error } = await supabase.from("service_catalog").delete().eq("id", id);
    if (!error) setServices(services.filter((s) => s.id !== id));
  }

  async function save() {
    if (!studioId) return;
    const [{ error }, { error: profileError }] = await Promise.all([
      supabase
        .from("inquiry_form_settings")
        .upsert({ studio_id: studioId, ...settings, updated_at: new Date().toISOString() }),
      supabase
        .from("studio_settings")
        .upsert({ studio_id: studioId, ...profile, updated_at: new Date().toISOString() }),
    ]);
    if (!error && !profileError) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-script text-5xl leading-tight mb-1">Settings</h1>
          <p className="text-charcoal/60 text-sm">
            Your business profile, notifications, and public inquiry form.{" "}
            {studioId && (
              <Link href={`/inquire/${studioId}`} target="_blank" className="text-gold hover:underline">
                Preview your form ↗
              </Link>
            )}
          </p>
        </div>
        <button onClick={save} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          Save
        </button>
      </div>
      {saved && <p className="text-sm text-green-700">Saved.</p>}

      <div className="flex gap-1 border-b border-charcoal/10 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-charcoal text-charcoal font-medium"
                : "border-transparent text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className={`bg-white border border-charcoal/10 rounded-xl p-6 ${activeTab === "profile" ? "" : "hidden"}`}>
        <h2 className="font-serif text-lg mb-4">Business profile</h2>
        <div className="space-y-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal/60 mb-1">Studio / business name</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2"
                value={profile.studio_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, studio_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-charcoal/60 mb-1">Contact email</label>
              <input
                type="email"
                className="w-full border border-charcoal/20 rounded-md px-3 py-2"
                value={profile.contact_email ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, contact_email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-charcoal/60 mb-1">Contact phone</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2"
                value={profile.contact_phone ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, contact_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-charcoal/60 mb-1">Business address</label>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2"
                value={profile.address ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-white border border-charcoal/10 rounded-xl p-6 ${activeTab === "notifications" ? "" : "hidden"}`}>
        <h2 className="font-serif text-lg mb-1">Notifications</h2>
        <p className="text-xs text-charcoal/50 mb-4">
          Note: this only saves your preference for now — actually emailing you on new inquiries needs an email
          provider connected (like Resend or Postmark), which isn&apos;t wired up yet.
        </p>
        <div className="space-y-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.notify_on_new_inquiry}
              onChange={() => setProfile((p) => ({ ...p, notify_on_new_inquiry: !p.notify_on_new_inquiry }))}
            />
            Notify me when a new inquiry comes in
          </label>
          <div>
            <label className="block text-charcoal/60 mb-1">Send notifications to</label>
            <input
              type="email"
              className="w-full sm:w-80 border border-charcoal/20 rounded-md px-3 py-2"
              value={profile.notification_email ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, notification_email: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <div className={`space-y-6 ${activeTab === "inquiry" ? "" : "hidden"}`}>
      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
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
            className="flex-1 border border-charcoal/20 rounded-md px-3 py-2 bg-ivory text-charcoal/70"
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

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Inquiry form welcome text</h2>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Heading</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={settings.welcome_heading}
              onChange={(e) => setSettings((s) => ({ ...s, welcome_heading: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Message</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              value={settings.welcome_message}
              onChange={(e) => setSettings((s) => ({ ...s, welcome_message: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-1">Questions to ask</h2>
        <p className="text-xs text-charcoal/50 mb-4">
          Name and email are always asked so you can follow up. Toggle the rest on or off.
        </p>
        <div className="space-y-3 text-sm">
          {(
            [
              ["ask_wedding_date", "Wedding date"],
              ["ask_venue", "Venue"],
              ["ask_getting_ready_location", "Getting ready location"],
              ["ask_party_size", "Party size"],
              ["ask_budget", "Budget range"],
              ["ask_referral_source", "How did you hear about us?"],
              ["ask_preferred_contact_method", "Preferred contact method"],
              ["ask_message", "Tell us about your vision (open message)"],
              ["require_phone", "Require phone number (instead of optional)"],
            ] as [keyof typeof DEFAULTS, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={settings[key] as boolean} onChange={() => toggle(key)} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-1">Your own questions</h2>
        <p className="text-xs text-charcoal/50 mb-4">
          Add anything else you like to ask — every stylist&apos;s process is a little different. Answers show up in the
          client&apos;s notes once they submit.
        </p>
        <div className="flex gap-2 mb-4 text-sm">
          <input
            className="flex-1 border border-charcoal/20 rounded-md px-3 py-2"
            placeholder="e.g. What's your hair type?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQuestion())}
          />
          <button onClick={addQuestion} className="bg-charcoal text-ivory rounded-md px-4 py-2">
            Add
          </button>
        </div>
        {settings.custom_questions.length === 0 ? (
          <p className="text-sm text-charcoal/50">No custom questions yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {settings.custom_questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                <span>{q.label}</span>
                <button onClick={() => removeQuestion(q.id)} className="text-red-600 text-xs">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>

      <div className={`space-y-6 ${activeTab === "invoice" ? "" : "hidden"}`}>
        <section className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h2 className="font-serif text-lg mb-1">Default deposit</h2>
          <p className="text-charcoal/60 text-sm mb-4">
            Applied automatically to the Deposit / Retainer line on every new invoice. You can still change it for
            an individual booking from that invoice — this just sets the starting point.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={profile.default_deposit_type}
              onChange={(e) =>
                setProfile((p) => ({ ...p, default_deposit_type: e.target.value as "percent" | "flat" }))
              }
            >
              <option value="percent">Percent of invoice total</option>
              <option value="flat">Flat amount</option>
            </select>
            {profile.default_deposit_type === "percent" ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-20 text-right"
                  value={profile.default_deposit_percent}
                  onChange={(e) => setProfile((p) => ({ ...p, default_deposit_percent: Number(e.target.value) }))}
                />
                <span>%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-28 text-right"
                  value={profile.default_deposit_flat}
                  onChange={(e) => setProfile((p) => ({ ...p, default_deposit_flat: Number(e.target.value) }))}
                />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h2 className="font-serif text-lg mb-1">Preset services</h2>
          <p className="text-charcoal/60 text-sm mb-4">
            Add every service you offer and its default rate. When you&apos;re building an invoice, you&apos;ll pick
            one from a dropdown and just enter a quantity — the rate and amount fill in automatically.
          </p>
          <form onSubmit={addService} className="flex flex-wrap gap-2 mb-4 text-sm">
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[200px]"
              placeholder="Service name (e.g. Bridesmaid Hair + Makeup)"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="border border-charcoal/20 rounded-md px-2 py-1 w-32"
              placeholder="Default rate"
              value={newServiceRate}
              onChange={(e) => setNewServiceRate(e.target.value)}
            />
            <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
              Add
            </button>
          </form>

          {services.length === 0 ? (
            <p className="text-charcoal/60 text-sm">No services yet. Add your first one above.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {services.map((s) => {
                const draft = editingService[s.id];
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-charcoal/10 pb-2 gap-2"
                  >
                    {draft ? (
                      <>
                        <div className="flex flex-1 gap-2">
                          <input
                            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1"
                            value={draft.name}
                            onChange={(e) =>
                              setEditingService({ ...editingService, [s.id]: { ...draft, name: e.target.value } })
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="border border-charcoal/20 rounded-md px-2 py-1 w-28"
                            value={draft.rate}
                            onChange={(e) =>
                              setEditingService({ ...editingService, [s.id]: { ...draft, rate: e.target.value } })
                            }
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => saveEditService(s.id)} className="text-gold hover:underline">
                            Save
                          </button>
                          <button onClick={() => cancelEditService(s.id)} className="text-charcoal/60">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>
                          {s.name}{" "}
                          <span className="text-charcoal/60">· ${Number(s.default_rate).toFixed(2)}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEditService(s)}
                            className="text-charcoal/60 hover:text-charcoal"
                          >
                            Edit
                          </button>
                          <button onClick={() => removeService(s.id)} className="text-red-600">
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function InquirySettingsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="text-charcoal/60">Loading...</p>}>
        <InquirySettingsContent />
      </Suspense>
    </AuthGuard>
  );
}
