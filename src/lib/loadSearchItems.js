import { supabase } from "./supabase";

const PAGE = 1000; // the database gives at most 1000 rows at once
const MAX_CARDS = 10000; // safety stop: 10 pages

// Loads all your cards (term + definition) in pages.
async function loadCards() {
  const rows = [];
  for (let from = 0; from < MAX_CARDS; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("id, set_id, term, definition")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// Loads your sets, notes and cards for the search.
// Returns:
//   { type: "set" | "note", id, title, description? }
//   { type: "folder", id, title (the name), count (how many sets inside) }
//   { type: "card", id, setId, setTitle, title (the term), description (the definition) }
// Sets and notes come newest first. Folders and cards come after them.
export async function loadSearchItems(userId) {
  const [setsResult, notesResult, foldersResult, cardRows] = await Promise.all([
    supabase
      .from("sets")
      .select("id, title, description, folder_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("notes")
      .select("id, title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("folders")
      .select("id, name")
      .eq("user_id", userId)
      .order("name"),
    // If cards fail to load, sets and notes search must still work.
    loadCards().catch((err) => {
      console.error(err);
      return [];
    }),
  ]);
  if (setsResult.error) throw setsResult.error;
  if (notesResult.error) throw notesResult.error;

  // If folders fail to load, the rest of the search must still work.
  if (foldersResult.error) console.error(foldersResult.error);
  const folderRows = foldersResult.error ? [] : foldersResult.data;
  const setCount = new Map();
  for (const row of setsResult.data) {
    if (row.folder_id) {
      setCount.set(row.folder_id, (setCount.get(row.folder_id) || 0) + 1);
    }
  }

  const setTitles = new Map(setsResult.data.map((row) => [row.id, row.title]));

  return [
    ...setsResult.data.map((row) => ({ ...row, type: "set" })),
    ...notesResult.data.map((row) => ({ ...row, type: "note" })),
    ...folderRows.map((row) => ({
      type: "folder",
      id: row.id,
      title: row.name || "",
      count: setCount.get(row.id) || 0,
    })),
    ...cardRows.map((row) => ({
      type: "card",
      id: row.id,
      setId: row.set_id,
      setTitle: setTitles.get(row.set_id) || "",
      title: row.term || "",
      description: row.definition || "",
    })),
  ];
}
