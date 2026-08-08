"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { fetchInboxItems, getInboxLastSeen, setInboxLastSeen, InboxItem } from "@/lib/inbox";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TYPE_LABEL: Record<InboxItem["type"], string> = {
  inquiry: "Inquiry",
  payment: "Payment",
  trial: "Trial",
  contract: "Contract",
};

function InboxContent() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadBefore, setUnreadBefore] = useState<string>(new Date(0).toISOString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const lastSeen = getInboxLastSeen();
      setUnreadBefore(lastSeen);
      const data = await fetchInboxItems();
      setItems(data);
      setLoading(false);
      setInboxLastSeen(new Date().toISOString());
    }
    load();
  }, []);

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl mb-1">Inbox</h1>
          <p className="text-charcoal/60 text-sm">
            New inquiries, payments, trial sessions, and signed contracts, in one place.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="text-charcoal/60 text-sm">Nothing here yet. Activity will show up as it happens.</p>
        </div>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10 overflow-hidden">
          {items.map((item) => {
            const unread = item.timestamp > unreadBefore;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-5 py-4 ${unread ? "bg-beige/20" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-charcoal/10 text-charcoal text-xs font-medium flex items-center justify-center shrink-0">
                  {initials(item.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <span className="text-xs text-charcoal/50 whitespace-nowrap">
                      {formatDistanceToNowStrict(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal/80 mt-0.5">
                    <span className="text-[11px] uppercase tracking-wide text-gold mr-1.5">
                      {TYPE_LABEL[item.type]}
                    </span>
                    {item.title}
                  </p>
                  <p className="text-sm text-charcoal/50 truncate mt-0.5">{item.snippet}</p>
                </div>
                {unread && <span className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <AuthGuard>
      <InboxContent />
    </AuthGuard>
  );
}
