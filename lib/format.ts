// Shared display-formatting helpers. See DESIGN_SYSTEM.md for the rules these
// implement — new currency/number displays should use these rather than
// hand-building strings, so formatting stays consistent across the app.

/**
 * Formats a dollar amount for display: "$1,234" for whole-dollar amounts,
 * "$1,675.50" only when there's an actual fractional amount (e.g. a
 * percentage-split payroll payout). One rule instead of separate
 * whole-dollar vs. cents-aware formatters.
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
