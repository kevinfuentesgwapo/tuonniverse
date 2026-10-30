// Turns a set's cards into a CSV file and downloads it.
// No header row: each line is "term,definition", so other apps can import it.

// Wraps a value in quotes when needed (comma, quote or new line inside).
function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function cardsToCsv(cards) {
  return cards
    .map((card) => `${csvCell(card.term)},${csvCell(card.definition)}`)
    .join("\r\n");
}

// "Biology: Cells!" -> "biology-cells"
function fileNameFor(title) {
  const slug = String(title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "tuoniverse-set"}.csv`;
}

export function downloadCardsCsv(title, cards) {
  // The first character (BOM) helps Excel read accents and other languages.
  const blob = new Blob(["\uFEFF", cardsToCsv(cards)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileNameFor(title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
