// Finds sets and notes that match what the student typed.
// items: [{ type: "set" | "note", id, title, description? }]
// Every word typed must match the title (or the description of a set).
// Titles that START with a word rank first, then titles that contain it.
export function searchItems(items, query) {
  const words = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [];

  const scored = [];
  for (const item of items) {
    const title = (item.title || "").toLowerCase();
    const description = (item.description || "").toLowerCase();
    let score = 0;
    let matches = true;

    for (const word of words) {
      if (title.startsWith(word)) score += 3;
      else if (title.includes(word)) score += 2;
      else if (description.includes(word)) score += 1;
      else {
        matches = false;
        break;
      }
    }

    if (matches) scored.push({ item, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title),
  );
  return scored.map((entry) => entry.item);
}
