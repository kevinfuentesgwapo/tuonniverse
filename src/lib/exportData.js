import { supabase } from "./supabase";
import { fetchAll } from "./fetchAll";
import { loadSettings } from "./userSettings";

// Collects everything that belongs to you. Cards sit inside their set.
export async function exportMyData(user) {
  const userId = user.id;
  const [folders, sets, cards, notes, sessions, progress, settings, profile] =
    await Promise.all([
      fetchAll("folders", "id, name, created_at", userId, "id"),
      fetchAll(
        "sets",
        "id, title, description, share_code, folder_id, created_at, updated_at",
        userId,
        "id",
      ),
      fetchAll(
        "cards",
        "id, set_id, term, definition, position, starred, created_at",
        userId,
        "id",
      ),
      fetchAll(
        "notes",
        "id, title, content, created_at, updated_at",
        userId,
        "id",
      ),
      fetchAll(
        "study_sessions",
        "id, set_id, mode, cards_done, created_at",
        userId,
        "id",
      ),
      fetchAll(
        "card_progress",
        "card_id, set_id, due_on, interval_days, ease, reps, lapses, last_reviewed",
        userId,
        "card_id",
      ),
      loadSettings(userId),
      supabase
        .from("profiles")
        .select("display_name, created_at")
        .eq("id", userId)
        .maybeSingle(),
    ]);
  if (profile.error) throw profile.error;

  return {
    app: "Tuoniverse",
    exported_at: new Date().toISOString(),
    account: {
      email: user.email ?? null,
      display_name: profile.data?.display_name ?? null,
      joined: profile.data?.created_at ?? null,
    },
    settings: {
      daily_goal: settings.dailyGoal,
      calm_mode: settings.calmMode,
    },
    folders,
    sets: sets.map((set) => ({
      ...set,
      cards: cards
        .filter((card) => card.set_id === set.id)
        .sort((a, b) => a.position - b.position)
        .map(({ set_id, ...card }) => card),
    })),
    notes,
    study_sessions: sessions,
    card_progress: progress,
  };
}

// Saves the data as a file on the student's device.
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
