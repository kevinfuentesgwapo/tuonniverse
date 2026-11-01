// POST /api/delete-account  { confirm: "DELETE" }  + header Authorization: Bearer <user token>
// Deletes ALL of the logged-in student's data (also their picture files,
// unless another card still uses a picture), then their login.
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
  ["folders", "user_id"],
  ["notes", "user_id"],
  ["ai_usage", "user_id"],
  ["user_settings", "user_id"],
  ["profiles", "id"],
];

// Picture files live in the public bucket "card-images" as <user id>/<name>.
const PICTURE_BUCKET = "card-images";

// Every picture file in this student's own folder.
async function listMyPictures(admin, userId) {
  const PAGE = 100;
  const paths = [];
  for (let offset = 0; offset < 5000; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(PICTURE_BUCKET)
      .list(userId, { limit: PAGE, offset });
    if (error) throw new Error(`pictures: ${error.message}`);
    for (const file of data) paths.push(`${userId}/${file.name}`);
    if (data.length < PAGE) break;
  }
  return paths;
}

// Deletes the files that NO card uses anymore. Run it AFTER this student's
// cards are gone. A saved copy of a shared set may still use a picture,
// and that picture must stay for the other person.
async function deleteUnusedPictures(admin, paths) {
  const CHUNK = 100;
  const free = [];
  for (let i = 0; i < paths.length; i += CHUNK) {
    const chunk = paths.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("cards")
      .select("image_path")
      .in("image_path", chunk);
    if (error) throw new Error(`pictures: ${error.message}`);
    const used = new Set((data || []).map((row) => row.image_path));
    free.push(...chunk.filter((path) => !used.has(path)));
  }
  for (let i = 0; i < free.length; i += CHUNK) {
    const { error } = await admin.storage
      .from(PICTURE_BUCKET)
      .remove(free.slice(i, i + CHUNK));
    if (error) throw new Error(`pictures: ${error.message}`);
  }
}

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
    // Find the picture files first, while we still know who they belong to.
    const pictures = await listMyPictures(admin, user.id);

    for (const [table, column] of TABLES) {
      const { error } = await admin.from(table).delete().eq(column, user.id);
      if (error) throw new Error(`${table}: ${error.message}`);
    }

    // Now that my cards are gone, remove the files nobody else uses.
    await deleteUnusedPictures(admin, pictures);

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
