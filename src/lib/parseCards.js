// Turns pasted text into cards. One card per line.
// Each line is split into term + definition at the FIRST separator found.
// Separators we try, in this order:
//   Tab (from Excel or Google Sheets), " — ", " – ", " - ", ":" and ","
const SEPARATORS = ["\t", " — ", " – ", " - ", ":", ","];

function splitLine(line) {
  for (const sep of SEPARATORS) {
    const at = line.indexOf(sep);
    if (at > 0) {
      const term = line.slice(0, at).trim();
      const definition = line.slice(at + sep.length).trim();
      if (term && definition) return { term, definition };
    }
  }
  return null;
}

// Returns { cards: [{ term, definition }], skipped: number }
export function parseCards(text) {
  const cards = [];
  let skipped = 0;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const card = splitLine(line);
    if (card) cards.push(card);
    else skipped += 1;
  }

  return { cards, skipped };
}

export default parseCards;
