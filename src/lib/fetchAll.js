import { supabase } from "./supabase";

const PAGE = 1000; // Supabase gives at most 1000 rows at a time

// Reads ALL of your rows from one table, a page at a time.
export async function fetchAll(table, columns, userId, orderColumn) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("user_id", userId)
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}
