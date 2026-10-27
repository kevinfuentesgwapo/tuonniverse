import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext(null);

// Keeps track of who is logged in and shares it with every page.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ask: is someone already logged in?
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Listen: tell me whenever someone logs in or out.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = { session, user: session?.user ?? null, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
