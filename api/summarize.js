// POST /api/summarize  { text }  + header Authorization: Bearer <user token>
// Same rules as generate-cards: logged in, 50 to 20,000 letters, 5 tries a day.
import { summarizeText } from "./_lib/gemini.js";
import {
  DAILY_LIMIT,
  MAX_CHARS,
  MIN_CHARS,
  getUsed,
  addUse,
} from "./_lib/limits.js";
import { requireUser, send } from "./_lib/auth.js";

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const { db, user } = session;

  const text = String(req.body?.text || "").trim();
  if (text.length < MIN_CHARS) {
    return send(res, 400, {
      error: "Add a bit more text (at least 50 letters).",
    });
  }
  if (text.length > MAX_CHARS) {
    return send(res, 400, {
      error: "That is too long. Try under 20,000 letters.",
    });
  }

  try {
    const used = await getUsed(db, user.id);
    if (used >= DAILY_LIMIT) {
      return send(res, 429, {
        error: "You used all your AI tries for today. They come back tomorrow!",
        used,
        limit: DAILY_LIMIT,
      });
    }

    const { title, content } = await summarizeText(text);
    if (!content) {
      return send(res, 200, {
        title: "",
        content: "",
        used,
        limit: DAILY_LIMIT,
      });
    }

    await addUse(db, user.id, used); // count only after success
    return send(res, 200, {
      title,
      content,
      used: used + 1,
      limit: DAILY_LIMIT,
    });
  } catch (e) {
    console.error("summarize:", e.message);
    return send(res, 500, {
      error: "Tuo could not make notes right now. Try again soon.",
    });
  }
}
