import { supabase } from "./supabase";

export const DEFAULT_SETTINGS = { dailyGoal: 10, calmMode: false };
export const GOAL_CHOICES = [5, 10, 20, 30, 50];

// Reads your settings. No row yet = the friendly defaults.
export async function loadSettings(userId) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("daily_goal, calm_mode")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return { dailyGoal: data.daily_goal, calmMode: data.calm_mode };
}

// Saves your settings (makes the row the first time).
export async function saveSettings(userId, settings) {
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      daily_goal: settings.dailyGoal,
      calm_mode: settings.calmMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
