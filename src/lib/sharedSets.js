import { supabase } from "./supabase";

// Read a shared set with its code. Returns { title, description, cards }
// or null when the link is wrong or sharing was turned off.
export async function getSharedSet(code) {
  const { data, error } = await supabase.rpc("get_shared_set", {
    p_code: code,
  });
  if (error) throw error;
  return data || null;
}

// Save a copy of a shared set into my own account.
// Returns the id of my new set. Needs a logged-in user.
export async function copySharedSet(code) {
  const { data, error } = await supabase.rpc("copy_shared_set", {
    p_code: code,
  });
  if (error) throw error;
  return data;
}
