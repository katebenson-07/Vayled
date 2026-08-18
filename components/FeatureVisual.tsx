/**
 * Drop-in slot for a real product screenshot. Pass `src` once a screenshot
 * exists (see /public/marketing) and it renders as a normal framed image;
 * until then it falls back to a branded placeholder panel so pages ship
 * looking finished rather than broken.
 */
export default function FeatureVisual({
  label,
  src,
  alt,
}: {
  label: string;
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      <div className="rounded-xl overflow-hidden border border-charcoal/10 shadow-sm bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? label} className="w-full h-auto block" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-charcoal/10 bg-gradient-to-br from-beige/50 via-ivory to-beige/20 aspect-[16/10] flex items-center justify-center p-8">
      <p className="font-serif text-charcoal/30 text-lg text-center">{label}</p>
    </div>
  );
}
