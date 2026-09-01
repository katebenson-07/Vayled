"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase reads the recovery token out of the URL and fires this event
    // once it's turned that into a real (temporary) session we can use to
    // set a new password. If someone lands here without a valid link, no
    // PASSWORD_RECOVERY event ever fires and the form below stays disabled.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also handle the case where the session is already established by the
    // time this component mounts (e.g. fast redirect).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl tracking-widest-lg uppercase text-ivory mb-2">Vayled</p>
          <p className="text-xs uppercase tracking-widest-lg text-beige/70">Set a new password</p>
        </div>
        <div className="w-full bg-ivory rounded-xl p-8">
          {done ? (
            <p className="text-sm text-charcoal/80">Password updated. Taking you to sign in...</p>
          ) : !ready ? (
            <p className="text-sm text-charcoal/60">
              Checking your reset link... If this doesn&apos;t update in a moment, the link may have expired —
              request a new one from the sign-in page.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">New password</label>
                <input
                  type="password"
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm new password</label>
                <input
                  type="password"
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-charcoal text-ivory rounded-md py-2 hover:bg-charcoal/90 disabled:opacity-50 uppercase text-xs tracking-widest-lg"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-charcoal" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
