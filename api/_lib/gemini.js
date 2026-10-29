// Talks to Gemini. Runs only on the server (Vercel). The key never reaches the browser.
//
// Google retires models often. So we keep a short list and try the next one
// if a model is gone (404), busy (503) or out of free tries (429).
// To force one model without changing code: add GEMINI_MODEL in Vercel env vars.
const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
].filter(Boolean);

const TRY_NEXT = [404, 429, 503];

// Sends one prompt, asks for JSON in the given shape, returns the parsed JSON.
async function askGemini(prompt, schema) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing-key");

  let res = null;
  let lastStatus = 0;

  for (const model of MODELS) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      },
    );
    if (res.ok) break;
    lastStatus = res.status;
    console.error(`gemini: model ${model} failed with ${res.status}`);
    if (!TRY_NEXT.includes(res.status)) break;
  }

  if (!res || !res.ok) throw new Error("gemini-" + lastStatus);

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("bad-json");
  }
}

const clean = (value, max) =>
  String(value || "")
    .trim()
    .slice(0, max);

export async function generateCards(text, count) {
  const prompt =
    `Make up to ${count} study flashcards from the text below.\n` +
    'Each card: a short "front" (question or term) and a clear "back" (answer, 1-2 sentences).\n' +
    "Use only facts from the text. Use the same language as the text. No duplicates.\n\n" +
    `TEXT:\n${text}`;

  const list = await askGemini(prompt, {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        front: { type: "STRING" },
        back: { type: "STRING" },
      },
      required: ["front", "back"],
    },
  });

  return (Array.isArray(list) ? list : [])
    .map((c) => ({ front: clean(c?.front, 500), back: clean(c?.back, 1000) }))
    .filter((c) => c.front && c.back)
    .slice(0, count);
}

// Short study notes in plain text (the Notes page shows plain text only).
// Returns { title, content }. Both are "" if Gemini gave nothing useful.
export async function summarizeText(text) {
  const prompt =
    "Write clear study notes from the text below, for a student.\n" +
    'Give a short "title" (under 8 words) and the "notes".\n' +
    "Notes rules: plain text only. Put each short heading on its own line. " +
    'Put each key point on its own line starting with "- ". ' +
    "Do not use markdown symbols like #, *, or **. " +
    "Keep important terms, names, dates, and numbers. " +
    "Use only facts from the text. Use the same language as the text. " +
    "Keep it under about 400 words.\n\n" +
    `TEXT:\n${text}`;

  const out = await askGemini(prompt, {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      notes: { type: "STRING" },
    },
    required: ["title", "notes"],
  });

  return {
    title: clean(out?.title, 120),
    content: clean(out?.notes, 8000),
  };
}
