import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import useAuth from "./useAuth";
import useRefreshOnFocus from "./useRefreshOnFocus";

// Turns a date into "2026-10-28" using the student's own clock.
function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

// Reads the saved study rounds and works out:
// streak, today's cards, this week's dots, and the last round.
// If something goes wrong, everything stays at 0 and the page still works.
// refreshKey (optional): when it changes, the numbers load again.
export default function useStudyProgress(refreshKey) {
  const { user } = useAuth();
  const userId = user?.id;
  const [focusTick, setFocusTick] = useState(0);
  const loadedRef = useRef(false); // true after one good load
  const [state, setState] = useState({
    loading: true,
    error: false,
    sessions: [],
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("set_id, mode, cards_done, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled) return;
      if (error) {
        console.error(error);
        // A failed background refresh keeps the numbers already on screen.
        if (loadedRef.current) return;
        setState({ loading: false, error: true, sessions: [] });
      } else {
        loadedRef.current = true;
        setState({ loading: false, error: false, sessions: data });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, focusTick]);

  // Back on the tab or the phone app: load again quietly.
  useRefreshOnFocus(() => setFocusTick((t) => t + 1));

  const { sessions } = state;

  // Which days had at least one round.
  const days = new Set(sessions.map((s) => dayKey(new Date(s.created_at))));

  const today = new Date();
  const todayKey = dayKey(today);
  const studiedToday = days.has(todayKey);

  // Streak. If you have not studied yet today, yesterday still counts,
  // so a new day never wipes your streak before you get a chance.
  let streak = 0;
  const cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  if (!studiedToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Cards finished today.
  const cardsToday = sessions
    .filter((s) => dayKey(new Date(s.created_at)) === todayKey)
    .reduce((sum, s) => sum + (s.cards_done || 0), 0);

  // This week, Monday first.
  const todayIndex = (today.getDay() + 6) % 7;
  const weekDone = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - todayIndex + i,
    );
    return days.has(dayKey(date));
  });

  const last = sessions[0]
    ? { setId: sessions[0].set_id, mode: sessions[0].mode }
    : null;

  return {
    loading: state.loading,
    error: state.error,
    streak,
    studiedToday,
    cardsToday,
    weekDone,
    hasStudied: sessions.length > 0,
    last,
  };
}
