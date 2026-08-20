import { PartyMember } from "./types";

export interface TimelineEntry {
  member: PartyMember;
  start: Date;
  end: Date;
}

/**
 * Builds a wedding-morning prep schedule by working backward from the time
 * everyone needs to be ready (readyBy). People are scheduled in order_index
 * order, back to back, with an optional buffer between each person.
 */
export function computeTimeline(
  readyBy: Date,
  members: PartyMember[],
  bufferMinutes: number = 0
): TimelineEntry[] {
  const ordered = [...members].sort((a, b) => a.order_index - b.order_index);
  const totalMinutes =
    ordered.reduce((sum, m) => sum + m.prep_minutes, 0) +
    bufferMinutes * Math.max(0, ordered.length - 1);

  let cursor = new Date(readyBy.getTime() - totalMinutes * 60000);
  const entries: TimelineEntry[] = [];

  for (const member of ordered) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + member.prep_minutes * 60000);
    entries.push({ member, start, end });
    cursor = new Date(end.getTime() + bufferMinutes * 60000);
  }

  return entries;
}

/**
 * Builds a wedding-morning prep schedule working forward from a shared start
 * time instead of backward from a ready-by time. Used when a booking has a
 * start time set — every stylist's queue begins at the same moment (so two
 * stylists both start around 9am, say) rather than each being anchored to
 * finish by the same ready-by time regardless of how many people they have.
 */
export function computeTimelineFromStart(
  startTime: Date,
  members: PartyMember[],
  bufferMinutes: number = 0
): TimelineEntry[] {
  const ordered = [...members].sort((a, b) => a.order_index - b.order_index);
  let cursor = new Date(startTime);
  const entries: TimelineEntry[] = [];

  for (const member of ordered) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + member.prep_minutes * 60000);
    entries.push({ member, start, end });
    cursor = new Date(end.getTime() + bufferMinutes * 60000);
  }

  return entries;
}
