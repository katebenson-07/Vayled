"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Client } from "@/lib/types";

function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("wedding_date", { ascending: true });
      setClients((data as Client[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">Clients</h1>
        <Link href="/clients/new" className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          Add client
        </Link>
      </div>
      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : clients.length === 0 ? (
        <p className="text-charcoal/60">No clients yet.</p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center justify-between p-4 hover:bg-ivory"
            >
              <div>
                <p className="font-medium">{c.bride_name}</p>
                <p className="text-sm text-charcoal/60">
                  {c.wedding_date ?? "No date set"} · {c.venue ?? "No venue"}
                </p>
              </div>
              <span className="text-sm text-charcoal/60">{c.email}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard>
      <ClientsContent />
    </AuthGuard>
  );
}
