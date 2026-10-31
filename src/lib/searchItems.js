// Finds sets, notes and cards that match what the student typed.
// items: [{ type: "set" | "note" | "folder" | "card", id, title, description? }]
// For a card, title = the term and description = the definition.
// Every word typed must match the title (or the description).
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

// Small helpers so the search box and the search page show results the same way.
export function resultPath(item) {
  if (item.type === "note") return `/notes/${item.id}`;
  if (item.type === "card") return `/sets/${item.setId}`;
  if (item.type === "folder") return `/sets?folder=${item.id}`;
  return `/sets/${item.id}`;
}

export function resultTag(item) {
  if (item.type === "note") return "Note";
  if (item.type === "card") return "Card";
  if (item.type === "folder") return "Folder";
  return "Set";
}

// The small grey line under the title.
export function resultSubtitle(item) {
  if (item.type === "folder") {
    return `${item.count} ${item.count === 1 ? "set" : "sets"}`;
  }
  if (item.type === "card") {
    const from = item.setTitle ? `In \u201c${item.setTitle}\u201d` : "";
    if (from && item.description) return `${from} \u2014 ${item.description}`;
    return from || item.description || "";
  }
  return item.description || "";
}
