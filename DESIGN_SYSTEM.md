# Vayled Design System

The reference for how Vayled looks and behaves. Pulled from what's actually in the
codebase today, with a few real inconsistencies resolved into single rules. New UI
work should match this file rather than inventing new one-off styling — if something
here doesn't fit a new case, update this file in the same commit rather than drifting
from it silently.

## Colors

Defined once in `tailwind.config.ts`, referenced everywhere as `ivory` / `charcoal` /
`gold` / `beige` (never raw hex in a component):

| Token | Hex | Role |
|---|---|---|
| `ivory` | `#fdf9f2` | Page background, text-on-dark |
| `charcoal` | `#2a1a14` | Primary text, primary buttons, sidebar, borders (a deep espresso brown, not literal charcoal) |
| `gold` | `#6F5F4D` | Accent — links, highlights, "gold" status accents |
| `beige` | `#DDD9C9` | Secondary surface (stat cards, pills, subtle backgrounds) |

**Primary button** — `bg-charcoal text-ivory` + `hover:bg-charcoal/90` + `disabled:opacity-50`.
Rounded shape depends on context (see Shape below).

**Secondary / outline button** — `border border-charcoal/20`, no fill, `hover:bg-white`
(on ivory/beige backgrounds) or `hover:bg-ivory`, `disabled:opacity-50`.

**Text link** — `text-gold hover:underline` for inline actions. Plain nav/back links use
`text-charcoal/60 hover:text-charcoal` instead (opacity darken, no underline).

**Borders** — `border-charcoal/10` for card/section panels (the standard). `border-charcoal/20`
for inputs and small outline buttons.

**Status badges:**
```
Booking      booked: bg-beige/50 text-charcoal/70   (accent bar bg-gold)
             completed: bg-green-50 text-green-700   (accent bar bg-green-500)
             cancelled/ghosted: bg-red-50 text-red-600 (accent bar bg-red-300)

Appointment  confirmed: bg-green-50 text-green-700
             pending: bg-amber-50 text-amber-700
             completed: bg-beige/60 text-charcoal/60
             cancelled: bg-red-50 text-red-600

Deposit      due: text-amber-700, progress fill bg-amber-400
             paid: text-green-700, progress fill bg-green-500
             (track: bg-beige/50)

Save state   success: text-green-700   failure: text-red-600
Net margin   positive: text-green-700  negative: text-red-600
Countdown    ≤14 days: text-red-600    default: text-charcoal/45
```
New status types should slot into this same palette (green=good/confirmed,
amber=pending/due, red=cancelled/failed, gold=neutral accent) rather than introducing
new colors.

## Typography

Three physical fonts cover every role via CSS variables in `app/layout.tsx` /
`tailwind.config.ts` — never hardcode a font name in a component, always use the
Tailwind key:

| Tailwind key | Renders as | Use for |
|---|---|---|
| `font-serif` | Lora (same `--font-sans` variable as `font-sans`) | Section headers, body emphasis, and most non-title headings. Also the site-wide body default (no class needed for plain text). Kept as a separate Tailwind key for semantic clarity even though it's the same physical font as `font-sans` today. |
| `font-sans` | Lora | Explicit use wherever digits should stay legible and even-width: stat numbers, durations, tabular data. Still paired with `font-semibold tabular-nums` — `tabular-nums` (fixed digit width) matters regardless of which font is active. |
| `font-script` | Abril Fatface | The standard for every internal page's main `<h1>` title (Bookings, Inquiries, Inbox, Clients, Stylists, Payroll, Contracts, Invoices, Settings, Email templates, Appointments, dashboard greeting, a booking's bride-name header, contract/invoice letterhead) — not just a few "big" pages, it's the universal page-title treatment. Chosen by Kate over Bellefair/Playfair Display/Marcellus/Prata/EB Garamond from a side-by-side comparison. Heavier and bolder than the script fonts tried before, so page-title sizes are one Tailwind step smaller than they were under Bellefair (see sizing below) to keep the same visual weight. Not for anything below ~`text-3xl` or dense/small text — it's illegible at small sizes. Public client-facing pages (bride portal, inquiry form, trial picker) intentionally stay off script — see `font-heading` below. |
| `font-heading` | Lora (same var as serif/sans) | Contract section numbering/titles, the client-portal bride-name header and small uppercase labels. A distinct semantic role from `font-serif` even though it's the same physical font. |
| `font-logo` | Italiana (free stand-in for Black Gold until licensed) | The "VAYLED" wordmark only — always uppercase, wide tracking, on a dark background. Deliberately kept off Lora/Abril Fatface as a distinct identity mark. |
| `font-tagline` | Lora (same var as sans) | The small subtitle under the logo, and as a whole-page body-font override on the two client-facing pages (bride portal, trial picker) — now a no-op there since Lora is the site-wide default anyway, but the class stays for semantic clarity. |

