function Field({ label, value, placeholder }: { label: string; value?: string; placeholder: string }) {
  const filled = Boolean(value && value !== "TBD");
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mb-1">{label}</p>
      <p
        className={`text-sm pb-1.5 border-b ${
          filled ? "border-gold/50 text-charcoal" : "border-charcoal/20 text-charcoal/30 italic"
        }`}
      >
        {filled ? value : placeholder}
      </p>
    </div>
  );
}

export default function ContractLetterhead({
  studioName,
  brideName,
  weddingDate,
  venue,
}: {
  studioName: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
}) {
  return (
    <div className="mb-8 print:mb-6">
      <div className="text-center">
        <p className="font-script text-5xl text-charcoal leading-none">{studioName}</p>
        <p className="text-[11px] uppercase tracking-widest-lg text-charcoal/40 mt-3">Bridal Hair &amp; Makeup</p>
        <div className="flex items-center gap-3 max-w-xs mx-auto my-4">
          <span className="flex-1 h-px bg-charcoal/20" />
          <span className="text-gold text-xs">&#9670;</span>
          <span className="flex-1 h-px bg-charcoal/20" />
        </div>
        <p className="text-[11px] uppercase tracking-widest-lg text-gold">Bridal Contract</p>
        <p className="text-sm text-charcoal/60 max-w-xl mx-auto mt-5 leading-relaxed">
          This agreement is entered into between {studioName} (the &quot;Hair Stylist&quot;) and the Client named below,
          and constitutes the entire agreement between both parties regarding the services described herein.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-5 bg-beige/15 border border-charcoal/10 rounded-md p-6 mt-6">
        <Field label="Client name" value={brideName} placeholder="Bride's full name" />
        <Field label="Wedding date" value={weddingDate} placeholder="Month DD, YYYY" />
        <Field label="Venue" value={venue} placeholder="Venue name & city" />
        <Field label="Hair stylist" value={studioName} placeholder="—" />
      </div>
    </div>
  );
}
