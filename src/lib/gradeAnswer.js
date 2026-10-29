// Checking a typed answer. Used by Test mode.
// Ignore capital letters, accents, punctuation, and extra spaces.
export function clean(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// How many letters are different between two texts?
export function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

// Returns "exact", "close" (small typo), or "wrong".
export function grade(typed, answer) {
  const t = clean(typed);
  const a = clean(answer);
  if (!a) return typed.trim() === answer.trim() ? "exact" : "wrong";
  if (t === a) return "exact";
  if (!t) return "wrong";
  // Short answers must be exact. Longer answers may have a few typos.
  const allowed =
    a.length <= 3 ? 0 : Math.min(5, Math.max(1, Math.floor(a.length * 0.15)));
  return distance(t, a) <= allowed ? "close" : "wrong";
}
