import { supabase } from "./supabaseClient";

// When a new stylist signs up from a /team-invite/[token] link, Supabase may
// require email confirmation before a session exists — in that case we can't
// call accept_studio_invite yet (no auth.uid() to attach). The token is
// stashed here so that once they confirm their email and actually log in
// (landing back in AuthGuard or TeamAuthGuard), we can finish accepting the
// invite before deciding where to route them. Without this, a stylist who
// has to confirm their email never gets their studio_members row flipped to
// "active," and both guards fall through to treating them like the owner.
const STORAGE_KEY = "vayled_pending_invite_token";

export function stashPendingInviteToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage can throw in some browser privacy modes — nothing to do,
    // the invite still works for anyone whose signUp() returns a session
    // immediately (the common case when email confirmation is off).
  }
}

/** Call once per auth check, before reading studio_members. Fire-and-forget:
 *  clears the stashed token whether or not it actually worked, so a stale or
 *  already-used token doesn't get retried forever. */
export async function acceptPendingInviteIfAny() {
  let token: string | null = null;
  try {
    token = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!token) return;
  try {
    await supabase.rpc("accept_studio_invite", { p_token: token });
  } finally {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
