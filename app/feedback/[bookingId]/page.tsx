"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

interface FeedbackInfo {
  bride_name: string;
  wedding_date: string | null;
  studio_name: string;
  submitted: boolean;
}

const HAIR_TOPICS = ["Shape", "Volume", "Face framing", "Hold", "Accessories"];
const MAKEUP_TOPICS = ["Complexion", "Eyes", "Lashes", "Lip color", "Overall tone"];
const CONFIDENCE = [
  { id: "yes", title: "Yes, this feels like me", note: "Only the small notes above, if any." },
  { id: "refine", title: "Yes, with a few refinements", note: "I'm happy with the direction and want the noted edits." },
  { id: "talk", title: "I'd like to talk it through", note: "A quick follow-up would help me feel certain." },
];

// Palette from the approved mockup.
const INK = "text-[#3B1A1F]";
const MUTED = "text-[#3B1A1F]/65";
const CARD = "bg-[#DDD9CA]";
const FIELD = "bg-[#EBEAE2]";
const LINE = "border-[#B9AE9C]";

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <span className={`text-[11px] tracking-[0.25em] ${INK}`}>
        <span className="font-mono mr-3">{n}</span>
        <span className="uppercase">{children}</span>
      </span>
      <span className={`flex-1 border-t ${LINE}`} />
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className={`font-script text-3xl md:text-4xl leading-tight mb-3 ${INK}`}>{children}</h2>;
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`px-4 py-2 text-sm border ${LINE} transition-colors ${
              on ? "bg-[#3B1A1F] text-[#EBEAE2]" : `${FIELD} ${INK} hover:bg-[#F2F1EA]`
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Notes({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className={`relative border ${LINE} ${FIELD}`}>
      <textarea
        rows={4}
        maxLength={600}
        className={`w-full bg-transparent p-4 pb-8 text-[15px] leading-relaxed resize-none placeholder:text-[#3B1A1F]/35 focus:outline-none ${INK}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className={`absolute bottom-2 right-3 text-xs ${MUTED}`}>{value.length}/600</span>
    </div>
  );
}

function Scale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`py-4 text-xl font-script border ${LINE} transition-colors ${
              value === n ? "bg-[#3B1A1F] text-[#EBEAE2]" : `${FIELD} ${INK} hover:bg-[#F2F1EA]`
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={`flex justify-between mt-2 text-[11px] uppercase tracking-[0.2em] ${MUTED}`}>
        <span>Not quite me</span>
        <span>Unmistakably me</span>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [info, setInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [gotHair, setGotHair] = useState(true);
  const [gotMakeup, setGotMakeup] = useState(true);
  const [overall, setOverall] = useState(0);
  const [hairRating, setHairRating] = useState(0);
  const [hairTopics, setHairTopics] = useState<string[]>([]);
  const [hairNotes, setHairNotes] = useState("");
  const [makeupRating, setMakeupRating] = useState(0);
  const [makeupTopics, setMakeupTopics] = useState<string[]>([]);
  const [makeupNotes, setMakeupNotes] = useState("");
  const [confidence, setConfidence] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [photoOk, setPhotoOk] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_preview_feedback", { p_booking_id: bookingId });
      if (rpcError || !data) setMissing(true);
      else setInfo(data as FeedbackInfo);
      setLoading(false);
    })();
  }, [bookingId]);

  const steps = useMemo(() => {
    const hairDone = !gotHair || hairRating > 0 || hairTopics.length > 0 || hairNotes.trim() !== "";
    const makeupDone = !gotMakeup || makeupRating > 0 || makeupTopics.length > 0 || makeupNotes.trim() !== "";
    return [
      { n: "01", label: "First impression", done: overall > 0 },
      { n: "02", label: "Hair details", done: gotHair && hairDone && (hairRating > 0 || hairTopics.length > 0 || hairNotes.trim() !== "") },
      { n: "03", label: "Makeup details", done: gotMakeup && makeupDone && (makeupRating > 0 || makeupTopics.length > 0 || makeupNotes.trim() !== "") },
      { n: "04", label: "Day-of confidence", done: confidence !== "" },
    ];
  }, [overall, gotHair, gotMakeup, hairRating, hairTopics, hairNotes, makeupRating, makeupTopics, makeupNotes, confidence]);
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const canSend = overall > 0 && confidence !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("submit_preview_feedback_v2", {
      p_booking_id: bookingId,
      p_answers: {
        received_hair: gotHair,
        received_makeup: gotMakeup,
        overall,
        hair_rating: gotHair && hairRating ? hairRating : null,
        hair_topics: gotHair ? hairTopics : [],
        hair_notes: gotHair ? hairNotes : "",
        makeup_rating: gotMakeup && makeupRating ? makeupRating : null,
        makeup_topics: gotMakeup ? makeupTopics : [],
        makeup_notes: gotMakeup ? makeupNotes : "",
        confidence,
        anything_else: anythingElse,
        photo_permission: photoOk,
      },
    });
    setSubmitting(false);
    const result = data as { ok: boolean; error?: string } | null;
    if (rpcError || !result?.ok) {
      setError(result?.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  const hero = (
    <header className="bg-[#38181D] text-[#F1EEE6]">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-28 md:pb-36">
        <div className="flex items-start justify-between mb-16 md:mb-24">
          <Logo size="md" />
          {info && <span className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] opacity-80">{info.studio_name}</span>}
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] opacity-70 mb-5">Bridal preview · A little reflection</p>
        <div className="md:flex md:items-end md:justify-between gap-12">
          <h1 className="font-script text-6xl md:text-8xl leading-none">
            How did it <em className="italic">feel?</em>
          </h1>
          <p className="max-w-sm leading-relaxed opacity-85 mt-8 md:mt-0">
            Your preview is a conversation, not a final exam. Share what felt beautiful and what you&apos;d like to
            refine. We want you to feel unmistakably like yourself.
          </p>
        </div>
      </div>
    </header>
  );

  const page = (body: React.ReactNode) => (
    <div className="min-h-screen bg-[#EAE9E1]">
      {hero}
      {body}
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[#3B1A1F]/40 py-10">Powered by Vayled</p>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#EAE9E1] flex items-center justify-center text-[#3B1A1F]/60">Loading...</div>;
  if (missing || !info)
    return (
      <div className="min-h-screen bg-[#EAE9E1] flex items-center justify-center px-6 text-center text-[#3B1A1F]/70">
        This link isn&apos;t working. Please reach out to your stylist.
      </div>
    );

  const first = info.bride_name.split(" ")[0];

  if (done || info.submitted)
    return page(
      <div className="max-w-2xl mx-auto px-6 -mt-16 md:-mt-24 relative">
        <div className={`${CARD} border ${LINE} p-10 md:p-14 text-center`}>
          <Heading>Thank you{done ? "" : " again"}, {first}.</Heading>
          <div className="w-12 border-t border-[#3B1A1F]/40 mx-auto my-5" />
          <p className={`leading-relaxed ${MUTED}`}>
            {info.studio_name} has your reflections and will use them to make your wedding day look exactly as you
            imagine.
          </p>
        </div>
      </div>
    );

  return page(
    <form onSubmit={submit} className="max-w-6xl mx-auto px-4 md:px-6 -mt-16 md:-mt-24 relative">
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8 lg:items-start">
        <aside className={`${CARD} border ${LINE} p-6 mb-6 lg:mb-0 lg:sticky lg:top-6`}>
          <p className={`text-[11px] uppercase tracking-[0.3em] ${MUTED} mb-3`}>Prepared for</p>
          <p className={`font-script text-3xl leading-tight ${INK}`}>{info.bride_name}</p>
          {info.wedding_date && (
            <p className={`text-sm mt-1 ${MUTED}`}>Wedding · {format(parseISO(info.wedding_date), "MMM d, yyyy")}</p>
          )}
          <div className={`border-t ${LINE} my-5`} />
          <div className={`flex justify-between text-[11px] uppercase tracking-[0.25em] ${MUTED} mb-2`}>
            <span>Your progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-1 bg-[#EBEAE2]">
            <div className="h-1 bg-[#3B1A1F] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <ol className="hidden lg:block mt-6">
            {steps.map((s) => (
              <li key={s.n} className={`flex gap-4 items-baseline py-3 border-b last:border-b-0 ${LINE} ${INK}`}>
                <span className={`font-mono text-xs ${s.done ? "" : "opacity-50"}`}>{s.done ? "✓" : s.n}</span>
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block bg-[#EBEAE2] p-4 mt-6">
            <p className={`text-[11px] uppercase tracking-[0.2em] ${INK} mb-2`}>A private note</p>
            <p className={`text-sm leading-relaxed ${MUTED}`}>
              Your responses are only shared with {info.studio_name} and your assigned beauty team.
            </p>
          </div>
        </aside>

        <div className={`${CARD} border ${LINE} p-6 md:p-10 space-y-14`}>
          <section>
            <Eyebrow n="01">First impression</Eyebrow>
            <Heading>Tell us where you landed, {first}.</Heading>
            <p className={`mb-6 leading-relaxed ${MUTED}`}>
              There are no wrong answers. Your honest reaction helps us make thoughtful, specific refinements.
            </p>
            <p className={`text-sm font-medium mb-3 ${INK}`}>Which parts of your preview did you receive?</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                { label: "Bridal hair", on: gotHair, set: setGotHair },
                { label: "Bridal makeup", on: gotMakeup, set: setGotMakeup },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => o.set(!o.on)}
                  className={`flex items-center justify-between px-5 py-4 border ${LINE} text-left ${
                    o.on ? "bg-[#3B1A1F] text-[#EBEAE2]" : `${FIELD} ${INK}`
                  }`}
                >
                  <span>{o.label}</span>
                  <span className="text-sm">{o.on ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <p className={`text-sm font-medium mb-3 ${INK}`}>
              Overall, how did you feel when you saw the finished look? *
            </p>
            <Scale value={overall} onChange={setOverall} />
          </section>

          {gotHair && (
            <section>
              <Eyebrow n="02">Hair details</Eyebrow>
              <Heading>What would you like to keep, or refine?</Heading>
              <p className={`mb-6 leading-relaxed ${MUTED}`}>
                Select any details you&apos;d like us to pay special attention to, then leave as much context as feels
                helpful.
              </p>
              <p className={`text-sm font-medium mb-3 ${INK}`}>How did your hair feel?</p>
              <div className="mb-6">
                <Scale value={hairRating} onChange={setHairRating} />
              </div>
              <p className={`text-sm font-medium mb-3 ${INK}`}>I have thoughts about...</p>
              <div className="mb-6">
                <Chips options={HAIR_TOPICS} value={hairTopics} onChange={setHairTopics} />
              </div>
              <p className={`text-sm font-medium mb-3 ${INK}`}>Hair notes</p>
              <Notes
                value={hairNotes}
                onChange={setHairNotes}
                placeholder="Example: I loved the softness around my face. Could we bring the bun slightly lower and leave one more piece near my right cheek?"
              />
            </section>
          )}

          {gotMakeup && (
            <section>
              <Eyebrow n="03">Makeup details</Eyebrow>
              <Heading>Let&apos;s fine-tune the finishing touches.</Heading>
              <p className={`mb-6 leading-relaxed ${MUTED}`}>
                Think about how the look felt in person, in natural light, and in any photos you took after the
                appointment.
              </p>
              <p className={`text-sm font-medium mb-3 ${INK}`}>How did your makeup feel?</p>
              <div className="mb-6">
                <Scale value={makeupRating} onChange={setMakeupRating} />
              </div>
              <p className={`text-sm font-medium mb-3 ${INK}`}>I have thoughts about...</p>
              <div className="mb-6">
                <Chips options={MAKEUP_TOPICS} value={makeupTopics} onChange={setMakeupTopics} />
              </div>
              <p className={`text-sm font-medium mb-3 ${INK}`}>Makeup notes</p>
              <Notes
                value={makeupNotes}
                onChange={setMakeupNotes}
                placeholder="Example: I loved the glow. Could we go a little softer on the lip and add a bit more definition to my lashes?"
              />
            </section>
          )}

          <section>
            <Eyebrow n="04">Looking ahead</Eyebrow>
            <Heading>How are you feeling about the wedding day?</Heading>
            <p className={`mb-6 leading-relaxed ${MUTED}`}>
              This helps us understand whether your look is ready to document or whether another conversation would
              feel reassuring.
            </p>
            <p className={`text-sm font-medium mb-3 ${INK}`}>I feel confident moving forward with this look... *</p>
            <div className="space-y-3 mb-8">
              {CONFIDENCE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConfidence(c.id)}
                  className={`w-full flex items-start gap-4 text-left px-5 py-4 border ${
                    confidence === c.id ? "border-[#3B1A1F] bg-[#F2F1EA]" : `${LINE} ${FIELD}`
                  }`}
                >
                  <span
                    className={`mt-1 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${LINE}`}
                  >
                    {confidence === c.id && <span className="w-2.5 h-2.5 rounded-full bg-[#3B1A1F]" />}
                  </span>
                  <span>
                    <span className={`block ${INK}`}>{c.title}</span>
                    <span className={`block text-sm ${MUTED}`}>{c.note}</span>
                  </span>
                </button>
              ))}
            </div>

            <p className={`text-sm font-medium mb-3 ${INK}`}>Anything else you want us to know?</p>
            <div className="mb-8">
              <Notes
                value={anythingElse}
                onChange={setAnythingElse}
                placeholder="Questions, timing notes, product sensitivities, or anything else on your mind..."
              />
            </div>

            <label className={`flex items-start gap-4 px-5 py-4 border ${LINE} ${FIELD} cursor-pointer`}>
              <input
                type="checkbox"
                className="mt-1.5 accent-[#3B1A1F]"
                checked={photoOk}
                onChange={(e) => setPhotoOk(e.target.checked)}
              />
              <span>
                <span className={`block ${INK}`}>Photo permission (optional)</span>
                <span className={`block text-sm ${MUTED}`}>
                  {info.studio_name} may keep preview photos in a private client file for day-of reference.
                </span>
              </span>
            </label>
          </section>

          <div className={`border-t ${LINE} pt-6`}>
            {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
            <p className={`text-sm mb-5 ${MUTED}`}>Complete the two starred questions to send your feedback.</p>
            <div className="md:flex md:items-center md:justify-between gap-8">
              <p className={`text-xs leading-relaxed mb-5 md:mb-0 max-w-md ${MUTED}`}>
                By submitting, your responses will be saved securely to your Vayled client profile and shared with{" "}
                {info.studio_name}.
              </p>
              <button
                type="submit"
                disabled={!canSend || submitting}
                className="w-full md:w-auto px-10 py-4 bg-[#3B1A1F] text-[#EBEAE2] text-[12px] uppercase tracking-[0.25em] disabled:opacity-40 hover:bg-[#4D0E12] transition-colors"
              >
                {submitting ? "Sending" : "Send my feedback"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
