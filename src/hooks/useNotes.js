import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import useAuth from "./useAuth";

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

  const reload = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("notes")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (err) {
      console.error(err);
      setError(err);
      setNotes([]);
    } else {
      setNotes((data ?? []).map(toNote));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

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
