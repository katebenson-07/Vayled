import { Fragment } from "react";
import { FIELD_MARKERS, stripFieldMarkers } from "@/lib/merge";

type Block =
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string };

const FIELD_SPLIT_RE = new RegExp(`${FIELD_MARKERS.start}([\\s\\S]*?)${FIELD_MARKERS.end}`, "g");
const PAYMENT_ROW_RE = /^(Contract total|Booking Deposit|Remaining Balance)\s*:\s*(.+)$/i;
const LEAD_LABEL_RE = /^([A-Z][A-Za-z &'-]{2,40}):\s*(.+)$/;

export function ContractSectionHeading({ numeral, title }: { numeral: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 pt-5 mt-3 border-t border-charcoal/10 first:border-t-0 first:mt-0 first:pt-0">
      <span className="font-heading text-base text-gold shrink-0">{numeral}.</span>
      <h2 className="font-heading text-base text-charcoal tracking-wide shrink-0 whitespace-nowrap">{title}</h2>
      <span className="flex-1 border-b border-charcoal/20" />
    </div>
  );
}

function parseBlocks(text: string): Block[] {
  const rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const blocks: Block[] = [];

  for (const raw of rawBlocks) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "bullets", items: lines.map((l) => l.replace(/^- /, "")) });
      continue;
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string) {
  const fieldSegments = text.split(FIELD_SPLIT_RE);
  const nodes: React.ReactNode[] = [];

  fieldSegments.forEach((seg, i) => {
    if (i % 2 === 1) {
      nodes.push(
        <span
          key={`${keyPrefix}-f-${i}`}
          className="inline-block px-2 border-b border-gold/60 text-charcoal align-bottom"
        >
          {seg}
        </span>
      );
      return;
    }
    const parts = seg.split(/(_{3,})/g);
    parts.forEach((part, j) => {
      if (/^_{3,}$/.test(part)) {
        nodes.push(
          <span key={`${keyPrefix}-${i}-${j}`} className="inline-block border-b border-charcoal/40 w-40 align-bottom mx-1">
            &nbsp;
          </span>
        );
      } else if (part) {
        nodes.push(<Fragment key={`${keyPrefix}-${i}-${j}`}>{part}</Fragment>);
      }
    });
  });

  return nodes;
}

function parsePaymentRow(item: string): { label: string; amount: string; sublabel?: string } | null {
  const plain = stripFieldMarkers(item);
  const m = PAYMENT_ROW_RE.exec(plain);
  if (!m) return null;
  const markedRest = item.slice(item.indexOf(":") + 1).trim();
  const commaIdx = markedRest.indexOf(",");
  if (commaIdx === -1) {
    return { label: m[1], amount: markedRest };
  }
  return {
    label: m[1],
    amount: markedRest.slice(0, commaIdx).trim(),
    sublabel: markedRest.slice(commaIdx + 1).trim().replace(/\.$/, ""),
  };
}

export default function ContractDocument({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  const paymentRows: { label: string; amount: string; sublabel?: string }[] = [];
  let inPaymentTable = false;

  const rendered: React.ReactNode[] = [];

  blocks.forEach((block, i) => {
    if (block.type === "bullets") {
      const normalItems: string[] = [];
      block.items.forEach((item) => {
        const payment = parsePaymentRow(item);
        if (payment) {
          inPaymentTable = true;
          paymentRows.push(payment);
        } else {
          normalItems.push(item);
        }
      });
      if (normalItems.length > 0) {
        if (inPaymentTable) {
          rendered.push(renderPaymentTable(paymentRows.splice(0), `pay-${i}`));
          inPaymentTable = false;
        }
        rendered.push(
          <ul key={i} className="space-y-1.5 text-sm leading-relaxed text-charcoal/90">
            {normalItems.map((item, j) => {
              const checkbox = item.startsWith("[ ] ");
              const body = checkbox ? item.slice(4) : item;
              return (
                <li key={j} className="flex gap-2">
                  <span className="text-gold shrink-0 mt-0.5">{checkbox ? "☐" : "◆"}</span>
                  <span>{renderInline(body, `${i}-${j}`)}</span>
                </li>
              );
            })}
          </ul>
        );
      }
      return;
    }

    if (inPaymentTable) {
      rendered.push(renderPaymentTable(paymentRows.splice(0), `pay-${i}`));
      inPaymentTable = false;
    }

    const leadMatch = LEAD_LABEL_RE.exec(block.text);
    rendered.push(
      <p key={i} className="text-sm leading-relaxed text-charcoal/90">
        {leadMatch ? (
          <>
            <span className="font-medium text-charcoal">{leadMatch[1]}: </span>
            {renderInline(leadMatch[2], `${i}`)}
          </>
        ) : (
          renderInline(block.text, `${i}`)
        )}
      </p>
    );
  });

  if (inPaymentTable) {
    rendered.push(renderPaymentTable(paymentRows.splice(0), "pay-end"));
  }

  return <div className="space-y-4">{rendered}</div>;
}

function renderPaymentTable(rows: { label: string; amount: string; sublabel?: string }[], key: string) {
  return (
    <div key={key} className="border border-charcoal/15 rounded-md divide-y divide-charcoal/10 overflow-hidden">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-charcoal">{row.label}</p>
            {row.sublabel && (
              <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-0.5">{row.sublabel}</p>
            )}
          </div>
          <p className="text-sm font-medium">{renderInline(row.amount, `${key}-${i}`)}</p>
        </div>
      ))}
    </div>
  );
}
