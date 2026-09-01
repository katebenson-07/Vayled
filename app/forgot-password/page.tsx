"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSent(true);
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
          <p className="font-logo text-3xl tracking-widest-lg uppercase text-ivory mb-2">Vayled</p>
          <p className="text-xs uppercase tracking-widest-lg text-beige/70">Reset your password</p>
        </div>
        <div className="w-full bg-ivory rounded-xl p-8">
          {sent ? (
            <div className="text-center">
              <p className="text-sm text-charcoal/80 mb-6">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
                Check your inbox (and spam folder) for an email from Supabase Auth.
              </p>
              <Link href="/login" className="text-sm text-gold hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-charcoal/60 mb-6">
                Enter the email on your account and we&apos;ll send you a link to set a new password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-charcoal text-ivory rounded-md py-2 hover:bg-charcoal/90 disabled:opacity-50 uppercase text-xs tracking-widest-lg"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
              <Link href="/login" className="block text-sm text-charcoal/60 hover:text-charcoal mt-4">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
