// Loads and saves spaced-repetition progress in Supabase.
// RLS keeps every student on their own rows.
import { supabase } from "./supabase.js";
import { buildQueue } from "./reviewQueue.js";
import { localToday, nextProgress } from "./spacedRepetition.js";

const PAGE = 1000; // Supabase returns at most 1000 rows per request
const SET_CHUNK = 50; // how many set ids we ask for at once

// Reads every row, page by page. makeQuery() must give a fresh ordered query.
async function fetchAll(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// Today's review list for one student.
// Returns { queue, dueTotal, newTotal, totalCards, nextDue } (see reviewQueue.js).
// We find the student's sets first, then the cards inside them. That does not
// depend on every card having its own user_id filled in.
export async function loadReviewQueue(userId, today = localToday()) {
  try {
    const [sets, progress] = await Promise.all([
      fetchAll(() =>
        supabase
          .from("sets")
          .select("id,title")
          .eq("user_id", userId)
          .order("id"),
      ),
      fetchAll(() =>
        supabase
          .from("card_progress")
          .select("card_id,due_on,reps,interval_days,ease,lapses")
          .eq("user_id", userId)
          .order("card_id"),
      ),
    ]);

    const cards = [];
    for (let i = 0; i < sets.length; i += SET_CHUNK) {
      const ids = sets.slice(i, i + SET_CHUNK).map((set) => set.id);
      const part = await fetchAll(() =>
        supabase
          .from("cards")
          .select("id,set_id,term,definition,position")
          .in("set_id", ids)
          .order("id"),
      );
      cards.push(...part);
    }

    return buildQueue({ cards, progress, sets, today });
  } catch (err) {
    console.error("loadReviewQueue:", err);
    throw new Error("Tuo could not load your cards. Please try again.");
  }
}

// Saves one answer. item = one entry of queue. rating = again | good | easy.
// Returns the new progress, so the screen can show "back in 3 days".
export async function saveProgress({
  userId,
  item,
  rating,
  today = localToday(),
}) {
  const next = nextProgress(item.progress, rating, today);
  const { error } = await supabase.from("card_progress").upsert(
    {
      user_id: userId,
      card_id: item.cardId,
      set_id: item.setId,
      ...next,
      last_reviewed: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" },
  );
  if (error) {
    console.error("saveProgress:", error);
    throw new Error("Tuo could not save that answer. Please try again.");
  }
  return next;
}
