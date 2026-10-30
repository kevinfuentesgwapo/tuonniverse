import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import useAuth from "./useAuth";
import useRefreshOnFocus from "./useRefreshOnFocus";

// Turns a database row into a friendly object.
function toNote(row) {
  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The list of your notes, newest first.
export default function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // quiet = true: no "Loading" flash, and old notes stay if it fails.
  const load = useCallback(
    async (quiet) => {
      if (!user) {
        setNotes([]);
        setLoading(false);
        return;
      }
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      const { data, error: err } = await supabase
        .from("notes")
        .select("id, title, content, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (err) {
        console.error(err);
        if (!quiet) {
          setError(err);
          setNotes([]);
        }
      } else {
        setNotes((data ?? []).map(toNote));
        setError(null);
      }
      if (!quiet) setLoading(false);
    },
    [user],
  );

  const reload = useCallback(() => load(false), [load]);
  const quietReload = useCallback(() => load(true), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Come back to the tab: refresh quietly.
  useRefreshOnFocus(quietReload);

  return { notes, loading, error, reload };
}

// One note, or null if it does not exist (or is not yours).
export async function getNote(id) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toNote(data) : null;
}

// Makes a new note. Returns its id.
export async function createNote({ userId, title, content }) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, title, content })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Saves changes to a note.
export async function updateNote(id, { title, content }) {
  const { error } = await supabase
    .from("notes")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Deletes a note for good.
export async function deleteNote(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
