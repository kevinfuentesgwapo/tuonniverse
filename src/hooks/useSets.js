import { supabase } from "../lib/supabase";

// Saves a new set and all its cards.
// If the cards fail to save, the empty set is removed again.
// Returns the new set id.
export async function createSet({ userId, title, description, cards }) {
  const { data: set, error: setError } = await supabase
    .from("sets")
    .insert({
      user_id: userId,
      title,
      description: description || null,
    })
    .select("id")
    .single();

  if (setError) throw setError;

  const rows = cards.map((card, index) => ({
    set_id: set.id,
    user_id: userId,
    term: card.term,
    definition: card.definition,
    position: index,
  }));

  const { error: cardsError } = await supabase.from("cards").insert(rows);

  if (cardsError) {
    await supabase.from("sets").delete().eq("id", set.id);
    throw cardsError;
  }

  return set.id;
}
