"use client";

import Link from "next/link";

export interface PageTab {
  key: string;
  label: string;
  count?: number;
  /** Link tabs navigate; leave off for tabs that switch the page content. */
  href?: string;
  onClick?: () => void;
  external?: boolean;
}

/**
 * The tab bar used across Vayled (the Cartier-style row of plain capitals with
 * a thin underline on the active one). Pass `active` to highlight a tab; link
 * tabs and button tabs can sit in the same bar. Use `divider` as a key to put
 * a small rule between groups.
 */
export default function PageTabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: (PageTab | "divider")[];
  active?: string;
  onChange?: (key: string) => void;
  className?: string;
}) {
  const base = "py-4 border-b -mb-px transition-colors whitespace-nowrap";
  return (
    <nav
      className={`flex items-center gap-8 overflow-x-auto border-b border-charcoal/10 text-[11px] uppercase tracking-[0.2em] ${className}`}
    >
      {tabs.map((t, i) => {
        if (t === "divider") {
          return <span key={`d${i}`} className="h-4 border-l border-charcoal/20 shrink-0" aria-hidden="true" />;
        }
        const on = active === t.key;
        const cls = `${base} ${on ? "border-wine text-wine" : "border-transparent text-charcoal/55 hover:text-charcoal"}`;
        const content = (
          <>
            {t.label}
            {typeof t.count === "number" && <span className="ml-2 text-charcoal/35">{t.count}</span>}
          </>
        );
        if (t.href) {
          return t.external ? (
            <a key={t.key} href={t.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {content}
            </a>
          ) : (
            <Link key={t.key} href={t.href} className={cls}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={t.key}
            onClick={() => {
              t.onClick?.();
              onChange?.(t.key);
            }}
            className={cls}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
