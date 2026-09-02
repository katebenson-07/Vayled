# Vayled Design System

The reference for how Vayled looks and behaves. Pulled from what's actually in the
codebase today, with a few real inconsistencies resolved into single rules. New UI
work should match this file rather than inventing new one-off styling — if something
here doesn't fit a new case, update this file in the same commit rather than drifting
from it silently.

## Colors

Defined once in `tailwind.config.ts`, referenced everywhere as `ivory` / `charcoal` /
`wine` / `gold` / `beige` (never raw hex in a component):

| Token | Hex | Role |
|---|---|---|
| `ivory` | `#FAF8F5` | Page background, text-on-dark (an off-white, not a cream/yellow) |
| `charcoal` | `#231815` | Primary text, primary buttons, borders (an espresso brown, not literal charcoal) |
| `wine` | `#4D0E12` | Dark brand surfaces only: the app sidebar and the marketing site's header/footer. Deliberately a different color from `charcoal` — the wine red lives on these dark bars, not spread across every button/border/text in the content area. |
| `gold` | `#4A2E27` | Accent — links, highlights, "gold" status accents (a warm medium brown, not literal gold) |
| `beige` | `#E8DFD8` | Secondary surface (stat cards, pills, subtle backgrounds) |

This palette (except `wine`, which is new) was built directly from a 5-swatch Pantone
reference Kate sent from Pinterest ("Transparent Yellow," "Sceptre Red," "Cerulean
Blue," "Potting Soil," "Java Brown") — `charcoal` is Java Brown, `wine` is Sceptre Red,
`gold` is Potting Soil. Cerulean Blue and Transparent Yellow were tried (blue as an
accent, yellow as the background) and both rejected — don't reintroduce blue as an
accent color or shift the background back toward yellow/cream without asking again.

**Primary button** — `bg-charcoal text-ivory` + `hover:bg-charcoal/90` + `disabled:opacity-50`.
Rounded shape depends on context (see Shape below).

**Secondary / outline button** — `border border-charcoal/20`, no fill, `hover:bg-white`
(on ivory/beige backgrounds) or `hover:bg-ivory`, `disabled:opacity-50`.

**Text link** — `text-gold hover:underline` for inline actions. Plain nav/back links use
`text-charcoal/60 hover:text-charcoal` instead (opacity darken, no underline).

**Borders** — `border-charcoal/10` for card/section panels (the standard). `border-charcoal/20`
for inputs and small outline buttons.

**Sidebar / dark nav bars** — `bg-wine`, not `bg-charcoal`. Text on it still uses `ivory`/
`beige` at the usual opacities (see `components/Sidebar.tsx`, `components/TeamSidebar.tsx`,
`components/MarketingNav.tsx`, `components/MarketingFooter.tsx`) — only the background
token changed, the text-color conventions on a dark surface are unchanged.

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
| `font-script` | Spectral (weight 600) | The standard for every internal page's main `<h1>` title (Bookings, Inquiries, Inbox, Clients, Stylists, Payroll, Contracts, Invoices, Settings, Email templates, Appointments, a booking's bride-name header, contract/invoice letterhead) — not just a few "big" pages, it's the universal page-title treatment, with one deliberate exception: the **dashboard greeting** ("Good evening, Kate") — see below. Replaced Abril Fatface, which Kate felt was too big/heavy at these sizes; Spectral is a lighter, more restrained serif chosen from a second round of options (Cormorant SC, Fraunces, Crimson Pro, Cardo). Kept the same sizes that had been stepped down for Abril Fatface (`text-4xl` / `text-3xl`) rather than sizing back up — approved at that scale in the comparison preview. Not for anything below ~`text-3xl` or dense/small text — it's illegible at small sizes. Public client-facing pages (bride portal, inquiry form, trial picker) intentionally stay off script — see `font-heading` below. |
| `font-heading` | Lora (same var as serif/sans) | Contract section numbering/titles, the client-portal bride-name header and small uppercase labels. A distinct semantic role from `font-serif` even though it's the same physical font. |
| `font-logo` | Prata (free stand-in for Black Gold until licensed; replaced Italiana, which read too plain/generic in all-caps at logo size) | The "VAYLED" wordmark only — always uppercase, wide tracking, on a dark background. Deliberately kept off Lora/Spectral as a distinct identity mark. |
| `font-tagline` | Lora (same var as sans) | The small subtitle under the logo, and as a whole-page body-font override on the two client-facing pages (bride portal, trial picker) — now a no-op there since Lora is the site-wide default anyway, but the class stays for semantic clarity. |

