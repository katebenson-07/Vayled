"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "./Sidebar";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });

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
