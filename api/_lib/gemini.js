// Talks to Gemini. Runs only on the server (Vercel). The key never reaches the browser.
const MODEL = "gemini-2.5-flash";

export async function generateCards(text, count) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing-key");

  const prompt =
    `Make up to ${count} study flashcards from the text below.\n` +
    'Each card: a short "front" (question or term) and a clear "back" (answer, 1-2 sentences).\n' +
    "Use only facts from the text. Use the same language as the text. No duplicates.\n\n" +
    `TEXT:\n${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
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

  if (!res.ok) throw new Error("gemini-" + res.status);

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
