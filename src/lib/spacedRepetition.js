// Spaced repetition: decides when a card comes back.
// Plain functions, no database here. Easy to test.
//
// Three answers:
//   again = "Still learning"  -> back tomorrow, card gets a bit harder
//   good  = "Got it"          -> back later (1 day, 3 days, then it grows)
//   easy  = "Too easy"        -> back much later
//
// Dates are strings like "2026-10-29" (the student's own local day).

export const RATINGS = ["again", "good", "easy"];

const START_EASE = 2.3;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_DAYS = 365;

// Today in the student's own time zone, as "YYYY-MM-DD".
export function localToday(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "2026-10-29" + 3 days = "2026-11-01". Safe across months and daylight time.
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// A card the student has never studied.
export function newProgress(today = localToday()) {
  return {
    reps: 0,
    interval_days: 0,
    ease: START_EASE,
    lapses: 0,
    due_on: today,
  };
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round2 = (n) => Math.round(n * 100) / 100;

// prev: { reps, interval_days, ease, lapses } or null for a new card.
// Returns the new { reps, interval_days, ease, lapses, due_on }.
export function nextProgress(prev, rating, today = localToday()) {
  if (!RATINGS.includes(rating)) throw new Error("Unknown rating: " + rating);
  const p = { ...newProgress(today), ...(prev || {}) };

  let { reps, interval_days: interval, ease, lapses } = p;

  if (rating === "again") {
    reps = 0;
    lapses += 1;
    interval = 1;
    ease = ease - 0.2;
  } else if (rating === "good") {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * ease);
    reps += 1;
  } else {
    // easy
    if (reps === 0) interval = 3;
    else if (reps === 1) interval = 7;
    else interval = Math.round(interval * ease * 1.3);
    reps += 1;
    ease = ease + 0.15;
  }

  interval = clamp(interval, 1, MAX_DAYS);
  ease = round2(clamp(ease, MIN_EASE, MAX_EASE));

  return {
    reps,
    interval_days: interval,
    ease,
    lapses,
    due_on: addDays(today, interval),
  };
}

// A card is due if it was never studied, or its day has come.
export function isDue(progress, today = localToday()) {
  return !progress || progress.due_on <= today;
}
