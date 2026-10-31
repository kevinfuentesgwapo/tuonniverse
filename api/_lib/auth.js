// Shared by the /api functions that need a logged-in student.
import { createClient } from "@supabase/supabase-js";

export const send = (res, code, body) => res.status(code).json(body);

// Checks: POST only, a token, the server setup, and a real user.
// Returns { db, user } when all is fine.
// Returns null after it has already sent the error (so just `return`).
export async function requireUser(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Please use POST." });
    return null;
  }

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) {
    send(res, 401, { error: "Please log in first." });
    return null;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    send(res, 500, { error: "Server is not set up yet." });
    return null;
  }

  // Act as the logged-in user, so RLS still protects the data.
  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data } = await db.auth.getUser(token);
  const user = data?.user;
  if (!user) {
    send(res, 401, { error: "Please log in again." });
    return null;
  }

  return { db, user };
}