**Sizing/weight pairings actually in use** (match these rather than picking arbitrary sizes):
- Page title: `font-script text-4xl leading-tight mb-1` (or `text-3xl` one size down for a person's name/greeting, or a notably long title like "Rehearsal hair & makeup")
- Section header inside a panel: `font-serif text-lg mb-4`
- Stat number: `font-sans font-semibold text-3xl tabular-nums` (or `text-xl` for a smaller card)
- Small uppercase label/eyebrow: `text-xs uppercase tracking-widest-lg` (or `tracking-[0.22em]` on `font-heading` labels)

## Data formatting

**Dates/times** — always via `date-fns format()`, never hand-built strings:
| Format string | Use for |
|---|---|
| `h:mm a` | Any time shown to a user (appointments, timeline, "saved at") — the one time format, used everywhere |
| `MMM d, yyyy` | List/detail dates |
| `EEEE, MMMM d, yyyy` | Full page-header date ("today" lines, selected calendar day) |
| `EEEE, MMMM d` | Same, without year (trial picker) |
| `MMMM yyyy` | Month-nav headers |
| `MMM yyyy` | Compact month label in a stat card |
| `EEE` / `d` / `MMM` (three-part) | Date-tile mini components |
| `yyyy-MM` / `yyyy-MM-dd` | Internal keys only (map keys, CSV filenames) — never shown raw to a user |

**Currency** — today this is inconsistent (three different implementations: a local
`money()` in payroll with forced cents, `.toFixed(0)` with no thousands separator
elsewhere, and `.toLocaleString()` with separators but no cents on the bride portal).
Going forward, use one shared helper:

```ts
// lib/format.ts
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
```
This gives `$1,234` for whole-dollar amounts and `$1,675.50` only when there's an actual
fractional amount (e.g. a percentage-split payroll payout) — one rule, no separate
"precise" variant needed. Existing call sites (`payroll/page.tsx`, `analytics/page.tsx`,
`expenses/page.tsx`, `bookings/page.tsx`, `portal/[bookingId]/page.tsx`, `lib/invoice.ts`)
can migrate to this over time; new currency displays should use it from the start.

**Stat numbers** stay `font-sans font-semibold tabular-nums` wherever they appear —
this was a deliberate fix (serif old-style numerals looked uneven) and should extend to
any stat/number display, not just Analytics/Expenses where it started.

## Interactive states

- **Disabled**: `disabled:opacity-50` uniformly, on any interactive element (button,
  input, or link acting as a button). No color change — opacity is the only signal.
  (Existing `/40` and `/30` variants are legacy inconsistency, not a second rule.)
- **Input focus**: `focus:outline-none focus:border-charcoal/30` for bordered inputs.
  For a dark-background input (e.g. on the marketing site), lighten the background
  instead: `focus:bg-ivory/15`. Every new input should have an explicit focus state —
  don't rely on the browser default.
- **Hover**: filled buttons darken (`hover:bg-charcoal/90`), outline buttons fill
  (`hover:bg-white` / `hover:bg-ivory`), text links underline (`hover:underline`) or
  darken (`hover:text-charcoal` for nav-style links).

## Shape & spacing

Border radius is chosen by component type, not by feel:
- `rounded-xl` — section/card panels: `bg-white border border-charcoal/10 rounded-xl p-5` (or `p-6`). Stat-card variant swaps `bg-white` for `bg-beige`, same shape.
- `rounded-lg` — nested boxes, list rows, sidebar nav items, dropdown/popover menus.
- `rounded-md` — the default for buttons, form inputs, and small tags/labels.
- `rounded-full` — pills only: filter/status chips, avatar/initials circles, progress bar tracks/fills, and marketing-site CTA buttons.
- `rounded-sm` — not an established pattern; avoid.

## Applying this

When building or editing a UI component: check this file first for the relevant color,
font, format, and interaction rules before writing new Tailwind classes. If a new kind
of element doesn't fit an existing pattern, extend this file with the new rule in the
same change rather than leaving it undocumented.
