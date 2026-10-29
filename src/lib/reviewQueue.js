// Builds today's review list. Plain functions, no database here. Easy to test.
//
// Cards that were studied before and are due come first (oldest due first).
// Then a few brand new cards, so a student is never buried in new stuff.
import { isDue } from "./spacedRepetition.js";

export const NEW_PER_SESSION = 10;
export const SESSION_MAX = 30;

// cards:    [{ id, set_id, term, definition, position }]
// progress: [{ card_id, due_on, reps, interval_days, ease, lapses }]
// sets:     [{ id, title }]
// Returns { queue, dueTotal, newTotal }
//   queue:    cards to study now (max SESSION_MAX)
//   dueTotal: studied cards that are due (all of them, even past the max)
//   newTotal: cards never studied
//   totalCards: cards that can be studied at all (both sides filled)
//   nextDue:  earliest day a studied card comes back, or null
export function buildQueue({
  cards,
  progress,
  sets,
  today,
  newPerSession = NEW_PER_SESSION,
  max = SESSION_MAX,
}) {
  const byCard = new Map(progress.map((p) => [p.card_id, p]));
  const titleOf = new Map(sets.map((s) => [s.id, s.title]));

  const reviews = [];
  const fresh = [];
  let totalCards = 0;
  let nextDue = null;

  for (const c of cards) {
    // A card with an empty side cannot be studied.
    if (!String(c.term || "").trim() || !String(c.definition || "").trim()) {
      continue;
    }
    totalCards += 1;
    const p = byCard.get(c.id) || null;
    const item = {
      cardId: c.id,
      setId: c.set_id,
      setTitle: titleOf.get(c.set_id) || "",
      term: c.term,
      definition: c.definition,
      position: c.position ?? 0,
      progress: p
        ? {
            reps: p.reps,
            interval_days: p.interval_days,
            ease: Number(p.ease),
            lapses: p.lapses,
            due_on: p.due_on,
          }
        : null,
    };
    if (!p) fresh.push(item);
    else if (isDue(p, today)) reviews.push(item);
    else if (!nextDue || p.due_on < nextDue) nextDue = p.due_on;
  }

  const bySetThenPosition = (a, b) =>
    String(a.setId).localeCompare(String(b.setId)) || a.position - b.position;

  reviews.sort(
    (a, b) =>
      a.progress.due_on.localeCompare(b.progress.due_on) ||
      bySetThenPosition(a, b),
  );
  fresh.sort(bySetThenPosition);

  const takenReviews = reviews.slice(0, max);
  const room = Math.max(0, max - takenReviews.length);
  const takenNew = fresh.slice(0, Math.min(newPerSession, room));

  return {
    queue: [...takenReviews, ...takenNew],
    dueTotal: reviews.length,
    newTotal: fresh.length,
    totalCards,
    nextDue,
  };
}
