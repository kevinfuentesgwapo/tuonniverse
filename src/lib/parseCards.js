// Turns pasted text (or a CSV / TXT file) into cards.
// One card per line. Each line is split into term + definition at the
// FIRST separator found. Separators we try, in this order:
//   Tab (Excel, Google Sheets, Quizlet), " — ", " – ", " - ", ":", "," and ";"
// Also works with quoted CSV, like: "Hello, world","Say ""hi"""
// A quoted card can even have a new line inside.
const SEPARATORS = ["\t", " — ", " – ", " - ", ":", ",", ";"];

// Reads a quoted value that starts at text[from] (a quote mark).
// Returns { value, end } (end = place after the closing quote) or null.
function readQuoted(text, from) {
  let value = "";
  for (let i = from + 1; i < text.length; i += 1) {
    if (text[i] === '"') {
      if (text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        return { value, end: i + 1 };
      }
    } else {
      value += text[i];
    }
  }
  return null;
}

// "Hello" -> Hello (only when the whole value is wrapped in quotes)
function unquote(value) {
  if (
    value.length >= 2 &&
    value[0] === '"' &&
    value[value.length - 1] === '"'
  ) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

// Splits the text into records (cards). A new line inside quotes
// does NOT start a new record.
function splitRecords(text) {
  const records = [];
  let current = "";
  let inQuotes = false;
  let atFieldStart = true;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      current += ch;
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") continue;
      records.push(current);
      current = "";
      atFieldStart = true;
      continue;
    }
    if (ch === "\n") {
      records.push(current);
      current = "";
      atFieldStart = true;
      continue;
    }
    if (ch === '"' && atFieldStart) inQuotes = true;
    current += ch;
    atFieldStart = ch === "\t" || ch === ",";
  }

  // A quote that never closed: do not swallow the rest. Use plain lines.
  if (inQuotes) records.push(...current.split(/\r?\n/));
  else records.push(current);
  return records;
}

// A record like: "term, with comma","definition"
function parseQuotedRecord(record) {
  if (record[0] !== '"') return null;
  const first = readQuoted(record, 0);
  if (!first) return null;
  const sep = record[first.end];
  if (sep !== "\t" && sep !== ",") return null;

  const rest = record.slice(first.end + 1);
  let definition = rest.trim();
  if (rest[0] === '"') {
    const second = readQuoted(rest, 0);
    const after = second ? rest[second.end] : undefined;
    if (second && (after === undefined || after === "\t" || after === ",")) {
      definition = second.value.trim();
    }
  }
  const term = first.value.trim();
  return term && definition ? { term, definition } : null;
}

function splitLine(line) {
  const quoted = parseQuotedRecord(line);
  if (quoted) return quoted;

  for (const sep of SEPARATORS) {
    const at = line.indexOf(sep);
    if (at > 0) {
      let term = line.slice(0, at).trim();
      let definition = line.slice(at + sep.length).trim();
      if (sep === "," || sep === "\t") {
        term = unquote(term).trim();
        definition = unquote(definition).trim();
      }
      if (term && definition) return { term, definition };
    }
  }
  return null;
}

// Returns { cards: [{ term, definition }], skipped: number }
export function parseCards(text) {
  const cards = [];
  let skipped = 0;
  // Files from Excel can start with a hidden mark (BOM). Remove it.
  const clean = String(text || "").replace(/^\uFEFF/, "");

  for (const rawRecord of splitRecords(clean)) {
    const record = rawRecord.trim();
    if (!record) continue;
    const card = splitLine(record);
    if (card) cards.push(card);
    else skipped += 1;
  }

  // A first line "term,definition" is a header, not a card.
  if (
    cards.length > 0 &&
    cards[0].term.toLowerCase() === "term" &&
    cards[0].definition.toLowerCase() === "definition"
  ) {
    cards.shift();
  }

  return { cards, skipped };
}

export default parseCards;
