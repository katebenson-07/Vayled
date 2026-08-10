"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { ServiceCatalogItem } from "@/lib/types";

const STARTER_SERVICES: Array<{ name: string; default_rate: number }> = [
  { name: "Bridal Hair", default_rate: 200 },
  { name: "Bridal Makeup", default_rate: 200 },
  { name: "Bridal Hair + Makeup", default_rate: 375 },
  { name: "Bridesmaid Hair", default_rate: 95 },
  { name: "Bridesmaid Makeup", default_rate: 95 },
  { name: "Bridesmaid Hair + Makeup", default_rate: 180 },
  { name: "Mother of the Bride/Groom — Hair + Makeup", default_rate: 180 },
  { name: "Flower Girl — Hair", default_rate: 45 },
  { name: "Trial — Hair + Makeup", default_rate: 250 },
];

function ServicesContent() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [editing, setEditing] = useState<Record<string, { name: string; rate: string }>>({});

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data } = await supabase
      .from("service_catalog")
      .select("*")
      .order("order_index");
    let list = (data as ServiceCatalogItem[]) ?? [];

    // First-ever visit for this studio: seed a starter catalog so the
    // invoice's service dropdown isn't empty on day one.
    if (list.length === 0 && studio_id) {
      const seeded = STARTER_SERVICES.map((s, i) => ({ ...s, studio_id, order_index: i }));
      const { data: inserted } = await supabase.from("service_catalog").insert(seeded).select();
      list = (inserted as ServiceCatalogItem[]) ?? [];
    }

    setServices(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("service_catalog")
      .insert({
        studio_id,
        name: newName.trim(),
        default_rate: newRate ? Number(newRate) : 0,
        order_index: services.length,
      })
      .select()
      .single();
    if (!error && data) {
      setServices([...services, data as ServiceCatalogItem]);
      setNewName("");
      setNewRate("");
    }
  }

  function startEdit(s: ServiceCatalogItem) {
    setEditing({ ...editing, [s.id]: { name: s.name, rate: String(s.default_rate) } });
  }

  function cancelEdit(id: string) {
    const next = { ...editing };
    delete next[id];
    setEditing(next);
  }

  async function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    const updates = { name: draft.name.trim(), default_rate: draft.rate ? Number(draft.rate) : 0 };
    const { error } = await supabase.from("service_catalog").update(updates).eq("id", id);
    if (!error) {
      setServices(services.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      cancelEdit(id);
    }
  }

  async function removeService(id: string) {
    const { error } = await supabase.from("service_catalog").delete().eq("id", id);
    if (!error) setServices(services.filter((s) => s.id !== id));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Services</h1>
        <p className="text-charcoal/60 text-sm">
          The service list every invoice&apos;s &quot;Add a service&quot; dropdown pulls from, with your default
          pricing. Edit these any time — changes only affect new line items you add, not invoices already sent.
        </p>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Your services</h2>
        <form onSubmit={addService} className="flex flex-wrap gap-2 mb-4 text-sm">
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[200px]"
            placeholder="Service name (e.g. Bridesmaid Hair + Makeup)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="border border-charcoal/20 rounded-md px-2 py-1 w-32"
            placeholder="Default rate"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
          />
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>

        {services.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No services yet. Add your first one above.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {services.map((s) => {
              const draft = editing[s.id];
              return (
                <div key={s.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2 gap-2">
                  {draft ? (
                    <>
                      <div className="flex flex-1 gap-2">
                        <input
                          className="border border-charcoal/20 rounded-md px-2 py-1 flex-1"
                          value={draft.name}
                          onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, name: e.target.value } })}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="border border-charcoal/20 rounded-md px-2 py-1 w-28"
                          value={draft.rate}
                          onChange={(e) => setEditing({ ...editing, [s.id]: { ...draft, rate: e.target.value } })}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => saveEdit(s.id)} className="text-gold hover:underline">
                          Save
                        </button>
                        <button onClick={() => cancelEdit(s.id)} className="text-charcoal/60">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>
                        {s.name} <span className="text-charcoal/60">· ${Number(s.default_rate).toFixed(2)}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(s)} className="text-charcoal/60 hover:text-charcoal">
                          Edit
                        </button>
                        <button onClick={() => removeService(s.id)} className="text-red-600">
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <AuthGuard>
      <ServicesContent />
    </AuthGuard>
  );
}
