// Calls our own /api functions. The browser never sees the Gemini key.
import { supabase } from "./supabase.js";

export const AI_LIMIT_FALLBACK = 5;

// Sends text to one of our /api functions. Returns the parsed JSON body.
// Throws an Error with a friendly message (error.status = HTTP code).
async function postAi(path, text) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    const err = new Error("Please log in first.");
    err.status = 401;
    throw err;
  }

  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error("No internet? Check your connection and try again.");
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON. Usually means /api is not running (plain "npm run dev").
    const err = new Error(
      'AI is not running here. Try the live site, or run "vercel dev".',
    );
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(
      body?.error || "Something went wrong. Please try again.",
    );
    err.status = res.status;
    err.used = body?.used;
    err.limit = body?.limit;
    throw err;
  }

  return body;
}

// Pasted text -> flashcards. Returns { cards, used, limit }.
export async function generateCardsFromText(text) {
  const body = await postAi("/api/generate-cards", text);
  return {
    cards: Array.isArray(body.cards) ? body.cards : [],
    used: body.used ?? 0,
    limit: body.limit ?? AI_LIMIT_FALLBACK,
  };
}

// Pasted text -> short study notes. Returns { title, content, used, limit }.
// title and content are "" when Tuo found nothing to write.
export async function summarizeText(text) {
  const body = await postAi("/api/summarize", text);
  return {
    title: typeof body.title === "string" ? body.title : "",
    content: typeof body.content === "string" ? body.content : "",
    used: body.used ?? 0,
    limit: body.limit ?? AI_LIMIT_FALLBACK,
  };
}
