"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  Booking,
  Client,
  PartyMember,
  Payment,
  Stylist,
  StylistTimeOff,
  BookingStylist,
  ClientNote,
  Vendor,
  TrialSession,
  ClientPhoto,
} from "@/lib/types";
import { computeTimeline } from "@/lib/timeline";
import { format, differenceInCalendarDays, parseISO, subDays } from "date-fns";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NOTE_TAGS = ["General", "Hair texture", "Allergy", "Day-of note", "Trial"];
const VENDOR_ROLES = ["Photographer", "Florist", "Planner", "Venue coordinator", "Videographer", "Other"];

const PIPELINE_STEPS = [
  "Inquiry received",
  "Contract signed",
  "Deposit paid",
  "Trial done",
  "Week of wedding",
  "Wedding day",
  "Balance & review",
] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Trial notes" },
  { id: "timeline", label: "Timeline" },
  { id: "vendors", label: "Vendors" },
  { id: "payments", label: "Payments" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [assignedStylists, setAssignedStylists] = useState<BookingStylist[]>([]);
  const [conflicts, setConflicts] = useState<{ stylist_id: string; bride_name: string }[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [photos, setPhotos] = useState<(ClientPhoto & { url: string | null })[]>([]);
  const [uploadingTag, setUploadingTag] = useState<"inspo" | "trial_result" | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [linkCopied, setLinkCopied] = useState(false);

  const [newNoteTag, setNewNoteTag] = useState(NOTE_TAGS[0]);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [newVendorRole, setNewVendorRole] = useState(VENDOR_ROLES[0]);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [quickAssignCounts, setQuickAssignCounts] = useState<Record<string, string>>({});
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);

  async function loadAll() {
    const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", id).single();
    setBooking(bookingData as Booking);

    let weddingDate: string | null = null;
    let clientId: string | null = null;
    if (bookingData) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", (bookingData as Booking).client_id)
        .single();
      setClient(clientData as Client);
      weddingDate = (clientData as Client | null)?.wedding_date ?? null;
      clientId = (clientData as Client | null)?.id ?? null;
    }

    const { data: memberData } = await supabase
      .from("party_members")
      .select("*")
      .eq("booking_id", id)
      .order("order_index");
    setMembers((memberData as PartyMember[]) ?? []);

    const { data: paymentData } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", id)
      .order("paid_at");
    setPayments((paymentData as Payment[]) ?? []);

    const { data: stylistData } = await supabase.from("stylists").select("*").eq("active", true).order("name");
    setAllStylists((stylistData as Stylist[]) ?? []);

    const { data: timeOffData } = await supabase.from("stylist_time_off").select("*");
    setTimeOff((timeOffData as StylistTimeOff[]) ?? []);

    const { data: assignedData } = await supabase.from("booking_stylists").select("*").eq("booking_id", id);
    setAssignedStylists((assignedData as BookingStylist[]) ?? []);

    if (clientId) {
      const { data: noteData } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      setNotes((noteData as ClientNote[]) ?? []);

      const { data: vendorData } = await supabase.from("vendors").select("*").eq("client_id", clientId);
      setVendors((vendorData as Vendor[]) ?? []);

      const { data: photoData } = await supabase
        .from("client_photos")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      const photoRows = (photoData as ClientPhoto[]) ?? [];
      const signedUrls = await Promise.all(
        photoRows.map((p) => supabase.storage.from("client-photos").createSignedUrl(p.storage_path, 3600))
      );
      setPhotos(photoRows.map((p, i) => ({ ...p, url: signedUrls[i].data?.signedUrl ?? null })));
    }

    const { data: trialData } = await supabase.from("trial_sessions").select("*").eq("booking_id", id).maybeSingle();
    setTrial((trialData as TrialSession) ?? null);

    const { data: allAssignments } = await supabase
      .from("booking_stylists")
      .select("stylist_id, booking_id, bookings(id, clients(bride_name, wedding_date))");
    const assignmentRows = (allAssignments as any[]) ?? [];
    if (weddingDate) {
      const conflictRows = assignmentRows.filter(
        (r) => r.booking_id !== id && r.bookings?.clients?.wedding_date === weddingDate
      );
      setConflicts(
        conflictRows.map((r) => ({
          stylist_id: r.stylist_id,
          bride_name: r.bookings?.clients?.bride_name ?? "another job",
        }))
      );
    } else {
      setConflicts([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateBooking(fields: Partial<Booking>) {
    if (!booking) return;
    const { error } = await supabase.from("bookings").update(fields).eq("id", booking.id);
    if (!error) {
      setBooking({ ...booking, ...fields });
      setSavedAt(new Date());
      setSaveError(false);
    } else {
      setSaveError(true);
    }
  }

  async function addMember() {
    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;
    const { data, error } = await supabase
      .from("party_members")
      .insert({
        booking_id: id,
        stylist_id,
        name: "New member",
        role: "bridesmaid",
        hair: true,
        makeup: true,
        prep_minutes: 45,
        price: 0,
        order_index: members.length,
      })
      .select()
      .single();
    if (!error && data) setMembers([...members, data as PartyMember]);
  }

  async function updateMember(memberId: string, fields: Partial<PartyMember>) {
    const { error } = await supabase.from("party_members").update(fields).eq("id", memberId);
    if (!error) {
      setMembers(members.map((m) => (m.id === memberId ? { ...m, ...fields } : m)));
      setSavedAt(new Date());
      setSaveError(false);
    } else {
      setSaveError(true);
    }
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from("party_members").delete().eq("id", memberId);
    if (!error) setMembers(members.filter((m) => m.id !== memberId));
  }

  /** Instead of assigning each wedding party member one at a time, enter how many
   *  people each stylist on the job is doing. Fills from anyone not yet assigned
   *  first, then adds placeholder bridesmaids for any shortfall, and jumps to the
   *  timeline once done. */
  async function quickAssignByCount() {
    const plan = jobStylists
      .map((s) => ({ stylistId: s.id, count: parseInt(quickAssignCounts[s.id] || "0", 10) || 0 }))
      .filter((p) => p.count > 0);
    if (plan.length === 0) return;

    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;

    const unassigned = members.filter((m) => !m.assigned_stylist_id);
    let poolIndex = 0;
    const updates: { id: string; assigned_stylist_id: string }[] = [];
    const newRows: Record<string, unknown>[] = [];
    let placeholderNum = members.filter((m) => /^Bridesmaid \d+$/.test(m.name)).length;

    for (const { stylistId, count } of plan) {
      for (let i = 0; i < count; i++) {
        if (poolIndex < unassigned.length) {
          updates.push({ id: unassigned[poolIndex].id, assigned_stylist_id: stylistId });
          poolIndex++;
        } else {
          placeholderNum++;
          newRows.push({
            booking_id: id,
            stylist_id,
            name: `Bridesmaid ${placeholderNum}`,
            role: "bridesmaid",
            hair: true,
            makeup: true,
            prep_minutes: 45,
            price: 0,
            order_index: members.length + newRows.length,
            assigned_stylist_id: stylistId,
          });
        }
      }
    }

    await Promise.all(
      updates.map((u) => supabase.from("party_members").update({ assigned_stylist_id: u.assigned_stylist_id }).eq("id", u.id))
    );
    let insertedRows: PartyMember[] = [];
    if (newRows.length > 0) {
      const { data } = await supabase.from("party_members").insert(newRows).select();
      insertedRows = (data as PartyMember[]) ?? [];
    }

    setMembers((prev) => {
      const updated = prev.map((m) => {
        const u = updates.find((x) => x.id === m.id);
        return u ? { ...m, assigned_stylist_id: u.assigned_stylist_id } : m;
      });
      return [...updated, ...insertedRows];
    });
    setQuickAssignCounts({});
    setActiveTab("timeline");
  }

  /** Drag-and-drop on the Timeline tab: move a person onto another stylist's
   *  schedule (or back to Unassigned), optionally dropping them right before
   *  a specific person to reorder within that schedule. Renumbers order_index
   *  across the whole party so relative order within each stylist's group
   *  stays correct. */
  async function reorderAndAssign(
    draggedId: string | null,
    targetStylistId: string | null,
    beforeMemberId: string | null
  ) {
    if (!draggedId || draggedId === beforeMemberId) {
      setDraggedMemberId(null);
      return;
    }
    const current = [...members].sort((a, b) => a.order_index - b.order_index);
    const draggedIdx = current.findIndex((m) => m.id === draggedId);
    if (draggedIdx === -1) {
      setDraggedMemberId(null);
      return;
    }
    const [dragged] = current.splice(draggedIdx, 1);
    let insertAt = current.length;
    if (beforeMemberId) {
      const targetIdx = current.findIndex((m) => m.id === beforeMemberId);
      if (targetIdx !== -1) insertAt = targetIdx;
    }
    const reassigned = dragged.assigned_stylist_id !== targetStylistId;
    dragged.assigned_stylist_id = targetStylistId;
    current.splice(insertAt, 0, dragged);

    const next = current.map((m, i) => ({ ...m, order_index: i }));
    setMembers(next);
    setDraggedMemberId(null);

    await Promise.all(
      next
        .filter((m, i) => m.order_index !== members.find((orig) => orig.id === m.id)?.order_index || (m.id === draggedId && reassigned))
        .map((m) =>
          supabase
            .from("party_members")
            .update({ order_index: m.order_index, ...(m.id === draggedId ? { assigned_stylist_id: targetStylistId } : {}) })
            .eq("id", m.id)
        )
    );
  }

  async function addPayment() {
    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;
    const amountStr = prompt("Payment amount ($)");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;
    const { data, error } = await supabase
      .from("payments")
      .insert({ booking_id: id, stylist_id, amount, type: "other", paid_at: new Date().toISOString() })
      .select()
      .single();
    if (!error && data) setPayments([...payments, data as Payment]);
  }

  async function assignStylist(stylistId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    // First person assigned to a job defaults to lead; anyone added after
    // that defaults to assist (easy to flip either way afterward).
    const role = assignedStylists.length === 0 ? "lead" : "assist";
    const { data, error } = await supabase
      .from("booking_stylists")
      .insert({ booking_id: id, stylist_id: stylistId, studio_id, role })
      .select()
      .single();
    if (!error && data) setAssignedStylists([...assignedStylists, data as BookingStylist]);
  }

  async function unassignStylist(stylistId: string) {
    const row = assignedStylists.find((a) => a.stylist_id === stylistId);
    if (!row) return;
    const { error } = await supabase.from("booking_stylists").delete().eq("id", row.id);
    if (!error) setAssignedStylists(assignedStylists.filter((a) => a.id !== row.id));
  }

  async function setStylistRole(stylistId: string, role: "lead" | "assist") {
    const row = assignedStylists.find((a) => a.stylist_id === stylistId);
    if (!row) return;
    const { error } = await supabase.from("booking_stylists").update({ role }).eq("id", row.id);
    if (!error) {
      setAssignedStylists(assignedStylists.map((a) => (a.id === row.id ? { ...a, role } : a)));
    }
  }

  function roleForStylist(stylistId: string): "lead" | "assist" {
    return assignedStylists.find((a) => a.stylist_id === stylistId)?.role ?? "lead";
  }

  function isOff(stylistId: string): boolean {
    if (!client?.wedding_date) return false;
    return timeOff.some(
      (t) => t.stylist_id === stylistId && client.wedding_date! >= t.start_date && client.wedding_date! <= t.end_date
    );
  }

  async function addNote() {
    if (!newNoteBody.trim() || !client) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("client_notes")
      .insert({ studio_id, client_id: client.id, tag: newNoteTag, body: newNoteBody })
      .select()
      .single();
    if (!error && data) {
      setNotes([data as ClientNote, ...notes]);
      setNewNoteBody("");
    }
  }

  async function removeNote(noteId: string) {
    const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
    if (!error) setNotes(notes.filter((n) => n.id !== noteId));
  }

  async function addVendor() {
    if (!newVendorName.trim() || !client) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("vendors")
      .insert({ studio_id, client_id: client.id, role: newVendorRole, name: newVendorName, contact: newVendorContact || null })
      .select()
      .single();
    if (!error && data) {
      setVendors([...vendors, data as Vendor]);
      setNewVendorName("");
      setNewVendorContact("");
    }
  }

  async function removeVendor(vendorId: string) {
    const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
    if (!error) setVendors(vendors.filter((v) => v.id !== vendorId));
  }

  async function uploadPhoto(file: File, tag: "inspo" | "trial_result") {
    if (!client) return;
    setUploadingTag(tag);
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    if (!studio_id) {
      setUploadingTag(null);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${studio_id}/${client.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("client-photos").upload(path, file);
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploadingTag(null);
      return;
    }
    const { data, error } = await supabase
      .from("client_photos")
      .insert({ studio_id, client_id: client.id, booking_id: id, storage_path: path, tag })
      .select()
      .single();
    if (!error && data) {
      const { data: signed } = await supabase.storage.from("client-photos").createSignedUrl(path, 3600);
      setPhotos([{ ...(data as ClientPhoto), url: signed?.signedUrl ?? null }, ...photos]);
    }
    setUploadingTag(null);
  }

  async function removePhoto(photo: ClientPhoto) {
    await supabase.storage.from("client-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("client_photos").delete().eq("id", photo.id);
    if (!error) setPhotos(photos.filter((p) => p.id !== photo.id));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;
  if (!booking) return <p className="text-charcoal/60">Booking not found.</p>;

  const assignedIds = new Set(assignedStylists.map((a) => a.stylist_id));
  const jobStylists = allStylists.filter((s) => assignedIds.has(s.id));
  const conflictMap = new Map(conflicts.map((c) => [c.stylist_id, c.bride_name]));

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(booking.contract_total) - totalPaid;

  const chairMinutes = members.reduce((sum, m) => sum + Number(m.prep_minutes || 0), 0);

  type StylistTimeline = {
    stylistId: string | null;
    stylistName: string;
    entries: ReturnType<typeof computeTimeline>;
  };

  let stylistTimelines: StylistTimeline[] = [];
  if (booking.ready_by_time && client?.wedding_date && members.length > 0) {
    const readyBy = new Date(`${client.wedding_date}T${booking.ready_by_time}`);
    if (!isNaN(readyBy.getTime())) {
      const buffer = booking.buffer_minutes ?? 10;
      const groups = new Map<string, PartyMember[]>();
      for (const m of members) {
        const key = m.assigned_stylist_id ?? "unassigned";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
      }
      stylistTimelines = Array.from(groups.entries())
        .map(([key, groupMembers]) => {
          const stylist = key === "unassigned" ? null : allStylists.find((s) => s.id === key) ?? null;
          return {
            stylistId: stylist?.id ?? null,
            stylistName: stylist ? stylist.name : "Unassigned",
            entries: computeTimeline(readyBy, groupMembers, buffer),
          };
        })
        .sort((a, b) => {
          if (a.stylistId === null) return 1;
          if (b.stylistId === null) return -1;
          const roleA = roleForStylist(a.stylistId);
          const roleB = roleForStylist(b.stylistId);
          if (roleA !== roleB) return roleA === "lead" ? -1 : 1;
          return a.stylistName.localeCompare(b.stylistName);
        });
    }
  }

  const daysToWedding = client?.wedding_date
    ? differenceInCalendarDays(parseISO(client.wedding_date), new Date())
    : null;

  // A deposit counts as paid once there's a real payment recorded for it (from
  // the invoice's "Mark paid" or a manual payment), falling back to the legacy
  // booking.deposit_paid flag for older bookings set before that existed.
  const depositPayment = payments.find((p) => p.type === "deposit");
  const depositPaid = !!depositPayment || booking.deposit_paid;

  const pipelineDone: Record<(typeof PIPELINE_STEPS)[number], boolean> = {
    "Inquiry received": true,
    "Contract signed": booking.contract_signed,
    "Deposit paid": depositPaid,
    "Trial done": !!trial?.completed,
    "Week of wedding": daysToWedding !== null && daysToWedding <= 7 && daysToWedding >= 0,
    "Wedding day": daysToWedding === 0,
    "Balance & review": booking.status === "completed" && balanceDue <= 0,
  };
  const currentStepIndex = PIPELINE_STEPS.findIndex((step) => !pipelineDone[step]);

  const weddingMilestones = [
    {
      label: "Contract signed",
      done: booking.contract_signed,
      date: booking.contract_signed_at ? format(parseISO(booking.contract_signed_at), "MMM d") : null,
    },
    {
      label: "Deposit received",
      done: depositPaid,
      date: depositPayment ? format(parseISO(depositPayment.paid_at), "MMM d") : null,
    },
    {
      label: "Trial / preview done",
      done: !!trial?.completed,
      date: trial?.session_date ? format(parseISO(trial.session_date), "MMM d") : null,
    },
    {
      label: "Balance due",
      done: balanceDue <= 0,
      date: client?.wedding_date ? format(subDays(parseISO(client.wedding_date), 14), "MMM d") : null,
    },
    {
      label: "Wedding day",
      done: daysToWedding !== null && daysToWedding <= 0,
      date: client?.wedding_date ? format(parseISO(client.wedding_date), "MMM d") : null,
    },
  ];
  const milestonesDone = weddingMilestones.filter((m) => m.done).length;

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/${id}` : "";
  const portalAvailable = booking.status === "booked" || booking.status === "completed";

  function copyPortalLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 text-xs text-charcoal/50">
        <div className="flex items-center gap-1.5">
          <button onClick={() => router.back()} className="hover:text-charcoal flex items-center gap-1">
            ← Back
          </button>
          <span>›</span>
          <Link href="/clients" className="hover:text-charcoal">
            Clients
          </Link>
          <span>›</span>
          <span className="text-charcoal font-medium">{client?.bride_name ?? "Booking"}</span>
        </div>
        {saveError ? (
          <span className="text-red-600">Couldn&apos;t save last change — try again</span>
        ) : (
          savedAt && <span className="text-green-700">Saved {format(savedAt, "h:mm a")} ✓</span>
        )}
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-charcoal text-ivory flex items-center justify-center text-sm font-medium shrink-0">
            {initials(client?.bride_name ?? "?")}
          </div>
          <div>
            <h1 className="font-script text-4xl leading-tight mb-1">{client?.bride_name ?? "Booking"}</h1>
            <p className="text-charcoal/60 text-sm">
              Wedding date · <span className="text-charcoal font-medium">{client?.wedding_date ?? "No date set"}</span>
              {client?.venue ? ` · ${client.venue}` : ""} · Party of {members.length}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] uppercase tracking-wide bg-charcoal text-ivory px-2 py-0.5 rounded">
                Bride
              </span>
              {client?.referral_source && (
                <span className="text-xs text-charcoal/50">Referred by {client.referral_source}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/emails?booking=${id}`} className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-white uppercase text-xs tracking-wide">
            Message
          </Link>
          <Link href={`/contracts/${id}`} className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-white uppercase text-xs tracking-wide">
            Contract{booking.contract_signed ? " ✓" : ""}
          </Link>
          <Link href={`/invoices/${id}`} className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-white uppercase text-xs tracking-wide">
            Invoice
          </Link>
          {portalAvailable && (
            <>
              <a
                href={`/portal/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-white uppercase text-xs tracking-wide"
              >
                Bride portal
              </a>
              <button
                onClick={copyPortalLink}
                className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-white uppercase text-xs tracking-wide"
              >
                {linkCopied ? "Link copied ✓" : "Copy link"}
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("timeline")}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 uppercase text-xs tracking-wide"
          >
            Build timeline
          </button>
        </div>
      </div>

      <div className="flex flex-wrap border border-charcoal/10 rounded-xl overflow-hidden bg-beige">
        {PIPELINE_STEPS.map((step, i) => {
          const done = pipelineDone[step];
          const current = i === currentStepIndex;
          return (
            <div
              key={step}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs flex-1 min-w-[140px] border-r border-charcoal/10 last:border-r-0 ${
                current ? "bg-charcoal text-ivory" : ""
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${
                  done
                    ? current
                      ? "bg-ivory border-ivory text-charcoal"
                      : "bg-charcoal border-charcoal text-ivory"
                    : current
                    ? "border-ivory/60"
                    : "border-charcoal/30"
                }`}
              >
                {done && "✓"}
              </span>
              <span className={current ? "text-ivory" : "text-charcoal/70"}>{step}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white border border-charcoal/10 rounded-xl px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-charcoal/50 text-xs uppercase tracking-wide">Status</label>
          <select
            className="border border-charcoal/20 rounded-md px-2 py-1 text-sm"
            value={booking.status}
            onChange={(e) => updateBooking({ status: e.target.value as Booking["status"] })}
          >
            <option value="inquiry">Inquiry</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="ghosted">Ghosted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-charcoal/50 text-xs uppercase tracking-wide">Ready by</label>
          <input
            type="time"
            className="border border-charcoal/20 rounded-md px-2 py-1 text-sm"
            value={booking.ready_by_time ?? ""}
            onChange={(e) => updateBooking({ ready_by_time: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-1 border-b border-charcoal/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-charcoal text-charcoal font-medium"
                : "border-transparent text-charcoal/50 hover:text-charcoal/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="space-y-5">
            <section className="bg-white border border-charcoal/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Inspiration &amp; photos</h2>
                <div className="flex items-center gap-3">
                  <label className="text-gold text-sm hover:underline cursor-pointer">
                    {uploadingTag === "inspo" ? "Uploading..." : "+ Add inspo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploadingTag}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(file, "inspo");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="text-gold text-sm hover:underline cursor-pointer">
                    {uploadingTag === "trial_result" ? "Uploading..." : "+ Add trial result"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploadingTag}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(file, "trial_result");
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {photos.length === 0 ? (
                <p className="text-charcoal/60 text-sm">No photos yet — add inspiration pics or trial results.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-charcoal/10 group">
                      {p.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt={p.caption ?? p.tag} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-ivory" />
                      )}
                      <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wide bg-white/80 text-charcoal/50 rounded px-1.5 py-0.5">
                        {p.tag === "inspo" ? "Inspo" : "Trial result"}
                      </span>
                      <button
                        onClick={() => removePhoto(p)}
                        className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-charcoal/70 text-ivory rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-charcoal/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Wedding party</h2>
                {members.length > 0 && (
                  <span className="text-xs text-charcoal/50">
                    {members.length} added
                    {members.some((m) => !m.assigned_stylist_id) ? " · some unassigned" : ""}
                  </span>
                )}
              </div>
              {jobStylists.length === 0 ? (
                <p className="text-charcoal/60 text-sm mt-3">
                  Assign stylists to this job below, then come back here to quick-assign how many people each is doing.
                </p>
              ) : (
                <div className="bg-ivory rounded-lg p-3 mt-3">
                  <div className="flex flex-wrap items-end gap-3 text-xs">
                    <span className="text-charcoal/50 uppercase tracking-wide">Quick assign</span>
                    {jobStylists.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5">
                        <span className="text-charcoal/70">{s.name}</span>
                        <input
                          type="number"
                          min="0"
                          className="border border-charcoal/20 rounded-md px-1.5 py-0.5 w-12 text-xs"
                          placeholder="0"
                          value={quickAssignCounts[s.id] ?? ""}
                          onChange={(e) => setQuickAssignCounts({ ...quickAssignCounts, [s.id]: e.target.value })}
                        />
                      </div>
                    ))}
                    <button
                      onClick={quickAssignByCount}
                      className="bg-charcoal text-ivory rounded-md px-3 py-1 text-xs uppercase tracking-wide ml-auto"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-charcoal/50 mt-2">
                    Enter how many people each stylist is doing. Fills anyone not yet assigned first, adds placeholder
                    bridesmaids for the rest, then jumps to the timeline — where you can rename, adjust, or drag anyone
                    to a different stylist.
                  </p>
                </div>
              )}
            </section>

            <section className="bg-white border border-charcoal/10 rounded-xl p-5">
              <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Stylists on this job</h2>
              {!client?.wedding_date ? (
                <p className="text-charcoal/60 text-sm">Set a wedding date on this client to see stylist availability.</p>
              ) : allStylists.length === 0 ? (
                <p className="text-charcoal/60 text-sm">
                  No stylists on your team yet. Add your team on the{" "}
                  <Link href="/stylists" className="text-gold hover:underline">
                    Stylists
                  </Link>{" "}
                  page.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {allStylists.map((s) => {
                    const assigned = assignedIds.has(s.id);
                    const off = isOff(s.id);
                    const busyWith = conflictMap.get(s.id);
                    const statusLabel = assigned
                      ? "Assigned"
                      : off
                      ? "Off"
                      : busyWith
                      ? `Booked — ${busyWith}`
                      : "Available";
                    const statusClass = assigned
                      ? "text-green-700"
                      : off
                      ? "text-red-600"
                      : busyWith
                      ? "text-amber-600"
                      : "text-charcoal/60";
                    const cut = (Number(booking.contract_total) || 0) * (Number(s.pay_percentage) || 0) / 100;
                    const role = roleForStylist(s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                        <span>
                          {s.name}
                          {s.is_1099 && s.pay_percentage > 0 && (
                            <span className="text-charcoal/50 text-xs ml-2">
                              {s.pay_percentage}% · ${cut.toFixed(2)} on this job
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          {assigned ? (
                            <div className="flex gap-1 bg-beige/40 rounded-md p-0.5">
                              {(["lead", "assist"] as const).map((r) => (
                                <button
                                  key={r}
                                  onClick={() => setStylistRole(s.id, r)}
                                  className={`px-2 py-0.5 rounded text-xs capitalize ${
                                    role === r ? "bg-charcoal text-ivory" : "text-charcoal/60"
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className={statusClass}>{statusLabel}</span>
                          )}
                          <button
                            onClick={() => (assigned ? unassignStylist(s.id) : assignStylist(s.id))}
                            disabled={!assigned && (off || !!busyWith)}
                            className="border border-charcoal/20 rounded-md px-3 py-1 text-xs disabled:opacity-40"
                          >
                            {assigned ? "Remove" : "Assign"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <section className="bg-white border border-charcoal/10 rounded-xl p-5">
              <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-1">Timeline to wedding</h2>
              <p className="font-serif text-2xl mb-3">
                {daysToWedding !== null ? (daysToWedding >= 0 ? `${daysToWedding} days away` : "Wedding passed") : "No date set"}
              </p>
              <div className="h-1 bg-charcoal/10 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-charcoal rounded-full"
                  style={{ width: `${(milestonesDone / weddingMilestones.length) * 100}%` }}
                />
              </div>
              <div className="space-y-2 text-sm">
                {weddingMilestones.map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className={`flex items-center gap-2 ${m.done ? "line-through text-charcoal/40" : "text-charcoal"}`}>
                      <input type="checkbox" checked={m.done} readOnly />
                      {m.label}
                    </span>
                    <span className="text-charcoal/50 text-xs">{m.date ?? ""}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={`/trials/${id}`} className="border border-charcoal/20 rounded-md px-3 py-2 hover:bg-white">
              Open full trial session (fee, ratings, quote) →
            </Link>
          </div>
          <section className="bg-white border border-charcoal/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Stylist notes</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              <select
                className="border border-charcoal/20 rounded-md px-2 py-1 text-sm"
                value={newNoteTag}
                onChange={(e) => setNewNoteTag(e.target.value)}
              >
                {NOTE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="border border-charcoal/20 rounded-md px-2 py-1 text-sm flex-1 min-w-[200px]"
                placeholder="Add a note..."
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
              />
              <button onClick={addNote} className="bg-charcoal text-ivory rounded-md px-4 py-1 text-sm">
                Add
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-charcoal/60 text-sm">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="bg-ivory/50 border border-charcoal/10 rounded-md p-4">
                    <p className="text-sm text-charcoal leading-relaxed mb-3">{n.body}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide bg-charcoal/5 text-charcoal/60 rounded px-2 py-1">
                        {n.tag}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-charcoal/40">{format(parseISO(n.created_at), "MMM d, yyyy")}</span>
                        <button onClick={() => removeNote(n.id)} className="text-red-600 text-xs">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "vendors" && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Vendor team</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              className="border border-charcoal/20 rounded-md px-2 py-1 text-sm"
              value={newVendorRole}
              onChange={(e) => setNewVendorRole(e.target.value)}
            >
              {VENDOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 text-sm flex-1 min-w-[140px]"
              placeholder="Name"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
            />
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 text-sm flex-1 min-w-[140px]"
              placeholder="Contact info"
              value={newVendorContact}
              onChange={(e) => setNewVendorContact(e.target.value)}
            />
            <button onClick={addVendor} className="bg-charcoal text-ivory rounded-md px-4 py-1 text-sm">
              Add
            </button>
          </div>
          {vendors.length === 0 ? (
            <p className="text-charcoal/60 text-sm">No vendors added yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {vendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                  <span>
                    <span className="text-charcoal/60">{v.role}:</span> {v.name}
                    {v.contact ? ` · ${v.contact}` : ""}
                  </span>
                  <button onClick={() => removeVendor(v.id)} className="text-red-600 text-xs">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "timeline" && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Wedding-day timeline</h2>
            <div className="flex items-center gap-3">
              {jobStylists.length > 1 && (
                <span className="text-xs text-charcoal/50">
                  Split across {jobStylists.length} stylists — drag anyone to move them.
                </span>
              )}
              <button onClick={addMember} className="text-gold text-xs hover:underline">
                + Add person
              </button>
            </div>
          </div>
          {!booking.ready_by_time ? (
            <p className="text-charcoal/60 text-sm">Set a ready-by time above to generate the timeline.</p>
          ) : stylistTimelines.length === 0 ? (
            <p className="text-charcoal/60 text-sm">
              No one added yet — use Quick assign on the Wedding party section, or{" "}
              <button onClick={addMember} className="text-gold hover:underline">
                add a person
              </button>{" "}
              here.
            </p>
          ) : (
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-3 gap-3 text-center mb-2">
                <div className="bg-ivory rounded-lg p-3">
                  <p className="text-xs text-charcoal/60">Ready by</p>
                  <p className="font-medium">
                    {format(new Date(`${client?.wedding_date}T${booking.ready_by_time}`), "h:mm a")}
                  </p>
                </div>
                <div className="bg-ivory rounded-lg p-3">
                  <p className="text-xs text-charcoal/60 mb-1">Buffer between people</p>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min={0}
                      className="border border-charcoal/20 rounded-md px-1.5 py-0.5 text-sm w-14 text-center"
                      value={booking.buffer_minutes ?? 10}
                      onChange={(e) => updateBooking({ buffer_minutes: parseInt(e.target.value) || 0 })}
                    />
                    <span className="font-medium text-sm">min</span>
                  </div>
                </div>
                <div className="bg-ivory rounded-lg p-3">
                  <p className="text-xs text-charcoal/60 mb-1">Ceremony time</p>
                  <input
                    type="time"
                    className="border border-charcoal/20 rounded-md px-1.5 py-0.5 text-sm w-full"
                    value={booking.ceremony_time ?? ""}
                    onChange={(e) => updateBooking({ ceremony_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {stylistTimelines.map((st) => (
                  <div
                    key={st.stylistId ?? "unassigned"}
                    className={`rounded-lg border overflow-hidden ${
                      st.stylistId === null ? "border-red-200" : "border-charcoal/10"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        st.stylistId === null ? "bg-red-50" : "bg-charcoal"
                      }`}
                    >
                      <p className={`font-serif text-base ${st.stylistId === null ? "text-red-700" : "text-ivory"}`}>
                        {st.stylistName}
                        {st.stylistId !== null && (
                          <span className="text-xs font-sans font-normal text-ivory/60 ml-2">
                            {roleForStylist(st.stylistId) === "lead" ? "Lead" : "Assist"}
                          </span>
                        )}
                      </p>
                      {st.entries.length > 0 && (
                        <span className={`text-xs ${st.stylistId === null ? "text-red-700" : "text-ivory/70"}`}>
                          Starts {format(st.entries[0].start, "h:mm a")}
                        </span>
                      )}
                    </div>
                    {st.stylistId === null && (
                      <p className="text-xs text-red-700/80 px-4 pt-2">
                        Drag these onto a stylist above to split them onto that stylist's own timeline.
                      </p>
                    )}
                    <div
                      className="p-4 space-y-2 min-h-[3rem]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        reorderAndAssign(draggedMemberId, st.stylistId, null);
                      }}
                    >
                      {st.entries.length === 0 && (
                        <p className="text-xs text-charcoal/40 text-center py-2">Drop someone here</p>
                      )}
                      {st.entries.map((entry) => (
                        <div
                          key={entry.member.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            reorderAndAssign(draggedMemberId, st.stylistId, entry.member.id);
                          }}
                          className="border-b border-charcoal/10 pb-2 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              draggable
                              onDragStart={() => setDraggedMemberId(entry.member.id)}
                              onDragEnd={() => setDraggedMemberId(null)}
                              className="text-charcoal/30 select-none cursor-grab active:cursor-grabbing"
                              title="Drag to move"
                            >
                              ⠿
                            </span>
                            <input
                              className="border border-charcoal/20 rounded-md px-2 py-1 text-sm flex-1 min-w-0"
                              value={entry.member.name}
                              onChange={(e) => updateMember(entry.member.id, { name: e.target.value })}
                            />
                            <span className="text-charcoal/60 text-xs whitespace-nowrap">
                              {format(entry.start, "h:mm a")}–{format(entry.end, "h:mm a")}
                            </span>
                            <button
                              onClick={() => removeMember(entry.member.id)}
                              className="text-red-600 text-xs shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 pl-5 text-xs text-charcoal/60">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={entry.member.hair}
                                onChange={(e) => updateMember(entry.member.id, { hair: e.target.checked })}
                              />
                              Hair
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={entry.member.makeup}
                                onChange={(e) => updateMember(entry.member.id, { makeup: e.target.checked })}
                              />
                              Makeup
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="border border-charcoal/20 rounded-md px-1.5 py-0.5 text-xs w-12"
                                value={entry.member.prep_minutes}
                                onChange={(e) =>
                                  updateMember(entry.member.id, { prep_minutes: parseInt(e.target.value) || 0 })
                                }
                              />
                              <span>min</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-charcoal/50 text-xs">Total chair time: {chairMinutes} min across {members.length} people.</p>

              <p className="text-charcoal/60 pt-2 border-t border-charcoal/10">
                Everyone ready by {format(new Date(`${client?.wedding_date}T${booking.ready_by_time}`), "h:mm a")}
                {booking.ceremony_time ? ` · Ceremony ${format(new Date(`${client?.wedding_date}T${booking.ceremony_time}`), "h:mm a")}` : ""}
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === "payments" && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Payments</h2>
            <button onClick={addPayment} className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs uppercase tracking-wide">
              Record payment
            </button>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-charcoal/60">Total paid: ${totalPaid.toFixed(2)}</span>
            <span className={balanceDue > 0 ? "text-red-600" : "text-green-700"}>
              Balance due: ${balanceDue.toFixed(2)}
            </span>
          </div>
          {payments.length === 0 ? (
            <p className="text-charcoal/60 text-sm">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                  <span>{format(new Date(p.paid_at), "MMM d, yyyy")}</span>
                  <span>${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <AuthGuard>
      <BookingDetail />
    </AuthGuard>
  );
}
