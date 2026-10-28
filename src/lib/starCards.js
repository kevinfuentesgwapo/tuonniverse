import { supabase } from "./supabase";

// Stars or un-stars one card (cards.starred).
// If Supabase blocks the change (no update policy), we say so clearly.
export async function setCardStarred(cardId, starred) {
  const { data, error } = await supabase
    .from("cards")
    .update({ starred })
    .eq("id", cardId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("The star was not saved. Check the cards update policy.");
  }
}
