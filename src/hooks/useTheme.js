import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tuoniverse-theme";
const DEFAULT_THEME = "dark";

// Read the saved theme. If anything goes wrong, use dark.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  } catch {
    // Some browsers block storage. That is okay.
  }
  return DEFAULT_THEME;
}

export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  // Every time the theme changes:
  // 1) tell the page (data-theme on <html>)
  // 2) save it for next time
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore. The theme still works for this visit.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
