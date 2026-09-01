/**
 * Brand mark: an oversized "V" (Italiana Bold, font-logo) with "AYLED"
 * nested inside its open counter, weight 300, baseline-aligned. Optional
 * "BRIDAL HAIR & MAKEUP" tagline in ultra-spaced Lora Light (font-tagline)
 * underneath — used on the Dashboard and Invoice, left off in the sidebar
 * where space is tight.
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
  const vSize = size === "lg" ? "text-7xl" : size === "md" ? "text-3xl" : "text-2xl";
  const restSize = size === "lg" ? "text-3xl" : size === "md" ? "text-base" : "text-sm";
  const restMargin = size === "lg" ? "-ml-2.5" : "-ml-1";

  return (
    <span className={`inline-block ${className}`}>
      <span className="font-logo font-bold inline-flex items-baseline">
        <span className={`${vSize} leading-none`}>V</span>
        <span className={`${restSize} font-light ${restMargin} tracking-wide`}>AYLED</span>
      </span>
      {tagline && (
        <span className="font-tagline font-light text-[10px] uppercase tracking-[0.3em] opacity-60 block mt-1">
          Bridal Hair &amp; Makeup
        </span>
      )}
    </span>
  );
}
