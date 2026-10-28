// Daily AI limit. Checked on the server, so users cannot cheat it.
export const DAILY_LIMIT = 5;
export const MAX_CHARS = 20000;
export const MIN_CHARS = 50;

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsed(db, userId) {
  const { data, error } = await db
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("used_on", todayUtc())
    .maybeSingle();
  if (error) throw new Error("usage-read");
  return data?.count || 0;
}

export async function addUse(db, userId, used) {
  const day = todayUtc();
  const q =
    used === 0
      ? db.from("ai_usage").insert({ user_id: userId, used_on: day, count: 1 })
      : db
          .from("ai_usage")
          .update({ count: used + 1 })
          .eq("user_id", userId)
          .eq("used_on", day);
  const { error } = await q;
  if (error) throw new Error("usage-write");
}
