"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { stashPendingInviteToken } from "@/lib/pendingInvite";

type Invite = {
  stylist_name: string;
  stylist_email: string;
  studio_name: string;
  status: "pending" | "active" | "revoked";
};

export default function TeamInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc("get_studio_invite", { p_token: token });
      if (error || !data || !data.stylist_name) {
        setNotFound(true);
        return;
      }
      setInvite(data as Invite);
    }
    load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setError(null);
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.stylist_email,
        password,
      });
      if (signUpError) throw signUpError;

      if (!signUpData.session) {
        // Project has email confirmation on — there's no session yet, so we
        // can't call accept_studio_invite (it needs auth.uid()). Stash the
        // token so that once they confirm their email and log in normally,
        // AuthGuard/TeamAuthGuard can finish accepting the invite on their
        // first authenticated page load, before deciding where to route them.
        stashPendingInviteToken(String(token));
        setCheckEmail(true);
        return;
      }

      const { data: acceptData, error: acceptError } = await supabase.rpc("accept_studio_invite", {
        p_token: token,
      });
      if (acceptError) throw acceptError;
      if (!acceptData?.ok) {
        setError(acceptData?.error ?? "This invite link is invalid or has already been used.");
        return;
      }

      router.replace("/team");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-ivory rounded-xl p-8 text-center">
          <p className="font-serif text-xl mb-2">Invite not found</p>
          <p className="text-sm text-charcoal/60">
            This invite link doesn&apos;t look right. Ask your studio to send you a new one.
          </p>
        </div>
      </div>
    );
  }

  if (invite && invite.status !== "pending") {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-ivory rounded-xl p-8 text-center">
          <p className="font-serif text-xl mb-2">This invite has already been used</p>
          <p className="text-sm text-charcoal/60 mb-6">
            If you already set up your login, sign in below instead.
          </p>
          <a
            href="/login"
            className="inline-block bg-charcoal text-ivory rounded-md px-6 py-2.5 uppercase text-xs tracking-widest-lg"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-ivory rounded-xl p-8 text-center">
          <p className="font-serif text-xl mb-2">Check your email</p>
          <p className="text-sm text-charcoal/60">
            Confirm your email, then{" "}
            <a href="/login" className="underline">
              sign in
            </a>{" "}
            to finish joining {invite?.studio_name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl tracking-widest-lg uppercase text-ivory mb-2">Vayled</p>
          <p className="text-xs uppercase tracking-widest-lg text-beige/70">Team invite</p>
        </div>
        <div className="w-full bg-ivory rounded-xl p-8">
          {invite ? (
            <>
              <p className="text-sm text-charcoal/60 mb-6">
                You&apos;ve been invited to join <span className="text-charcoal font-medium">{invite.studio_name}</span>{" "}
                on Vayled as <span className="text-charcoal font-medium">{invite.stylist_name}</span>. Set a password
                to finish setting up your login.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    className="w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white/50 text-charcoal/60"
                    value={invite.stylist_email}
                    disabled
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
                  {loading ? "Please wait..." : "Join the team"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-charcoal/60">Loading invite...</p>
          )}
        </div>
      </div>
    </div>
  );
}
