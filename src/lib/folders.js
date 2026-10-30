import { supabase } from "./supabase";

export const FOLDER_NAME_MAX = 60;

// Your folders, A to Z.
export async function loadFolders(userId) {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name")
    .eq("user_id", userId);
  if (error) throw error;
  return data.sort((a, b) => a.name.localeCompare(b.name));
}

// Makes a folder. Returns { id, name }.
export async function createFolder(userId, name) {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function renameFolder(id, name) {
  const { data, error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "The folder was not renamed (check the folders UPDATE policy).",
    );
  }
}

// Deletes the folder only. Its sets stay and go back to "No folder".
export async function deleteFolder(id) {
  const { error: moveError } = await supabase
    .from("sets")
    .update({ folder_id: null })
    .eq("folder_id", id);
  if (moveError) throw moveError;

  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}
