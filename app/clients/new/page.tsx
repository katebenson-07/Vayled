"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

function NewClientForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    bride_name: "",
    email: "",
    phone: "",
    wedding_date: "",
    venue: "",
    notes: "",
    referral_source: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;

    const { data, error } = await supabase
      .from("clients")
      .insert({ ...form, stylist_id })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/clients/${data.id}`);
  }

  return (
    <div>
      <h1 className="font-script text-4xl leading-tight mb-6">Add client</h1>
      <form onSubmit={handleSubmit} className="bg-white border border-charcoal/10 rounded-xl p-6 space-y-4 max-w-lg">
        <div>
          <label className="block text-sm mb-1">Bride&apos;s name</label>
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            required
            value={form.bride_name}
            onChange={(e) => update("bride_name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Wedding date</label>
          <input
            type="date"
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            value={form.wedding_date}
            onChange={(e) => update("wedding_date", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Venue</label>
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Referred by</label>
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            placeholder="e.g. Instagram, past client, venue referral"
            value={form.referral_source}
            onChange={(e) => update("referral_source", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Notes</label>
          <textarea
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-charcoal text-ivory rounded-md px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save client"}
        </button>
      </form>
    </div>
  );
}

export default function NewClientPage() {
  return (
    <AuthGuard>
      <NewClientForm />
    </AuthGuard>
  );
}
