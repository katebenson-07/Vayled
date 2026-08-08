/**
 * Wordmark treatment matching the brand logo: an oversized serif "V" with
 * "AYLED" set smaller alongside it, baseline-aligned.
 */
export default function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const vSize = size === "lg" ? "text-6xl" : size === "md" ? "text-3xl" : "text-2xl";
  const restSize = size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <span className={`font-serif inline-flex items-baseline ${className}`}>
      <span className={`${vSize} leading-none`}>V</span>
      <span className={`${restSize} tracking-widest-lg`}>AYLED</span>
    </span>
  );
}
