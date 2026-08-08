export default function ContractSignatureBlock({
  studioName,
  brideName,
}: {
  studioName: string;
  brideName?: string;
}) {
  return (
    <div className="mt-8 pt-2">
      <div className="flex items-center gap-3 max-w-xs mx-auto mb-6">
        <span className="flex-1 h-px bg-charcoal/20" />
        <span className="text-gold text-xs">&#9670;</span>
        <span className="flex-1 h-px bg-charcoal/20" />
      </div>
      <p className="text-center text-[11px] uppercase tracking-widest-lg text-charcoal/50 mb-8">
        By signing below, both parties confirm they have read and agreed to all terms set forth in this contract.
      </p>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8 text-sm">
        <div>
          <div className="border-b border-charcoal/30 h-10" />
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Client signature</p>
        </div>
        <div>
          <div className="border-b border-charcoal/30 h-10" />
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Hair stylist signature</p>
        </div>
        <div>
          <div className="border-b border-charcoal/30 h-8" />
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Date</p>
        </div>
        <div>
          <div className="border-b border-charcoal/30 h-8" />
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Date</p>
        </div>
        <div>
          <p className="text-charcoal/70 pb-1.5 border-b border-charcoal/20 min-h-[1.5rem]">{brideName || ""}</p>
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Printed name</p>
        </div>
        <div>
          <p className="text-charcoal/70 pb-1.5 border-b border-charcoal/20 min-h-[1.5rem]">{studioName}</p>
          <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">Printed name</p>
        </div>
      </div>
    </div>
  );
}
