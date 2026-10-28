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

async function callModel(model, key, prompt) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                front: { type: "STRING" },
                back: { type: "STRING" },
              },
              required: ["front", "back"],
            },
          },
        },
      }),
    },
  );
}

export async function generateCards(text, count) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing-key");

  const prompt =
    `Make up to ${count} study flashcards from the text below.\n` +
    'Each card: a short "front" (question or term) and a clear "back" (answer, 1-2 sentences).\n' +
    "Use only facts from the text. Use the same language as the text. No duplicates.\n\n" +
    `TEXT:\n${text}`;

  let res = null;
  let lastStatus = 0;

  for (const model of MODELS) {
    res = await callModel(model, key, prompt);
    if (res.ok) break;
    lastStatus = res.status;
    console.error(`generate-cards: model ${model} failed with ${res.status}`);
    if (!TRY_NEXT.includes(res.status)) break;
  }

  if (!res || !res.ok) throw new Error("gemini-" + lastStatus);

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    throw new Error("bad-json");
  }

  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      front: String(c.front || "")
        .trim()
        .slice(0, 500),
      back: String(c.back || "")
        .trim()
        .slice(0, 1000),
    }))
    .filter((c) => c.front && c.back)
    .slice(0, count);
}
