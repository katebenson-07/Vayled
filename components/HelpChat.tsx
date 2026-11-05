"use client";

import { useEffect, useRef, useState } from "react";
import { SUPPORT_EMAIL } from "@/lib/helpKnowledge";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = {
  site: ["What does Vayled do?", "How much does it cost?", "When can I join?"],
  app: ["How do I change my text messages?", "How do I invite a stylist?", "How does payroll work?"],
};

export default function HelpChat({ mode }: { mode: "site" | "app" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, mode }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply =
        data.reply ||
        (data.error === "rate_limited"
          ? "You've asked a lot of questions in a short time. Please try again in a few minutes."
          : `Sorry, I can't answer right now. Please email ${SUPPORT_EMAIL}.`);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: `Sorry, I can't answer right now. Please email ${SUPPORT_EMAIL}.` }]);
    }
    setSending(false);
  }

  return (
    <div className="fixed right-4 z-40 print:hidden" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
      {open && (
        <div className="mb-3 w-[min(92vw,22rem)] h-[min(70vh,30rem)] bg-white border border-charcoal/15 shadow-xl flex flex-col">
          <div className="bg-charcoal text-ivory px-5 py-4 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.25em]">Vayled help</p>
            <button onClick={() => setOpen(false)} aria-label="Close help" className="text-ivory/80 hover:text-ivory text-lg leading-none">
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div>
                <p className="text-charcoal/70 mb-3">
                  {mode === "app" ? "How can I help with Vayled?" : "Hi! Ask me anything about Vayled."}
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS[mode].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left border border-charcoal/20 px-3 py-2 text-charcoal hover:bg-charcoal/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <p
                  className={`inline-block max-w-[85%] px-3 py-2 whitespace-pre-wrap text-left ${
                    m.role === "user" ? "bg-charcoal text-ivory" : "bg-ivory text-charcoal"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {sending && <p className="text-charcoal/40 text-xs">Typing...</p>}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-charcoal/10 flex"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Type your question"
              className="flex-1 px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 text-[11px] uppercase tracking-[0.2em] text-charcoal disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((o) => !o)}
          className="bg-charcoal text-ivory text-[11px] uppercase tracking-[0.25em] px-5 py-3 shadow-lg hover:bg-charcoal/90"
        >
          {open ? "Close" : "Help"}
        </button>
      </div>
    </div>
  );
}
