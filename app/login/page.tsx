"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { business_name: businessName } },
        });
        if (error) throw error;
      }
      router.replace("/dashboard");
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
          <p className="text-xs uppercase tracking-widest-lg text-beige/70">For bridal hair &amp; makeup studios</p>
        </div>
        <div className="w-full bg-ivory rounded-xl p-8">
          <p className="text-sm text-charcoal/60 mb-6">
            {mode === "signin" ? "Sign in to your studio" : "Create your studio account"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm mb-1">Business name</label>
                <input
                  className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <div className="flex items-center justify-between mt-4">
            <button
              className="text-sm text-charcoal/60 hover:text-charcoal"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
            {mode === "signin" && (
              <Link href="/forgot-password" className="text-sm text-charcoal/60 hover:text-charcoal">
                Forgot password?
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-charcoal" />}>
      <LoginForm />
    </Suspense>
  );
}
