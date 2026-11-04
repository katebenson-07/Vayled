"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Settings > Personal Information: permanently delete the account and all data. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ confirm: text }),
    });
    if (res.ok) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }
    const j = await res.json().catch(() => ({}));
    setError(j.error ?? "Something went wrong.");
    setBusy(false);
  }

  return (
    <div className="mt-8 pt-6 border-t border-charcoal/10 text-sm">
      <h3 className="font-serif text-base mb-1">Delete account</h3>
      <p className="text-charcoal/60 mb-3">
        Permanently deletes your studio, clients, bookings, photos, and everything else. This can&apos;t be undone.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-red-600 hover:underline">
          Delete my account
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block text-charcoal/60">Type DELETE to confirm</label>
          <input
            className="border border-charcoal/20 rounded-md px-3 py-2 w-full max-w-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={remove}
              disabled={text !== "DELETE" || busy}
              className="bg-red-600 text-white rounded-md px-4 py-2 disabled:opacity-40"
            >
              {busy ? "Deleting..." : "Permanently delete"}
            </button>
            <button onClick={() => setOpen(false)} className="text-charcoal/60">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
