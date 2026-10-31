// POST /api/generate-cards  { text }  + header Authorization: Bearer <user token>
import { generateCards } from "./_lib/gemini.js";
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
      error: "Paste a bit more text (at least 50 letters).",
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

    const cards = await generateCards(text, 20);
    if (cards.length === 0) {
      return send(res, 200, { cards: [], used, limit: DAILY_LIMIT });
    }

    await addUse(db, user.id, used); // count only after success
    return send(res, 200, { cards, used: used + 1, limit: DAILY_LIMIT });
  } catch (e) {
    console.error("generate-cards:", e.message);
    return send(res, 500, {
      error: "Tuo could not make cards right now. Try again soon.",
    });
  }
}
