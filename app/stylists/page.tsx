"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Stylist, StylistTimeOff, StudioMember } from "@/lib/types";
import { format } from "date-fns";

function StylistsContent() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIs1099, setEditIs1099] = useState(true);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIs1099, setNewIs1099] = useState(true);
  const [newPayPercentage, setNewPayPercentage] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [toStylistId, setToStylistId] = useState("");
  const [toStart, setToStart] = useState("");
  const [toEnd, setToEnd] = useState("");
  const [toReason, setToReason] = useState("");

  async function loadAll() {
    const { data: stylistData } = await supabase.from("stylists").select("*").order("name");
    setStylists((stylistData as Stylist[]) ?? []);
    const { data: toData } = await supabase.from("stylist_time_off").select("*").order("start_date");
    setTimeOff((toData as StylistTimeOff[]) ?? []);
    const { data: memberData } = await supabase.from("studio_members").select("*");
    setMembers((memberData as StudioMember[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addStylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("stylists")
      .insert({
        studio_id,
        name: newName,
        email: newEmail || null,
        phone: newPhone || null,
        is_1099: newIs1099,
        pay_percentage: newPayPercentage ? Number(newPayPercentage) : 0,
      })
      .select()
      .single();
    if (!error && data) {
      setStylists([...stylists, data as Stylist]);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewIs1099(true);
      setNewPayPercentage("");
    }
  }

  async function updateStylist(id: string, fields: Partial<Stylist>) {
    const { error } = await supabase.from("stylists").update(fields).eq("id", id);
    if (!error) {
      setStylists(stylists.map((x) => (x.id === id ? { ...x, ...fields } : x)));
      setSavedAt(new Date());
    }
  }

  function startEditing(s: Stylist) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditEmail(s.email ?? "");
    setEditPhone(s.phone ?? "");
    setEditIs1099(s.is_1099);
  }

  async function saveEditing(id: string) {
    if (!editName.trim()) return;
    await updateStylist(id, {
      name: editName.trim(),
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      is_1099: editIs1099,
    });
    setEditingId(null);
  }

  async function toggleActive(s: Stylist) {
    const { error } = await supabase.from("stylists").update({ active: !s.active }).eq("id", s.id);
    if (!error) setStylists(stylists.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
  }

  async function removeStylist(id: string) {
    const { error } = await supabase.from("stylists").delete().eq("id", id);
    if (!error) {
      setStylists(stylists.filter((x) => x.id !== id));
      setTimeOff(timeOff.filter((t) => t.stylist_id !== id));
      setMembers(members.filter((m) => m.stylist_id !== id));
    }
  }

  /** Sends (or resends) a team-login invite for this stylist: create the
   *  pending studio_members row ourselves (our own RLS already allows it),
   *  then have the server actually send the email via Resend. */
  async function inviteStylist(s: Stylist) {
    if (!s.email) {
      setInviteError(`Add an email for ${s.name} before sending an invite.`);
      return;
    }
    setInviteError(null);
    setInvitingId(s.id);
    try {
      let member = members.find((m) => m.stylist_id === s.id) ?? null;
      if (!member) {
        const { data: userData } = await supabase.auth.getUser();
        const studio_id = userData.user?.id;
        const { data, error } = await supabase
          .from("studio_members")
          .insert({ studio_id, stylist_id: s.id })
          .select()
          .single();
        if (error || !data) throw new Error(error?.message ?? "Couldn't create invite.");
        member = data as StudioMember;
        setMembers([...members, member]);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/invite-stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stylistId: s.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        // Email sending isn't set up yet (no RESEND_API_KEY) — the invite
        // itself still exists, so point her at the copy-link fallback below
        // instead of a generic failure.
        if (res.status === 501) {
          setInviteError(
            `Email sending isn't set up yet, so ${s.name}'s invite wasn't emailed — use "Copy invite link" below to send it yourself for now.`
          );
        } else {
          throw new Error(body.error ?? "Couldn't send invite.");
        }
      }
    } catch (err: any) {
      setInviteError(err.message ?? "Something went wrong sending the invite.");
    } finally {
      setInvitingId(null);
    }
  }

  function copyInviteLink(s: Stylist) {
    const member = members.find((m) => m.stylist_id === s.id);
    if (!member) return;
    const link = `${window.location.origin}/team-invite/${member.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!toStylistId || !toStart || !toEnd) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("stylist_time_off")
      .insert({ studio_id, stylist_id: toStylistId, start_date: toStart, end_date: toEnd, reason: toReason || null })
      .select()
      .single();
    if (!error && data) {
      setTimeOff([...timeOff, data as StylistTimeOff]);
      setToStylistId("");
      setToStart("");
      setToEnd("");
      setToReason("");
    }
  }

  async function removeTimeOff(id: string) {
    const { error } = await supabase.from("stylist_time_off").delete().eq("id", id);
    if (!error) setTimeOff(timeOff.filter((t) => t.id !== id));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl mb-1">Stylists</h1>
          <p className="text-charcoal/60 text-sm">
            Your team of 1099 contractors (or employees) and their time off — set each person&apos;s cut of a job
            here, then assign them from each booking&apos;s page, where they&apos;ll show up on the calendar
            automatically.
          </p>
        </div>
        {savedAt && <span className="text-xs text-green-700 whitespace-nowrap">Saved {format(savedAt, "h:mm a")} ✓</span>}
      </div>

      {inviteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{inviteError}</div>
      )}

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Team</h2>
        <form onSubmit={addStylist} className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[140px]"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[140px]"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[120px]"
            placeholder="Phone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              className="border border-charcoal/20 rounded-md px-2 py-1 w-16"
              placeholder="Pay %"
              value={newPayPercentage}
              onChange={(e) => setNewPayPercentage(e.target.value)}
            />
            <span className="text-charcoal/60">%</span>
          </div>
          <label className="flex items-center gap-1 text-charcoal/60">
            <input type="checkbox" checked={newIs1099} onChange={(e) => setNewIs1099(e.target.checked)} />
            1099
          </label>
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>

        {stylists.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No team members yet. Add your first stylist above.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {stylists.map((s) => {
              const member = members.find((m) => m.stylist_id === s.id) ?? null;
              const loginStatus = member?.status ?? null;
              const isEditing = editingId === s.id;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-2">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <input
                        className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[120px]"
                        placeholder="Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <input
                        className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[140px]"
                        placeholder="Email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                      <input
                        className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[120px]"
                        placeholder="Phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                      <label className="flex items-center gap-1 text-charcoal/60 text-xs">
                        <input type="checkbox" checked={editIs1099} onChange={(e) => setEditIs1099(e.target.checked)} />
                        1099
                      </label>
                      <button
                        onClick={() => saveEditing(s.id)}
                        className="bg-charcoal text-ivory rounded-md px-3 py-1 text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-charcoal/60 hover:text-charcoal text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className={s.active ? "text-charcoal" : "text-charcoal/40 line-through"}>{s.name}</span>
                        {s.is_1099 && (
                          <span className="text-[10px] uppercase tracking-wide bg-beige text-charcoal/70 px-1.5 py-0.5 rounded ml-2">
                            1099
                          </span>
                        )}
                        {loginStatus && (
                          <span
                            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ml-2 ${
                              loginStatus === "active"
                                ? "bg-green-50 text-green-700"
                                : loginStatus === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-charcoal/5 text-charcoal/50"
                            }`}
                          >
                            {loginStatus === "active" ? "Login active" : loginStatus === "pending" ? "Invite sent" : "Login revoked"}
                          </span>
                        )}
                        {(s.email || s.phone) && (
                          <span className="text-charcoal/60 ml-2">{[s.email, s.phone].filter(Boolean).join(" · ")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="border border-charcoal/20 rounded-md px-2 py-1 w-16 text-right"
                            value={s.pay_percentage}
                            onChange={(e) => updateStylist(s.id, { pay_percentage: Number(e.target.value) })}
                          />
                          <span className="text-charcoal/60">%</span>
                        </div>
                        <button onClick={() => startEditing(s)} className="text-charcoal/60 hover:text-charcoal">
                          Edit
                        </button>
                        {loginStatus !== "active" && (
                          <button
                            onClick={() => inviteStylist(s)}
                            disabled={invitingId === s.id}
                            className="border border-charcoal/20 rounded-md px-3 py-1 text-xs disabled:opacity-40"
                          >
                            {invitingId === s.id ? "Sending..." : loginStatus === "pending" ? "Resend invite" : "Invite to log in"}
                          </button>
                        )}
                        {loginStatus === "pending" && (
                          <button onClick={() => copyInviteLink(s)} className="text-gold text-xs hover:underline">
                            {copiedId === s.id ? "Link copied ✓" : "Copy invite link"}
                          </button>
                        )}
                        <button onClick={() => toggleActive(s)} className="text-charcoal/60 hover:text-charcoal">
                          {s.active ? "Mark inactive" : "Mark active"}
                        </button>
                        <button onClick={() => removeStylist(s.id)} className="text-red-600">
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

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Time off</h2>
        <form onSubmit={addTimeOff} className="flex flex-wrap items-end gap-2 mb-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Stylist</label>
            <select
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toStylistId}
              onChange={(e) => setToStylistId(e.target.value)}
            >
              <option value="">Select...</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Start date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toStart}
              onChange={(e) => setToStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">End date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toEnd}
              onChange={(e) => setToEnd(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-charcoal/60 mb-1">Reason (optional)</label>
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 w-full"
              value={toReason}
              onChange={(e) => setToReason(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>

        {timeOff.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No time off recorded.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {timeOff.map((t) => {
              const stylistName = stylists.find((s) => s.id === t.stylist_id)?.name ?? "Unknown";
              return (
                <div key={t.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                  <span>
                    {stylistName}
                    <span className="text-charcoal/60">
                      {" "}
                      · {t.start_date} – {t.end_date}
                      {t.reason ? ` · ${t.reason}` : ""}
                    </span>
                  </span>
                  <button onClick={() => removeTimeOff(t.id)} className="text-red-600">
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StylistsPage() {
  return (
    <AuthGuard>
      <StylistsContent />
    </AuthGuard>
  );
}
