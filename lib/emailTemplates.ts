import { EmailTemplate } from "./types";

/**
 * Seeded into every new studio's `email_templates` table the first time they're
 * needed (Emails page, or the Dashboard's Reminders panel — whichever loads
 * first). Kept in one place so both always agree on template names, since the
 * Reminders panel looks templates up by name (e.g. "Balance due reminder").
 */
export const DEFAULT_TEMPLATES: Omit<EmailTemplate, "id" | "studio_id" | "created_at">[] = [
  {
    name: "Inquiry response",
    subject: "Re: Your wedding hair & makeup inquiry",
    body:
      "Hi {{bride_name}},\n\nThank you so much for reaching out about {{wedding_date}} at {{venue}}! I'd love to be part of your day.\n\nLet me know if you'd like to schedule a trial, and I'll send over availability.\n\nWarmly,",
  },
  {
    name: "Booking confirmation",
    subject: "You're booked! {{wedding_date}}",
    body:
      "Hi {{bride_name}},\n\nYou're officially on the calendar for {{wedding_date}} at {{venue}}! Contract total is {{contract_total}}, with a deposit of {{deposit_amount}}.\n\nSo excited for your day!",
  },
  {
    name: "Trial reminder",
    subject: "Your trial session is coming up",
    body: "Hi {{bride_name}},\n\nJust a reminder about your upcoming trial session — can't wait to see you!",
  },
  {
    name: "Trial prep questionnaire",
    subject: "A few quick questions before your trial",
    body:
      "Hi {{bride_name}},\n\nSo excited for your trial! To help me prep, could you answer a few quick questions beforehand?\n\n1. What's your hair type/texture (fine, thick, curly, color-treated)?\n2. Any skin sensitivities, allergies, or products to avoid?\n3. Do you have inspo photos for hair and/or makeup you'd like to send over?\n4. What's the overall vibe you're going for (natural, glam, romantic, editorial)?\n5. Will anyone be joining you at the trial?\n\nSee you soon!",
  },
  {
    name: "Balance due reminder",
    subject: "Balance due for your wedding day",
    body:
      "Hi {{bride_name}},\n\nJust a friendly reminder that your remaining balance of {{balance_due}} is due before {{wedding_date}}.\n\nLet me know if you have any questions!",
  },
  {
    name: "Thank-you / review request",
    subject: "Thank you!",
    body:
      "Hi {{bride_name}},\n\nIt was such an honor being part of your wedding day! If you have a moment, I'd so appreciate a review — it means the world to small businesses like mine.\n\nWishing you all the best!",
  },
];
