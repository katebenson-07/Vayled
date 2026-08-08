import { format } from "date-fns";

export default function ContractFooter() {
  return (
    <div className="text-center mt-10 print:mt-8">
      <p className="font-script text-2xl text-charcoal">Thank you for trusting us with your most beautiful day.</p>
      <p className="text-[10px] uppercase tracking-widest-lg text-charcoal/40 mt-2">
        Contract prepared {format(new Date(), "MMMM d, yyyy")}
      </p>
    </div>
  );
}
