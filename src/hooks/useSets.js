import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import useAuth from "./useAuth";

// ---------- Your list of sets (with how many cards each has) ----------
export default function useSets() {
  const { user } = useAuth();
  const userId = user?.id;
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error: loadError } = await supabase
      .from("sets")
      .select("id, title, description, created_at, cards(count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error(loadError);
      setError("We could not load your sets.");
      setSets([]);
    } else {
      setError("");
      setSets(
        data.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          createdAt: row.created_at,
          cardCount: row.cards?.[0]?.count ?? 0,
        })),
      );
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  function reload() {
    setLoading(true);
    load();
  }

  const totalCards = sets.reduce((sum, set) => sum + set.cardCount, 0);

  return { sets, loading, error, reload, totalCards };
}

// ---------- Save a new set and all its cards ----------
// If the cards fail to save, the empty set is removed again.
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

// ---------- Open one set with its cards, in order ----------
// Returns { set, cards }, or null if the set does not exist.
export async function getSet(id) {
  const { data: set, error: setError } = await supabase
    .from("sets")
    .select("id, title, description, created_at")
    .eq("id", id)
    .maybeSingle();

  // 22P02 = the address is not a real id. Same as "not found".
  if (setError?.code === "22P02") return null;
  if (setError) throw setError;
  if (!set) return null;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, term, definition, starred, position")
    .eq("set_id", id)
    .order("position", { ascending: true });

  if (cardsError) throw cardsError;

  return { set, cards };
}

// ---------- Save changes to a set ----------
// title, description: the new text for the set.
// removedIds: ids of cards to delete.
// changed: existing cards that changed [{ id, term, definition, position }].
// added: brand new cards [{ term, definition, position }].
// Stars are never touched, so starred cards stay starred.
export async function updateSet({
  setId,
  userId,
  title,
  description,
  removedIds = [],
  changed = [],
  added = [],
}) {
  // 1. The set itself. If nothing changed, the update rule is missing.
  const { data: updated, error: setError } = await supabase
    .from("sets")
    .update({
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId)
    .select("id");

  if (setError) throw setError;
  if (!updated || updated.length === 0) {
    throw new Error("The set was not updated (check the sets UPDATE policy).");
  }

  // 2. Remove cards. In small groups so the web address stays short.
  for (let i = 0; i < removedIds.length; i += 100) {
    const group = removedIds.slice(i, i + 100);
    const { error: removeError } = await supabase
      .from("cards")
      .delete()
      .eq("set_id", setId)
      .in("id", group);
    if (removeError) throw removeError;
  }

  // 3. Change existing cards in one go.
  if (changed.length > 0) {
    const rows = changed.map((card) => ({
      id: card.id,
      set_id: setId,
      user_id: userId,
      term: card.term,
      definition: card.definition,
      position: card.position,
    }));
    const { error: changeError } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "id" });
    if (changeError) throw changeError;
  }

  // 4. Add new cards.
  if (added.length > 0) {
    const rows = added.map((card) => ({
      set_id: setId,
      user_id: userId,
      term: card.term,
      definition: card.definition,
      position: card.position,
    }));
    const { error: addError } = await supabase.from("cards").insert(rows);
    if (addError) throw addError;
  }
}

// ---------- Delete a set and its cards ----------
export async function deleteSet(id) {
  const { error: cardsError } = await supabase
    .from("cards")
    .delete()
    .eq("set_id", id);
  if (cardsError) throw cardsError;

  const { error: setError } = await supabase.from("sets").delete().eq("id", id);
  if (setError) throw setError;
}
