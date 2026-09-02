/**
 * Brand mark: a plain "VAYLED" wordmark (Prata, font-logo), uppercase with
 * modest tracking (tighter than the old tracking-widest-lg, to match the
 * mockup previews Kate approved), one size per `size` prop — no
 * oversized-V/nested-letter treatment. Optional "BRIDAL HAIR & MAKEUP"
 * tagline in ultra-spaced Lora Light (font-tagline) underneath — used on the
 * Dashboard and Invoice, left off in the sidebar where space is tight.
 */
export default function Logo({
  size = "md",
  tagline = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
  className?: string;
}) {
  const wordmarkSize = size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-xl";

  return (
    <span className={`inline-block ${className}`}>
      <span className={`font-logo ${wordmarkSize} uppercase tracking-[0.08em]`}>Vayled</span>
      {tagline && (
        <span className="font-tagline font-light text-[10px] uppercase tracking-[0.3em] opacity-60 block mt-1">
          Bridal Hair &amp; Makeup
        </span>
      )}
    </span>
  );
}
