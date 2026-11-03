// Friendly words for students when Gemini cannot help right now.
// gemini.js throws "gemini-429" (out of free tries) or "gemini-503" (busy)
// when every model on its list said no.
const BUSY = new Set(["gemini-429", "gemini-503"]);

export function aiErrorMessage(err, fallback) {
  if (BUSY.has(err?.message)) {
    return "Lots of students are using Tuo's AI right now. Your tries are safe. Please try again later today, or tomorrow.";
  }
  return fallback;
}
