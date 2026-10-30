// POST /api/delete-account  { confirm: "DELETE" }  + header Authorization: Bearer <user token>
// Deletes ALL of the logged-in student's data, then their login.
// Needs the secret env variable SUPABASE_SERVICE_ROLE_KEY (set in Vercel only).
import { createClient } from "@supabase/supabase-js";

const send = (res, code, body) => res.status(code).json(body);

// Order matters: rows that point to other rows go first.
// [table, column that holds the student's id]
const TABLES = [
  ["card_progress", "user_id"],
  ["study_sessions", "user_id"],
  ["cards", "user_id"],
  ["sets", "user_id"],
  ["notes", "user_id"],
  ["ai_usage", "user_id"],
  ["user_settings", "user_id"],
  ["profiles", "id"],
];

export default async function handler(req, res) {
  if (req.method !== "POST")
    return send(res, 405, { error: "Please use POST." });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return send(res, 401, { error: "Please log in first." });

  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service)
    return send(res, 500, { error: "Server is not set up yet." });

  // The student must type DELETE. This stops accidents.
  if (req.body?.confirm !== "DELETE") {
    return send(res, 400, { error: "Please type DELETE to confirm." });
  }

  // Who is asking? Check the token with the normal (public) key.
  const asUser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await asUser.auth.getUser(token);
  const user = auth?.user;
  if (!user) return send(res, 401, { error: "Please log in again." });

  // The admin client skips RLS. It only ever touches THIS student's rows.
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    for (const [table, column] of TABLES) {
      const { error } = await admin.from(table).delete().eq(column, user.id);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`login: ${error.message}`);

    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("delete-account:", e.message);
    // Safe to try again: deleting the same rows twice is fine.
    return send(res, 500, {
      error:
        "We could not finish deleting your account. Some of your data may already be gone. Please try again.",
    });
  }
}