**Sizing/weight pairings actually in use** (match these rather than picking arbitrary sizes):
- Page title: `font-script text-4xl leading-tight mb-1` (or `text-3xl` one size down for a person's name/greeting, or a notably long title like "Rehearsal hair & makeup")
- Section header inside a panel: `font-serif text-lg mb-4`
- Stat number: `font-sans font-semibold text-3xl tabular-nums` (or `text-xl` for a smaller card)
- Small uppercase label/eyebrow: `text-xs uppercase tracking-widest-lg` (or `tracking-[0.22em]` on `font-heading` labels)

**Dashboard greeting exception** — `app/dashboard/page.tsx`'s "Good evening, Kate" is
`font-serif text-2xl mb-1`, not `font-script`. Kate wanted to keep the personalized
greeting but asked for it smaller/plainer than the big script treatment every other
page title uses — a deliberate one-off, not an oversight. Don't "fix" it to match the
universal page-title rule without asking first.

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

Every interactive element — button, input, select, textarea, or link acting as a
button — should carry an explicit state for each of these; never rely on the browser
default. This was audited and retrofitted across every page in the app (roughly 190
elements: ~150 inputs, ~35 buttons, plus opacity cleanup), so treat it as the floor for
anything new, not an aspiration.

### Buttons

| State | Primary (filled) | Secondary (outline) | Text link | Nav-style link |
|---|---|---|---|---|
| Default | `bg-charcoal text-ivory` | `border border-charcoal/20` | `text-gold` | `text-charcoal/60` |
| Hover | `hover:bg-charcoal/90` | `hover:bg-white` (on ivory/beige bg) or `hover:bg-ivory` | `hover:underline` | `hover:text-charcoal` |
| Active/pressed | No separate active state today — hover color is the only feedback; don't invent a third shade unless a real need comes up. |
| Disabled | `disabled:opacity-50` — opacity only, no color change, on any button that can receive a `disabled` prop |
| Toggle/pill selected state (e.g. filter tabs, view/edit switches) | Selected = primary treatment above; unselected = nav-style link treatment above. Both branches need their own hover — a selected pill should still darken on hover, not just the unselected one. |

**Destructive actions** (delete/remove — irreversible or data-losing): red instead of
charcoal, in one of two forms depending on prominence:
- Standalone/irreversible (e.g. "Delete booking", "Delete client"): `border border-red-200 text-red-600 rounded-md px-4 py-2 hover:bg-red-50`
- Inline/lightweight (e.g. "Remove" on a line item): `text-red-600 text-xs`, or if it
  needs to stay quiet until intent is clear, `text-charcoal/40 hover:text-red-600`

### Inputs, selects, textareas

| State | Style |
|---|---|
| Default | `border border-charcoal/20 rounded-md px-3 py-2` |
| Focus | `focus:outline-none focus:border-charcoal/30`. Dark-background variant (marketing site): `focus:bg-ivory/15` instead of a border change. |
| Disabled | `disabled:opacity-50`, same rule as buttons |
| Error/invalid | Not used anywhere yet — no field-level validation exists in the app today. If/when it's added, the rule is: `border-red-300 focus:border-red-400` on the field, plus `text-red-600 text-xs mt-1` helper text below it. Don't invent a different pattern per page when this need shows up. |

### Cleanup notes

`disabled:opacity-40` and `disabled:opacity-30` were legacy leftovers from before this
rule existed — normalized to `disabled:opacity-50` everywhere. There is no longer a
second disabled-opacity value anywhere in the app; if you see one, it's a bug, not an
intentional variant.

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
