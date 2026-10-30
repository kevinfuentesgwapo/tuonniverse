// Turns saved study rounds into honest numbers. No network here, just math.

export const KNOWN_DAYS = 21; // a card is "known well" when Review lets it wait this long
export const MODES = ["flashcards", "quiz", "write", "match", "test"];
export const MODE_LABELS = {
  flashcards: "Flashcards",
  quiz: "Quiz",
  write: "Write",
  match: "Match",
  test: "Test",
};

// "2026-10-30" using the student's own clock (same as useStudyProgress).
function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

// A whole number for each calendar day, so "next day" is always +1.
function dayNumber(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// sessions: [{ mode, cards_done, created_at }]
export function computeStats(sessions, now = new Date()) {
  const cardsByDay = new Map();
  const modeRounds = {};
  const modeCards = {};
  for (const mode of MODES) {
    modeRounds[mode] = 0;
    modeCards[mode] = 0;
  }
  let totalCards = 0;

  for (const s of sessions) {
    const key = dayKey(new Date(s.created_at));
    const done = s.cards_done || 0;
    cardsByDay.set(key, (cardsByDay.get(key) || 0) + done);
    totalCards += done;
    if (s.mode in modeRounds) {
      modeRounds[s.mode] += 1;
      modeCards[s.mode] += done;
    }
  }

  const studied = new Set([...cardsByDay.keys()].map(dayNumber));

  // Best streak: the longest run of days in a row.
  const sorted = [...studied].sort((a, b) => a - b);
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
  }

  // Current streak. If you have not studied yet today, yesterday still counts.
  const today = dayNumber(dayKey(now));
  let cursor = studied.has(today) ? today : today - 1;
  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  // The last 14 days, oldest first.
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    last14.push({
      key: dayKey(date),
      date,
      cards: cardsByDay.get(dayKey(date)) || 0,
      isToday: i === 0,
    });
  }

  let favoriteMode = null;
  for (const mode of MODES) {
    if (
      modeRounds[mode] > 0 &&
      (!favoriteMode || modeRounds[mode] > modeRounds[favoriteMode])
    ) {
      favoriteMode = mode;
    }
  }

  return {
    totalRounds: sessions.length,
    totalCards,
    daysStudied: cardsByDay.size,
    streak,
    bestStreak,
    last14,
    modeRounds,
    modeCards,
    favoriteMode,
  };
}

// progressRows: [{ set_id, interval_days }]. Returns Map: set id -> cards known well.
export function knownBySet(progressRows) {
  const known = new Map();
  for (const row of progressRows) {
    if ((row.interval_days || 0) >= KNOWN_DAYS) {
      known.set(row.set_id, (known.get(row.set_id) || 0) + 1);
    }
  }
  return known;
}
