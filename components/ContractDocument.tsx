import { Fragment } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string };

const HEADING_RE = /^([IVXLCDM]+)\.\s+(.+)$/;

function parseBlocks(text: string): Block[] {
  const rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const blocks: Block[] = [];

  for (const raw of rawBlocks) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && HEADING_RE.test(lines[0])) {
      blocks.push({ type: "heading", text: lines[0] });
      continue;
    }
    if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "bullets", items: lines.map((l) => l.replace(/^- /, "")) });
      continue;
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(_{3,})/g);
  return parts.map((part, i) =>
    /^_{3,}$/.test(part) ? (
      <span key={`${keyPrefix}-${i}`} className="inline-block border-b border-charcoal/40 w-40 align-bottom mx-1">
        &nbsp;
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    )
  );
}

export default function ContractDocument({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          const match = HEADING_RE.exec(block.text);
          return (
            <h2
              key={i}
              className="font-serif text-lg text-charcoal pt-4 mt-2 border-t border-charcoal/10 first:border-t-0 first:mt-0 first:pt-0"
            >
              {match ? (
                <>
                  <span className="text-gold mr-2">{match[1]}.</span>
                  {match[2]}
                </>
              ) : (
                block.text
              )}
            </h2>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={i} className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed text-charcoal/90">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-charcoal/90">
            {renderInline(block.text, `${i}`)}
          </p>
        );
      })}
    </div>
  );
}
