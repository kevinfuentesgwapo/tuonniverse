import { supabase } from "./supabase";

// Saves one finished study round. This powers streaks, goals,
// "Continue studying", and quests later.
// mode is 'flashcards', 'quiz', or 'write'.
export async function saveStudySession({ userId, setId, mode, cardsDone }) {
  const { error } = await supabase.from("study_sessions").insert({
    user_id: userId,
    set_id: setId,
    mode,
    cards_done: cardsDone,
  });

  if (error) throw error;
}
