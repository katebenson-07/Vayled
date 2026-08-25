"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { acceptPendingInviteIfAny } from "@/lib/pendingInvite";
import TeamSidebar from "./TeamSidebar";

type TeamMemberContext = {
  studioId: string;
  stylistId: string;
  stylistName: string;
};

const Ctx = createContext<TeamMemberContext | null>(null);

/** Read the logged-in stylist's own studio_id/stylist_id inside any /team page. */
export function useTeamMember() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeamMember must be used inside TeamAuthGuard");
  return ctx;
}

export default function TeamAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [member, setMember] = useState<TeamMemberContext | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      await acceptPendingInviteIfAny();
      if (!mounted) return;

      const { data: membership } = await supabase
        .from("studio_members")
        .select("studio_id, stylist_id")
        .eq("user_id", sessionData.session.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!mounted) return;
      if (!membership) {
        // Not an invited stylist — most likely the studio owner, who belongs
        // on the full app instead.
        router.replace("/dashboard");
        return;
      }

      const { data: stylist } = await supabase
        .from("stylists")
        .select("name")
        .eq("id", membership.stylist_id)
        .maybeSingle();
      if (!mounted) return;

      setMember({
        studioId: membership.studio_id,
        stylistId: membership.stylist_id,
        stylistName: stylist?.name ?? "",
      });
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

  if (!member) {
    return <div className="p-8 text-charcoal/60">Loading...</div>;
  }

  return (
    <Ctx.Provider value={member}>
      <div className="min-h-screen bg-ivory md:flex">
        <TeamSidebar stylistName={member.stylistName} />
        <main className="flex-1 min-w-0 p-6 md:p-8 max-w-4xl">{children}</main>
      </div>
    </Ctx.Provider>
  );
}
