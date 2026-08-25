"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { acceptPendingInviteIfAny } from "@/lib/pendingInvite";
import Sidebar from "./Sidebar";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }

      // Finish accepting any invite that had to wait on email confirmation
      // before flipping their studio_members row to active (see
      // lib/pendingInvite.ts) — otherwise they'd be stuck looking like the
      // owner forever, since their membership row never leaves "pending."
      await acceptPendingInviteIfAny();
      if (!mounted) return;

      // Owner logins never have a studio_members row (auth.uid() = studio_id
      // is what makes them the owner everywhere else in the schema). If this
      // user IS in studio_members and active, they're an invited stylist —
      // send them to their own stripped-down view instead of the owner app.
      const { data: membership } = await supabase
        .from("studio_members")
        .select("status")
        .eq("user_id", data.session.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!mounted) return;
      if (membership) {
        router.replace("/team");
        return;
      }

      setReady(true);
    }

    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return <div className="p-8 text-charcoal/60">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ivory md:flex">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-8 max-w-6xl">{children}</main>
    </div>
  );
}
