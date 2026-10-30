import { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../lib/userSettings";

// Your settings: { settings: { dailyGoal, calmMode }, loading, error, save }.
// save({ dailyGoal }) or save({ calmMode }) returns true or false.
// Calm mode is switched on the page here (data-calm on <html>).
export default function useSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadSettings(userId)
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("We could not load your settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Calm mode: CSS in settings.css slows all motion down to nothing.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.calmMode) root.setAttribute("data-calm", "on");
    else root.removeAttribute("data-calm");
  }, [settings.calmMode]);

  const save = useCallback(
    async (changes) => {
      if (!userId) return false;
      const previous = settings;
      setSettings({ ...settings, ...changes });
      setError("");
      try {
        await saveSettings(userId, { ...settings, ...changes });
        return true;
      } catch (err) {
        console.error(err);
        setSettings(previous);
        setError("We could not save that. Please try again.");
        return false;
      }
    },
    [userId, settings],
  );

  return { settings, loading, error, save };
}
