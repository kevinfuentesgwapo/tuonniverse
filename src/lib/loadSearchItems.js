import { supabase } from "./supabase";

// Loads your sets and notes (titles only) for the search page.
// Returns [{ type: "set" | "note", id, title, description? }], newest first.
export async function loadSearchItems(userId) {
  const [setsResult, notesResult] = await Promise.all([
    supabase
      .from("sets")
      .select("id, title, description")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("notes")
      .select("id, title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);
  if (setsResult.error) throw setsResult.error;
  if (notesResult.error) throw notesResult.error;

  return [
    ...setsResult.data.map((row) => ({ ...row, type: "set" })),
    ...notesResult.data.map((row) => ({ ...row, type: "note" })),
  ];
}
